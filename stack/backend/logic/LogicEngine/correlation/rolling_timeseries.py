"""
rolling_timeseries.py
---------------------
Produces FULL daily time-series rolling correlations (no snapshot — every day
is preserved) between a company's metrics and each sector's matching metrics.

This is the core fix for the "missing days" bug: instead of returning only the
last point we now return a complete Series per (sector, metric, window) triple.

Public API
----------
  build_full_rolling_corr(company_df, sector_dfs, windows, metric_stems)
      -> dict  { window: { sector_name: pd.DataFrame(Date x metric) } }

  build_all_dates_matrix(company_df, sector_dfs, windows, metric_stems)
      -> pd.DataFrame  long-format:  Date | Window | Sector | metric_stem columns…

  top_correlated_sectors(company_df, sector_dfs, window, metric_stem, top_n)
      -> list[str]   names of the top_n most correlated sectors (abs mean corr)
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional

try:
    from .correlation_matrix import METRIC_STEMS       # package mode
except ImportError:
    from correlation_matrix import METRIC_STEMS        # script mode


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _date_indexed(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of df with Date as a DatetimeIndex, sorted ascending."""
    df = df.copy()
    if "Date" not in df.columns:
        df = df.reset_index()
    df["Date"] = pd.to_datetime(df["Date"])
    return df.sort_values("Date").set_index("Date")


# ─────────────────────────────────────────────────────────────────────────────
# Core builder
# ─────────────────────────────────────────────────────────────────────────────

def build_full_rolling_corr(
    company_df:   pd.DataFrame,
    sector_dfs:   Dict[str, pd.DataFrame],
    windows:      List[int] = [20, 60, 100],
    metric_stems: Optional[List[str]] = None,
) -> Dict[int, Dict[str, pd.DataFrame]]:
    """
    For every (window, sector, metric_stem) triple build the FULL rolling
    Pearson correlation time-series — not just the last value.

    Returns
    -------
    {
      window: {
        sector_name: pd.DataFrame(
            index=Date,
            columns=metric_stems,
            values=rolling_corr ∈ [-1, 1]
        )
      }
    }

    NaN before the first full window is kept (honest signal).
    """
    if metric_stems is None:
        metric_stems = METRIC_STEMS

    co = _date_indexed(company_df)
    results: Dict[int, Dict[str, pd.DataFrame]] = {w: {} for w in windows}

    for sector_name, sector_df in sector_dfs.items():
        se = _date_indexed(sector_df)

        # ── Align company + sector on shared dates once ──────────────────────
        # Build a wide aligned frame for all stems so dates are consistent
        aligned_pairs = {}
        for stem in metric_stems:
            co_col = f"company_{stem}"
            se_col = f"sector_{stem}"
            if co_col not in co.columns or se_col not in se.columns:
                continue
            pair = pd.concat([co[co_col], se[se_col]], axis=1, join="inner").dropna()
            pair.columns = ["co", "se"]
            if len(pair) >= 2:
                aligned_pairs[stem] = pair

        if not aligned_pairs:
            # No usable data for this sector — fill NaN frames per window
            for w in windows:
                results[w][sector_name] = pd.DataFrame(columns=metric_stems)
            continue

        # ── Per window, compute rolling corr for every stem ─────────────────
        for w in windows:
            stem_series = {}
            for stem, pair in aligned_pairs.items():
                if len(pair) < w:
                    # Not enough data for this window — all NaN
                    stem_series[stem] = pd.Series(np.nan, index=pair.index, name=stem)
                else:
                    rc = pair["co"].rolling(w).corr(pair["se"])
                    rc.name = stem
                    stem_series[stem] = rc

            if stem_series:
                df_w = pd.DataFrame(stem_series)
                df_w.index.name = "Date"
                df_w.columns.name = "Metric"
                results[w][sector_name] = df_w
            else:
                results[w][sector_name] = pd.DataFrame(columns=metric_stems)

    return results


# ─────────────────────────────────────────────────────────────────────────────
# Long-format assembler (all windows, all sectors, all dates in one frame)
# ─────────────────────────────────────────────────────────────────────────────

