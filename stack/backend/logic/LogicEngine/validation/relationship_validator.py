"""
relationship_validator.py
-------------------------
Validates whether a company's return is genuinely and persistently
correlated with each sector index.

Three-stage filter
------------------
1. Lag correlation  : test lags 0-5 days on return_1d against the FULL
                      unaligned series so each lag independently aligns
                      its own date overlap. Picks the lag with highest |r|.
                      This correctly catches sector-leads-company patterns.

2. Statistical test : Pearson p-value < 0.05 AND |r| >= 0.25 (effect size).
                      p-value alone is useless at large N (always near 0),
                      so effect size guards against weak-but-significant noise.

3. Long-term check  : split full shared history into 3 equal periods.
                      Correlation sign must be consistent and |r| >= 0.2
                      in every period (not a one-era fluke).

Public API
----------
  validate_relationships(company_df, sector_dfs) -> pd.DataFrame
"""

import pandas as pd
import numpy as np
from scipy import stats
from typing import Dict

METRIC = "return_1d"
LAGS   = [0, 1, 2, 3, 5]

# Minimum effect size — filters weak-but-statistically-significant noise
MIN_EFFECT_SIZE = 0.25


def _date_indexed(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "Date" not in df.columns:
        df = df.reset_index()
    df["Date"] = pd.to_datetime(df["Date"])
    return df.sort_values("Date").set_index("Date")


def _best_lag(co_series: pd.Series, se_series: pd.Series) -> tuple:
    """
    Test each lag independently on the full unaligned series.
    Sector is shifted forward by `lag` days (sector[t-lag] vs company[t]).
    Each lag does its own inner alignment after the shift.
    Returns (best_lag, correlation, p_value).
    """
    best = {"lag": 0, "r": np.nan, "p": 1.0}

    for lag in LAGS:
        # shift on the original full series, then align — each lag gets its own overlap
        se_shifted = se_series.shift(lag)
        combined   = pd.concat([co_series, se_shifted], axis=1).dropna()
        combined.columns = ["co", "se"]

        if len(combined) < 60:
            continue

        r, p = stats.pearsonr(combined["co"], combined["se"])

        if np.isnan(best["r"]) or abs(r) > abs(best["r"]):
            best = {"lag": lag, "r": r, "p": p}

    return best["lag"], best["r"], best["p"]


def _period_correlations(co_series: pd.Series, se_series: pd.Series, lag: int) -> list:
    """
    Align series at the best lag, split into 3 equal time periods,
    return Pearson r for each period.
    """
    se_shifted = se_series.shift(lag)
    aligned    = pd.concat([co_series, se_shifted], axis=1).dropna()
    aligned.columns = ["co", "se"]

    n = len(aligned)
    if n < 90:  # need at least 30 rows per period
        return [np.nan, np.nan, np.nan]

    size = n // 3
    return [
        aligned.iloc[:size]["co"].corr(aligned.iloc[:size]["se"]),
        aligned.iloc[size: 2 * size]["co"].corr(aligned.iloc[size: 2 * size]["se"]),
        aligned.iloc[2 * size:]["co"].corr(aligned.iloc[2 * size:]["se"]),
    ]


def validate_relationships(
    company_df: pd.DataFrame,
    sector_dfs: Dict[str, pd.DataFrame],
    p_threshold: float = 0.05,
    min_period_corr: float = 0.2,
) -> pd.DataFrame:
    """
    Run all three validation stages for every sector.

    Parameters
    ----------
    company_df      : output of company_engine()
    sector_dfs      : { sector_name: sector_df }
    p_threshold     : max allowed p-value  (default 0.05)
    min_period_corr : min |r| in every sub-period (default 0.2)

    Returns
    -------
    pd.DataFrame sorted by |correlation| descending.
    Columns: sector, lag_days, correlation, p_value,
             period_1_r, period_2_r, period_3_r
    """
    co     = _date_indexed(company_df)
    co_col = f"company_{METRIC}"

    if co_col not in co.columns:
        raise ValueError(f"Column '{co_col}' not found in company_df.")

    rows = []

    for sector_name, sector_df in sector_dfs.items():
        se     = _date_indexed(sector_df)
        se_col = f"sector_{METRIC}"

        if se_col not in se.columns:
            continue

        co_s = co[co_col]
        se_s = se[se_col]

        # Stage 1 — find best lag on full unaligned series
        lag, r, p = _best_lag(co_s, se_s)

        if np.isnan(r):
            continue

        # Stage 2 — p-value + effect size
        if p >= p_threshold or abs(r) < MIN_EFFECT_SIZE:
            continue

        # Stage 3 — long-term persistence across 3 time periods
        p1, p2, p3 = _period_correlations(co_s, se_s, lag)

        if any(np.isnan(v) for v in [p1, p2, p3]):
            continue

        signs_consistent  = (np.sign(p1) == np.sign(p2) == np.sign(p3))
        all_strong_enough = all(abs(v) >= min_period_corr for v in [p1, p2, p3])

        if not (signs_consistent and all_strong_enough):
            continue

        rows.append({
            "sector":      sector_name,
            "lag_days":    lag,
            "correlation": round(r, 4),
            "p_value":     f"{p:.2e}",   # scientific notation — readable at large N
            "period_1_r":  round(p1, 4),
            "period_2_r":  round(p2, 4),
            "period_3_r":  round(p3, 4),
        })

    result = pd.DataFrame(rows)
    if result.empty:
        return result

    return result.sort_values("correlation", key=abs, ascending=False).reset_index(drop=True)
