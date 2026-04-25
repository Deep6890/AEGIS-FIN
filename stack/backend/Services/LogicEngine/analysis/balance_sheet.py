"""
balance_sheet.py
----------------
Computes 20 financial health ratios from quarterly financials.

Input  : dict from yfinance (income, balance, cashflow, info) OR
         pass raw DataFrames directly via bs_data dict.
Output : dict with keys:
    "ticker"            str
    "info"              dict   (yfinance info)
    "ratios"            pd.DataFrame  — 20 ratios, current snapshot
    "historical_ratios" pd.DataFrame  — long-format (Date, Ratio, Value)
    "sector_overlay"    dict   — pressure, pct_rank, direction, narrative
    "full_ratios"       pd.DataFrame  — ratios + AdjustedStatus column

Each ratio row: Ratio | Value | YoY_pct | HistPctRank | Status | Trend | Description | Category

Status is data-driven: percentile rank of current value vs company's own history.
    green  >= 75th pct  |  red <= 25th pct  |  amber middle  |  gray insufficient

Sector overlay: only adjusts amber — confirmed green/red are never overridden.

Usage
-----
    from balance_sheet import run_balance_sheet

    result = run_balance_sheet(ticker="TCS.NS", sector_health_results=results, top_sectors=["IT Sector"])
"""

import numpy as np
import pandas as pd

from .scoring import safe_div, pct_status, sector_pressure
from LogicEngine.logger import get_logger
from LogicEngine.schema import validate_financials

log = get_logger(__name__)

# Data is passed in — fetching is done exclusively by fetching/fetcher.py

# ── Ratio helpers ─────────────────────────────────────────────────────────────

def _col(df, col):
    if df.empty or col not in df.columns: return pd.Series(dtype=float)
    return pd.to_numeric(df[col], errors="coerce").dropna()

def _latest(s):  return float(s.iloc[0]) if not s.empty else np.nan
def _py(s):
    clean = s.dropna()
    return float(clean.iloc[4]) if len(clean) >= 5 else np.nan
def _yoy(c, p):  return np.nan if (pd.isna(c) or pd.isna(p) or p == 0) else (c - p) / abs(p) * 100

def _yoy_hist(s):
    s = s.dropna()
    if len(s) < 5: return pd.Series(dtype=float)
    return pd.Series([v for v in [_yoy(float(s.iloc[i]), float(s.iloc[i+4])) for i in range(len(s)-4)] if not pd.isna(v)], dtype=float)

def _ratio_hist(nc, dc, sn, sd, scale=1.0):
    n, d = _col(sn, nc), _col(sd, dc)
    shared = sorted(set(n.index) & set(d.index), reverse=True)
    vals, dates = [], []
    for dt in shared:
        v = safe_div(float(n[dt]), float(d[dt]))
        if not pd.isna(v): vals.append(v * scale); dates.append(dt)
    return pd.Series(vals, index=dates, dtype=float) if vals else pd.Series(dtype=float)


# ── Ratio engine ──────────────────────────────────────────────────────────────

