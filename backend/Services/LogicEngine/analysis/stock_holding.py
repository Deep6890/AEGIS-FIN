"""
stock_holding.py
----------------
Analyses institutional / promoter shareholding patterns.

Input  : ticker string (fetches from yfinance internally)
Output : dict with keys:
    "ticker"         str
    "info"           dict
    "metrics"        pd.DataFrame  — raw metrics
    "full_metrics"   pd.DataFrame  — metrics + AdjustedStatus
    "sector_overlay" dict          — signal, pressure, pct_rank, narrative
    "holding_signal" str           — ACCUMULATION | STABLE | DISTRIBUTION

Metric status is data-driven — compared to own historical distribution.
Sector overlay only adjusts amber metrics; confirmed green/red are not overridden.

Usage
-----
    from stock_holding import run_stock_holding

    result = run_stock_holding(ticker="TCS.NS", sector_health_results=results, top_sectors=["IT Sector"])
"""

import numpy as np
import pandas as pd

from .scoring import parse_pct, pct_status, sector_pressure
from LogicEngine.logger import get_logger
from LogicEngine.schema import validate_holders

log = get_logger(__name__)

# Data is passed in — fetching is done exclusively by fetching/fetcher.py

# ── Metrics engine ────────────────────────────────────────────────────────────

def compute_holding_metrics(holder_data, lookback_days=90):
    inst  = holder_data.get("institutional", pd.DataFrame())
    ins_t = holder_data.get("insider_trans",  pd.DataFrame())
    info  = holder_data.get("info",           {})
    ph    = holder_data.get("price_history",  pd.DataFrame())
    rows  = []

    def add(name, val, status="gray", trend="neutral", desc="", cat="Ownership"):
        rows.append({
            "Metric":   name,
            "Value":    round(float(val), 4) if (val is not None and not pd.isna(val)) else None,
            "Status":   status, "Trend": trend, "Description": desc, "Category": cat,
        })

    # Institutional %
    ip = parse_pct(info.get("heldPercentInstitutions", np.nan))
    if not pd.isna(ip):
        st = "gray"
        if not inst.empty and "% Out" in inst.columns:
            hp = inst["% Out"].apply(parse_pct).dropna()
            st = "green" if ip > hp.sum() * 0.5 else "amber"
        add("Institutional Ownership %", ip, st, "neutral", "% held by institutions")

    # Insider %
    iip = parse_pct(info.get("heldPercentInsiders", np.nan))
    if not pd.isna(iip):
        add("Insider Ownership %", iip, "gray", "neutral", "% held by insiders/promoters")

    # HHI concentration
    if not inst.empty and "% Out" in inst.columns:
        w = inst["% Out"].apply(parse_pct).dropna() / 100
        hhi = float((w ** 2).sum()) if not w.empty else np.nan
        if not pd.isna(hhi):
            st = "red" if hhi > 0.25 else "amber" if hhi > 0.15 else "green"
            add("Holder Concentration (HHI)", hhi, st, "neutral", "HHI of top holders (0=diversified, 1=single holder)", "Concentration")

    # Insider net buy/sell
    if not ins_t.empty:
        td = ins_t.copy(); td.columns = td.columns.str.lower()
        if "start date" in td.columns:
            td["start date"] = pd.to_datetime(td["start date"], errors="coerce")
            td = td[td["start date"] >= pd.Timestamp.now() - pd.Timedelta(days=lookback_days)]
        if "transaction" in td.columns and not td.empty:
            tl = td["transaction"].str.lower()
            buys  = tl.str.contains("buy",  na=False).sum()
            sells = tl.str.contains("sell", na=False).sum()
            total = buys + sells
            if total > 0:
                nb = (buys - sells) / total * 100
                add(f"Insider Net Buy % ({lookback_days}d)", nb,
                    "green" if nb > 0 else "red" if nb < 0 else "amber",
                    "up" if nb > 0 else "down",
                    f"Net insider buy/sell last {lookback_days}d", "Insider Activity")

    # Realised volatility vs own history
    if not ph.empty and "Close" in ph.columns:
        p = ph.copy()
        if "Date" in p.columns:
            p["Date"] = pd.to_datetime(p["Date"]); p = p.sort_values("Date")
        rv = p["Close"].pct_change().dropna().rolling(30).std() * np.sqrt(252) * 100
        rv = rv.dropna()
        cv = float(rv.iloc[-1]) if not rv.empty else np.nan
        inv = {"green": "red", "red": "green", "amber": "amber", "gray": "gray"}
        add("Annualised Volatility % (30d)", cv, inv.get(pct_status(cv, rv), "gray"),
            "neutral", "30d realised vol annualised vs own history", "Risk")

    # Market cap
    mc = info.get("marketCap", np.nan)
    if mc and not pd.isna(mc):
        add("Market Cap (Cr)", mc / 1e7, "gray", "neutral", "Market cap INR crores", "Size")

    return pd.DataFrame(rows)


