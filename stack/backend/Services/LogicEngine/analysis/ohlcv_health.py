"""
ohlcv_health.py — OHLCV health engine
---------------------------------------
Identical pipeline for sector indices and company stocks.
Delegates indicator computation to indicators.py and scoring to scoring.py.

Input  : OHLCV DataFrame (Close + Date column or DatetimeIndex)
Output : dict { name, label_col, history (DataFrame), latest (dict),
                signal, regime, market_phase, health_score }
"""

import warnings
import numpy as np
import pandas as pd

from .indicators import rolling_z, rolling_pct_rank, ols_slope, ema, spike_bands
from .scoring    import safe_div, parse_pct, pct_status, sector_pressure

warnings.filterwarnings("ignore")

# ── Re-export scoring utilities so other modules can import from one place ────
__all__ = [
    "run_ohlcv_health",
    "compute_macro_overlay", "apply_macro_overlay",
    # scoring utils (re-exported for backward compat)
    "safe_div", "parse_pct", "pct_status", "sector_pressure",
]

# ── Constants ─────────────────────────────────────────────────────────────────

_SIGNAL_ORDER = ["WEAK", "WATCH", "NEUTRAL", "STRONG"]

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


# ── Internal helper ───────────────────────────────────────────────────────────

def _date_index(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "Date" not in df.columns:
        df = df.reset_index()
    df["Date"] = pd.to_datetime(df["Date"])
    return df.sort_values("Date").set_index("Date")


# ── Core engine ───────────────────────────────────────────────────────────────

def run_ohlcv_health(ohlcv_df, name, label_col="Sector", window_short=20, window_long=60):
    """
    Full health pipeline for any OHLCV asset (sector or company).

    Parameters
    ----------
    ohlcv_df     : pd.DataFrame  Must have Close + Date (column or index)
    name         : str
    label_col    : "Sector" | "Company"
    window_short : int  default 20
    window_long  : int  default 60

    Returns
    -------
    dict { name, label_col, history, latest, signal, regime, market_phase, health_score }
    """
    df = _date_index(ohlcv_df)
    if "Close" not in df.columns:
        raise ValueError(f"[{name}] needs a Close column")

    out = pd.DataFrame(index=df.index)
    out[label_col]      = name
    out["Close"]        = df["Close"]
    ret                 = df["Close"].pct_change(1)
    out["daily_return"] = ret

    out["ema_short"] = ema(df["Close"], window_short)
    out["ema_long"]  = ema(df["Close"], window_long)
    out["trend"]     = np.where(out["ema_short"] > out["ema_long"], "Upward", "Downward")

    q95, q05          = spike_bands(ret, window_long)
    out["spike_up"]   = ret > q95
    out["spike_down"] = ret < q05

    out["ret_z"]      = rolling_z(ret, window_long)
    out["vol_z"]      = -rolling_z(ret.rolling(window_short, min_periods=5).std(), window_long)
    out["momentum_z"] = rolling_z(out["ema_short"] - out["ema_long"], window_long)
    log_c             = np.log(df["Close"].replace(0, np.nan))
    slope_s           = ols_slope(log_c, window_short)
    out["slope_z"]    = rolling_z(slope_s, window_long)
    out["composite"]  = out[["ret_z", "vol_z", "momentum_z", "slope_z"]].mean(axis=1)
    out["health_score"] = rolling_pct_rank(out["composite"], window_long)

    hs  = out["health_score"]
    q75 = hs.rolling(window_long, min_periods=10).quantile(0.75)
    q50 = hs.rolling(window_long, min_periods=10).quantile(0.50)
    q25 = hs.rolling(window_long, min_periods=10).quantile(0.25)
    out["signal"] = np.select(
        [hs.isna() | q75.isna(), hs >= q75, hs >= q50, hs >= q25],
        ["INSUFFICIENT_DATA", "STRONG", "NEUTRAL", "WATCH"],
        default="WEAK",
    )

    slope_l = ols_slope(log_c, window_long)
    out["regime"] = np.where(
        (slope_s > 0) & (slope_l > 0), "BULL",
        np.where((slope_s < 0) & (slope_l < 0), "BEAR", "NEUTRAL"),
    )
    out["market_phase"] = [
        _PHASE_MAP.get((str(s), str(r)), "Transition")
        for s, r in zip(out["signal"], out["regime"])
    ]
    out["date_flag"] = out.index.strftime("%Y-%m-%d")

    row    = out.iloc[-1]
    dr     = row.get("daily_return", np.nan)
    hs_val = row.get("health_score", np.nan)

    latest = {
        "name":             name,
        "date":             str(out.index[-1].date()),
        "close":            float(row["Close"]) if pd.notna(row["Close"]) else None,
        "daily_return_pct": round(float(dr) * 100, 3) if pd.notna(dr) else None,
        "daily_status":     "UP" if pd.notna(dr) and dr >= 0 else "DOWN",
        "health_score":     round(float(hs_val), 2) if pd.notna(hs_val) else None,
        "composite":        round(float(row.get("composite", np.nan)), 4)
                            if pd.notna(row.get("composite")) else None,
        "signal":           str(row.get("signal", "INSUFFICIENT_DATA")),
        "regime":           str(row.get("regime", "NEUTRAL")),
        "market_phase":     str(row.get("market_phase", "Transition")),
        "trend":            str(row.get("trend", "")),
        "spike_up":         bool(row.get("spike_up", False)),
        "spike_down":       bool(row.get("spike_down", False)),
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
    Derive daily macro risk regime from VIX, USD-INR, Gold, Crude Oil.
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
               np.where(score > 0.5, "RISK_ON", "NEUTRAL"))

    def _narr(row):
        p = []
        v = row.get("India VIX", np.nan); u = row.get("USD-INR", np.nan)
        g = row.get("Gold", np.nan);      c = row.get("Crude Oil", np.nan)
        if not pd.isna(v) and v >  0.5: p.append("VIX up")
        if not pd.isna(v) and v < -0.5: p.append("VIX down")
        if not pd.isna(u) and u >  0.5: p.append("INR weak")
        if not pd.isna(g) and g >  0.5: p.append("Gold up")
        if not pd.isna(c) and c >  0.5: p.append("Crude up")
        if not pd.isna(c) and c < -0.5: p.append("Crude down")
        return "; ".join(p) if p else "Macro neutral"

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
    Returns updated health_result with macro_adjusted_signal.
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