def compute_ratios(bs_data):
    inc = bs_data.get("income",   pd.DataFrame())
    bal = bs_data.get("balance",  pd.DataFrame())
    cf  = bs_data.get("cashflow", pd.DataFrame())

    def _get(col, src):
        s = _col(src, col); return _latest(s), _py(s), s

    rev_c, rev_p, rev_s = _get("Total Revenue",             inc)
    ni_c,  ni_p,  ni_s  = _get("Net Income",                inc)
    eb_c,  eb_p,  _     = _get("EBIT",                      inc)
    gr_c,  gr_p,  _     = _get("Gross Profit",              inc)
    ebd_c, _,     _     = _get("EBITDA",                    inc)
    ie_c,  _,     _     = _get("Interest Expense",          inc)
    ta_c,  ta_p,  _     = _get("Total Assets",              bal)
    eq_c,  eq_p,  eq_s  = _get("Stockholders Equity",       bal)
    cl_c,  _,     _     = _get("Current Liabilities",       bal)
    ca_c,  _,     _     = _get("Current Assets",            bal)
    cs_c,  _,     _     = _get("Cash And Cash Equivalents", bal)
    inv_c, _,     _     = _get("Inventory",                 bal)
    rec_c, _,     _     = _get("Receivables",               bal)
    ltd_c, _,     _     = _get("Long Term Debt",            bal)
    std_c, _,     _     = _get("Current Debt",              bal)
    cfo_c, cfo_p, _     = _get("Operating Cash Flow",       cf)
    cpx_c, _,     _     = _get("Capital Expenditure",       cf)

    ie_c  = abs(ie_c)  if not pd.isna(ie_c)  else np.nan
    cpx_c = abs(cpx_c) if not pd.isna(cpx_c) else np.nan
    debt  = (ltd_c or 0) + (std_c or 0)
    fcf   = (cfo_c - cpx_c) if not (pd.isna(cfo_c) or pd.isna(cpx_c)) else np.nan

    # EBITDA fallback when yfinance returns implausible value
    if not pd.isna(ebd_c) and not pd.isna(rev_c) and rev_c > 0 and abs(safe_div(ebd_c, rev_c)) < 0.01:
        for da in ("Depreciation And Amortization", "Reconciled Depreciation"):
            da_s = _col(cf, da)
            if not da_s.empty and not pd.isna(eb_c):
                ebd_c = eb_c + abs(float(da_s.iloc[0])); break

    ratios, hist_rows = [], []

    def add(name, val, yc, yp, hs, desc, cat):
        h   = hs.dropna()
        pct = float(np.mean(h < val) * 100) if (not pd.isna(val) and len(h) >= 4) else np.nan
        yoy = _yoy(yc, yp)
        ratios.append({
            "Ratio":       name,
            "Value":       round(val, 4) if not pd.isna(val) else None,
            "YoY_pct":     round(yoy, 2) if not pd.isna(yoy) else None,
            "HistPctRank": round(pct, 1) if not pd.isna(pct) else None,
            "Status":      pct_status(val, hs),
            "Trend":       "up" if (not pd.isna(yoy) and yoy > 0) else "down",
            "Description": desc,
            "Category":    cat,
        })
        for dt, v in h.items():
            if hasattr(dt, "strftime") and not pd.isnull(dt):
                hist_rows.append({"Date": dt.strftime("%Y-%m-%d"), "Ratio": name, "Value": round(v, 4)})

    # Profitability
    add("Gross Margin %",       safe_div(gr_c, rev_c)*100,  gr_c,  gr_p,  _ratio_hist("Gross Profit","Total Revenue",inc,inc,100),            "Gross profit / revenue",           "Profitability")
    add("Net Profit Margin %",  safe_div(ni_c, rev_c)*100,  ni_c,  ni_p,  _ratio_hist("Net Income","Total Revenue",inc,inc,100),               "Net income / revenue",             "Profitability")
    add("EBITDA Margin %",      safe_div(ebd_c,rev_c)*100,  ebd_c, rev_c, _ratio_hist("EBITDA","Total Revenue",inc,inc,100),                   "EBITDA / revenue",                 "Profitability")
    add("ROE %",                safe_div(ni_c, eq_c)*100,   ni_c,  ni_p,  _ratio_hist("Net Income","Stockholders Equity",inc,bal,100),          "Net income / equity",              "Profitability")
    add("ROA %",                safe_div(ni_c, ta_c)*100,   ni_c,  ni_p,  _ratio_hist("Net Income","Total Assets",inc,bal,100),                 "Net income / assets",              "Profitability")
    # Liquidity
    add("Current Ratio",        safe_div(ca_c, cl_c),       ca_c,  np.nan,_ratio_hist("Current Assets","Current Liabilities",bal,bal),          "Current assets / CL",              "Liquidity")
    add("Quick Ratio",          safe_div(ca_c-(inv_c or 0),cl_c), ca_c, np.nan, _ratio_hist("Current Assets","Current Liabilities",bal,bal),    "(Current assets-inventory) / CL",  "Liquidity")
    add("Cash Ratio",           safe_div(cs_c, cl_c),       cs_c,  np.nan,_ratio_hist("Cash And Cash Equivalents","Current Liabilities",bal,bal),"Cash / CL",                       "Liquidity")
    # Leverage
    ltd_s, std_s = _col(bal, "Long Term Debt"), _col(bal, "Current Debt")
    de_v, de_d = [], []
    for dt in sorted(set(ltd_s.index) & set(eq_s.index), reverse=True):
        v = safe_div((float(ltd_s[dt]) if dt in ltd_s.index else 0) + (float(std_s[dt]) if dt in std_s.index else 0), float(eq_s[dt]))
        if not pd.isna(v): de_v.append(v); de_d.append(dt)
    add("Debt/Equity",          safe_div(debt, eq_c),       debt,  np.nan,pd.Series(de_v, index=de_d, dtype=float),                            "Total debt / equity",              "Leverage")
    add("Debt/Assets",          safe_div(debt, ta_c),       debt,  np.nan,_ratio_hist("Long Term Debt","Total Assets",bal,bal),                 "Total debt / assets",              "Leverage")
    add("Interest Coverage",    safe_div(eb_c, ie_c),       eb_c,  eb_p,  _ratio_hist("EBIT","Interest Expense",inc,inc),                      "EBIT / interest expense",          "Leverage")
    # Efficiency
    add("Asset Turnover",       safe_div(rev_c, ta_c),      rev_c, rev_p, _ratio_hist("Total Revenue","Total Assets",inc,bal),                  "Revenue / assets",                 "Efficiency")
    add("Inventory Turnover",   safe_div(rev_c, inv_c),     rev_c, rev_p, _ratio_hist("Total Revenue","Inventory",inc,bal),                     "Revenue / inventory",              "Efficiency")
    add("Receivables Turnover", safe_div(rev_c, rec_c),     rev_c, rev_p, _ratio_hist("Total Revenue","Receivables",inc,bal),                   "Revenue / receivables",            "Efficiency")
    # Cash Flow
    add("CFO/Net Income",       safe_div(cfo_c, ni_c),      cfo_c, cfo_p, _ratio_hist("Operating Cash Flow","Net Income",cf,inc),               "Operating CF / net income",        "Cash Flow")
    add("FCF Margin %",         safe_div(fcf, rev_c)*100,   fcf,   cfo_p, _ratio_hist("Operating Cash Flow","Total Revenue",cf,inc,100),        "Free CF / revenue",                "Cash Flow")
    # Growth
    add("Revenue Growth %",     _yoy(rev_c, rev_p),         rev_c, rev_p, _yoy_hist(rev_s),                                                    "YoY revenue growth",               "Growth")
    add("Net Income Growth %",  _yoy(ni_c,  ni_p),          ni_c,  ni_p,  _yoy_hist(ni_s),                                                     "YoY net income growth",            "Growth")
    # Capital Structure
    add("Equity Ratio %",       safe_div(eq_c, ta_c)*100,   eq_c,  eq_p,  _ratio_hist("Stockholders Equity","Total Assets",bal,bal,100),        "Equity / assets",                  "Capital Structure")
    add("Equity Growth %",      _yoy(eq_c, eq_p),           eq_c,  eq_p,  _yoy_hist(eq_s),                                                     "YoY equity growth",                "Capital Structure")

    snap = pd.DataFrame(ratios)
    snap["ValueStr"] = snap["Value"].apply(lambda v: f"{v:,.2f}" if (v is not None and not pd.isna(v)) else "N/A")
    return snap, pd.DataFrame(hist_rows)


