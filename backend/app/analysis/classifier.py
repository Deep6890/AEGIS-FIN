"""
classifier.py
-------------
Classifies each company daily using numeric pipeline outputs only.
All inputs are floats. Output is numeric-heavy with one label string.
"""

import numpy as np


# ── Class thresholds ──────────────────────────────────────────────────────────
_CLASSES = [
    (80, "STRONG"),
    (60, "POSITIVE"),
    (40, "NEUTRAL"),
    (20, "WEAK"),
    (0,  "DISTRESSED"),
]


def _safe(v, default=0.0) -> float:
    if v is None:
        return default
    try:
        f = float(v)
        return default if (f != f or abs(f) == float("inf")) else f
    except Exception:
        return default


def _clamp(v: float, lo=0.0, hi=100.0) -> float:
    return max(lo, min(hi, v))


# ── Sub-scores ────────────────────────────────────────────────────────────────

def _trend_score(ohlcv_latest: dict) -> float:
    """0-100 from ohlcv_health latest row."""
    hs   = _safe(ohlcv_latest.get("health_score"), 50.0)
    comp = _safe(ohlcv_latest.get("composite"),     0.0)
    ret  = _safe(ohlcv_latest.get("daily_return"),  0.0)
    # health_score is already 0-100; composite is z-score-like (-3 to +3)
    comp_norm = _clamp((comp + 3) / 6 * 100)
    ret_norm  = _clamp((ret * 100 + 5) / 10 * 100)   # ±5% daily → 0-100
    return _clamp(hs * 0.6 + comp_norm * 0.3 + ret_norm * 0.1)


def _fundamental_score(bs_rows: list[dict], holding_rows: list[dict]) -> float:
    """0-100 from balance_sheet_scores + holding_scores latest period."""
    if not bs_rows and not holding_rows:
        return 50.0

    # Balance sheet: average hist_pct_rank (already 0-100 percentile)
    bs_ranks = [_safe(r.get("hist_pct_rank")) for r in bs_rows
                if r.get("hist_pct_rank") is not None]
    bs_score = float(np.mean(bs_ranks)) if bs_ranks else 50.0

    # Holding: use value directly for key metrics (normalised 0-100)
    # metric_id 1=Institutional%, 3=Promoter%, 7=HHI(inverted), 10=Volatility(inverted)
    h_map = {r["metric_id"]: _safe(r.get("value")) for r in holding_rows
             if r.get("metric_id") is not None}

    inst     = _clamp(h_map.get(1, 30.0))           # higher = better
    promoter = _clamp(h_map.get(3, 30.0))           # higher = better
    hhi      = _clamp(100 - h_map.get(7, 0.15) * 400)  # lower HHI = better
    vol      = _clamp(100 - h_map.get(10, 30.0))    # lower vol = better

    h_score = inst * 0.3 + promoter * 0.3 + hhi * 0.2 + vol * 0.2

    return _clamp(bs_score * 0.6 + h_score * 0.4)


def _sector_alignment_score(corr_rows: list[dict]) -> float:
    """0-100 from correlation_scores latest rows."""
    if not corr_rows:
        return 50.0
    corr_vals = []
    health_vals = []
    for r in corr_rows:
        c = _safe(r.get("corr_60d") or r.get("corr_100d") or r.get("corr_full"))
        h = _safe(r.get("avg_top_health"))
        if c != 0.0:
            corr_vals.append(c)
        if h != 0.0:
            health_vals.append(h)

    corr_norm   = _clamp((float(np.mean(corr_vals))   + 1) / 2 * 100) if corr_vals   else 50.0
    health_norm = _clamp(float(np.mean(health_vals)))                   if health_vals else 50.0
    return _clamp(corr_norm * 0.5 + health_norm * 0.5)


def _sentiment_score(ohlcv_latest: dict, corr_rows: list[dict]) -> float:
    """0-100 momentum + spike signal."""
    cum_1m  = _safe(ohlcv_latest.get("cum_change_1m"), 0.0)
    ret_z   = _safe(ohlcv_latest.get("ret_z"),         0.0)
    spike_u = bool(ohlcv_latest.get("spike_up",  False))
    spike_d = bool(ohlcv_latest.get("spike_down", False))

    mom_norm = _clamp((cum_1m + 20) / 40 * 100)   # ±20% 1m range → 0-100
    rz_norm  = _clamp((ret_z  +  3) /  6 * 100)   # ±3 z-score → 0-100

    spike_adj = 5.0 if spike_u else (-5.0 if spike_d else 0.0)

    outperf = [_safe(r.get("outperf_60d")) for r in corr_rows
               if r.get("outperf_60d") is not None]
    op_norm = _clamp((float(np.mean(outperf)) + 10) / 20 * 100) if outperf else 50.0

    raw = mom_norm * 0.4 + rz_norm * 0.3 + op_norm * 0.3 + spike_adj
    return _clamp(raw)


# ── Main classifier ───────────────────────────────────────────────────────────

def classify(
    ohlcv_latest:  dict,
    bs_rows:       list[dict],
    holding_rows:  list[dict],
    corr_rows:     list[dict],
) -> dict:
    """
    Returns classification dict. Never raises — returns neutral defaults on error.

    Parameters
    ----------
    ohlcv_latest  : latest row from ohlcv_health
    bs_rows       : latest period rows from balance_sheet_scores
    holding_rows  : latest period rows from holding_scores
    corr_rows     : latest date rows from correlation_scores
    """
    try:
        trend     = _trend_score(ohlcv_latest)
        fund      = _fundamental_score(bs_rows, holding_rows)
        sentiment = _sentiment_score(ohlcv_latest, corr_rows)
        alignment = _sector_alignment_score(corr_rows)

        final = _clamp(
            trend     * 0.35 +
            fund      * 0.30 +
            sentiment * 0.20 +
            alignment * 0.15
        )

        label = next(c for threshold, c in _CLASSES if final >= threshold)

        return {
            "trend_score":            round(trend,     2),
            "fundamental_score":      round(fund,      2),
            "sentiment_score":        round(sentiment, 2),
            "sector_alignment_score": round(alignment, 2),
            "final_score":            round(final,     2),
            "class":                  label,
        }
    except Exception:
        return {
            "trend_score": 50.0, "fundamental_score": 50.0,
            "sentiment_score": 50.0, "sector_alignment_score": 50.0,
            "final_score": 50.0, "class": "NEUTRAL",
        }
