"""
insights.py
-----------
Generates daily insight signals per company from classifier output.
Numeric-first. Summary is short (UI-readable, max ~60 chars).
"""

from datetime import date


def _safe(v, default=0.0) -> float:
    if v is None:
        return default
    try:
        f = float(v)
        return default if (f != f or abs(f) == float("inf")) else f
    except Exception:
        return default


_SUMMARIES = {
    "STRONG":    "Strong momentum with solid fundamentals.",
    "POSITIVE":  "Positive trend, fundamentals improving.",
    "NEUTRAL":   "Mixed signals, no clear directional bias.",
    "WEAK":      "Weak trend, monitor for further decline.",
    "DISTRESSED":"High risk — poor fundamentals and trend.",
}


def generate(company_id: str, classification: dict, ohlcv_latest: dict) -> dict:
    """
    Returns insight dict ready for Supabase upsert.
    Never raises.

    Parameters
    ----------
    company_id     : UUID string
    classification : output of classifier.classify()
    ohlcv_latest   : latest row from ohlcv_health
    """
    try:
        final     = _safe(classification.get("final_score"),            50.0)
        trend     = _safe(classification.get("trend_score"),            50.0)
        fund      = _safe(classification.get("fundamental_score"),      50.0)
        sentiment = _safe(classification.get("sentiment_score"),        50.0)
        alignment = _safe(classification.get("sector_alignment_score"), 50.0)
        cls       = classification.get("class", "NEUTRAL")

        # Momentum: blend of trend + sentiment
        momentum = round(trend * 0.5 + sentiment * 0.5, 2)

        # Risk: inverse of fundamental + spike penalty
        spike_pen = 10.0 if ohlcv_latest.get("spike_down") else 0.0
        risk = round(max(0.0, min(100.0, (100 - fund) * 0.6 + (100 - alignment) * 0.4 + spike_pen)), 2)

        # Strength: overall composite
        strength = round(final, 2)

        insight_score = round(final * 0.5 + momentum * 0.3 + (100 - risk) * 0.2, 2)

        return {
            "company_id":    company_id,
            "date":          date.today().isoformat(),
            "insight_score": insight_score,
            "final_score":   round(final, 2),
            "class":         cls,
            "signals": {
                "momentum": momentum,
                "risk":     risk,
                "strength": strength,
            },
            "summary": _SUMMARIES.get(cls, "Insufficient data for insight."),
        }
    except Exception:
        return {
            "company_id":    company_id,
            "date":          date.today().isoformat(),
            "insight_score": 50.0,
            "final_score":   50.0,
            "class":         "NEUTRAL",
            "signals":       {"momentum": 50.0, "risk": 50.0, "strength": 50.0},
            "summary":       "Insufficient data for insight.",
        }