# ── Sector overlay ────────────────────────────────────────────────────────────

def apply_sector_overlay(ratios_df, sector_health_results, top_sectors, window=20):
    """
    sector_health_results : dict { name: run_ohlcv_health() result }
    top_sectors           : list of sector names to use
    """
    p, pct, q75, q25, named = sector_pressure(sector_health_results, top_sectors, window)
    out = ratios_df.copy()
    if pd.isna(p):
        out["AdjustedStatus"]  = out["Status"]
        out["SectorPressure"]  = np.nan
        out["SectorNarrative"] = "Insufficient sector data."
        return out, {"direction": "NEUTRAL", "pressure": np.nan, "pct_rank": np.nan, "narrative": "Insufficient sector data."}

    if p >= q75:   direction, narr = "TAILWIND", f"Sectors ({named}) top quartile (score={p:.1f}, pct={pct:.0f}%). Tailwind."
    elif p <= q25: direction, narr = "HEADWIND", f"Sectors ({named}) bottom quartile (score={p:.1f}, pct={pct:.0f}%). Headwind."
    else:          direction, narr = "NEUTRAL",  f"Sectors ({named}) mid-range (score={p:.1f}, pct={pct:.0f}%). Neutral."

    out["AdjustedStatus"]  = out["Status"].apply(
        lambda s: "green" if direction == "TAILWIND" and s == "amber"
             else ("red" if direction == "HEADWIND" and s == "amber" else s))
    out["SectorPressure"]  = round(p, 2)
    out["SectorNarrative"] = narr
    overlay = {"direction": direction, "pressure": round(p, 2), "pct_rank": round(pct, 1), "narrative": narr}
    return out, overlay


# ── Full pipeline ─────────────────────────────────────────────────────────────

def run_balance_sheet(financials_data, sector_health_results=None, top_sectors=None, sector_window=20):
    # Validate input schema before processing
    vr = validate_financials(financials_data, financials_data.get("ticker", ""))
    if not vr.ok:
        log.error("balance_sheet.invalid_input", ticker=financials_data.get("ticker"),
                  errors=vr.errors)
        return {
            "ticker": financials_data.get("ticker", ""),
            "info": {}, "ratios": pd.DataFrame(), "historical_ratios": pd.DataFrame(),
            "full_ratios": pd.DataFrame(),
            "sector_overlay": {"direction": "NEUTRAL", "pressure": float("nan"),
                               "pct_rank": float("nan"), "narrative": "Invalid input data."},
        }
    for w in vr.warnings:
        log.warning("balance_sheet.input_warning", ticker=financials_data.get("ticker"), warning=w)

    ratios, hist = compute_ratios(financials_data)
    log.info("balance_sheet.ratios_computed", ticker=financials_data.get("ticker"),
             ratio_count=len(ratios))

    overlay_info = {"direction": "NEUTRAL", "pressure": float("nan"),
                    "pct_rank": float("nan"), "narrative": "No sector data provided."}
    full_ratios  = ratios.copy()
    full_ratios["AdjustedStatus"] = ratios["Status"]

    if sector_health_results and top_sectors:
        full_ratios, overlay_info = apply_sector_overlay(
            ratios, sector_health_results, top_sectors, sector_window)

    return {
        "ticker":            financials_data.get("ticker", ""),
        "info":              financials_data.get("info", {}),
        "ratios":            ratios,
        "historical_ratios": hist,
        "full_ratios":       full_ratios,
        "sector_overlay":    overlay_info,
    }
