"""
indicators.py — Rolling technical indicators
---------------------------------------------
Pure computation: takes a Close price Series, returns indicator Series.
No scoring, no signals, no business logic.
Imported by ohlcv_health.py only.
"""

import numpy as np
import pandas as pd


def rolling_z(s: pd.Series, w: int, clip: float = 3.0) -> pd.Series:
    """
    Z-score of s against its own rolling window of length w.

    Parameters
    ----------
    s    : price or return series
    w    : lookback window
    clip : clip z-scores to [-clip, +clip] to prevent extreme outliers
           from distorting the composite and health score.
           Default 3.0 (covers 99.7% of a normal distribution).
    """
    mp = max(5, w // 4)
    mu = s.rolling(w, min_periods=mp).mean()
    sd = s.rolling(w, min_periods=mp).std()
    z  = (s - mu) / sd.replace(0, np.nan)
    # Clip to ±clip std to prevent single extreme events from dominating
    return z.clip(-clip, clip)


def rolling_pct_rank(s: pd.Series, w: int) -> pd.Series:
    """
    Rolling percentile rank (0–100) of each value vs the preceding w values.

    Fix: use exactly w lookback values (not w+1 which was off-by-one).
    """
    mp = max(10, w // 4)

    def _f(arr):
        # arr has length w; last element is current, rest is history
        cur  = arr[-1]
        hist = arr[:-1]
        hist = hist[~np.isnan(hist)]
        if len(hist) == 0:
            return np.nan
        return float(np.mean(hist < cur) * 100)

    return s.rolling(w, min_periods=mp).apply(_f, raw=True)


def ols_slope(log_p: pd.Series, w: int) -> pd.Series:
    """Rolling OLS slope of log-price over window w."""
    x  = np.arange(w, dtype=float)
    x -= x.mean()
    ss = np.dot(x, x)

    def _f(seg):
        if np.isnan(seg).any():
            return np.nan
        return np.dot(x, seg - seg.mean()) / ss

    return log_p.rolling(w).apply(_f, raw=True)


def ema(s: pd.Series, span: int) -> pd.Series:
    return s.ewm(span=span, adjust=False).mean()


def spike_bands(ret: pd.Series, window: int):
    """Returns (q95, q05) rolling quantile bands for spike detection."""
    q95 = ret.rolling(window, min_periods=10).quantile(0.95)
    q05 = ret.rolling(window, min_periods=10).quantile(0.05)
    return q95, q05
