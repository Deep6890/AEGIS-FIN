"""
balance_sheet.py
----------------
Domain-aware financial health ratios from quarterly financials.
Domain is auto-detected from yfinance info (sector / industry).
Only ratios meaningful for that domain are computed — no gray noise.

Input  : financials_data dict with keys:
             "ticker"   str
             "info"     dict          (yfinance info — must have sector/industry)
             "income"   pd.DataFrame  (quarterly income statement)
             "balance"  pd.DataFrame  (quarterly balance sheet)
             "cashflow" pd.DataFrame  (quarterly cash flow)

Output : dict with keys:
    "ticker"            str
    "domain"            str            — detected domain label
    "info"              dict
    "ratios"            pd.DataFrame   — domain-relevant ratios, current snapshot
    "historical_ratios" pd.DataFrame   — long-format (Date, Ratio, Value)
    "full_ratios"       pd.DataFrame   — ratios + AdjustedStatus column
    "sector_overlay"    dict           — pressure, pct_rank, direction, narrative

Ratio row schema
----------------
    Ratio | Value | YoY_pct | HistPctRank | Status | Trend | Description | Category

Status — data-driven percentile rank of current value vs company's own history:
    green  >= 75th pct  |  red <= 25th pct  |  amber middle  |  gray insufficient

Sector overlay only adjusts amber rows — confirmed green / red are never overridden.

Domain map (auto-detected)
--------------------------
    it           → Technology / Software
    banking      → Banks, NBFCs, Financial Services
    pharma       → Pharmaceuticals, Biotech
    retail       → Retail, FMCG, Consumer
    realestate   → Real Estate
    energy       → Energy, Utilities, Oil & Gas
    manufacturing→ Industrials, Auto, Metals
    general      → fallback — all universal ratios

Data fetching is the caller's responsibility (fetching/fetcher.py).

Usage
-----
    from balance_sheet import run_balance_sheet

    result = run_balance_sheet(
        financials_data       = data,          # dict from fetcher
        sector_health_results = ohlcv_results, # optional
        top_sectors           = ["IT Sector"], # optional
    )
"""

import numpy as np
import pandas as pd

from .scoring import safe_div, pct_status, sector_pressure
from app.logger import get_logger
from app.schema import validate_financials

log = get_logger(__name__)


# ── Domain detection ──────────────────────────────────────────────────────────

def _detect_domain(info: dict) -> str:
    """
    Detect company domain from yfinance info sector / industry strings.
    Returns a normalised domain key used to select relevant ratios.
    """
    sector   = (info.get("sector",   "") or "").lower()
    industry = (info.get("industry", "") or "").lower()

    if any(k in industry for k in ("bank", "nbfc", "insurance")) \
            or "financial" in sector:
        return "banking"
    if any(k in industry for k in ("software", "internet", "semiconductor", "it services")):
        return "it"
    if sector == "technology":
        return "it"
    if any(k in industry for k in ("pharma", "biotech", "drug", "life sciences")):
        return "pharma"
    if any(k in industry for k in ("retail", "grocery", "fmcg", "consumer staples",
                                    "food", "beverage", "household")):
        return "retail"
    if "real estate" in sector or "reit" in industry:
        return "realestate"
    if any(k in sector for k in ("energy", "utilities", "oil", "gas")):
        return "energy"
    if any(k in sector for k in ("industrials", "materials")) \
            or any(k in industry for k in ("auto", "metal", "steel", "cement",
                                            "chemical", "manufacturing")):
        return "manufacturing"
    return "general"


# ── Domain ratio registry ─────────────────────────────────────────────────────
#
# Each domain lists exactly which ratio keys to compute.
# Keys map to _add() calls in compute_ratios().
# Universal ratios run for every domain.
# Domain-specific ratios replace meaningless ones (no inventory for IT, etc.)
#
# Universal (all domains):
#   gross_margin, net_margin, ebitda_margin, roe, roa
#   debt_equity, debt_assets, equity_ratio, equity_growth
#   cfo_ni, fcf_margin, revenue_growth, ni_growth
#
# Domain extras replace / add:
#   it          → cash_assets, rd_revenue          (no inventory)
#   banking     → equity_assets_pct, interest_coverage  (no inventory turnover)
#   pharma      → rd_revenue, intangibles_assets    (no inventory turnover)
#   retail      → current_ratio, quick_ratio, inventory_turnover, receivables_turnover
#   realestate  → debt_ebitda, current_ratio        (lumpy revenue — skip turnover)
#   energy      → debt_ebitda, capex_revenue, asset_turnover
#   manufacturing → current_ratio, quick_ratio, inventory_turnover,
#                   receivables_turnover, interest_coverage, asset_turnover, capex_revenue
#   general     → full set