def build_all_dates_matrix(
    company_df:   pd.DataFrame,
    sector_dfs:   Dict[str, pd.DataFrame],
    windows:      List[int] = [20, 60, 100],
    metric_stems: Optional[List[str]] = None,
    drop_prefix_nan: bool = True,
) -> pd.DataFrame:
    """
    Flatten build_full_rolling_corr() into a single long-format DataFrame:

        Date | Window | Sector | return_1d | return_5d | … | momentum

    Parameters
    ----------
    drop_prefix_nan : bool
        If True, drop rows where ALL metric columns are NaN
        (the warm-up period before the first full window).

    Returns
    -------
    pd.DataFrame  — zero missing dates beyond the warm-up window.
    """
    if metric_stems is None:
        metric_stems = METRIC_STEMS

    full = build_full_rolling_corr(company_df, sector_dfs, windows, metric_stems)

    rows = []
    for window, sector_map in full.items():
        for sector_name, df in sector_map.items():
            if df.empty:
                continue
            tmp = df.reset_index()          # Date column
            tmp.insert(1, "Window", window)
            tmp.insert(2, "Sector", sector_name)
            rows.append(tmp)

    if not rows:
        cols = ["Date", "Window", "Sector"] + metric_stems
        return pd.DataFrame(columns=cols)

    result = pd.concat(rows, ignore_index=True)
    result["Date"] = pd.to_datetime(result["Date"])
    result = result.sort_values(["Window", "Sector", "Date"]).reset_index(drop=True)

    if drop_prefix_nan:
        metric_cols = [c for c in result.columns if c in metric_stems]
        result = result.dropna(subset=metric_cols, how="all").reset_index(drop=True)

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Top-correlated sectors finder
# ─────────────────────────────────────────────────────────────────────────────

def top_correlated_sectors(
    company_df:  pd.DataFrame,
    sector_dfs:  Dict[str, pd.DataFrame],
    window:      int = 60,
    metric_stem: str = "return_1d",
    top_n:       int = 5,
    abs_corr:    bool = True,
) -> List[str]:
    """
    Find the top_n sectors whose rolling correlation with the company is
    strongest (absolute or signed) over the given window.

    Uses the MEAN of the rolling series as the summary statistic so the full
    history matters, not just the most recent point.

    Parameters
    ----------
    abs_corr : bool  If True rank by |mean corr|; else by mean corr (allows
                     negatively correlated sectors to rank high).

    Returns
    -------
    list[str]  ordered from most to least correlated.
    """
    full = build_full_rolling_corr(
        company_df, sector_dfs,
        windows=[window],
        metric_stems=[metric_stem],
    )

    sector_map = full[window]
    scores = {}
    for sector_name, df in sector_map.items():
        if df.empty or metric_stem not in df.columns:
            continue
        series = df[metric_stem].dropna()
        if series.empty:
            continue
        val = abs(series.mean()) if abs_corr else series.mean()
        scores[sector_name] = val

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [name for name, _ in ranked[:top_n]]


# ─────────────────────────────────────────────────────────────────────────────
# Snapshot helper (latest value per sector/metric for a given window)
# ─────────────────────────────────────────────────────────────────────────────

def latest_snapshot_from_full(
    full_result: Dict[int, Dict[str, pd.DataFrame]],
    window: int,
) -> pd.DataFrame:
    """
    Extract the most-recent row from a build_full_rolling_corr() result for a
    given window.

    Returns
    -------
    pd.DataFrame  shape (n_sectors, n_metric_stems)
        Index   = Sector names
        Columns = metric stems
    """
    sector_map = full_result.get(window, {})
    rows = {}
    for sector_name, df in sector_map.items():
        if df.empty:
            rows[sector_name] = {}
        else:
            last_valid = df.dropna(how="all")
            rows[sector_name] = last_valid.iloc[-1].to_dict() if not last_valid.empty else {}

    result = pd.DataFrame(rows).T
    result.index.name   = "Sector"
    result.columns.name = "Metric"
    return result
