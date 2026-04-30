"""
ohlcv_health.py
---------------
OHLCV health engine. Needs Close price; Open is optional.
Self-contained — only numpy and pandas required.

Computed fields
---------------
  1. daily_return      — % change close-to-close
  2. cum_change_*      — cumulative % change over configurable windows
  3. close_z           — rolling z-score of close price (base z-score)
                         > +3 → upper spike  |  < -3 → lower spike
  4. spike_up/down     — bool flags from close_z threshold
  5. z_change          — day-over-day change in close_z  (trend velocity)
  6. cum_z_change      — cumulative sum of z_change  (momentum accumulation)
  7. oc_spark          — (Close − Open) / Open × 100  (intraday spark)
  8. oc_spark_abs      — |oc_spark|
  9. volatility        — rolling std of |daily_return|, annualised
 10. ret_z             — rolling z-score of daily_return
 11. composite         — weighted blend of normalised z-scores
 12. health_score      — 0–100 rolling percentile rank of composite
 13. signal            — STRONG / NEUTRAL / WATCH / WEAK / INSUFFICIENT_DATA

Output dict
-----------
{
    "name"        : str,
    "history"     : pd.DataFrame,   # full column set
    "latest"      : dict,            # JSON-ready snapshot of last row
    "signal"      : str,
    "health_score": float | None,
}
"""

import numpy as np
import pandas as pd

__all__ = ["run_ohlcv_health"]

# ── Windows (trading days) ────────────────────────────────────────────────────
_W_Z    = 60    # z-score rolling window
_W_VOL  = 20    # volatility rolling window
_W_1M   = 21    # ~1 trading month
_W_1Y   = 252   # ~1 trading year
_W_2Y   = 504   # ~2 trading years
_SPIKE  = 3.0   # z-score spike threshold


# ── Private helpers ───────────────────────────────────────────────────────────

def _prep(df: pd.DataFrame) -> pd.DataFrame:
    """Normalise index to DatetimeIndex, sorted ascending."""
    df = df.copy()
    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(df["Date"])
        df = df.set_index("Date")
    df.index = pd.to_datetime(df.index)
    return df.sort_index()