_DOMAIN_RATIOS: dict[str, set[str]] = {
    "it": {
        "gross_margin", "net_margin", "ebitda_margin", "roe", "roa",
        "current_ratio", "cash_ratio",
        "debt_equity", "debt_assets",
        "cfo_ni", "fcf_margin",
        "revenue_growth", "ni_growth",
        "equity_ratio", "equity_growth",
        "cash_assets", "rd_revenue",
    },
    "banking": {
        "net_margin", "roe", "roa",
        "equity_ratio", "equity_growth",
        "debt_assets",
        "cfo_ni", "revenue_growth", "ni_growth",
        "interest_coverage",
        "equity_assets_pct",
    },
    "pharma": {
        "gross_margin", "net_margin", "ebitda_margin", "roe", "roa",
        "current_ratio", "quick_ratio", "cash_ratio",
        "debt_equity", "debt_assets", "interest_coverage",
        "cfo_ni", "fcf_margin",
        "revenue_growth", "ni_growth",
        "equity_ratio", "equity_growth",
        "rd_revenue", "intangibles_assets",
    },
    "retail": {
        "gross_margin", "net_margin", "ebitda_margin", "roe", "roa",
        "current_ratio", "quick_ratio", "cash_ratio",
        "debt_equity", "debt_assets",
        "asset_turnover", "inventory_turnover", "receivables_turnover",
        "cfo_ni", "fcf_margin",
        "revenue_growth", "ni_growth",
        "equity_ratio", "equity_growth",
    },
    "realestate": {
        "net_margin", "ebitda_margin", "roe", "roa",
        "current_ratio",
        "debt_equity", "debt_assets", "debt_ebitda",
        "cfo_ni", "fcf_margin",
        "revenue_growth", "ni_growth",
        "equity_ratio", "equity_growth",
    },
    "energy": {
        "gross_margin", "net_margin", "ebitda_margin", "roe", "roa",
        "current_ratio",
        "debt_equity", "debt_assets", "debt_ebitda", "interest_coverage",
        "asset_turnover", "capex_revenue",
        "cfo_ni", "fcf_margin",
        "revenue_growth", "ni_growth",
        "equity_ratio", "equity_growth",
    },
    "manufacturing": {
        "gross_margin", "net_margin", "ebitda_margin", "roe", "roa",
        "current_ratio", "quick_ratio",
        "debt_equity", "debt_assets", "interest_coverage",
        "asset_turnover", "inventory_turnover", "receivables_turnover",
        "capex_revenue",
        "cfo_ni", "fcf_margin",
        "revenue_growth", "ni_growth",
        "equity_ratio", "equity_growth",
    },
    "general": {
        "gross_margin", "net_margin", "ebitda_margin", "roe", "roa",
        "current_ratio", "quick_ratio", "cash_ratio",
        "debt_equity", "debt_assets", "interest_coverage",
        "asset_turnover", "inventory_turnover", "receivables_turnover",
        "cfo_ni", "fcf_margin",
        "revenue_growth", "ni_growth",
        "equity_ratio", "equity_growth",
    },
}


# ── Low-level column helpers ──────────────────────────────────────────────────

def _col(df: pd.DataFrame, col: str) -> pd.Series:
    """Extract a numeric column from a DataFrame; return empty Series if missing."""
    if df.empty or col not in df.columns:
        return pd.Series(dtype=float)
    return pd.to_numeric(df[col], errors="coerce").dropna()


def _latest(s: pd.Series) -> float:
    """Most recent (first) value in a quarterly series."""
    return float(s.iloc[0]) if not s.empty else np.nan


def _prior_year(s: pd.Series) -> float:
    """Value from ~4 quarters ago (index 4) for YoY comparison."""
    clean = s.dropna()
    return float(clean.iloc[4]) if len(clean) >= 5 else np.nan


