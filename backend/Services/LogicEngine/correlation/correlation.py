"""
correlation.py
--------------
Company-vs-sector correlation engine.

Input contract (no fetching, no raw data)
------------------------------------------
  company_health  : dict  — output of run_ohlcv_health()
                    must contain key "history" (pd.DataFrame with DatetimeIndex)
                    columns needed: daily_return, ret_z, z_change, cum_z_change,
                                    volatility, composite, health_score, spike_up, spike_down

  sector_results  : dict { sector_name: run_ohlcv_health() result }
                    same structure as company_health, label_col="Sector"

Both come from analysis/ohlcv_health.py — already normalised, no raw OHLCV needed here.

What this module produces
--------------------------
  1. company_vs_sectors   — Pearson corr of company vs every sector (all windows)
  2. top_sectors          — ranked list of most correlated sectors (long-window dominant)
  3. health_by_top        — health scores of top sectors + company health context
  4. relative_growth      — company return vs sector return (outperformance)
  5. relative_spikes      — spike alignment between company and each sector
  6. sift                 — rolling correlation time-series (full history)
  7. insights             — plain-language summary list

Final output: run_correlation() -> dict (JSON-ready, no DataFrames at top level)

Usage
-----
    from correlation.correlation import run_correlation

    result = run_correlation(company_health, sector_results, windows=[20, 60, 100], top_n=5)
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional

# ── Metric stems derived from ohlcv_health history columns ───────────────────
# These exist in every run_ohlcv_health() "history" DataFrame
METRIC_STEMS = ["daily_return", "ret_z", "z_change", "cum_z_change", "volatility", "composite"]

# Long window drives top-sector ranking (persistent relationship > short noise)
LONG_WINDOW  = 100
SHORT_WINDOW = 20
MID_WINDOW   = 60


# ── Helpers ───────────────────────────────────────────────────────────────────

def _history(health_result: dict) -> pd.DataFrame:
    h = health_result.get("history", pd.DataFrame())
    if not isinstance(h.index, pd.DatetimeIndex):
        if "Date" in h.columns:
            h = h.set_index("Date")
        h.index = pd.to_datetime(h.index)
    return h.sort_index()


def _align(co_series: pd.Series, se_series: pd.Series) -> pd.DataFrame:
    aligned = pd.concat([co_series, se_series], axis=1, join="inner").dropna()
    aligned.columns = ["co", "se"]
    return aligned


def _pearson(aligned: pd.DataFrame) -> float:
    if len(aligned) < 5:
        return np.nan
    return float(aligned["co"].corr(aligned["se"]))


def _rolling_corr(aligned: pd.DataFrame, window: int) -> pd.Series:
    if len(aligned) < window:
        return pd.Series(dtype=float)
    return aligned["co"].rolling(window).corr(aligned["se"]).dropna()


def _safe(v):
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    return round(float(v), 4)


# ── 1. Company vs every sector — Pearson across all windows ──────────────────

def _company_vs_sectors(co_h: pd.DataFrame, sector_results: dict, windows: List[int]) -> dict:
    """
    For each sector and each window, compute Pearson correlation on the
    shared date range using the composite score (single best summary metric).

    Returns:
    {
        "IT Sector": {
            "full":  0.82,   # full shared history
            "20d":   0.71,
            "60d":   0.79,
            "100d":  0.83,
        },
        ...
    }
    """
    co_series = co_h["composite"].dropna() if "composite" in co_h.columns else pd.Series(dtype=float)
    result = {}

    for name, sr in sector_results.items():
        se_h = _history(sr)
        if "composite" not in se_h.columns:
            continue
        se_series = se_h["composite"].dropna()
        aligned   = _align(co_series, se_series)

        entry = {"full": _safe(_pearson(aligned))}
        for w in windows:
            rc = _rolling_corr(aligned, w)
            entry[f"{w}d"] = _safe(rc.iloc[-1]) if not rc.empty else None
        result[name] = entry

    return result


# ── 2. Top sectors — ranked by long-window correlation ───────────────────────

def _rank_top_sectors(corr_by_sector: dict, long_window: int, top_n: int) -> List[dict]:
    """
    Rank sectors by absolute correlation at the long window.
    Long-window correlation is the dominant signal — persistent relationship.

    Returns list of dicts sorted by |long_window_corr| descending:
    [
        { "rank": 1, "sector": "IT Sector", "corr_100d": 0.83, "corr_full": 0.82 },
        ...
    ]
    """
    key = f"{long_window}d"
    scores = []
    for name, entry in corr_by_sector.items():
        v = entry.get(key) or entry.get("full")
        if v is not None:
            scores.append((name, abs(v), entry.get(key), entry.get("full")))

    scores.sort(key=lambda x: x[1], reverse=True)
    return [
        {"rank": i + 1, "sector": name, f"corr_{long_window}d": _safe(cv), "corr_full": _safe(fv)}
        for i, (name, _, cv, fv) in enumerate(scores[:top_n])
    ]


# ── 3. Health by top sectors ──────────────────────────────────────────────────

def _health_by_top(top_sectors: List[dict], sector_results: dict, company_health: dict) -> dict:
    """
    For each top sector, pull its latest health snapshot.
    Also include company health for direct comparison.

    Returns:
    {
        "company": { health_score, signal, regime, market_phase, trend },
        "sectors": [
            { "sector": "IT Sector", "rank": 1, "health_score": 72.1,
              "signal": "STRONG", "regime": "BULL", "market_phase": "Confirmed Uptrend",
              "corr_100d": 0.83 },
            ...
        ],
        "avg_top_health": 68.4,
        "health_alignment": "ALIGNED"   # company and top sectors moving together
    }
    """
    co_latest = company_health.get("latest", {})
    co_hs     = co_latest.get("health_score")

    sectors_out = []
    top_scores  = []
    for t in top_sectors:
        name = t["sector"]
        sr   = sector_results.get(name, {})
        lat  = sr.get("latest", {})
        hs   = lat.get("health_score")
        if hs is not None:
            top_scores.append(hs)
        sectors_out.append({
            "sector":       name,
            "rank":         t["rank"],
            "health_score": _safe(hs),
            "signal":       lat.get("signal"),
            f"corr_{LONG_WINDOW}d": t.get(f"corr_{LONG_WINDOW}d"),
        })

    avg_top = _safe(float(np.mean(top_scores))) if top_scores else None

    # Alignment: company health vs avg top-sector health
    alignment = "INSUFFICIENT_DATA"
    if co_hs is not None and avg_top is not None:
        diff = abs(co_hs - avg_top)
        if diff <= 15:
            alignment = "ALIGNED"
        elif co_hs > avg_top + 15:
            alignment = "COMPANY_LEADING"
        else:
            alignment = "COMPANY_LAGGING"

    return {
        "company": {
            "health_score": _safe(co_hs),
            "signal":       co_latest.get("signal"),
        },
        "sectors":          sectors_out,
        "avg_top_health":   avg_top,
        "health_alignment": alignment,
    }


# ── 4. Relative growth ────────────────────────────────────────────────────────

def _relative_growth(co_h: pd.DataFrame, sector_results: dict, top_sectors: List[dict], windows: List[int]) -> dict:
    """
    Company return minus sector return over each window.
    Positive = company outperforming sector.

    Returns:
    {
        "IT Sector": {
            "20d_outperformance_pct":  1.23,
            "60d_outperformance_pct": -0.45,
            "100d_outperformance_pct": 2.10,
            "direction": "OUTPERFORMING"  | "UNDERPERFORMING" | "NEUTRAL"
        },
        ...
    }
    """
    if "daily_return" not in co_h.columns:
        return {}

    result = {}
    top_names = {t["sector"] for t in top_sectors}

    for name in top_names:
        sr   = sector_results.get(name, {})
        se_h = _history(sr)
        if "daily_return" not in se_h.columns:
            continue

        co_ret = co_h["daily_return"].dropna()
        se_ret = se_h["daily_return"].dropna()
        aligned = _align(co_ret, se_ret)
        if aligned.empty:
            continue

        entry = {}
        for w in windows:
            tail = aligned.tail(w)
            if len(tail) < w // 2:
                entry[f"{w}d_outperformance_pct"] = None
                continue
            co_cum = float((1 + tail["co"]).prod() - 1) * 100
            se_cum = float((1 + tail["se"]).prod() - 1) * 100
            entry[f"{w}d_outperformance_pct"] = _safe(co_cum - se_cum)

        # Direction based on long window
        lw_key = f"{LONG_WINDOW}d_outperformance_pct"
        lw_val = entry.get(lw_key)
        if lw_val is None:
            direction = "INSUFFICIENT_DATA"
        elif lw_val > 1.0:
            direction = "OUTPERFORMING"
        elif lw_val < -1.0:
            direction = "UNDERPERFORMING"
        else:
            direction = "NEUTRAL"

        entry["direction"] = direction
        result[name] = entry

    return result


# ── 5. Relative spikes ────────────────────────────────────────────────────────

def _relative_spikes(co_h: pd.DataFrame, sector_results: dict, top_sectors: List[dict]) -> dict:
    """
    Spike alignment: on days the company spikes up/down, does the sector too?

    Returns:
    {
        "IT Sector": {
            "co_spike_up_days":    12,
            "co_spike_down_days":  8,
            "aligned_up_pct":      75.0,   # % of co spike-up days where sector also spiked up
            "aligned_down_pct":    62.5,
            "spike_alignment":     "HIGH"  | "MODERATE" | "LOW"
        },
        ...
    }
    """
    if "spike_up" not in co_h.columns or "spike_down" not in co_h.columns:
        return {}

    result = {}
    top_names = {t["sector"] for t in top_sectors}

    for name in top_names:
        sr   = sector_results.get(name, {})
        se_h = _history(sr)
        if "spike_up" not in se_h.columns:
            continue

        # Align on shared dates
        shared = co_h.index.intersection(se_h.index)
        if len(shared) < 20:
            continue

        co_up   = co_h.loc[shared, "spike_up"].astype(bool)
        co_dn   = co_h.loc[shared, "spike_down"].astype(bool)
        se_up   = se_h.loc[shared, "spike_up"].astype(bool)
        se_dn   = se_h.loc[shared, "spike_down"].astype(bool)

        n_co_up = int(co_up.sum())
        n_co_dn = int(co_dn.sum())

        aligned_up  = float((co_up & se_up).sum() / n_co_up * 100) if n_co_up > 0 else 0.0
        aligned_dn  = float((co_dn & se_dn).sum() / n_co_dn * 100) if n_co_dn > 0 else 0.0
        avg_align   = (aligned_up + aligned_dn) / 2

        spike_alignment = "HIGH" if avg_align >= 60 else "MODERATE" if avg_align >= 35 else "LOW"

        result[name] = {
            "co_spike_up_days":   n_co_up,
            "co_spike_down_days": n_co_dn,
            "aligned_up_pct":     _safe(aligned_up),
            "aligned_down_pct":   _safe(aligned_dn),
            "spike_alignment":    spike_alignment,
        }

    return result


# ── 6. SIFT — rolling correlation time-series ─────────────────────────────────

def _sift(co_h: pd.DataFrame, sector_results: dict, top_sectors: List[dict], windows: List[int]) -> dict:
    """
    Full rolling correlation time-series for each top sector.
    Uses composite score as the single metric (most informative).

    Returns:
    {
        "IT Sector": {
            "20d":  [ {"date": "2026-04-24", "corr": 0.81}, ... ],
            "60d":  [ ... ],
            "100d": [ ... ],
            "latest_20d":  0.81,
            "latest_60d":  0.79,
            "latest_100d": 0.83,
        },
        ...
    }
    """
    if "composite" not in co_h.columns:
        return {}

    co_series = co_h["composite"].dropna()
    result    = {}
    top_names = {t["sector"] for t in top_sectors}

    for name in top_names:
        sr   = sector_results.get(name, {})
        se_h = _history(sr)
        if "composite" not in se_h.columns:
            continue

        se_series = se_h["composite"].dropna()
        aligned   = _align(co_series, se_series)
        if aligned.empty:
            continue

        entry = {}
        for w in windows:
            rc = _rolling_corr(aligned, w)
            if rc.empty:
                entry[f"{w}d"]        = []
                entry[f"latest_{w}d"] = None
                continue
            # Keep last 60 rows in the time-series (reduces JSON ~75%)
            # Full history is available in the store via load_ohlcv_health_history
            rc_tail = rc.tail(60)
            entry[f"{w}d"] = [
                {"date": str(dt.date()), "corr": _safe(v)}
                for dt, v in rc_tail.items()
                if not pd.isna(v)
            ]
            entry[f"latest_{w}d"] = _safe(rc.iloc[-1])

        result[name] = entry

    return result


# ── 7. Insights ───────────────────────────────────────────────────────────────

def _insights(
    company_health: dict,
    top_sectors: List[dict],
    health_ctx: dict,
    rel_growth: dict,
    rel_spikes: dict,
    sector_results: dict,
) -> List[str]:
    ins     = []
    co      = company_health.get("latest", {})
    co_name = company_health.get("name", "Company")
    hs      = co.get("health_score")
    sig     = co.get("signal", "")

    if hs is not None:
        ins.append(f"{co_name} health score is {hs:.1f}/100 — signal: {sig}.")

    if top_sectors:
        t1 = top_sectors[0]
        ins.append(
            f"Strongest correlated sector: {t1['sector']} "
            f"(corr_{LONG_WINDOW}d = {t1.get(f'corr_{LONG_WINDOW}d', 'N/A')})."
        )

    alignment = health_ctx.get("health_alignment", "")
    avg_top   = health_ctx.get("avg_top_health")
    if alignment and avg_top is not None and hs is not None:
        ins.append(
            f"Health alignment with top sectors: {alignment} "
            f"(company={hs:.1f}, avg_top={avg_top:.1f})."
        )

    for name, rg in rel_growth.items():
        d = rg.get("direction", "")
        v = rg.get(f"{LONG_WINDOW}d_outperformance_pct")
        if d and d != "INSUFFICIENT_DATA" and v is not None:
            ins.append(
                f"{co_name} is {d} vs {name} over {LONG_WINDOW}d "
                f"(outperformance: {v:+.2f}%)."
            )

    for name, sp in rel_spikes.items():
        sa = sp.get("spike_alignment", "")
        au = sp.get("aligned_up_pct")
        ad = sp.get("aligned_down_pct", 0) or 0
        if sa and au is not None:
            ins.append(f"Spike alignment with {name}: {sa} (up={au:.0f}%, down={ad:.0f}%).")

    return ins


# ── Master function ───────────────────────────────────────────────────────────

def run_correlation(
    company_health:  dict,
    sector_results:  dict,
    windows:         List[int] = None,
    top_n:           int = 5,
) -> dict:
    """
    Full correlation analysis for one company against all sectors.

    Parameters
    ----------
    company_health  : dict  — run_ohlcv_health() result
    sector_results  : dict  — { sector_name: run_ohlcv_health() result }
    windows         : list  — rolling windows in trading days (default [20, 60, 100])
    top_n           : int   — number of top correlated sectors to highlight

    Returns
    -------
    dict (JSON-ready — no DataFrames, all plain Python types)
    {
        "company":            str,
        "date":               str,
        "windows":            [20, 60, 100],

        "company_vs_sectors": { sector: { full, 20d, 60d, 100d } },
        "top_sectors":        [ { rank, sector, corr_100d, corr_full } ],
        "health_by_top":      { company: {...}, sectors: [...], avg_top_health, health_alignment },
        "relative_growth":    { sector: { 20d_outperformance_pct, ..., direction } },
        "relative_spikes":    { sector: { co_spike_up_days, aligned_up_pct, ..., spike_alignment } },
        "sift":               { sector: { 20d: [...], 60d: [...], 100d: [...], latest_Xd } },
        "insights":           [ str, ... ],
    }
    """
    if windows is None:
        windows = [SHORT_WINDOW, MID_WINDOW, LONG_WINDOW]

    co_h = _history(company_health)

    corr_by_sector = _company_vs_sectors(co_h, sector_results, windows)
    top_sectors    = _rank_top_sectors(corr_by_sector, long_window=LONG_WINDOW, top_n=top_n)
    health_ctx     = _health_by_top(top_sectors, sector_results, company_health)
    rel_growth     = _relative_growth(co_h, sector_results, top_sectors, windows)
    rel_spikes     = _relative_spikes(co_h, sector_results, top_sectors)
    sift           = _sift(co_h, sector_results, top_sectors, windows)
    insights       = _insights(company_health, top_sectors, health_ctx, rel_growth, rel_spikes, sector_results)

    return {
        "company":            company_health.get("name", ""),
        "date":               company_health.get("latest", {}).get("date", ""),
        "windows":            windows,
        "company_vs_sectors": corr_by_sector,
        "top_sectors":        top_sectors,
        "health_by_top":      health_ctx,
        "relative_growth":    rel_growth,
        "relative_spikes":    rel_spikes,
        "sift":               sift,
        "insights":           insights,
    }