# ── Sector overlay ────────────────────────────────────────────────────────────

def apply_sector_overlay(metrics_df, sector_health_results, top_sectors, window=20):
    """
    sector_health_results : dict { name: run_ohlcv_health() result }
    top_sectors           : list of sector names
    """
    p, pct, q75, q25, _ = sector_pressure(sector_health_results, top_sectors, window)
    out = metrics_df.copy()
    if pd.isna(p):
        out["AdjustedStatus"] = out["Status"]
        return out, {"signal": "STABLE", "pressure": np.nan, "pct_rank": np.nan, "narrative": "Insufficient sector data."}

    sig  = "ACCUMULATION" if p >= q75 else "DISTRIBUTION" if p <= q25 else "STABLE"
    narr = f"Sector pressure={p:.1f} (pct={pct:.0f}%). Signal: {sig}."
    out["AdjustedStatus"] = out["Status"].apply(
        lambda s: "green" if sig == "ACCUMULATION" and s == "amber"
             else ("red" if sig == "DISTRIBUTION" and s == "amber" else s))
    overlay = {"signal": sig, "pressure": round(p, 2), "pct_rank": round(pct, 1), "narrative": narr}
    return out, overlay


# ── Full pipeline ─────────────────────────────────────────────────────────────

def run_stock_holding(holder_data, sector_health_results=None, top_sectors=None, sector_window=20, lookback_days=90):
    # Validate input schema
    vr = validate_holders(holder_data, holder_data.get("ticker", ""))
    if not vr.ok:
        log.error("stock_holding.invalid_input", ticker=holder_data.get("ticker"),
                  errors=vr.errors)
        empty = pd.DataFrame()
        return {
            "ticker": holder_data.get("ticker", ""), "info": {},
            "raw": {"institutional": empty, "major": empty, "insider_trans": empty},
            "metrics": empty, "full_metrics": empty,
            "sector_overlay": {"signal": "STABLE", "pressure": float("nan"),
                               "pct_rank": float("nan"), "narrative": "Invalid input data."},
            "holding_signal": "STABLE",
        }
    for w in vr.warnings:
        log.warning("stock_holding.input_warning", ticker=holder_data.get("ticker"), warning=w)

    metrics = compute_holding_metrics(holder_data, lookback_days)
    log.info("stock_holding.metrics_computed", ticker=holder_data.get("ticker"),
             metric_count=len(metrics))

    overlay_info = {"signal": "STABLE", "pressure": float("nan"),
                    "pct_rank": float("nan"), "narrative": "No sector data provided."}
    full_metrics = metrics.copy()
    full_metrics["AdjustedStatus"] = metrics["Status"]

    if sector_health_results and top_sectors:
        full_metrics, overlay_info = apply_sector_overlay(
            metrics, sector_health_results, top_sectors, sector_window)

    return {
        "ticker":         holder_data.get("ticker", ""),
        "info":           holder_data.get("info", {}),
        "raw": {
            "institutional": holder_data.get("institutional", pd.DataFrame()),
            "major":         holder_data.get("major",         pd.DataFrame()),
            "insider_trans": holder_data.get("insider_trans", pd.DataFrame()),
        },
        "metrics":        metrics,
        "full_metrics":   full_metrics,
        "sector_overlay": overlay_info,
        "holding_signal": overlay_info.get("signal", "STABLE"),
    }