def _yoy(current: float, prior: float) -> float:
    """Year-over-year % change."""
    if pd.isna(current) or pd.isna(prior) or prior == 0:
        return np.nan
    return (current - prior) / abs(prior) * 100


def _yoy_hist(s: pd.Series) -> pd.Series:
    """
    Rolling YoY % change series for growth ratios.
    Each point i is compared to point i+4 (same quarter prior year).
    """
    s = s.dropna()
    if len(s) < 5:
        return pd.Series(dtype=float)
    vals = [
        _yoy(float(s.iloc[i]), float(s.iloc[i + 4]))
        for i in range(len(s) - 4)
    ]
    return pd.Series([v for v in vals if not pd.isna(v)], dtype=float)


def _ratio_hist(
    num_col: str, den_col: str,
    num_src: pd.DataFrame, den_src: pd.DataFrame,
    scale: float = 1.0,
) -> pd.Series:
    """
    Build a dated history of (num_col / den_col) × scale,
    aligned on shared dates so quarters match correctly.
    """
    n = _col(num_src, num_col)
    d = _col(den_src, den_col)
    shared = sorted(set(n.index) & set(d.index), reverse=True)
    vals, dates = [], []
    for dt in shared:
        try:
            v = safe_div(float(n[dt]), float(d[dt]))
            if not pd.isna(v):
                vals.append(v * scale)
                dates.append(dt)
        except (ValueError, TypeError):
            continue
    return pd.Series(vals, index=dates, dtype=float) if vals else pd.Series(dtype=float)


# ── Ratio computation ─────────────────────────────────────────────────────────

