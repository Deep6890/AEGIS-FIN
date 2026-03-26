"""
sector_health.py
----------------
Per-day sector health matrix — FULLY DATA-DRIVEN.

No hand-crafted weights, thresholds, or magic numbers.
Every signal derives its cut-offs from the rolling statistics of the data itself.

Strategy
--------
  • raw features computed (returns, EMA spread, volatility, OLS slope)
  • each feature is Z-scored against its OWN rolling history
    → no external benchmark, no fixed thresholds
  • composite = EQUAL-WEIGHT average of all valid Z-scores
    → no manual weighting
  • health_score = rolling percentile rank of composite within its OWN
    rolling window  (0–100, where 100 = historically strongest day)
    → adapts to each sector's own distribution
  • signal = quartile of health_score within its own rolling history
    → STRONG (top 25 %), NEUTRAL (50–75 %), WATCH (25–50 %), WEAK (bottom 25 %)
    → thresholds are the rolling 25th / 50th / 75th percentile of health_score

Spike detection:
  Up/down spikes flagged when today's return is outside its rolling
  [q05, q95] quantile band — bounds estimated per-sector, per-day.

Public API
----------
  compute_sector_health(sector_df, sector_name, window_short, window_long)
      -> pd.DataFrame  (Date index, one row per trading day)

  run_all_sector_health(sector_dfs, window_short, window_long)
      -> dict { sector_name: pd.DataFrame }

  sector_health_on_date(health_dfs, date)
      -> pd.DataFrame  (one row per sector for a single date)

  rolling_health_matrix(health_dfs, cols)
      -> pd.DataFrame  (long: Date | Sector | signal | health_score | …)
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _ensure_date_index(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "Date" not in df.columns:
        df = df.reset_index()
    df["Date"] = pd.to_datetime(df["Date"])
    return df.sort_values("Date").set_index("Date")


def _rolling_zscore(series: pd.Series, window: int) -> pd.Series:
    """Z-score of each value relative to its own rolling (window) history."""
    mu  = series.rolling(window, min_periods=max(5, window // 4)).mean()
    std = series.rolling(window, min_periods=max(5, window // 4)).std()
    return (series - mu) / std.replace(0, np.nan)


def _rolling_percentile_rank(series: pd.Series, window: int) -> pd.Series:
    """
    For each row, compute the percentile rank of that value within the previous
    `window` observations of the series.  Pure data-driven 0-100 score.
    """
    def _pct_rank(arr):
        v = arr[-1]
        hist = arr[:-1]
        if len(hist) == 0 or np.all(np.isnan(hist)):
            return np.nan
        hist = hist[~np.isnan(hist)]
        if len(hist) == 0:
            return np.nan
        return float(np.mean(hist <= v) * 100)

    return series.rolling(window + 1, min_periods=max(10, window // 4)).apply(
        _pct_rank, raw=True
    )


def _rolling_ols_slope(log_price: pd.Series, window: int) -> pd.Series:
    """
    Rolling OLS slope of log-price ~ time over `window` bars.
    Demeaned t-vector avoids intercept.  Returns slope per bar (≈ daily log-return).
    """
    x = np.arange(window, dtype=float)
    x -= x.mean()
    ss_x = np.dot(x, x)

    def _slope(seg):
        y = seg
        if np.isnan(y).any():
            return np.nan
        return np.dot(x, y - y.mean()) / ss_x

    return log_price.rolling(window).apply(_slope, raw=True)


# ─────────────────────────────────────────────────────────────────────────────
# Single-sector health engine
# ─────────────────────────────────────────────────────────────────────────────

def compute_sector_health(
    sector_df:    pd.DataFrame,
    sector_name:  str,
    window_short: int = 20,
    window_long:  int = 60,
) -> pd.DataFrame:
    """
    Compute a full daily health matrix for ONE sector.

    All thresholds and weights are derived from the sector's own price history.

    Parameters
    ----------
    sector_df    : OHLCV DataFrame (Date column or DatetimeIndex).
                   Output of sector_engine() or raw yfinance data both accepted.
    sector_name  : Label stored in the 'Sector' column.
    window_short : Short rolling window in trading days (default 20).
    window_long  : Long  rolling window in trading days (default 60).

    Returns
    -------
    pd.DataFrame with DatetimeIndex and columns:
        Sector, Close, daily_return,
        ema_short, ema_long, trend,
        spike_up, spike_down,
        ret_z, vol_z, momentum_z, slope_z,
        composite, health_score, signal,
        date_flag
    """
    df = _ensure_date_index(sector_df)

    if "Close" not in df.columns:
        raise ValueError(f"[{sector_name}] DataFrame must contain 'Close' column.")

    out = pd.DataFrame(index=df.index)
    out["Sector"] = sector_name
    out["Close"]  = df["Close"]

    # ── Daily return ─────────────────────────────────────────────────────────
    ret = df["Close"].pct_change(1)
    out["daily_return"] = ret

    # ── EMA trend (direction only, no fixed span ratio) ───────────────────────
    out["ema_short"] = df["Close"].ewm(span=window_short, adjust=False).mean()
    out["ema_long"]  = df["Close"].ewm(span=window_long,  adjust=False).mean()
    out["trend"]     = np.where(out["ema_short"] > out["ema_long"], "Upward", "Downward")

    # ── Spike detection: rolling quantile band [q5, q95] of returns ──────────
    # All thresholds come from the data's own rolling distribution
    q95 = ret.rolling(window_long, min_periods=10).quantile(0.95)
    q05 = ret.rolling(window_long, min_periods=10).quantile(0.05)
    out["spike_up"]   = ret > q95
    out["spike_down"] = ret < q05

    # ── Feature Z-scores (each vs its OWN rolling history) ───────────────────

    # 1. Return Z-score
    out["ret_z"] = _rolling_zscore(ret, window_long)

    # 2. Volatility Z-score (rolling std of returns, then Z of that)
    vol = ret.rolling(window_short, min_periods=5).std()
    out["vol_z"] = _rolling_zscore(vol, window_long)
    # Invert so HIGH volatility → negative z (bad for health)
    out["vol_z"] = -out["vol_z"]

    # 3. Momentum Z-score (EMA spread, normalised vs its own history)
    momentum_raw = out["ema_short"] - out["ema_long"]
    out["momentum_z"] = _rolling_zscore(momentum_raw, window_long)

    # 4. Price-slope Z-score (OLS slope of log price vs its own history)
    log_close = np.log(df["Close"].replace(0, np.nan))
    slope = _rolling_ols_slope(log_close, window_short)
    out["slope_z"] = _rolling_zscore(slope, window_long)

    # ── Composite: EQUAL-WEIGHT average of all valid feature Z-scores ─────────
    # No manual weights — each feature contributes equally.
    # NaN features are excluded from the average on that day.
    z_cols = ["ret_z", "vol_z", "momentum_z", "slope_z"]
    z_frame = out[z_cols]
    out["composite"] = z_frame.mean(axis=1)   # rowwise nanmean via pandas default

    # ── Health score: rolling percentile rank of composite vs its OWN history ─
    # 0 = historically weakest day for this sector,  100 = historically strongest
    out["health_score"] = _rolling_percentile_rank(out["composite"], window_long)

    # ── Signal: data-driven quartile labels using rolling quantiles ───────────
    # Cut-points are the rolling 25th / 50th / 75th pct of health_score itself.
    # Adapts to every sector's own distribution — no fixed numbers.
    hs = out["health_score"]
    q75 = hs.rolling(window_long, min_periods=10).quantile(0.75)
    q50 = hs.rolling(window_long, min_periods=10).quantile(0.50)
    q25 = hs.rolling(window_long, min_periods=10).quantile(0.25)

    conditions = [
        hs.isna() | q75.isna(),
        hs >= q75,
        hs >= q50,
        hs >= q25,
    ]
    choices = ["INSUFFICIENT_DATA", "STRONG", "NEUTRAL", "WATCH"]
    out["signal"] = np.select(conditions, choices, default="WEAK")

    # ── Regime: sign of both slopes (fully data-derived) ─────────────────────
    slope_long = _rolling_ols_slope(log_close, window_long)
    regime = np.where(
        (slope > 0) & (slope_long > 0), "BULL",
        np.where((slope < 0) & (slope_long < 0), "BEAR", "NEUTRAL")
    )
    out["regime"] = regime

    # ── Date stamp ───────────────────────────────────────────────────────────
    out["date_flag"] = out.index.strftime("%Y-%m-%d")

    return out


# ─────────────────────────────────────────────────────────────────────────────
# Multi-sector runner
# ─────────────────────────────────────────────────────────────────────────────

def run_all_sector_health(
    sector_dfs:   Dict[str, pd.DataFrame],
    window_short: int = 20,
    window_long:  int = 60,
) -> Dict[str, pd.DataFrame]:
    """
    Run compute_sector_health() for every sector.

    Returns
    -------
    { sector_name: pd.DataFrame (Date index, full health matrix) }
    """
    results = {}
    for name, raw_df in sector_dfs.items():
        print(f"  [health] {name} ...", end=" ", flush=True)
        try:
            h = compute_sector_health(raw_df, name, window_short, window_long)
            results[name] = h
            print(f"OK ({len(h)} rows)")
        except Exception as exc:
            print(f"FAILED: {exc}")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Cross-section helpers
# ─────────────────────────────────────────────────────────────────────────────

def sector_health_on_date(
    health_dfs: Dict[str, pd.DataFrame],
    date: str,
) -> pd.DataFrame:
    """
    Return a single-date snapshot of all sectors' health metrics.

    Uses exact-date match; falls back to the nearest prior trading date.
    """
    target = pd.Timestamp(date)
    rows = []
    for name, df in health_dfs.items():
        if target in df.index:
            rows.append(df.loc[target].to_dict())
        else:
            prior = df.index[df.index <= target]
            if len(prior) > 0:
                rows.append(df.loc[prior[-1]].to_dict())
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows).reset_index(drop=True)


def rolling_health_matrix(
    health_dfs: Dict[str, pd.DataFrame],
    cols: Optional[List[str]] = None,
) -> pd.DataFrame:
    """
    Concatenate all sector health DataFrames into a LONG-format matrix.

        Date | Sector | signal | health_score | trend | regime | …

    No day is missing beyond the initial warm-up window.
    """
    default_cols = [
        "Sector", "Close", "daily_return",
        "trend", "spike_up", "spike_down",
        "composite", "health_score", "signal", "regime", "date_flag",
    ]
    keep = cols or default_cols

    frames = []
    for name, df in health_dfs.items():
        tmp = df.reset_index()
        tmp["Sector"] = name
        available = [c for c in keep if c in tmp.columns]
        date_col = ["Date"] if "Date" in tmp.columns else []
        frames.append(tmp[date_col + [c for c in available if c != "Date"]])

    if not frames:
        return pd.DataFrame()

    result = pd.concat(frames, ignore_index=True)
    result["Date"] = pd.to_datetime(result["Date"])
    return result.sort_values(["Date", "Sector"]).reset_index(drop=True)
