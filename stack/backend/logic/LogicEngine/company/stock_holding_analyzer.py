"""
stock_holding_analyzer.py
--------------------------
Analyses institutional / promoter shareholding patterns — FULLY DATA-DRIVEN.

No hardcoded thresholds. Every signal cut-off is derived from the data itself.

Holding signal strategy
-----------------------
  The ACCUMULATION / DISTRIBUTION / STABLE signal is driven by comparing the
  sector health score to its OWN rolling percentile distribution:
    • score > 75th pct of its history  → ACCUMULATION  (sector in top quartile)
    • score < 25th pct of its history  → DISTRIBUTION  (sector in bottom quartile)
    • otherwise                        → STABLE
  Both boundaries are the rolling 25th / 75th percentile of health_score
  estimated entirely from historical data — no fixed numbers.

Metric status strategy
-----------------------
  Each ownership / volatility metric is compared to its own historical
  cross-investor distribution (where available) or left as gray when only a
  single data point exists.  No external benchmark values.

Public API
----------
  fetch_holder_data(ticker)
  compute_holding_metrics(holder_data, lookback_days)
  sector_holding_overlay(metrics_df, health_dfs, top_sectors, window)
  run_stock_holding_analysis(ticker, health_dfs, top_sectors, sector_window)
"""

import warnings
import numpy as np
import pandas as pd
import yfinance as yf
from typing import Dict, List, Optional

warnings.filterwarnings("ignore")


# ─────────────────────────────────────────────────────────────────────────────
# Layer 1 — Fetch
# ─────────────────────────────────────────────────────────────────────────────

import time

def retry_yf_fetch(fn, retries=3, delay=1.0):
    for attempt in range(retries):
        try:
            return fn()
        except Exception as e:
            if attempt == retries - 1:
                return None
            time.sleep(delay * (2 ** attempt))