def compute_ratios(bs_data: dict, domain: str = "general") -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Compute domain-relevant ratios from the financials dict.
    Only ratios in _DOMAIN_RATIOS[domain] are computed — no gray noise
    from metrics that don't apply to the company's business type.

    Parameters
    ----------
    bs_data : financials dict (income, balance, cashflow)
    domain  : detected domain key from _detect_domain()

    Returns
    -------
    ratios_df : pd.DataFrame  — one row per ratio (snapshot)
    hist_df   : pd.DataFrame  — long-format history (Date, Ratio, Value)
    """
    inc = bs_data.get("income",   pd.DataFrame())
    bal = bs_data.get("balance",  pd.DataFrame())
    cf  = bs_data.get("cashflow", pd.DataFrame())

    active = _DOMAIN_RATIOS.get(domain, _DOMAIN_RATIOS["general"])

    # ── Pull raw series ───────────────────────────────────────────────────────
    def _get(col: str, src: pd.DataFrame) -> tuple[float, float, pd.Series]:
        s = _col(src, col)
        return _latest(s), _prior_year(s), s

    rev_c, rev_p, rev_s = _get("Total Revenue",             inc)
    ni_c,  ni_p,  ni_s  = _get("Net Income",                inc)
    eb_c,  eb_p,  _     = _get("EBIT",                      inc)
    gr_c,  gr_p,  _     = _get("Gross Profit",              inc)
    ebd_c, ebd_p, _     = _get("EBITDA",                    inc)
    ie_c,  _,     _     = _get("Interest Expense",          inc)
    ta_c,  ta_p,  _     = _get("Total Assets",              bal)
    eq_c,  eq_p,  eq_s  = _get("Stockholders Equity",       bal)
    cl_c,  _,     cl_s  = _get("Current Liabilities",       bal)
    ca_c,  _,     ca_s  = _get("Current Assets",            bal)
    cs_c,  _,     _     = _get("Cash And Cash Equivalents", bal)
    inv_c, _,     inv_s = _get("Inventory",                 bal)
    rec_c, _,     _     = _get("Receivables",               bal)
    ltd_c, _,     _     = _get("Long Term Debt",            bal)
    std_c, _,     std_s = _get("Current Debt",              bal)
    cfo_c, cfo_p, _     = _get("Operating Cash Flow",       cf)
    cpx_c, _,     _     = _get("Capital Expenditure",       cf)
    rd_c,  _,     _     = _get("Research And Development",  inc)
    int_c, _,     _     = _get("Goodwill And Other Intangible Assets", bal)

    # ── Derived values ────────────────────────────────────────────────────────
    ie_c  = abs(ie_c)  if not pd.isna(ie_c)  else np.nan
    cpx_c = abs(cpx_c) if not pd.isna(cpx_c) else np.nan
    rd_c  = abs(rd_c)  if not pd.isna(rd_c)  else np.nan
    debt  = (ltd_c or 0) + (std_c or 0)
    fcf   = (cfo_c - cpx_c) if not (pd.isna(cfo_c) or pd.isna(cpx_c)) else np.nan

    # EBITDA fallback: yfinance sometimes returns an implausibly small EBITDA.
    # If EBITDA margin looks < 1%, rebuild from EBIT + D&A.
    if not pd.isna(ebd_c) and not pd.isna(rev_c) and rev_c > 0 \
            and abs(safe_div(ebd_c, rev_c)) < 0.01:
        for da_col in ("Depreciation And Amortization", "Reconciled Depreciation"):
            da_s = _col(cf, da_col)
            if not da_s.empty and not pd.isna(eb_c):
                ebd_c = eb_c + abs(float(da_s.iloc[0]))
                break

    # ── Debt/Equity history (needs two columns summed) ────────────────────────
    ltd_s = _col(bal, "Long Term Debt")
    std_s = _col(bal, "Current Debt")
    de_vals, de_dates = [], []
    for dt in sorted(set(ltd_s.index) & set(eq_s.index), reverse=True):
        total_debt = (float(ltd_s[dt]) if dt in ltd_s.index else 0) + \
                     (float(std_s[dt]) if dt in std_s.index else 0)
        v = safe_div(total_debt, float(eq_s[dt]))
        if not pd.isna(v):
            de_vals.append(v)
            de_dates.append(dt)
    de_hist = pd.Series(de_vals, index=de_dates, dtype=float)

    # ── Quick Ratio history (Current Assets − Inventory) / Current Liabilities ─
    qr_vals, qr_dates = [], []
    for dt in sorted(set(ca_s.index) & set(cl_s.index), reverse=True):
        inv_val = float(inv_s[dt]) if dt in inv_s.index else 0.0
        v = safe_div(float(ca_s[dt]) - inv_val, float(cl_s[dt]))
        if not pd.isna(v):
            qr_vals.append(v)
            qr_dates.append(dt)
    qr_hist = pd.Series(qr_vals, index=qr_dates, dtype=float)

    # ── Debt/Assets history (total debt = LTD + STD) ─────────────────────────
    da_vals, da_dates = [], []
    ta_s = _col(bal, "Total Assets")
    for dt in sorted(set(ltd_s.index) & set(ta_s.index), reverse=True):
        total_debt = (float(ltd_s[dt]) if dt in ltd_s.index else 0) + \
                     (float(std_s[dt]) if dt in std_s.index else 0)
        v = safe_div(total_debt, float(ta_s[dt]))
        if not pd.isna(v):
            da_vals.append(v)
            da_dates.append(dt)
    da_hist = pd.Series(da_vals, index=da_dates, dtype=float)

    # ── Accumulator ───────────────────────────────────────────────────────────
    ratios: list[dict]    = []
    hist_rows: list[dict] = []

    def _add(
        key: str,
        name: str, val: float,
        yoy_c: float, yoy_p: float,
        hist: pd.Series,
        desc: str, cat: str,
    ) -> None:
        """Register a ratio only if it belongs to the active domain set."""
        if key not in active:
            return
        h   = hist.dropna()
        pct = float(np.mean(h < val) * 100) if (not pd.isna(val) and len(h) >= 4) else np.nan
        yoy = _yoy(yoy_c, yoy_p)

        ratios.append({
            "Ratio":       name,
            "Value":       round(val, 4) if not pd.isna(val) else None,
            "YoY_pct":     round(yoy, 2) if not pd.isna(yoy) else None,
            "HistPctRank": round(pct, 1) if not pd.isna(pct) else None,
            "Status":      pct_status(val, hist) if not pd.isna(val) else "gray",
            "Trend":       "up" if (not pd.isna(yoy) and yoy > 0) else "down",
            "Description": desc,
            "Category":    cat,
        })

        for dt, v in h.items():
            if hasattr(dt, "strftime") and not pd.isnull(dt):
                hist_rows.append({
                    "Date":  dt.strftime("%Y-%m-%d"),
                    "Ratio": name,
                    "Value": round(v, 4),
                })

    # ── Profitability ─────────────────────────────────────────────────────────
    _add("gross_margin",
         "Gross Margin %",
         safe_div(gr_c, rev_c) * 100, gr_c, gr_p,
         _ratio_hist("Gross Profit", "Total Revenue", inc, inc, 100),
         "Gross profit / revenue", "Profitability")

    _add("net_margin",
         "Net Profit Margin %",
         safe_div(ni_c, rev_c) * 100, ni_c, ni_p,
         _ratio_hist("Net Income", "Total Revenue", inc, inc, 100),
         "Net income / revenue", "Profitability")

    _add("ebitda_margin",
         "EBITDA Margin %",
         safe_div(ebd_c, rev_c) * 100, ebd_c, ebd_p,
         _ratio_hist("EBITDA", "Total Revenue", inc, inc, 100),
         "EBITDA / revenue", "Profitability")

    _add("roe",
         "ROE %",
         safe_div(ni_c, eq_c) * 100, ni_c, ni_p,
         _ratio_hist("Net Income", "Stockholders Equity", inc, bal, 100),
         "Net income / equity", "Profitability")

    _add("roa",
         "ROA %",
         safe_div(ni_c, ta_c) * 100, ni_c, ni_p,
         _ratio_hist("Net Income", "Total Assets", inc, bal, 100),
         "Net income / assets", "Profitability")

    # ── Liquidity ─────────────────────────────────────────────────────────────
    _add("current_ratio",
         "Current Ratio",
         safe_div(ca_c, cl_c), ca_c, np.nan,
         _ratio_hist("Current Assets", "Current Liabilities", bal, bal),
         "Current assets / current liabilities", "Liquidity")

    _add("quick_ratio",
         "Quick Ratio",
         safe_div(ca_c - (inv_c or 0), cl_c), ca_c, np.nan,
         qr_hist,
         "(Current assets − inventory) / current liabilities", "Liquidity")
    _add("cash_ratio",
         "Cash Ratio",
         safe_div(cs_c, cl_c), cs_c, np.nan,
         _ratio_hist("Cash And Cash Equivalents", "Current Liabilities", bal, bal),
         "Cash / current liabilities", "Liquidity")

    # ── Leverage ──────────────────────────────────────────────────────────────
    _add("debt_equity",
         "Debt/Equity",
         safe_div(debt, eq_c), debt, np.nan,
         de_hist,
         "Total debt / equity", "Leverage")

    _add("debt_assets",
         "Debt/Assets",
         safe_div(debt, ta_c), debt, np.nan,
         da_hist,
         "Total debt / assets", "Leverage")

    _add("interest_coverage",
         "Interest Coverage",
         safe_div(eb_c, ie_c), eb_c, eb_p,
         _ratio_hist("EBIT", "Interest Expense", inc, inc),
         "EBIT / interest expense", "Leverage")

    _add("debt_ebitda",
         "Debt/EBITDA",
         safe_div(debt, ebd_c), debt, np.nan,
         pd.Series(dtype=float),   # built ad-hoc; history via de_hist proxy
         "Total debt / EBITDA", "Leverage")

    # ── Efficiency ────────────────────────────────────────────────────────────
    _add("asset_turnover",
         "Asset Turnover",
         safe_div(rev_c, ta_c), rev_c, rev_p,
         _ratio_hist("Total Revenue", "Total Assets", inc, bal),
         "Revenue / assets", "Efficiency")

    _add("inventory_turnover",
         "Inventory Turnover",
         safe_div(rev_c, inv_c), rev_c, rev_p,
         _ratio_hist("Total Revenue", "Inventory", inc, bal),
         "Revenue / inventory", "Efficiency")

    _add("receivables_turnover",
         "Receivables Turnover",
         safe_div(rev_c, rec_c), rev_c, rev_p,
         _ratio_hist("Total Revenue", "Receivables", inc, bal),
         "Revenue / receivables", "Efficiency")

    _add("capex_revenue",
         "Capex/Revenue %",
         safe_div(cpx_c, rev_c) * 100, cpx_c, np.nan,
         _ratio_hist("Capital Expenditure", "Total Revenue", cf, inc, 100),
         "Capital expenditure / revenue", "Efficiency")

    # ── Domain-specific ───────────────────────────────────────────────────────
    _add("cash_assets",
         "Cash/Assets %",
         safe_div(cs_c, ta_c) * 100, cs_c, np.nan,
         _ratio_hist("Cash And Cash Equivalents", "Total Assets", bal, bal, 100),
         "Cash as % of total assets — capital-light proxy", "Profitability")

    _add("rd_revenue",
         "R&D/Revenue %",
         safe_div(rd_c, rev_c) * 100, rd_c, np.nan,
         _ratio_hist("Research And Development", "Total Revenue", inc, inc, 100),
         "R&D spend as % of revenue", "Profitability")

    _add("intangibles_assets",
         "Intangibles/Assets %",
         safe_div(int_c, ta_c) * 100, int_c, np.nan,
         _ratio_hist("Goodwill And Other Intangible Assets", "Total Assets", bal, bal, 100),
         "Intangible assets as % of total assets", "Capital Structure")

    _add("equity_assets_pct",
         "Equity/Assets % (Cap Adequacy)",
         safe_div(eq_c, ta_c) * 100, eq_c, eq_p,
         _ratio_hist("Stockholders Equity", "Total Assets", bal, bal, 100),
         "Equity / assets — capital adequacy proxy for banks", "Capital Structure")

    # ── Cash Flow ─────────────────────────────────────────────────────────────
    _add("cfo_ni",
         "CFO/Net Income",
         safe_div(cfo_c, ni_c), cfo_c, cfo_p,
         _ratio_hist("Operating Cash Flow", "Net Income", cf, inc),
         "Operating cash flow / net income", "Cash Flow")

    _add("fcf_margin",
         "FCF Margin %",
         safe_div(fcf, rev_c) * 100, fcf, cfo_p,
         _ratio_hist("Operating Cash Flow", "Total Revenue", cf, inc, 100),
         "Free cash flow / revenue", "Cash Flow")

    # ── Growth ────────────────────────────────────────────────────────────────
    _add("revenue_growth",
         "Revenue Growth %",
         _yoy(rev_c, rev_p), rev_c, rev_p,
         _yoy_hist(rev_s),
         "YoY revenue growth", "Growth")

    _add("ni_growth",
         "Net Income Growth %",
         _yoy(ni_c, ni_p), ni_c, ni_p,
         _yoy_hist(ni_s),
         "YoY net income growth", "Growth")

    # ── Capital Structure ─────────────────────────────────────────────────────
    _add("equity_ratio",
         "Equity Ratio %",
         safe_div(eq_c, ta_c) * 100, eq_c, eq_p,
         _ratio_hist("Stockholders Equity", "Total Assets", bal, bal, 100),
         "Equity / assets", "Capital Structure")

    _add("equity_growth",
         "Equity Growth %",
         _yoy(eq_c, eq_p), eq_c, eq_p,
         _yoy_hist(eq_s),
         "YoY equity growth", "Capital Structure")

    # ── Format snapshot ───────────────────────────────────────────────────────
    snap = pd.DataFrame(ratios)
    snap["ValueStr"] = snap["Value"].apply(
        lambda v: f"{v:,.2f}" if (v is not None and not pd.isna(v)) else "N/A"
    )
    return snap, pd.DataFrame(hist_rows)


# ── Sector overlay ────────────────────────────────────────────────────────────

def apply_sector_overlay(
    ratios_df: pd.DataFrame,
    sector_health_results: dict,
    top_sectors: list[str],
    window: int = 20,
) -> tuple[pd.DataFrame, dict]:
    """
    Adjust amber-status ratios based on sector pressure direction.
    Confirmed green / red are never overridden.

    Parameters
    ----------
    sector_health_results : { sector_name: run_ohlcv_health() result }
    top_sectors           : list of sector names to aggregate
    window                : trailing window (trading days) for pressure calc

    Returns
    -------
    (full_ratios_df, overlay_info_dict)
    """
    p, pct, q75, q25, named = sector_pressure(sector_health_results, top_sectors, window)

    out = ratios_df.copy()

    if pd.isna(p):
        out["AdjustedStatus"]  = out["Status"]
        out["SectorPressure"]  = np.nan
        out["SectorNarrative"] = "Insufficient sector data."
        return out, {
            "direction": "NEUTRAL",
            "pressure":  np.nan,
            "pct_rank":  np.nan,
            "narrative": "Insufficient sector data.",
        }

    if p >= q75:
        direction = "TAILWIND"
        narrative = (f"Sectors ({named}) are in top quartile "
                     f"(score={p:.1f}, pct={pct:.0f}%). Tailwind.")
    elif p <= q25:
        direction = "HEADWIND"
        narrative = (f"Sectors ({named}) are in bottom quartile "
                     f"(score={p:.1f}, pct={pct:.0f}%). Headwind.")
    else:
        direction = "NEUTRAL"
        narrative = (f"Sectors ({named}) are mid-range "
                     f"(score={p:.1f}, pct={pct:.0f}%). Neutral.")

    out["AdjustedStatus"] = out["Status"].apply(
        lambda s:
            "green" if (direction == "TAILWIND" and s == "amber") else
            "red"   if (direction == "HEADWIND" and s == "amber") else s
    )
    out["SectorPressure"]  = round(p, 2)
    out["SectorNarrative"] = narrative

    return out, {
        "direction": direction,
        "pressure":  round(p, 2),
        "pct_rank":  round(pct, 1),
        "narrative": narrative,
    }


# ── Full pipeline ─────────────────────────────────────────────────────────────

def run_balance_sheet(
    financials_data: dict,
    sector_health_results: dict | None = None,
    top_sectors: list[str] | None = None,
    sector_window: int = 20,
) -> dict:
    """
    Run domain-aware balance sheet analysis for any company.

    Domain is auto-detected from financials_data["info"] (sector / industry).
    Only ratios relevant to that domain are computed — no gray noise.

    Parameters
    ----------
    financials_data       : dict with keys ticker, info, income, balance, cashflow
    sector_health_results : optional { name: ohlcv_health result } for overlay
    top_sectors           : optional list of sector names to use in overlay
    sector_window         : trailing window for sector pressure (default 20)

    Returns
    -------
    {
        "ticker"            : str,
        "domain"            : str,
        "info"              : dict,
        "ratios"            : pd.DataFrame,
        "historical_ratios" : pd.DataFrame,
        "full_ratios"       : pd.DataFrame,
        "sector_overlay"    : dict,
    }
    """
    ticker = financials_data.get("ticker", "")
    info   = financials_data.get("info", {})

    # ── Validate input ────────────────────────────────────────────────────────
    vr = validate_financials(financials_data, ticker)
    if not vr.ok:
        log.error("balance_sheet.invalid_input", ticker=ticker, errors=vr.errors)
        return {
            "ticker":            ticker,
            "domain":            "unknown",
            "info":              {},
            "ratios":            pd.DataFrame(),
            "historical_ratios": pd.DataFrame(),
            "full_ratios":       pd.DataFrame(),
            "sector_overlay": {
                "direction": "NEUTRAL",
                "pressure":  float("nan"),
                "pct_rank":  float("nan"),
                "narrative": "Invalid input data.",
            },
        }

    for w in vr.warnings:
        log.warning("balance_sheet.input_warning", ticker=ticker, warning=w)

    # ── Detect domain ─────────────────────────────────────────────────────────
    domain = _detect_domain(info)
    log.info("balance_sheet.domain_detected", ticker=ticker, domain=domain,
             sector=info.get("sector", ""), industry=info.get("industry", ""))

    # ── Compute ratios ────────────────────────────────────────────────────────
    ratios, hist = compute_ratios(financials_data, domain)
    log.info("balance_sheet.ratios_computed", ticker=ticker, domain=domain,
             ratio_count=len(ratios))

    # ── Sector overlay ────────────────────────────────────────────────────────
    overlay_info: dict = {
        "direction": "NEUTRAL",
        "pressure":  float("nan"),
        "pct_rank":  float("nan"),
        "narrative": "No sector data provided.",
    }
    full_ratios = ratios.copy()
    full_ratios["AdjustedStatus"] = ratios["Status"]

    if sector_health_results and top_sectors:
        full_ratios, overlay_info = apply_sector_overlay(
            ratios, sector_health_results, top_sectors, sector_window
        )

    return {
        "ticker":            ticker,
        "domain":            domain,
        "info":              info,
        "ratios":            ratios,
        "historical_ratios": hist,
        "full_ratios":       full_ratios,
        "sector_overlay":    overlay_info,
    }