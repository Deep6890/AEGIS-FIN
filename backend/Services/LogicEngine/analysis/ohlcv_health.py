"""
ohlcv_health.py  v3
--------------------
Self-contained OHLCV health engine.
Only needs a DataFrame with Close (and optionally Open) columns.
Computes everything internally — no external indicator imports needed.

Logic
-----
1. Cumulative close change   — 1M / 1Y / 2Y windows
2. Close Z-score             — rolling 60d; >+3 = upper spike, <-3 = lower spike
3. Z-score change            — day-over-day delta of the z-score (trend of trend)
4. Cumulative Z-score change — running sum of z-score deltas (momentum accumulation)
5. Open-Close spark          — (Close - Open) / Open * 100  (intraday day-wise spark)
6. Volatility                — rolling std of daily returns (annualised), abs-value based
7. Signal + Score            — derived from z-score and cumulative z-change
8. Output                    — latest snapshot dict + full history DataFrame

Input
-----
    ohlcv_df  : pd.DataFrame  — must have Close column; Date as column or index
                                Open column optional (used for spark)
    name      : str           — sector or company name
    label_col : str           — "Sector" | "Company"

Output
------
    dict {
        name, label_col,
        history      : pd.DataFrame  (full time-series of all computed columns),
        latest       : dict          (latest row as JSON-ready dict),
        signal       : str,
        health_score : float | None,
    }
"""

import numpy as np
import pandas as pd

# ── Re-export for backward compat (other modules import from here) ─────────────
from .scoring import safe_div, parse_pct, pct_status, sector_pressure
from .scoring import sector_pressure  # noqa: F811

__all__ = [
    "run_ohlcv_health",
    "compute_macro_overlay",
    "apply_macro_overlay",
    "safe_div", "parse_pct", "pct_status", "sector_pressure",
]

# ── Windows ───────────────────────────────────────────────────────────────────
_W_ZSCORE   = 60    # rolling window for z-score base
_W_VOL      = 20    # rolling window for volatility
_W_1M       = 21    # ~1 trading month
_W_1Y       = 252   # ~1 trading year
_W_2Y       = 504   # ~2 trading years
_SPIKE_THR  = 3.0   # z-score threshold for spike detection

# ── Market phase map ──────────────────────────────────────────────────────────
_PHASE_MAP = {
    ("STRONG", "BULL"):    "Confirmed Uptrend",
    ("STRONG", "BEAR"):    "Distribution Phase",
    ("STRONG", "NEUTRAL"): "Consolidation",
    ("NEUTRAL","BULL"):    "Steady Climb",
    ("NEUTRAL","BEAR"):    "Slow Bleed",
    ("NEUTRAL","NEUTRAL"): "Transition",
    ("WATCH",  "BULL"):    "Bull Exhaustion",
    ("WATCH",  "BEAR"):    "Confirmed Downtrend",
    ("WATCH",  "NEUTRAL"): "Transition",
    ("WEAK",   "BULL"):    "Dead-Cat Bounce",
    ("WEAK",   "BEAR"):    "Capitulation",
    ("WEAK",   "NEUTRAL"): "Transition",
}