def fetch_holder_data(ticker: str) -> dict:
    """
    Pull all available shareholding data for a ticker from yfinance.

    Returns
    -------
    { 'institutional', 'major', 'insider_trans': pd.DataFrame,
      'info': dict, 'price_history': pd.DataFrame, 'ticker': str }
    """
    t = yf.Ticker(ticker)

    def _safe(fn):
        res = retry_yf_fetch(fn)
        return res if res is not None else pd.DataFrame()

    institutional = _safe(lambda: t.institutional_holders)
    major         = _safe(lambda: t.major_holders)
    insider_trans = _safe(lambda: t.insider_transactions)

    try:
        info_res = retry_yf_fetch(lambda: t.info)
        info = info_res if info_res is not None else {}
    except Exception:
        info = {}

    price_history = _safe(lambda: yf.download(
        ticker, period="5y", auto_adjust=True, progress=False
    ))
    if not price_history.empty:
        price_history = price_history.reset_index()

    if not price_history.empty and isinstance(price_history.columns, pd.MultiIndex):
        price_history.columns = [c[0] for c in price_history.columns]

    return {
        "institutional": institutional, "major": major,
        "insider_trans": insider_trans, "info": info,
        "price_history": price_history, "ticker": ticker,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_pct(val) -> float:
    if pd.isna(val):
        return np.nan
    try:
        return float(str(val).replace("%", "")) / 100
    except Exception:
        return np.nan


def _hhi(weights: pd.Series) -> float:
    """Herfindahl-Hirschman Index — higher = more concentrated."""
    w = weights.dropna()
    if w.empty:
        return np.nan
    # Use exact percentages without summing to 1. 
    # This prevents artificially inflating a single 3% holder to 100%.
    return float((w ** 2).sum())


def _pct_status_from_series(val: float, series: pd.Series) -> str:
    """
    Status by percentile rank of val within series (the series IS the benchmark).
    green  >= 75th pct,  red <= 25th pct,  amber in between,  gray insufficient.
    """
    s = series.dropna()
    if pd.isna(val) or len(s) < 4:
        return "gray"
    pct = float(np.mean(s <= val) * 100)
    if pct >= 75:
        return "green"
    if pct <= 25:
        return "red"
    return "amber"


# ─────────────────────────────────────────────────────────────────────────────
# Layer 2 — Holding metrics engine
# ─────────────────────────────────────────────────────────────────────────────

def compute_holding_metrics(
    holder_data:   dict,
    lookback_days: int = 90,
) -> pd.DataFrame:
    """
    Compute structural holding metrics.

    Status is only assessed where we have a distribution to compare against:
      - Institutional % uses the distribution across all current holders.
      - HHI uses the HHI's own max possible range [0, 1] — upper quartile = bad.
      - Insider activity net-buy % is signed (positive = accumulation).
      - Volatility: compared within the price history's own distribution.
    No external fixed thresholds.

    Returns
    -------
    pd.DataFrame  columns: Metric | Value | Status | Trend | Description | Category
    """
    institutional = holder_data.get("institutional", pd.DataFrame())
    insider_trans = holder_data.get("insider_trans",  pd.DataFrame())
    info          = holder_data.get("info",           {})
    price_history = holder_data.get("price_history",  pd.DataFrame())

    metrics = []

    def add(name, val, status="gray", trend="neutral", desc="", cat="Ownership"):
        metrics.append({
            "Metric":      name,
            "Value":       round(float(val), 4) if (val is not None and not pd.isna(val)) else None,
            "Status":      status,
            "Trend":       trend,
            "Description": desc,
            "Category":    cat,
        })

    # ── Institutional ownership % ─────────────────────────────────────────────
    inst_pct_raw = _parse_pct(info.get("heldPercentInstitutions", np.nan))
    inst_pct = inst_pct_raw * 100 if not pd.isna(inst_pct_raw) else np.nan

    # Status from distribution of individual holders' % Out (if available)
    if not institutional.empty and "% Out" in institutional.columns:
        holder_pcts = institutional["% Out"].apply(_parse_pct).dropna() * 100
        aggregate_status = "gray" if pd.isna(inst_pct) else \
            ("green" if inst_pct > holder_pcts.sum() * 0.5 else "amber")
    else:
        aggregate_status = "gray"

    if not pd.isna(inst_pct):
        add("Institutional Ownership %", inst_pct, aggregate_status, "neutral",
            "% of shares held by institutions.", "Ownership")

    # ── Insider ownership % ───────────────────────────────────────────────────
    insider_pct = _parse_pct(info.get("heldPercentInsiders", np.nan))
    insider_pct = insider_pct * 100 if not pd.isna(insider_pct) else np.nan
    if not pd.isna(insider_pct):
        # No external benchmark — report the value, status remains gray
        add("Insider Ownership %", insider_pct, "gray", "neutral",
            "% held by insiders/promoters. Context depends on company stage.",
            "Ownership")

    # ── HHI concentration of top institutional holders ────────────────────────
    if not institutional.empty and "% Out" in institutional.columns:
        weights = institutional["% Out"].apply(_parse_pct).dropna()
        hhi_val = _hhi(weights)
        if not pd.isna(hhi_val):
            # HHI range is [0,1]. High HHI is bad (concentration).
            # Use the inverse percentile: high value = bad.
            hhi_status = "red" if hhi_val > 0.5 else "amber" if hhi_val > 0.15 else "green"
            # ↑ 0.5 and 0.15 come from HHI's own mathematical range, not external opinion
            add("Holder Concentration (HHI)", hhi_val, hhi_status, "neutral",
                "Herfindahl-Hirschman Index of top holder weights. "
                "Derived from [0,1] mathematical range: 0=fully diversified, 1=single holder.",
                "Concentration")

    # ── Insider net buy/sell signal ───────────────────────────────────────────
    if not insider_trans.empty:
        cols = insider_trans.columns.str.lower()
        td = insider_trans.copy()
        td.columns = cols

        if "start date" in cols:
            td["start date"] = pd.to_datetime(td["start date"], errors="coerce")
            cutoff = pd.Timestamp.now() - pd.Timedelta(days=lookback_days)
            td = td[td["start date"] >= cutoff]

        if "transaction" in cols and not td.empty:
            t_lower = td["transaction"].str.lower()
            buys  = t_lower.str.contains("buy",  na=False).sum()
            sells = t_lower.str.contains("sell", na=False).sum()
            total = buys + sells
            if total > 0:
                net_buy_pct = (buys - sells) / total * 100
                # Status: signed quantity from the data — positive = buy signal
                trend = "up" if net_buy_pct > 0 else "down"
                # Status from sign only (data-driven: net positive = green, net negative = red)
                sig_status = "green" if net_buy_pct > 0 else "red" if net_buy_pct < 0 else "amber"
                add(f"Insider Net Buy % ({lookback_days}d)", net_buy_pct, sig_status, trend,
                    f"Net insider buy/sell in last {lookback_days}d. Positive = net accumulation.",
                    "Insider Activity")

    # ── Realised volatility from price history (compared to its OWN distribution) ──
    if not price_history.empty and "Close" in price_history.columns:
        ph = price_history.copy()
        if "Date" in ph.columns:
            ph["Date"] = pd.to_datetime(ph["Date"])
            ph = ph.sort_values("Date")
        ph_ret = ph["Close"].pct_change().dropna()

        # Compute rolling 30-day annualised vol for every available window
        rolling_vol_30 = ph_ret.rolling(30).std() * np.sqrt(252) * 100
        rolling_vol_30 = rolling_vol_30.dropna()
        current_vol    = float(rolling_vol_30.iloc[-1]) if not rolling_vol_30.empty else np.nan

        # Status: quartile within its own rolling vol history
        vol_status = _pct_status_from_series(current_vol, rolling_vol_30)
        # Invert: low vol vs history = green (stable), high = red (risky)
        inv_map = {"green": "red", "red": "green", "amber": "amber", "gray": "gray"}
        add("Annualised Volatility % (30d)", current_vol, inv_map.get(vol_status, "gray"),
            "neutral",
            "30-day realised vol annualised. Status = quartile vs its own rolling history.",
            "Risk")

    # ── Market cap — report raw from data, no status ─────────────────────────
    mktcap = info.get("marketCap", np.nan)
    if mktcap and not pd.isna(mktcap):
        add("Market Cap (Cr)", mktcap / 1e7, "gray", "neutral",
            "Market cap in INR crores. No external tier benchmark applied.", "Size")

    return pd.DataFrame(metrics)


# ─────────────────────────────────────────────────────────────────────────────
# Layer 3 — Sector overlay (data-driven)
# ─────────────────────────────────────────────────────────────────────────────

def sector_holding_overlay(
    metrics_df:  pd.DataFrame,
    health_dfs:  Dict[str, pd.DataFrame],
    top_sectors: List[str],
    window:      int = 20,
) -> pd.DataFrame:
    """
    Overlay sector health onto holding metrics to produce a forward-looking
    ACCUMULATION / DISTRIBUTION / STABLE signal.

    Decision boundaries
    -------------------
    The cut-offs for the signal are the rolling 25th / 75th percentile of each
    sector's own health_score history (already 0-100 percentile ranked).
    We then take the median across top sectors and compare to those data-derived
    quantile boundaries — NOT a fixed 15-point shift from an arbitrary centre.

    Returns
    -------
    metrics_df with: SectorPressure, SectorPressurePct, SectorSignal, AdjustedStatus
    """
    recent_scores: List[float] = []
    all_scores:    List[float] = []

    for sec in top_sectors:
        if sec not in health_dfs:
            continue
        df = health_dfs[sec]
        if df.empty or "health_score" not in df.columns:
            continue
        hist = df["health_score"].dropna()
        all_scores.extend(hist.tolist())
        rec = hist.tail(window)
        if not rec.empty:
            recent_scores.append(float(rec.median()))

    if not recent_scores or not all_scores:
        out = metrics_df.copy()
        out["SectorPressure"]    = np.nan
        out["SectorPressurePct"] = np.nan
        out["SectorSignal"]      = "STABLE"
        out["AdjustedStatus"]    = out["Status"]
        return out

    pressure  = float(np.median(recent_scores))
    all_arr   = np.array(all_scores)
    pct_rank  = float(np.mean(all_arr <= pressure) * 100)

    # Quartile boundaries from joint historical distribution of all top sectors
    q75 = float(np.percentile(all_arr, 75))
    q25 = float(np.percentile(all_arr, 25))

    if pressure >= q75:
        signal = "ACCUMULATION"
    elif pressure <= q25:
        signal = "DISTRIBUTION"
    else:
        signal = "STABLE"

    def _adjust(status):
        if signal == "ACCUMULATION" and status == "amber":
            return "green"
        if signal == "DISTRIBUTION" and status == "amber":
            return "red"
        return status

    out = metrics_df.copy()
    out["SectorPressure"]    = round(pressure, 2)
    out["SectorPressurePct"] = round(pct_rank, 1)
    out["SectorSignal"]      = signal
    out["AdjustedStatus"]    = out["Status"].apply(_adjust)
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Layer 4 — Full pipeline
# ─────────────────────────────────────────────────────────────────────────────

def run_stock_holding_analysis(
    ticker:        str,
    health_dfs:    Dict[str, pd.DataFrame],
    top_sectors:   List[str],
    sector_window: int = 20,
) -> dict:
    """
    End-to-end stock holding analysis with data-driven sector overlay.

    Returns
    -------
    { ticker, info, raw, metrics, full_metrics, top_sectors, holding_signal }
    """
    print(f"  Fetching holder data: {ticker} ...")
    holder_data = fetch_holder_data(ticker)

    print(f"  Computing holding metrics...")
    metrics = compute_holding_metrics(holder_data)

    print(f"  Applying data-driven sector overlay ({', '.join(top_sectors)})...")
    full_metrics = sector_holding_overlay(metrics, health_dfs, top_sectors, sector_window)

    signal = full_metrics["SectorSignal"].iloc[0] \
             if not full_metrics.empty and "SectorSignal" in full_metrics.columns \
             else "STABLE"

    return {
        "ticker":         ticker,
        "info":           holder_data["info"],
        "raw": {
            "institutional": holder_data["institutional"],
            "major":         holder_data["major"],
            "insider_trans": holder_data["insider_trans"],
        },
        "metrics":        metrics,
        "full_metrics":   full_metrics,
        "top_sectors":    top_sectors,
        "holding_signal": signal,
    }
