"""
balance_sheet_analyzer.py
--------------------------
Fetches the current balance sheet for a company (via yfinance), computes key
financial health ratios, and overlays sector health signals — FULLY DATA-DRIVEN.

No hand-crafted thresholds, no fixed benchmarks.

Ratio status strategy
---------------------
  Each ratio is scored relative to the COMPANY'S OWN HISTORICAL DISTRIBUTION
  across the available quarterly periods (audit_window):
    • percentile >= 75th of own history  → "green"
    • percentile <= 25th of own history  → "red"
    • otherwise                          → "amber"
  This way "good" is what is HISTORICALLY good FOR THIS COMPANY, not a
  universal fixed number that ignores company size, sector, and business model.

Sector overlay strategy
-----------------------
  Uses the ROLLING PERCENTILE RANK of each top-sector's health_score within
  its own history as the sector pressure signal.  The decision boundary is the
  median of those percentile ranks:
    • median_rank > 75th percentile (of all sector ranks) → tailwind
    • median_rank < 25th percentile                       → headwind
  All boundaries are derived from the cross-section of sector scores on the day.

Public API
----------
  fetch_balance_sheet(ticker, audit_window)
  compute_financial_ratios(bs_data)
  sector_overlay(ratios_df, health_dfs, top_sectors, window)
  run_balance_sheet_analysis(ticker, health_dfs, top_sectors, audit_window)
"""

import warnings
import numpy as np
import pandas as pd
import yfinance as yf
from typing import Dict, List, Optional

warnings.filterwarnings("ignore")


# ─────────────────────────────────────────────────────────────────────────────
# Layer 1 — Raw fetch
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

