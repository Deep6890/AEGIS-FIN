"""
correlation_matrix.py
---------------------
Correlates one company's metric columns against each sector's metric columns
on their shared (overlapping) dates.

Public API
----------
  build_company_sector_corr(company_df, sector_dfs)           -> pd.DataFrame
  build_rolling_company_corr(company_df, sector_dfs, windows) -> dict[int, pd.DataFrame]
"""

import pandas as pd
import numpy as np
from typing import Dict

# Numeric metric stems that both engines share (no prefix, no label)
METRIC_STEMS = [
    "return_1d",
    "return_5d",
    "return_20d",
    "volatility_20d",
    "atr",
    "drawdown_20d",
    "volume_ratio",
    "momentum",
]


def _date_indexed(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of df with Date as a DatetimeIndex, sorted ascending."""
    df = df.copy()
    if "Date" not in df.columns:
        df = df.reset_index()
    df["Date"] = pd.to_datetime(df["Date"])
    return df.sort_values("Date").set_index("Date")


def build_company_sector_corr(
    company_df: pd.DataFrame,
    sector_dfs: Dict[str, pd.DataFrame],
) -> pd.DataFrame:
    """
    For every sector and every numeric metric stem, compute the Pearson
    correlation between the company's metric and the sector's matching metric
    over their shared date range.

    Parameters
    ----------
    company_df  : pd.DataFrame
        Output of company_engine() for ONE company.
        Must contain columns like  company_return_1d, company_momentum, …

    sector_dfs  : dict { sector_name: sector_df }
        Output of sector_engine() for each sector.
        Each df must contain columns like  sector_return_1d, sector_momentum, …

    Returns
    -------
    pd.DataFrame  shape (n_sectors, n_metric_stems)
        Rows   = sector names
        Columns = metric stems  (return_1d, return_5d, …)
        Values  = Pearson correlation  ∈ [-1, 1],  NaN if insufficient overlap
    """
    co = _date_indexed(company_df)

    rows = {}
    for sector_name, sector_df in sector_dfs.items():
        se = _date_indexed(sector_df)

        correlations = {}
        for stem in METRIC_STEMS:
            co_col = f"company_{stem}"
            se_col = f"sector_{stem}"

            if co_col not in co.columns or se_col not in se.columns:
                correlations[stem] = np.nan
                continue

            # Align on shared dates (inner join) — anchors to each entity's base date
            aligned = pd.concat(
                [co[co_col], se[se_col]], axis=1, join="inner"
            ).dropna()
            aligned.columns = ["co", "se"]

            if len(aligned) < 2:
                correlations[stem] = np.nan
            else:
                correlations[stem] = aligned["co"].corr(aligned["se"])

        rows[sector_name] = correlations

    result = pd.DataFrame(rows).T          # shape: (n_sectors, n_stems)
    result.index.name   = "Sector"
    result.columns.name = "Metric"
    return result


def build_rolling_company_corr(
    company_df: pd.DataFrame,
    sector_dfs: Dict[str, pd.DataFrame],
    windows: list = [20, 60, 100],
) -> Dict[int, pd.DataFrame]:
    """
    For each rolling window, compute the most-recent rolling Pearson correlation
    between the company's metrics and each sector's matching metrics.

    Returns
    -------
    dict { window: pd.DataFrame(shape: n_sectors x n_stems) }
        Values = most-recent rolling Pearson corr over last `window` trading days.
    """
    co = _date_indexed(company_df)
    results = {}

    for window in windows:
        rows = {}
        for sector_name, sector_df in sector_dfs.items():
            se = _date_indexed(sector_df)
            correlations = {}
            for stem in METRIC_STEMS:
                co_col = f"company_{stem}"
                se_col = f"sector_{stem}"

                if co_col not in co.columns or se_col not in se.columns:
                    correlations[stem] = np.nan
                    continue

                aligned = pd.concat(
                    [co[co_col], se[se_col]], axis=1, join="inner"
                ).dropna()
                aligned.columns = ["co", "se"]

                if len(aligned) < window:
                    correlations[stem] = np.nan
                else:
                    rolling = aligned["co"].rolling(window).corr(aligned["se"])
                    correlations[stem] = rolling.dropna().iloc[-1] if not rolling.dropna().empty else np.nan

            rows[sector_name] = correlations

        df = pd.DataFrame(rows).T
        df.index.name   = "Sector"
        df.columns.name = "Metric"
        results[window] = df

    return results