def _zscore(s: pd.Series, w: int) -> pd.Series:
    """
    Rolling z-score.  NOT clipped so ±3 spikes remain visible as outliers.
    min_periods = max(5, w // 4) to avoid NaN for the whole warmup period.
    """
    mp = max(5, w // 4)
    mu = s.rolling(w, min_periods=mp).mean()
    sd = s.rolling(w, min_periods=mp).std().replace(0, np.nan)
    return (s - mu) / sd


def _vol(ret: pd.Series, w: int) -> pd.Series:
    """
    Annualised volatility via abs(return).
    Using absolute value captures magnitude regardless of direction.
    """
    mp = max(5, w // 4)
    return ret.abs().rolling(w, min_periods=mp).std() * np.sqrt(252) * 100


def _f(v):
    """Safe float for JSON output — returns None on NaN/Inf."""
    if v is None:
        return None
    try:
        f = float(v)
        return None if (np.isnan(f) or np.isinf(f)) else round(f, 4)
    except Exception:
        return None


def _rank(arr: np.ndarray) -> float:
    """Percentile rank of last element vs rest. Used in rolling apply."""
    cur  = arr[-1]
    hist = arr[:-1]
    hist = hist[~np.isnan(hist)]
    if len(hist) == 0 or np.isnan(cur):
        return np.nan
    return float(np.mean(hist < cur) * 100)


# ── Core engine ───────────────────────────────────────────────────────────────

def run_ohlcv_health(
    ohlcv_df: pd.DataFrame,
    name: str,
    *,
    cum_windows: dict | None = None,   # e.g. {"1m": 21, "1y": 252, "2y": 504}
    window_z:    int = _W_Z,
    window_vol:  int = _W_VOL,
    spike_thr:   float = _SPIKE,
) -> dict:
    """
    Run full OHLCV health analysis on any asset.

    Parameters
    ----------
    ohlcv_df    : DataFrame with at least a 'Close' column (and optionally 'Open').
                  Index or a 'Date' column is used as the time axis.
    name        : Asset label (sector, company, index — anything).
    cum_windows : Dict of label → trading-day window for cumulative change.
                  Defaults to {"1m": 21, "1y": 252, "2y": 504}.
    window_z    : Rolling window for z-scores (default 60).
    window_vol  : Rolling window for volatility (default 20).
    spike_thr   : Z-score magnitude that flags a spike (default 3.0).

    Returns
    -------
    {
        "name"        : str,
        "history"     : pd.DataFrame,
        "latest"      : dict,
        "signal"      : str,
        "health_score": float | None,
    }
    """
    df = _prep(ohlcv_df)
    if "Close" not in df.columns:
        raise ValueError(f"[{name}] DataFrame must have a 'Close' column.")

    close    = df["Close"].astype(float)
    has_open = "Open" in df.columns
    open_    = df["Open"].astype(float) if has_open else None

    if cum_windows is None:
        cum_windows = {"1m": _W_1M, "1y": _W_1Y, "2y": _W_2Y}

    out = pd.DataFrame(index=df.index)

    # ── 1. Daily return ───────────────────────────────────────────────────────
    ret = close.pct_change(1)
    out["daily_return"] = ret

    # ── 2. Cumulative close change over each requested window ─────────────────
    for label, w in cum_windows.items():
        out[f"cum_change_{label}"] = close.pct_change(w) * 100

    # ── 3. Close z-score — BASE z-score value ────────────────────────────────
    #   > +spike_thr → price far above rolling mean (upper outlier)
    #   < -spike_thr → price far below rolling mean (lower outlier)
    close_z = _zscore(close, window_z)
    out["close_z"] = close_z

    # ── 4. Spike flags ────────────────────────────────────────────────────────
    out["spike_up"]   = close_z >  spike_thr
    out["spike_down"] = close_z < -spike_thr

    # ── 5. Z-score change — velocity of the z-score ───────────────────────────
    #   Positive → z-score accelerating upward (trend strengthening)
    #   Negative → z-score falling (trend weakening / reversing)
    z_change = close_z.diff(1)
    out["z_change"] = z_change

    # ── 6. Cumulative z-score change — total momentum drift ───────────────────
    out["cum_z_change"] = z_change.cumsum()

    # ── 7. Open-Close intraday spark ──────────────────────────────────────────
    #   (Close − Open) / Open × 100
    #   Positive = bullish day  |  Negative = bearish day
    #   Large |value| = sudden intraday move
    if has_open:
        spark = (close - open_) / open_.replace(0, np.nan) * 100
        out["oc_spark"]     = spark
        out["oc_spark_abs"] = spark.abs()
    else:
        out["oc_spark"]     = np.nan
        out["oc_spark_abs"] = np.nan

    # ── 8. Volatility — abs-based, annualised ─────────────────────────────────
    out["volatility"] = _vol(ret, window_vol)

    # ── 9. Return z-score ────────────────────────────────────────────────────
    ret_z = _zscore(ret, window_z)
    out["ret_z"] = ret_z

    # ── 10. Composite score ──────────────────────────────────────────────────
    #   All inputs normalised via z-score before blending.
    #   Weights: ret_z 35% | z_change 30% | cum_z_change 20% | -vol 15%
    #   Low volatility is rewarded (stability signals health).
    z_chg_n = _zscore(z_change,            window_z).clip(-3, 3)
    cum_z_n = _zscore(out["cum_z_change"], window_z).clip(-3, 3)
    vol_n   = _zscore(out["volatility"],   window_z).clip(-3, 3)

    composite = (
        ret_z.clip(-3, 3) * 0.35 +
        z_chg_n           * 0.30 +
        cum_z_n           * 0.20 +
        (-vol_n)          * 0.15
    )
    out["composite"] = composite

    # ── 11. Health score 0–100 ───────────────────────────────────────────────
    #   Rolling percentile rank of composite vs its own history.
    mp = max(10, window_z // 4)
    health = composite.rolling(window_z, min_periods=mp).apply(_rank, raw=True)
    out["health_score"] = health

    # ── 12. Signal ───────────────────────────────────────────────────────────
    out["signal"] = np.select(
        [health.isna(), health >= 75, health >= 50, health >= 25],
        ["INSUFFICIENT_DATA", "STRONG", "NEUTRAL", "WATCH"],
        default="WEAK",
    )

    # ── Latest snapshot (JSON-ready) ─────────────────────────────────────────
    row = out.iloc[-1]
    dr  = row.get("daily_return", np.nan)

    cum_latest = {
        f"cum_change_{lbl}": _f(row.get(f"cum_change_{lbl}"))
        for lbl in cum_windows
    }

    latest: dict = {
        "name":  name,
        "date":  str(out.index[-1].date()),
        "close": _f(close.iloc[-1]),

        # Daily return
        "daily_return_pct": _f(float(dr) * 100) if pd.notna(dr) else None,
        "daily_status":     "UP" if pd.notna(dr) and dr >= 0 else "DOWN",

        # Cumulative close changes (dynamic keys)
        **cum_latest,

        # Z-score family
        "close_z":      _f(row.get("close_z")),
        "ret_z":        _f(row.get("ret_z")),
        "z_change":     _f(row.get("z_change")),
        "cum_z_change": _f(row.get("cum_z_change")),

        # Spike detection
        "spike_up":   bool(row.get("spike_up",   False)),
        "spike_down": bool(row.get("spike_down", False)),

        # Intraday spark
        "oc_spark":     _f(row.get("oc_spark")),
        "oc_spark_abs": _f(row.get("oc_spark_abs")),

        # Volatility
        "volatility": _f(row.get("volatility")),

        # Composite + health
        "composite":    _f(row.get("composite")),
        "health_score": _f(row.get("health_score")),

        # Classification
        "signal": str(row.get("signal", "INSUFFICIENT_DATA")),
    }

    return {
        "name":         name,
        "history":      out,
        "latest":       latest,
        "signal":       latest["signal"],
        "health_score": latest["health_score"],
    }