"""
scoring.py — Shared scoring utilities
--------------------------------------
Stateless helpers. No imports from other analysis modules.
Used by balance_sheet, stock_holding, and any module that needs
percentile ranking or sector pressure aggregation.

ohlcv_health.py no longer imports from here — it is fully self-contained.
"""

import numpy as np
import pandas as pd


def safe_div(a, b) -> float:
    """Return a / b, or np.nan on zero / NaN / exception."""
    try:
        return np.nan if (b == 0 or pd.isna(b) or pd.isna(a)) else float(a) / float(b)
    except Exception:
        return np.nan


def parse_pct(val) -> float:
    """Parse '12.5%' or 0.125 → float on 0-100 scale."""
    if pd.isna(val):
        return np.nan
    try:
        v = float(str(val).replace("%", "").strip())
        return v if abs(v) > 1 else v * 100
    except Exception:
        return np.nan


def pct_status(value, history) -> str:
    """
    Data-driven label: where does value sit in its own historical distribution?
    green  ≥ 75th pct
    red    ≤ 25th pct
    amber  middle
    gray   insufficient data
    """
    h = pd.Series(history).dropna()
    if pd.isna(value) or len(h) < 4:
        return "gray"
    rank = float(np.mean(h < value) * 100)
    return "green" if rank >= 75 else "red" if rank <= 25 else "amber"


def sector_pressure(health_results: dict, top_names: list, window: int = 20) -> tuple:
    """
    Aggregate recent health scores from correlated assets into a pressure scalar.
    Uses mean (not median) for a smoother signal.

    Returns
    -------
    (pressure, pct_rank, q75, q25, named_str)
    All np.nan / '' when data is insufficient.
    """
    all_s, recent_s = [], []
    for name in top_names:
        r    = health_results.get(name, {})
        hist = r.get("history", pd.DataFrame())
        if hist.empty or "health_score" not in hist.columns:
            continue
        scores = hist["health_score"].dropna()
        all_s.extend(scores.tolist())
        rec = scores.tail(window)
        if not rec.empty:
            recent_s.append(float(rec.mean()))

    if not recent_s or not all_s:
        return np.nan, np.nan, np.nan, np.nan, ""

    arr = np.array(all_s)
    p   = float(np.mean(recent_s))
    return (
        p,
        float(np.mean(arr < p) * 100),
        float(np.percentile(arr, 75)),
        float(np.percentile(arr, 25)),
        ", ".join(top_names[:3]),
    )