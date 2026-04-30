"""
stock_holding.py
----------------
Analyses institutional / promoter shareholding patterns.

Input  : holder_data dict from fetcher.py with keys:
             "ticker"        str
             "info"          dict          (yfinance info)
             "institutional" pd.DataFrame  (institutional holders snapshot)
             "major"         pd.DataFrame  (major holders — FII/DII proxy)
             "insider_trans" pd.DataFrame  (insider transactions)
             "price_history" pd.DataFrame  (OHLCV — for price/vol metrics)

Output : dict with keys:
    "ticker"          str
    "info"            dict
    "raw"             dict        — original DataFrames passed through
    "metrics"         pd.DataFrame
    "full_metrics"    pd.DataFrame  — metrics + AdjustedStatus
    "sector_overlay"  dict
    "holding_signal"  str          — ACCUMULATING | DISTRIBUTING | STABLE | WATCH
    "hist_metrics"    pd.DataFrame — long-format history (Date, Metric, Value)

Metric row schema
-----------------
    Metric | Value | Status | Trend | Description | Category

Status — data-driven (percentile rank vs own history where available,
         rule-based for snapshot-only metrics):
    green | amber | red | gray

Sector overlay only adjusts amber rows — green / red never overridden.

Historical trends
-----------------
  Price-based  : volatility, 52W high/low distance tracked via price_history
  Holder-based : ownership %, concentration tracked from institutional snapshots
                 (quarter-over-quarter from the dates in institutional DataFrame)

Sector overlay
--------------
  Generic — works for any sector passed via top_sectors.
  Adjusts amber → green (ACCUMULATING) or amber → red (DISTRIBUTING).

Data fetching is the caller's responsibility (fetching/fetcher.py).
"""

import numpy as np
import pandas as pd

from .scoring import parse_pct, pct_status, sector_pressure
from app.logger import get_logger
from app.schema import validate_holders

log = get_logger(__name__)


# ── Low-level helpers ─────────────────────────────────────────────────────────

def _f(v) -> float | None:
    """Safe float — None on NaN/Inf."""
    if v is None:
        return None
    try:
        f = float(v)
        return None if (np.isnan(f) or np.isinf(f)) else round(f, 4)
    except Exception:
        return None


def _col_lower(df: pd.DataFrame, *candidates: str) -> str | None:
    """Return first matching column name (case-insensitive)."""
    lmap = {c.lower(): c for c in df.columns}
    for c in candidates:
        if c.lower() in lmap:
            return lmap[c.lower()]
    return None


# ── Historical metric builder ─────────────────────────────────────────────────

def _build_hist_metrics(
    inst: pd.DataFrame,
    ph: pd.DataFrame,
) -> pd.DataFrame:
    """
    Build a long-format historical metrics DataFrame.

    Price-based rows  : volatility, 52W high/low distance — daily from price_history
    Holder-based rows : institutional %, HHI — from dated snapshots in institutional df

    Returns pd.DataFrame with columns: Date | Metric | Value
    """
    rows: list[dict] = []

    # ── Price-based history ───────────────────────────────────────────────────
    if not ph.empty and "Close" in ph.columns:
        p = ph.copy()
        date_col = _col_lower(p, "Date", "date")
        if date_col:
            p[date_col] = pd.to_datetime(p[date_col])
            p = p.sort_values(date_col).set_index(date_col)
        else:
            p.index = pd.to_datetime(p.index)
            p = p.sort_index()

        close = p["Close"].astype(float)

        # Rolling 30-day annualised volatility
        vol = close.pct_change().rolling(30).std() * np.sqrt(252) * 100
        for dt, v in vol.dropna().items():
            rows.append({"Date": str(dt.date()), "Metric": "Annualised Volatility %",
                         "Value": round(float(v), 4)})

        # 52W high/low distance — rolling 252-day window
        if len(close) >= 50:
            roll_max = close.rolling(252, min_periods=50).max()
            roll_min = close.rolling(252, min_periods=50).min()
            dist_high = ((close - roll_max) / roll_max * 100).dropna()
            dist_low  = ((close - roll_min) / roll_min * 100).dropna()
            for dt, v in dist_high.items():
                rows.append({"Date": str(dt.date()), "Metric": "52W High Distance %",
                             "Value": round(float(v), 4)})
            for dt, v in dist_low.items():
                rows.append({"Date": str(dt.date()), "Metric": "52W Low Distance %",
                             "Value": round(float(v), 4)})

    # ── Holder-based history ──────────────────────────────────────────────────
    # yfinance institutional DataFrame has a 'Date Reported' column per holder.
    # We group by report date to get quarterly ownership snapshots.
    if not inst.empty:
        date_col = _col_lower(inst, "Date Reported", "date reported", "date")
        pct_col  = _col_lower(inst, "% Out", "% out", "pct out")

        if date_col and pct_col:
            snap = inst[[date_col, pct_col]].copy()
            snap[date_col] = pd.to_datetime(snap[date_col], errors="coerce")
            snap[pct_col]  = snap[pct_col].apply(parse_pct)
            snap = snap.dropna()

            for dt, grp in snap.groupby(date_col):
                w = grp[pct_col] / 100
                # Total institutional % at that date
                total_inst = float(w.sum() * 100)
                rows.append({"Date": str(dt.date()),
                             "Metric": "Institutional Ownership %",
                             "Value": round(total_inst, 4)})
                # HHI at that date
                hhi = float((w ** 2).sum())
                rows.append({"Date": str(dt.date()),
                             "Metric": "Holder Concentration (HHI)",
                             "Value": round(hhi, 6)})

    return pd.DataFrame(rows) if rows else pd.DataFrame(
        columns=["Date", "Metric", "Value"])