def fetch_balance_sheet(ticker: str, audit_window: int = 20) -> dict:
    """
    Fetch quarterly financial statements from Yahoo Finance.

    Parameters
    ----------
    ticker       : Yahoo Finance ticker, e.g. 'TCS.NS'
    audit_window : Trailing quarterly periods to retain.

    Returns
    -------
    { 'income', 'balance', 'cashflow': pd.DataFrame, 'info': dict, 'ticker': str }
    """
    t = yf.Ticker(ticker)

    def _tidy(raw) -> pd.DataFrame:
        if raw is None or raw.empty:
            return pd.DataFrame()
        df = raw.T.copy()
        df.index = pd.to_datetime(df.index)
        return df.sort_index(ascending=False).head(audit_window)

    def _safe(fn):
        res = retry_yf_fetch(fn)
        return res if res is not None else None

    income_raw = _safe(lambda: t.quarterly_financials)
    balance_raw = _safe(lambda: t.quarterly_balance_sheet)
    cashflow_raw = _safe(lambda: t.quarterly_cashflow)

    income   = _tidy(income_raw)
    balance  = _tidy(balance_raw)
    cashflow = _tidy(cashflow_raw)

    try:
        info_res = retry_yf_fetch(lambda: t.info)
        info = info_res if info_res is not None else {}
    except Exception:
        info = {}

    return {
        "income": income, "balance": balance,
        "cashflow": cashflow, "info": info, "ticker": ticker,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Layer 2 — Financial ratio engine (data-driven status)
# ─────────────────────────────────────────────────────────────────────────────

def _safe_div(a, b):
    try:
        if b == 0 or pd.isna(b) or pd.isna(a):
            return np.nan
        return a / b
    except Exception:
        return np.nan


def _col_series(df: pd.DataFrame, col: str) -> pd.Series:
    """Return the full numeric series for col, sorted newest-first."""
    if df.empty or col not in df.columns:
        return pd.Series(dtype=float)
    return pd.to_numeric(df[col], errors="coerce").dropna()


def _latest(series: pd.Series):
    return float(series.iloc[0]) if not series.empty else np.nan


def _prior(series: pd.Series):
    return float(series.iloc[1]) if len(series) > 1 else np.nan


def _yoy(cur, prev):
    if pd.isna(cur) or pd.isna(prev) or prev == 0:
        return np.nan
    return (cur - prev) / abs(prev) * 100

def _yoy_hist(series: pd.Series) -> pd.Series:
    """Year-over-Year growth history using exact same-quarter-prior-year (shift 4)."""
    s = series.dropna()
    if len(s) < 5:
        return pd.Series(dtype=float)
    yoy_vals = []
    for i in range(len(s) - 4):
        yoy_vals.append(_yoy(float(s.iloc[i]), float(s.iloc[i + 4])))
    return pd.Series([v for v in yoy_vals if not pd.isna(v)], dtype=float)


def _percentile_status(current_val: float, historical_series: pd.Series) -> str:
    """
    Status based entirely on where the current value sits within the historical
    distribution of that same ratio for this company.

    green  = top quartile (>= 75th pct of own history)
    red    = bottom quartile (<= 25th pct of own history)
    amber  = middle two quartiles
    gray   = insufficient history (< 4 observations)
    """
    history = historical_series.dropna()
    if pd.isna(current_val) or len(history) < 4:
        return "gray"
    pct_rank = float(np.mean(history <= current_val) * 100)
    if pct_rank >= 75:
        return "green"
    if pct_rank <= 25:
        return "red"
    return "amber"


def compute_financial_ratios(bs_data: dict) -> pd.DataFrame:
    """
    Compute 20 financial health ratios.

    Status for each ratio is determined by comparing the CURRENT quarter
    value against the company's OWN historical distribution.
    No fixed thresholds — the data decides what is good for this company.

    Returns
    -------
    tuple:
      pd.DataFrame: Current snapshot of ratios
      pd.DataFrame: Full historical time-series of all ratios (Date, Ratio, Value)
    """
    inc = bs_data.get("income",   pd.DataFrame())
    bal = bs_data.get("balance",  pd.DataFrame())
    cf  = bs_data.get("cashflow", pd.DataFrame())

    # ── Helper to build a ratio time-series across all available quarters ─────
    def _ratio_series(num_col, den_col, src_num, src_den, scale=1.0, inv=False):
        """Build the full historical Series of num/den aligned on the SAME quarter date."""
        n = _col_series(src_num, num_col)
        d = _col_series(src_den, den_col)
        # Align strictly on matching quarter-end dates so cross-statement ratios
        # (e.g. income vs balance) don't mix mismatched periods.
        shared = sorted(set(n.index) & set(d.index), reverse=True)
        vals, dates = [], []
        for dt in shared:
            v = _safe_div(float(n[dt]), float(d[dt]))
            if not pd.isna(v):
                vals.append(v * scale * (-1 if inv else 1))
                dates.append(dt)
        return pd.Series(vals, index=dates, dtype=float) if vals else pd.Series(dtype=float)

    # ── Shortcuts for latest vs 1 year ago ────────────────────────────────────
    def _get(col, src):
        s = _col_series(src, col)
        val_cur = _latest(s)
        val_py = float(s.iloc[4]) if len(s.dropna()) >= 5 else np.nan
        return val_cur, val_py, s

    rev_cur,  rev_p,  rev_s  = _get("Total Revenue",                         inc)

    ni_cur,   ni_p,   ni_s   = _get("Net Income",                             inc)
    ebit_cur, ebit_p, ebit_s = _get("EBIT",                                   inc)
    gross_c,  gross_p, gross_s= _get("Gross Profit",                          inc)
    # EBITDA: yfinance sometimes reports a single-quarter anomaly; use TTM fallback
    ebitda_c, _,      _       = _get("EBITDA",                                inc)
    # If EBITDA looks implausibly small vs revenue (< 1% margin), recompute from EBIT+DA
    if not pd.isna(ebitda_c) and not pd.isna(rev_cur) and rev_cur > 0:
        ebitda_margin = ebitda_c / rev_cur
        if abs(ebitda_margin) < 0.01:          # < 1% is a data artefact
            da_c = np.nan
            for da_col in ("Depreciation And Amortization", "Reconciled Depreciation"):
                _da_s = _col_series(cf, da_col)
                if not _da_s.empty:
                    da_c = abs(float(_da_s.iloc[0]))
                    break
            if not pd.isna(ebit_cur) and not pd.isna(da_c):
                ebitda_c = ebit_cur + da_c
    int_exp_c, _,     _       = _get("Interest Expense",                      inc)
    int_exp_c = abs(int_exp_c) if not pd.isna(int_exp_c) else np.nan

    ta_c,  ta_p,  ta_s   = _get("Total Assets",                              bal)
    eq_c,  eq_p,  eq_s   = _get("Stockholders Equity",                       bal)
    cl_c,  _,     _      = _get("Current Liabilities",                       bal)
    ca_c,  _,     _      = _get("Current Assets",                            bal)
    cash_c,_, _          = _get("Cash And Cash Equivalents",                 bal)
    inv_c, _, inv_s      = _get("Inventory",                                 bal)
    rec_c, _, _          = _get("Receivables",                               bal)
    ltd_c, _, _          = _get("Long Term Debt",                            bal)
    std_c, _, _          = _get("Current Debt",                              bal)
    total_debt = (ltd_c if not pd.isna(ltd_c) else 0) + (std_c if not pd.isna(std_c) else 0)

    cfo_c, cfo_p, cfo_s  = _get("Operating Cash Flow",                       cf)
    capex_c, _, _        = _get("Capital Expenditure",                       cf)
    capex_c = abs(capex_c) if not pd.isna(capex_c) else np.nan
    fcf = (cfo_c - capex_c) if not (pd.isna(cfo_c) or pd.isna(capex_c)) else np.nan

    # ── Ratio builder ─────────────────────────────────────────────────────────
    ratios = []
    history_records = []

    def add(name, val, y_cur, y_prev, hist_series, desc, cat):
        yoy      = _yoy(y_cur, y_prev)  # Now y_prev corresponds to 1 yr ago
        hist_pct = float(np.mean(hist_series.dropna() <= val) * 100) \
                   if (not pd.isna(val) and len(hist_series.dropna()) >= 4) else np.nan
        status   = _percentile_status(val, hist_series)
        trend    = "up" if (not pd.isna(yoy) and yoy > 0) else "down"
        ratios.append({
            "Ratio":        name,
            "Value":        round(val, 4) if not pd.isna(val) else None,
            "YoY_pct":      round(yoy, 2) if not pd.isna(yoy) else None,
            "HistPctRank":  round(hist_pct, 1) if not pd.isna(hist_pct) else None,
            "Status":       status,
            "Trend":        trend,
            "Description":  desc,
            "Category":     cat,
        })
        
        # Accumulate the full historical time-series for ML/AI DB storage
        for dt, h_val in hist_series.dropna().items():
            # dt is a Timestamp when _ratio_series built the index from shared dates
            # Skip integer positional indices (no real date available)
            if not hasattr(dt, "strftime") or pd.isnull(dt):
                continue
            dt_str = dt.strftime("%Y-%m-%d")
            if "Growth" not in name:
                history_records.append({
                    "Date":  dt_str,
                    "Ratio": name,
                    "Value": round(h_val, 4)
                })

    # ── Profitability ─────────────────────────────────────────────────────────
    add("Gross Margin %",
        _safe_div(gross_c, rev_cur) * 100,
        gross_c, gross_p,
        _ratio_series("Gross Profit", "Total Revenue", inc, inc, 100),
        "Gross profit as % of revenue. Measures pricing power & production efficiency.",
        "Profitability")

    add("Net Profit Margin %",
        _safe_div(ni_cur, rev_cur) * 100,
        ni_cur, ni_p,
        _ratio_series("Net Income", "Total Revenue", inc, inc, 100),
        "Net income as % of revenue. Shows bottom-line profitability.",
        "Profitability")

    add("EBITDA Margin %",
        _safe_div(ebitda_c, rev_cur) * 100,
        ebitda_c, rev_cur,
        _ratio_series("EBITDA", "Total Revenue", inc, inc, 100),
        "Operating profitability before interest, tax, depreciation, amortisation.",
        "Profitability")

    add("ROE %",
        _safe_div(ni_cur, eq_c) * 100,
        ni_cur, ni_p,
        _ratio_series("Net Income", "Stockholders Equity", inc, bal, 100),
        "Return on Equity — how efficiently shareholders' capital generates profit.",
        "Profitability")

    add("ROA %",
        _safe_div(ni_cur, ta_c) * 100,
        ni_cur, ni_p,
        _ratio_series("Net Income", "Total Assets", inc, bal, 100),
        "Return on Assets — profit generated per rupee of assets.",
        "Profitability")

    # ── Liquidity ─────────────────────────────────────────────────────────────
    add("Current Ratio",
        _safe_div(ca_c, cl_c),
        ca_c, np.nan,
        _ratio_series("Current Assets", "Current Liabilities", bal, bal),
        "Current Assets / Current Liabilities. Short-term payment ability.",
        "Liquidity")

    add("Quick Ratio",
        _safe_div(ca_c - (inv_c if not pd.isna(inv_c) else 0), cl_c),
        ca_c, np.nan,
        _ratio_series("Current Assets", "Current Liabilities", bal, bal),
        "(Current Assets – Inventory) / Current Liabilities. Stricter liquidity test.",
        "Liquidity")

    add("Cash Ratio",
        _safe_div(cash_c, cl_c),
        cash_c, np.nan,
        _ratio_series("Cash And Cash Equivalents", "Current Liabilities", bal, bal),
        "Cash / Current Liabilities. Most conservative liquidity measure.",
        "Liquidity")

    # ── Leverage ──────────────────────────────────────────────────────────────
    debt_hist = pd.Series([
        ((_safe_div(float(ltd or 0), 1) or 0) + (_safe_div(float(std or 0), 1) or 0))
        for ltd, std in zip(
            _col_series(bal, "Long Term Debt"),
            _col_series(bal, "Current Debt")
        )
    ])
    eq_vals = eq_s.values[:len(debt_hist)]
    de_hist = pd.Series(
        [_safe_div(d, e) for d, e in zip(debt_hist.values, eq_vals)]
    ) if not eq_s.empty else pd.Series(dtype=float)
    add("Debt/Equity",
        _safe_div(total_debt, eq_c),
        total_debt, np.nan,
        de_hist,
        "Total Debt / Equity.  Higher = greater financial leverage.",
        "Leverage")

    add("Debt/Assets",
        _safe_div(total_debt, ta_c),
        total_debt, np.nan,
        _ratio_series("Long Term Debt", "Total Assets", bal, bal),
        "Fraction of total assets financed by debt.",
        "Leverage")

    add("Interest Coverage",
        _safe_div(ebit_cur, int_exp_c),
        ebit_cur, ebit_p,
        _ratio_series("EBIT", "Interest Expense", inc, inc),
        "EBIT / Interest Expense.  Higher = more cushion to service debt.",
        "Leverage")

    # ── Efficiency ────────────────────────────────────────────────────────────
    add("Asset Turnover",
        _safe_div(rev_cur, ta_c),
        rev_cur, rev_p,
        _ratio_series("Total Revenue", "Total Assets", inc, bal),
        "Revenue / Total Assets.  How efficiently assets generate sales.",
        "Efficiency")

    add("Inventory Turnover",
        _safe_div(rev_cur, inv_c),
        rev_cur, rev_p,
        _ratio_series("Total Revenue", "Inventory", inc, bal),
        "Revenue / Inventory.  Higher = faster inventory cycles.",
        "Efficiency")

    add("Receivables Turnover",
        _safe_div(rev_cur, rec_c),
        rev_cur, rev_p,
        _ratio_series("Total Revenue", "Receivables", inc, bal),
        "Revenue / Receivables.  Speed at which customers pay.",
        "Efficiency")

    # ── Cash Flow ─────────────────────────────────────────────────────────────
    add("CFO/Net Income",
        _safe_div(cfo_c, ni_cur),
        cfo_c, cfo_p,
        _ratio_series("Operating Cash Flow", "Net Income", cf, inc),
        "Operating Cash Flow / Net Income.  > 1 means earnings backed by real cash.",
        "Cash Flow")

    add("FCF Margin %",
        _safe_div(fcf, rev_cur) * 100,
        fcf, cfo_p,
        _ratio_series("Operating Cash Flow", "Total Revenue", cf, inc, 100),
        "Free Cash Flow as % of Revenue.  Fuels dividends, buybacks, growth.",
        "Cash Flow")

    # ── Growth (YoY is the value; compare vs own history of that growth rate) ─
    rev_growth = _yoy(rev_cur, rev_p)
    rev_growth_hist = _yoy_hist(rev_s)
    add("Revenue Growth %", rev_growth, rev_cur, rev_p, rev_growth_hist,
        "Y-o-Y quarterly revenue growth.", "Growth")

    ni_growth = _yoy(ni_cur, ni_p)
    ni_growth_hist = _yoy_hist(ni_s)
    add("Net Income Growth %", ni_growth, ni_cur, ni_p, ni_growth_hist,
        "Y-o-Y quarterly net income growth.", "Growth")

    # ── Capital Structure ─────────────────────────────────────────────────────
    add("Equity Ratio %",
        _safe_div(eq_c, ta_c) * 100,
        eq_c, eq_p,
        _ratio_series("Stockholders Equity", "Total Assets", bal, bal, 100),
        "Equity as % of total assets. Higher = more self-funded.", "Capital Structure")

    eq_growth = _yoy(eq_c, eq_p)
    eq_growth_hist = _yoy_hist(eq_s)
    add("Equity Growth %", eq_growth, eq_c, eq_p, eq_growth_hist,
        "Y-o-Y growth in shareholders' equity. Reflects retained earnings build-up.",
        "Capital Structure")

    df_out = pd.DataFrame(ratios)
    df_out["ValueStr"] = df_out["Value"].apply(
        lambda v: f"{v:,.2f}" if (v is not None and not pd.isna(v)) else "N/A"
    )
    
    df_hist = pd.DataFrame(history_records)
    return df_out, df_hist


# ─────────────────────────────────────────────────────────────────────────────
# Layer 3 — Sector overlay (data-driven boundaries)
# ─────────────────────────────────────────────────────────────────────────────

def sector_overlay(
    ratios_df:   pd.DataFrame,
    health_dfs:  Dict[str, pd.DataFrame],
    top_sectors: List[str],
    window:      int = 20,
) -> pd.DataFrame:
    """
    Adjust ratio Status using sector health signals.

    Boundary logic — entirely data-derived
    ---------------------------------------
    1. Collect the rolling `window`-day health_score for each top sector.
    2. Compute each sector's own PERCENTILE RANK within its full history.
       → values are already 0-100 from compute_sector_health().
    3. Sector pressure  = median of those recent percentile scores.
       → a pure cross-sectional median, no fixed centre point.
    4. Decision boundary = 75th and 25th percentile of ALL health scores
       ever seen across ALL top sectors (tail = their joint distribution).
       → tailwind if pressure > 75th pct of joint distribution
       → headwind if pressure < 25th pct of joint distribution

    Returns
    -------
    ratios_df with new columns:
        SectorPressure (float), SectorPressurePct (float),
        AdjustedStatus (str), SectorNarrative (str)
    """
    # ── Collect health_score history across all top sectors ──────────────────
    all_scores: List[float] = []
    recent_scores: List[float] = []

    for sec in top_sectors:
        if sec not in health_dfs:
            continue
        df = health_dfs[sec]
        if df.empty or "health_score" not in df.columns:
            continue
        hist = df["health_score"].dropna()
        all_scores.extend(hist.tolist())
        recent = hist.tail(window)
        if not recent.empty:
            recent_scores.append(float(recent.median()))

    if not recent_scores or not all_scores:
        out = ratios_df.copy()
        out["SectorPressure"]    = np.nan
        out["SectorPressurePct"] = np.nan
        out["AdjustedStatus"]    = ratios_df["Status"]
        out["SectorNarrative"]   = "Insufficient sector health history."
        return out

    pressure     = float(np.median(recent_scores))
    all_arr      = np.array(all_scores)
    pct_rank     = float(np.mean(all_arr <= pressure) * 100)

    # Boundaries from the JOINT distribution of all-sector health scores
    joint_q75 = float(np.percentile(all_arr, 75))
    joint_q25 = float(np.percentile(all_arr, 25))

    named = ", ".join(top_sectors[:3])
    if pressure >= joint_q75:
        direction  = "TAILWIND"
        narrative  = (f"Correlated sectors ({named}) health is in the top quartile "
                      f"of their joint distribution (score={pressure:.1f}, "
                      f"pct={pct_rank:.0f}%). Sector tailwind expected.")
    elif pressure <= joint_q25:
        direction  = "HEADWIND"
        narrative  = (f"Correlated sectors ({named}) health is in the bottom quartile "
                      f"(score={pressure:.1f}, pct={pct_rank:.0f}%). Headwind risk.")
    else:
        direction  = "NEUTRAL"
        narrative  = (f"Correlated sectors ({named}) health is mid-range "
                      f"(score={pressure:.1f}, pct={pct_rank:.0f}%). Effect muted.")

    def _adjust(status):
        if direction == "TAILWIND" and status == "amber":
            return "green"
        if direction == "HEADWIND" and status == "amber":
            return "red"
        return status

    out = ratios_df.copy()
    out["SectorPressure"]    = round(pressure, 2)
    out["SectorPressurePct"] = round(pct_rank, 1)
    out["AdjustedStatus"]    = out["Status"].apply(_adjust)
    out["SectorNarrative"]   = narrative
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Layer 4 — Full pipeline
# ─────────────────────────────────────────────────────────────────────────────

def run_balance_sheet_analysis(
    ticker:        str,
    health_dfs:    Dict[str, pd.DataFrame],
    top_sectors:   List[str],
    audit_window:  int = 20,
    sector_window: int = 20,
) -> dict:
    """
    End-to-end balance sheet analysis with data-driven sector overlay.

    Returns
    -------
    { ticker, info, raw, ratios, full_ratios, top_sectors, sector_pressure }
    """
    print(f"  Fetching balance sheet: {ticker} (window={audit_window}q)...")
    bs_data = fetch_balance_sheet(ticker, audit_window)

    print(f"  Computing financial ratios (self-referential status)...")
    ratios, ratios_history = compute_financial_ratios(bs_data)

    print(f"  Applying data-driven sector overlay ({', '.join(top_sectors)})...")
    full_ratios = sector_overlay(ratios, health_dfs, top_sectors, sector_window)

    pressure = float(full_ratios["SectorPressure"].iloc[0]) \
               if not full_ratios.empty else np.nan

    return {
        "ticker":          ticker,
        "info":            bs_data["info"],
        "raw":             {k: v for k, v in bs_data.items()
                            if k not in ("info", "ticker")},
        "ratios":          ratios,
        "full_ratios":     full_ratios,
        "historical_ratios": ratios_history,
        "top_sectors":     top_sectors,
        "sector_pressure": pressure,
    }
