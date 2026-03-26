"""
correlation_sift.py
-------------------
Rolling correlation — company metric vs sector metric over a sliding window.

Public API
----------
  sift_company_sector_corr(company_df, sector_dfs, metric_stem, window)
      -> dict { sector_name: pd.Series(rolling_corr, index=Date) }

  latest_sift_snapshot(sift_result)
      -> pd.DataFrame  shape (n_sectors, 1)
"""

import pandas as pd
import numpy as np
from typing import Dict



def _date_indexed(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of df with Date as a DatetimeIndex, sorted ascending."""
    df = df.copy()
    if "Date" not in df.columns:
        df = df.reset_index()
    df["Date"] = pd.to_datetime(df["Date"])
    return df.sort_values("Date").set_index("Date")


def sift_company_sector_corr(
    company_df: pd.DataFrame,
    sector_dfs: Dict[str, pd.DataFrame],
    metric_stem: str = "return_1d",
    window: int = 60,
) -> Dict[str, pd.Series]:
    """
    For each sector, compute a rolling `window`-day Pearson correlation
    between the company's metric and that sector's matching metric.

    Parameters
    ----------
    company_df  : pd.DataFrame   Output of company_engine() for ONE company.
    sector_dfs  : dict           { sector_name: sector_df }
    metric_stem : str            Stem without prefix, e.g. 'return_1d', 'momentum'
    window      : int            Rolling window in trading days.

    Returns
    -------
    dict { sector_name: pd.Series(rolling_corr, index=Date) }
        Each Series has values ∈ [-1, 1].  NaN before the first full window.
    """
    co     = _date_indexed(company_df)
    co_col = f"company_{metric_stem}"

    if co_col not in co.columns:
        raise ValueError(f"Column '{co_col}' not found in company_df.")

    result: Dict[str, pd.Series] = {}

    for sector_name, sector_df in sector_dfs.items():
        se     = _date_indexed(sector_df)
        se_col = f"sector_{metric_stem}"

        if se_col not in se.columns:
            continue

        # Align on shared dates (inner join) → respects each entity's base date
        aligned = pd.concat(
            [co[co_col], se[se_col]], axis=1, join="inner"
        ).dropna()
        aligned.columns = ["co", "se"]

        if len(aligned) < window:
            # Not enough overlap for even one full window
            result[sector_name] = pd.Series(dtype=float)
            continue

        rolling_corr = aligned["co"].rolling(window).corr(aligned["se"])
        result[sector_name] = rolling_corr.dropna()

    return result


def latest_sift_snapshot(
    sift_result: Dict[str, pd.Series],
    metric_stem: str = "return_1d",
) -> pd.DataFrame:
    """
    Collapse a sift_company_sector_corr() result into a tidy DataFrame
    containing only the most recent rolling correlation value per sector.

    Returns
    -------
    pd.DataFrame  shape (n_sectors, 1)
        Index   = sector names
        Column  = metric_stem
    """
    rows = {}
    for sector_name, series in sift_result.items():
        rows[sector_name] = series.iloc[-1] if not series.empty else np.nan

    df = pd.DataFrame.from_dict(rows, orient="index", columns=[metric_stem])
    df.index.name = "Sector"
    return df


def sift_all_metrics(
    company_df: pd.DataFrame,
    sector_dfs: Dict[str, pd.DataFrame],
    metric_stems: list = None,
    window: int = 60,
) -> Dict[str, Dict[str, pd.Series]]:
    """
    Run sift_company_sector_corr() for every metric stem and return a
    nested dict:

        { metric_stem: { sector_name: pd.Series(rolling_corr) } }

    Parameters
    ----------
    metric_stems : list | None   If None, uses all METRIC_STEMS from correlation_matrix.
    """
    if metric_stems is None:
        try:
            from .correlation_matrix import METRIC_STEMS
        except ImportError:
            from correlation_matrix import METRIC_STEMS  # script mode
        metric_stems = METRIC_STEMS
    stems = metric_stems

    return {
        stem: sift_company_sector_corr(company_df, sector_dfs, stem, window)
        for stem in stems
    }


def latest_sift_all_metrics(
    sift_all: Dict[str, Dict[str, pd.Series]],
) -> pd.DataFrame:
    """
    Collapse sift_all_metrics() output into a single Sector × Metric DataFrame
    of the most recent rolling correlation for every (sector, metric) pair.

    Returns
    -------
    pd.DataFrame  shape (n_sectors, n_stems)
        Rows   = sector names
        Columns = metric stems
        Values  = most-recent rolling Pearson corr ∈ [-1, 1]
    """
    frames = {}
    for stem, sift_result in sift_all.items():
        snapshot = latest_sift_snapshot(sift_result, metric_stem=stem)
        frames[stem] = snapshot[stem]

    result = pd.DataFrame(frames)
    result.index.name   = "Sector"
    result.columns.name = "Metric"
    return result
