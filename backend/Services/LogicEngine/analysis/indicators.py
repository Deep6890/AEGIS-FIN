"""
indicators.py — Rolling technical indicators
---------------------------------------------
Pure computation: takes a Close price Series, returns indicator Series.
No scoring, no signals, no business logic.
Imported by ohlcv_health.py only.
"""

import numpy as np
import pandas as pd


def rolling_z(s: pd.Series, w: int) -> pd.Series:
    """Z-score of s against its own rolling window of length w."""
    mp = max(5, w // 4)
    mu = s.rolling(w, min_periods=mp).mean()
    sd = s.rolling(w, min_periods=mp).std()
    return (s - mu) / sd.replace(0, np.nan)


def rolling_pct_rank(s: pd.Series, w: int) -> pd.Series:
    """Rolling percentile rank (0–100) of each value vs preceding w values."""
    def _f(arr):
        h = arr[:-1]; h = h[~np.isnan(h)]
        return float(np.mean(h < arr[-1]) * 100) if len(h) else np.nan
    return s.rolling(w + 1, min_periods=max(10, w // 4)).apply(_f, raw=True)


def ols_slope(log_p: pd.Series, w: int) -> pd.Series:
    """Rolling OLS slope of log-price over window w."""
    x = np.arange(w, dtype=float); x -= x.mean(); ss = np.dot(x, x)
    def _f(seg):
        return np.nan if np.isnan(seg).any() else np.dot(x, seg - seg.mean()) / ss
    return log_p.rolling(w).apply(_f, raw=True)


def ema(s: pd.Series, span: int) -> pd.Series:
    return s.ewm(span=span, adjust=False).mean()


def spike_bands(ret: pd.Series, window: int):
    """Returns (q95, q05) rolling quantile bands for spike detection."""
    q95 = ret.rolling(window, min_periods=10).quantile(0.95)
    q05 = ret.rolling(window, min_periods=10).quantile(0.05)
    return q95, q05