# ── Metrics engine ────────────────────────────────────────────────────────────

def compute_holding_metrics(
    holder_data: dict,
    lookback_days: int = 90,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Compute all holding metrics.

    Returns
    -------
    metrics_df   : pd.DataFrame  — one row per metric (snapshot)
    hist_df      : pd.DataFrame  — long-format history (Date, Metric, Value)
    """
    inst  = holder_data.get("institutional", pd.DataFrame())
    ins_t = holder_data.get("insider_trans",  pd.DataFrame())
    info  = holder_data.get("info",           {})
    ph    = holder_data.get("price_history",  pd.DataFrame())
    major = holder_data.get("major",          pd.DataFrame())

    rows: list[dict] = []

    def _add(
        name: str, val,
        status: str = "gray", trend: str = "neutral",
        desc: str = "", cat: str = "Ownership",
        hist: pd.Series | None = None,
    ) -> None:
        """
        Register a metric row.
        If hist is provided, status is derived from percentile rank (data-driven).
        Otherwise status is rule-based (passed in directly).
        """
        fval = _f(val)
        if hist is not None and fval is not None:
            status = pct_status(fval, hist)
        rows.append({
            "Metric":      name,
            "Value":       fval,
            "Status":      status if fval is not None else "gray",
            "Trend":       trend,
            "Description": desc,
            "Category":    cat,
        })

    # ── 1. Ownership snapshot ─────────────────────────────────────────────────
    ip  = parse_pct(info.get("heldPercentInstitutions", np.nan))
    iip = parse_pct(info.get("heldPercentInsiders",     np.nan))

    # Build institutional history series for percentile ranking
    inst_hist = pd.Series(dtype=float)
    if not inst.empty:
        pct_col  = _col_lower(inst, "% Out", "% out")
        date_col = _col_lower(inst, "Date Reported", "date reported", "date")
        if pct_col and date_col:
            snap = inst[[date_col, pct_col]].copy()
            snap[date_col] = pd.to_datetime(snap[date_col], errors="coerce")
            snap[pct_col]  = snap[pct_col].apply(parse_pct)
            snap = snap.dropna()
            inst_hist = snap.groupby(date_col)[pct_col].sum().sort_index()

    _add("Institutional Ownership %", ip,
         status="green" if not pd.isna(ip) and ip >= 50
                else "amber" if not pd.isna(ip) and ip >= 25 else "red",
         desc="% held by institutions",
         hist=inst_hist if not inst_hist.empty else None)

    _add("Insider Ownership %", iip,
         status="green" if not pd.isna(iip) and iip >= 50
                else "amber" if not pd.isna(iip) and iip >= 20 else "red",
         desc="% held by insiders / promoters")

    # Promoter holding — same value as insider, explicit label for Indian context
    _add("Promoter Holding %", iip,
         status="green" if not pd.isna(iip) and iip >= 35
                else "amber" if not pd.isna(iip) and iip >= 20 else "red",
         desc="% held by promoters (Indian context)")

    # Public float
    float_pct: float | None = None
    if not pd.isna(ip) and not pd.isna(iip):
        float_pct = max(0.0, 100.0 - ip - iip)
        _add("Public Float %", float_pct,
             status="green" if float_pct >= 50 else "amber" if float_pct >= 25 else "red",
             desc="% shares available for public trading")

    # ── 2. FII / DII split from major holders ────────────────────────────────
    fii_pct: float | None = None
    dii_pct: float | None = None

    if not major.empty:
        mc = major.copy()
        mc.columns = mc.columns.str.lower()
        pct_c    = _col_lower(mc, "% out", "pct out")
        holder_c = _col_lower(mc, "holder", "name")

        if pct_c and holder_c:
            mc["_pct"] = mc[pct_c].apply(parse_pct)
            _dii_kw = ("mutual", "fund", "insurance", "lic", "sbi", "hdfc",
                       "icici", "axis", "kotak", "nippon", "uti", "birla",
                       "aditya", "reliance", "tata")
            dii_mask = mc[holder_c].str.lower().str.contains(
                "|".join(_dii_kw), na=False, regex=True)
            dii_pct = _f(mc.loc[dii_mask,  "_pct"].sum()) if dii_mask.any()  else None
            fii_pct = _f(mc.loc[~dii_mask, "_pct"].sum()) if (~dii_mask).any() else None

    if fii_pct is not None:
        _add("FII Holding %", fii_pct,
             status="green" if fii_pct >= 20 else "amber" if fii_pct >= 5 else "gray",
             desc="% held by Foreign Institutional Investors")

    if dii_pct is not None:
        _add("DII Holding %", dii_pct,
             status="green" if dii_pct >= 15 else "amber" if dii_pct >= 5 else "gray",
             desc="% held by Domestic Institutional Investors")

    # ── 3. Concentration ──────────────────────────────────────────────────────
    if not inst.empty:
        pct_col = _col_lower(inst, "% Out", "% out")
        if pct_col:
            w = inst[pct_col].apply(parse_pct).dropna() / 100

            hhi = _f((w ** 2).sum())
            if hhi is not None:
                _add("Holder Concentration (HHI)", hhi,
                     status="red" if hhi > 0.25 else "amber" if hhi > 0.15 else "green",
                     desc="HHI of top institutional holders (0=diversified, 1=monopoly)",
                     cat="Concentration")

            top10 = _f(w.nlargest(10).sum() * 100)
            if top10 is not None:
                _add("Top 10 Holders %", top10,
                     status="red" if top10 >= 70 else "amber" if top10 >= 50 else "green",
                     desc="% held by top 10 institutional holders",
                     cat="Concentration")

    # ── 4. Insider activity ───────────────────────────────────────────────────
    if not ins_t.empty:
        td = ins_t.copy()
        td.columns = td.columns.str.lower()
        date_c = _col_lower(td, "start date", "date")
        txn_c  = _col_lower(td, "transaction", "type")

        if date_c and txn_c:
            td[date_c] = pd.to_datetime(td[date_c], errors="coerce")
            td = td[td[date_c] >= pd.Timestamp.now() - pd.Timedelta(days=lookback_days)]
            if not td.empty:
                tl    = td[txn_c].str.lower()
                buys  = tl.str.contains("buy",  na=False).sum()
                sells = tl.str.contains("sell", na=False).sum()
                total = buys + sells
                if total > 0:
                    nb = (buys - sells) / total * 100
                    _add(f"Insider Net Buy % ({lookback_days}d)", nb,
                         status="green" if nb > 10 else "red" if nb < -10 else "amber",
                         trend="up" if nb > 0 else "down",
                         desc=f"Net insider buy ratio over last {lookback_days} days",
                         cat="Activity")

    # ── 5. Price / Risk metrics ───────────────────────────────────────────────
    if not ph.empty and "Close" in ph.columns:
        p = ph.copy()
        date_col = _col_lower(p, "Date", "date")
        if date_col:
            p[date_col] = pd.to_datetime(p[date_col])
            p = p.sort_values(date_col)
        close = p["Close"].astype(float)

        # Volatility — lower is better, so invert percentile status
        rv    = close.pct_change().rolling(30).std() * np.sqrt(252) * 100
        rv    = rv.dropna()
        cv    = _f(rv.iloc[-1]) if not rv.empty else None
        _inv  = {"green": "red", "red": "green", "amber": "amber", "gray": "gray"}
        if cv is not None:
            raw_st = pct_status(cv, rv)
            _add("Annualised Volatility %", cv,
                 status=_inv.get(raw_st, "gray"),
                 desc="30-day realised volatility, annualised", cat="Risk")

        # 52W high / low distances
        if len(close) >= 50:
            recent   = close.tail(252)
            high52   = float(recent.max())
            low52    = float(recent.min())
            cur      = float(close.iloc[-1])

            dist_high = _f((cur - high52) / high52 * 100) if high52 > 0 else None
            dist_low  = _f((cur - low52)  / low52  * 100) if low52  > 0 else None

            if dist_high is not None:
                _add("52W High Distance %", dist_high,
                     status="green" if dist_high > -10
                            else "amber" if dist_high > -30 else "red",
                     desc="% distance of current price from 52-week high", cat="Price")

            if dist_low is not None:
                _add("52W Low Distance %", dist_low,
                     status="green" if dist_low > 30
                            else "amber" if dist_low > 10 else "red",
                     desc="% above 52-week low", cat="Price")

    # ── 6. Size ───────────────────────────────────────────────────────────────
    mc = info.get("marketCap", np.nan)
    if mc and not pd.isna(mc):
        _add("Market Cap (Cr)", _f(mc / 1e7),
             desc="Market capitalisation in INR crores", cat="Size")

    shares = info.get("sharesOutstanding", np.nan)
    if shares and not pd.isna(shares):
        _add("Shares Outstanding (Cr)", _f(shares / 1e7),
             desc="Total shares outstanding in crores", cat="Size")

    short_pct = info.get("shortPercentOfFloat", np.nan)
    if short_pct and not pd.isna(short_pct):
        sp = _f(parse_pct(short_pct))
        _add("Short Interest % of Float", sp,
             status="red" if sp and sp > 10 else "amber" if sp and sp > 5 else "green",
             desc="Shares shorted as % of float", cat="Risk")

    # ── Historical metrics ────────────────────────────────────────────────────
    hist_df = _build_hist_metrics(inst, ph)

    snap = pd.DataFrame(rows)
    return snap, hist_df


# ── Holding signal ────────────────────────────────────────────────────────────

def _derive_holding_signal(metrics: pd.DataFrame) -> str:
    """
    Derive a holding signal from metric statuses.

    ACCUMULATING — majority of ownership + activity metrics are green
    DISTRIBUTING — majority are red
    WATCH        — mixed signals (some red in key metrics)
    STABLE       — neutral / insufficient data
    """
    if metrics.empty:
        return "STABLE"

    own_cats = metrics[metrics["Category"].isin(["Ownership", "Activity", "Concentration"])]
    if own_cats.empty:
        return "STABLE"

    green = (own_cats["Status"] == "green").sum()
    red   = (own_cats["Status"] == "red").sum()
    total = len(own_cats)

    if total == 0:
        return "STABLE"
    if green / total >= 0.6:
        return "ACCUMULATING"
    if red / total >= 0.4:
        return "DISTRIBUTING"
    if red > 0:
        return "WATCH"
    return "STABLE"


# ── Sector overlay ────────────────────────────────────────────────────────────

def apply_sector_overlay(
    metrics_df: pd.DataFrame,
    sector_health_results: dict,
    top_sectors: list[str],
    window: int = 20,
) -> tuple[pd.DataFrame, dict]:
    """
    Adjust amber-status metrics based on sector pressure.
    Generic — works for any sector list passed in.
    Green / red metrics are never overridden.
    """
    p, pct, q75, q25, named = sector_pressure(sector_health_results, top_sectors, window)

    out = metrics_df.copy()

    if pd.isna(p):
        out["AdjustedStatus"] = out["Status"]
        return out, {
            "signal":    "STABLE",
            "pressure":  np.nan,
            "pct_rank":  np.nan,
            "narrative": "Insufficient sector data.",
        }

    if p >= q75:
        signal    = "ACCUMULATING"
        narrative = (f"Sectors ({named}) top quartile "
                     f"(score={p:.1f}, pct={pct:.0f}%). Accumulation signal.")
    elif p <= q25:
        signal    = "DISTRIBUTING"
        narrative = (f"Sectors ({named}) bottom quartile "
                     f"(score={p:.1f}, pct={pct:.0f}%). Distribution signal.")
    else:
        signal    = "STABLE"
        narrative = (f"Sectors ({named}) mid-range "
                     f"(score={p:.1f}, pct={pct:.0f}%). Neutral.")

    out["AdjustedStatus"] = out["Status"].apply(
        lambda s:
            "green" if (signal == "ACCUMULATING" and s == "amber") else
            "red"   if (signal == "DISTRIBUTING" and s == "amber") else s
    )

    return out, {
        "signal":    signal,
        "pressure":  round(p, 2),
        "pct_rank":  round(pct, 1),
        "narrative": narrative,
    }


# ── Full pipeline ─────────────────────────────────────────────────────────────

def run_stock_holding(
    holder_data: dict,
    sector_health_results: dict | None = None,
    top_sectors: list[str] | None = None,
    sector_window: int = 20,
    lookback_days: int = 90,
) -> dict:
    """
    Run full shareholding pattern analysis for any company.

    Parameters
    ----------
    holder_data           : dict with keys ticker, info, institutional,
                            major, insider_trans, price_history
    sector_health_results : optional { name: ohlcv_health result }
    top_sectors           : optional list of sector names for overlay
    sector_window         : trailing window for sector pressure (default 20)
    lookback_days         : insider activity lookback window (default 90)

    Returns
    -------
    {
        "ticker"         : str,
        "info"           : dict,
        "raw"            : dict,
        "metrics"        : pd.DataFrame,
        "full_metrics"   : pd.DataFrame,
        "hist_metrics"   : pd.DataFrame,
        "sector_overlay" : dict,
        "holding_signal" : str,
    }
    """
    ticker = holder_data.get("ticker", "")

    # ── Validate ──────────────────────────────────────────────────────────────
    vr = validate_holders(holder_data, ticker)
    if not vr.ok:
        log.error("stock_holding.invalid_input", ticker=ticker, errors=vr.errors)
        empty = pd.DataFrame()
        return {
            "ticker":         ticker,
            "info":           {},
            "raw":            {"institutional": empty, "major": empty,
                               "insider_trans": empty},
            "metrics":        empty,
            "full_metrics":   empty,
            "hist_metrics":   empty,
            "sector_overlay": {"signal": "STABLE", "pressure": float("nan"),
                               "pct_rank": float("nan"),
                               "narrative": "Invalid input data."},
            "holding_signal": "STABLE",
        }

    for w in vr.warnings:
        log.warning("stock_holding.input_warning", ticker=ticker, warning=w)

    # ── Compute ───────────────────────────────────────────────────────────────
    metrics, hist_df = compute_holding_metrics(holder_data, lookback_days)
    log.info("stock_holding.metrics_computed", ticker=ticker,
             metric_count=len(metrics), hist_rows=len(hist_df))

    # ── Holding signal ────────────────────────────────────────────────────────
    holding_signal = _derive_holding_signal(metrics)

    # ── Sector overlay ────────────────────────────────────────────────────────
    overlay_info: dict = {
        "signal":    holding_signal,
        "pressure":  float("nan"),
        "pct_rank":  float("nan"),
        "narrative": "No sector data provided.",
    }
    full_metrics = metrics.copy()
    full_metrics["AdjustedStatus"] = metrics["Status"]

    if sector_health_results and top_sectors:
        full_metrics, overlay_info = apply_sector_overlay(
            metrics, sector_health_results, top_sectors, sector_window)
        # Refine holding signal with sector overlay signal if stronger
        if overlay_info["signal"] in ("ACCUMULATING", "DISTRIBUTING"):
            holding_signal = overlay_info["signal"]

    log.info("stock_holding.signal", ticker=ticker, signal=holding_signal,
             sector_overlay=overlay_info.get("signal"))

    return {
        "ticker":         ticker,
        "info":           holder_data.get("info", {}),
        "raw": {
            "institutional": holder_data.get("institutional", pd.DataFrame()),
            "major":         holder_data.get("major",         pd.DataFrame()),
            "insider_trans": holder_data.get("insider_trans", pd.DataFrame()),
        },
        "metrics":        metrics,
        "full_metrics":   full_metrics,
        "hist_metrics":   hist_df,
        "sector_overlay": overlay_info,
        "holding_signal": holding_signal,
    }