_RISK_SENSITIVE = {"IT Sector", "Auto Sector", "Realty Sector", "Metal Sector", "Energy Sector"}
_RISK_DEFENSIVE = {"FMCG Sector", "Pharma Sector", "Gold"}
_SIGNAL_ORDER   = ["WEAK", "WATCH", "NEUTRAL", "STRONG"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _prep(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure DatetimeIndex sorted ascending."""
    df = df.copy()
    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(df["Date"])
        df = df.set_index("Date")
    df.index = pd.to_datetime(df.index)
    return df.sort_index()


def _cumulative_change(close: pd.Series, window: int) -> pd.Series:
    """
    Percentage change from `window` bars ago to today.
    (close_today - close_N_ago) / close_N_ago * 100
    """
    return close.pct_change(periods=window) * 100


def _rolling_zscore(s: pd.Series, w: int = _W_ZSCORE) -> pd.Series:
    """
    Rolling z-score of s over window w.
    z = (s - rolling_mean) / rolling_std
    Not clipped — raw value so spikes at ±3 are visible.
    """
    mp = max(5, w // 4)
    mu = s.rolling(w, min_periods=mp).mean()
    sd = s.rolling(w, min_periods=mp).std().replace(0, np.nan)
    return (s - mu) / sd


def _rolling_vol(ret: pd.Series, w: int = _W_VOL) -> pd.Series:
    """
    Annualised volatility from rolling std of daily returns.
    Uses absolute values as base — captures magnitude regardless of direction.
    vol = rolling_std(|ret|) * sqrt(252) * 100  (as %)
    """
    mp = max(5, w // 4)
    return ret.abs().rolling(w, min_periods=mp).std() * np.sqrt(252) * 100


def _regime(close: pd.Series) -> pd.Series:
    """BULL / BEAR / NEUTRAL from 20d vs 60d EMA direction."""
    e20 = close.ewm(span=20, adjust=False).mean()
    e60 = close.ewm(span=60, adjust=False).mean()
    slope20 = e20.diff()
    slope60 = e60.diff()
    return pd.Series(
        np.where((slope20 > 0) & (slope60 > 0), "BULL",
        np.where((slope20 < 0) & (slope60 < 0), "BEAR", "NEUTRAL")),
        index=close.index,
    )


def _safe_float(v):
    if v is None: return None
    try:
        f = float(v)
        return None if np.isnan(f) or np.isinf(f) else round(f, 4)
    except Exception:
        return None


# ── Core engine ───────────────────────────────────────────────────────────────

def run_ohlcv_health(ohlcv_df: pd.DataFrame, name: str,
                     label_col: str = "Sector",
                     window_short: int = 20,
                     window_long:  int = 60) -> dict:
    """
    Full OHLCV health pipeline.

    Parameters
    ----------
    ohlcv_df     : DataFrame with Close (required) and Open (optional)
    name         : asset name
    label_col    : "Sector" | "Company"
    window_short : short EMA window (default 20)
    window_long  : z-score / health window (default 60)

    Returns
    -------
    dict with keys: name, label_col, history, latest, signal, health_score
    """
    df = _prep(ohlcv_df)

    if "Close" not in df.columns:
        raise ValueError(f"[{name}] DataFrame must have a 'Close' column")

    close = df["Close"].astype(float)
    has_open = "Open" in df.columns
    open_  = df["Open"].astype(float) if has_open else None

    out = pd.DataFrame(index=df.index)
    out[label_col] = name
    out["close"]   = close

    # ── 1. Daily return ───────────────────────────────────────────────────────
    ret = close.pct_change(1)
    out["daily_return"] = ret

    # ── 2. Cumulative close change (1M / 1Y / 2Y) ────────────────────────────
    out["cum_change_1m"] = _cumulative_change(close, _W_1M)
    out["cum_change_1y"] = _cumulative_change(close, _W_1Y)
    out["cum_change_2y"] = _cumulative_change(close, _W_2Y)

    # ── 3. Close Z-score (base value) ────────────────────────────────────────
    # z > +3  → upper spike (price well above recent mean)
    # z < -3  → lower spike (price well below recent mean)
    close_z = _rolling_zscore(close, window_long)
    out["close_z"] = close_z

    # ── 4. Spike detection from z-score ──────────────────────────────────────
    out["spike_up"]   = close_z > _SPIKE_THR
    out["spike_down"] = close_z < -_SPIKE_THR

    # ── 5. Z-score change (trend of the trend) ───────────────────────────────
    # How much the z-score moved day-over-day
    # Positive = z-score rising (price accelerating above mean)
    # Negative = z-score falling (price decelerating / reversing)
    z_change = close_z.diff(1)
    out["z_change"] = z_change

    # ── 6. Cumulative Z-score change (momentum accumulation) ─────────────────
    # Running sum of z_change over the full series
    # Shows how much total z-score drift has accumulated
    out["cum_z_change"] = z_change.cumsum()

    # ── 7. Open-Close spark (intraday day-wise move) ──────────────────────────
    # (Close - Open) / Open * 100
    # Positive = bullish day, Negative = bearish day
    # Large absolute value = sudden intraday spark
    if has_open:
        spark = (close - open_) / open_.replace(0, np.nan) * 100
        out["oc_spark"] = spark
        out["oc_spark_abs"] = spark.abs()   # magnitude regardless of direction
    else:
        out["oc_spark"]     = np.nan
        out["oc_spark_abs"] = np.nan

    # ── 8. Volatility (abs-value based, annualised) ───────────────────────────
    out["volatility"] = _rolling_vol(ret, _W_VOL)

    # ── 9. Return Z-score (for composite) ────────────────────────────────────
    ret_z = _rolling_zscore(ret, window_long)
    out["ret_z"] = ret_z

    # ── 10. Composite score ───────────────────────────────────────────────────
    # Weighted blend:
    #   ret_z        0.35  — recent return momentum
    #   z_change     0.30  — acceleration of price z-score
    #   cum_z_change 0.20  — accumulated trend direction (normalised)
    #   -volatility  0.15  — low vol is rewarded (stability)
    vol_norm = _rolling_zscore(out["volatility"], window_long)
    z_chg_norm = _rolling_zscore(z_change, window_long)
    cum_z_norm = _rolling_zscore(out["cum_z_change"], window_long)

    composite = (
        ret_z.clip(-3, 3)        * 0.35 +
        z_chg_norm.clip(-3, 3)   * 0.30 +
        cum_z_norm.clip(-3, 3)   * 0.20 +
        (-vol_norm.clip(-3, 3))  * 0.15
    )
    out["composite"] = composite

    # ── 11. Health score (0–100) ──────────────────────────────────────────────
    # Rolling percentile rank of composite vs own 60d history
    mp = max(10, window_long // 4)

    def _pct_rank(arr):
        cur  = arr[-1]
        hist = arr[:-1]
        hist = hist[~np.isnan(hist)]
        if len(hist) == 0 or np.isnan(cur):
            return np.nan
        return float(np.mean(hist < cur) * 100)

    health_score = composite.rolling(window_long, min_periods=mp).apply(_pct_rank, raw=True)
    out["health_score"] = health_score

    # ── 12. Signal (from health_score) ───────────────────────────────────────
    hs = health_score
    out["signal"] = np.select(
        [hs.isna(), hs >= 75, hs >= 50, hs >= 25],
        ["INSUFFICIENT_DATA", "STRONG", "NEUTRAL", "WATCH"],
        default="WEAK",
    )

    # ── 13. Regime + Market Phase ─────────────────────────────────────────────
    out["regime"] = _regime(close)
    out["market_phase"] = [
        _PHASE_MAP.get((str(s), str(r)), "Transition")
        for s, r in zip(out["signal"], out["regime"])
    ]

    # ── 14. Trend (EMA crossover) ─────────────────────────────────────────────
    e_short = close.ewm(span=window_short, adjust=False).mean()
    e_long  = close.ewm(span=window_long,  adjust=False).mean()
    out["ema_short"] = e_short
    out["ema_long"]  = e_long
    out["trend"]     = np.where(e_short > e_long, "Upward", "Downward")

    # ── 15. Latest snapshot (JSON-ready) ─────────────────────────────────────
    row = out.iloc[-1]
    dr  = row.get("daily_return", np.nan)

    latest = {
        "name":             name,
        "date":             str(out.index[-1].date()),
        "close":            _safe_float(row["close"]),
        "daily_return_pct": _safe_float(float(dr) * 100) if pd.notna(dr) else None,
        "daily_status":     "UP" if pd.notna(dr) and dr >= 0 else "DOWN",

        # Cumulative changes
        "cum_change_1m":    _safe_float(row.get("cum_change_1m")),
        "cum_change_1y":    _safe_float(row.get("cum_change_1y")),
        "cum_change_2y":    _safe_float(row.get("cum_change_2y")),

        # Z-score family
        "close_z":          _safe_float(row.get("close_z")),
        "ret_z":            _safe_float(row.get("ret_z")),
        "z_change":         _safe_float(row.get("z_change")),
        "cum_z_change":     _safe_float(row.get("cum_z_change")),

        # Spikes
        "spike_up":         bool(row.get("spike_up", False)),
        "spike_down":       bool(row.get("spike_down", False)),

        # Intraday spark
        "oc_spark":         _safe_float(row.get("oc_spark")),
        "oc_spark_abs":     _safe_float(row.get("oc_spark_abs")),

        # Volatility
        "volatility":       _safe_float(row.get("volatility")),

        # Composite & health
        "composite":        _safe_float(row.get("composite")),
        "health_score":     _safe_float(row.get("health_score")),

        # Classification
        "signal":           str(row.get("signal", "INSUFFICIENT_DATA")),
        "regime":           str(row.get("regime", "NEUTRAL")),
        "market_phase":     str(row.get("market_phase", "Transition")),
        "trend":            str(row.get("trend", "")),
    }

    return {
        "name":         name,
        "label_col":    label_col,
        "history":      out,
        "latest":       latest,
        "signal":       latest["signal"],
        "regime":       latest["regime"],
        "market_phase": latest["market_phase"],
        "health_score": latest["health_score"],
    }


# ── Macro overlay ─────────────────────────────────────────────────────────────

def compute_macro_overlay(health_results: dict) -> dict:
    """
    Derive macro risk regime from VIX, USD-INR, Gold, Crude Oil ret_z values.
    Returns { regime, score, narrative, history }
    """
    keys   = ("India VIX", "USD-INR", "Gold", "Crude Oil")
    frames = {}
    for k in keys:
        r = health_results.get(k, {})
        h = r.get("history", pd.DataFrame())
        if not h.empty and "ret_z" in h.columns:
            frames[k] = h["ret_z"].rename(k)

    if not frames:
        return {"regime": "NEUTRAL", "score": 0.0,
                "narrative": "No macro data", "history": pd.DataFrame()}

    combined = pd.concat(frames.values(), axis=1).sort_index()
    score    = pd.concat([-combined[c] for c in combined.columns], axis=1).mean(axis=1)
    regime_s = np.where(score < -0.5, "RISK_OFF",
               np.where(score > 0.5,  "RISK_ON", "NEUTRAL"))

    def _narr(row):
        parts = []
        v = row.get("India VIX", np.nan); u = row.get("USD-INR", np.nan)
        g = row.get("Gold", np.nan);      c = row.get("Crude Oil", np.nan)
        if not pd.isna(v) and v >  0.5: parts.append("VIX up")
        if not pd.isna(v) and v < -0.5: parts.append("VIX down")
        if not pd.isna(u) and u >  0.5: parts.append("INR weak")
        if not pd.isna(g) and g >  0.5: parts.append("Gold up")
        if not pd.isna(c) and c >  0.5: parts.append("Crude up")
        if not pd.isna(c) and c < -0.5: parts.append("Crude down")
        return "; ".join(parts) if parts else "Macro neutral"

    hist = combined.copy()
    hist["macro_score"]     = score
    hist["macro_regime"]    = regime_s
    hist["macro_narrative"] = hist.apply(_narr, axis=1)
    hist = hist.reset_index()
    hist["Date"] = pd.to_datetime(hist["Date"])
    hist = hist.sort_values("Date").reset_index(drop=True)

    return {
        "regime":    str(regime_s[-1]) if len(regime_s) else "NEUTRAL",
        "score":     round(float(score.iloc[-1]) if not score.empty else 0.0, 4),
        "narrative": hist["macro_narrative"].iloc[-1] if not hist.empty else "Macro neutral",
        "history":   hist,
    }


def apply_macro_overlay(sector_name: str, health_result: dict, macro_result: dict) -> dict:
    """
    Shift a sector's signal one level based on macro regime and sector sensitivity.
    """
    sig    = health_result.get("signal", "NEUTRAL")
    regime = macro_result.get("regime", "NEUTRAL")
    sens   = sector_name in _RISK_SENSITIVE
    defe   = sector_name in _RISK_DEFENSIVE

    def _shift(s, d):
        if s not in _SIGNAL_ORDER: return s
        return _SIGNAL_ORDER[max(0, min(len(_SIGNAL_ORDER) - 1, _SIGNAL_ORDER.index(s) + d))]

    if regime == "RISK_OFF":
        adj = _shift(sig, -1) if sens else (_shift(sig, +1) if defe else sig)
    elif regime == "RISK_ON":
        adj = _shift(sig, +1) if sens else (_shift(sig, -1) if defe else sig)
    else:
        adj = sig

    result = dict(health_result)
    result["latest"] = dict(health_result.get("latest", {}))
    result["latest"]["macro_regime"]          = regime
    result["latest"]["macro_narrative"]       = macro_result.get("narrative", "")
    result["latest"]["macro_adjusted_signal"] = adj
    result["macro_adjusted_signal"]           = adj
    return result
