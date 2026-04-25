"""
company_classifier.py
---------------------
Classifies a company across four dimensions using outputs from the
existing analysis modules. No fetching, no raw data — pure scoring logic.

Input contract
--------------
All four inputs are the exact outputs of the existing modules:

  ohlcv_result      : run_ohlcv_health(label_col="Company")
  balance_result    : run_balance_sheet(financials_data, ...)
  holding_result    : run_stock_holding(holder_data, ...)
  correlation_result: run_correlation(company_health, sector_results)

Output
------
  run_classifier(...) -> dict  (fully JSON-ready, no DataFrames)

Classification dimensions
--------------------------
  1. PRICE_HEALTH  — OHLCV signals: health_score, signal, regime, trend
  2. FUNDAMENTAL   — Balance sheet: ratio statuses, trends, sector overlay
  3. OWNERSHIP     — Holding patterns: institutional, insider, concentration
  4. SECTOR_FIT    — Correlation: top-sector alignment, outperformance

Each dimension produces:
  score      : 0–100
  grade      : A | B | C | D | F
  label      : descriptive classification label
  confidence : HIGH | MEDIUM | LOW  (based on data completeness)
  signals    : list of contributing signal strings

Composite tiers (score-based, no directional recommendation):
  TIER_1 (>=78) — top-quartile across all dimensions
  TIER_2 (>=62) — above average, most signals positive
  TIER_3 (>=48) — mixed signals, no clear direction
  TIER_4 (>=35) — below average, multiple weak signals
  TIER_5 (<35)  — bottom-quartile, majority signals negative

Scoring philosophy
------------------
  - All scores are data-driven from the module outputs
  - green status  → +points,  red → -points,  amber → neutral,  gray → skip
  - Trend direction (up/down) adds momentum bonus/penalty
  - Sector tailwind/headwind adjusts fundamental score
  - Correlation strength weights sector_fit score
  - Confidence degrades when data is missing or gray
"""

import numpy as np
from typing import Optional


# ── Grade / label maps ────────────────────────────────────────────────────────

def _grade(score: float) -> str:
    if score >= 80: return "A"
    if score >= 65: return "B"
    if score >= 50: return "C"
    if score >= 35: return "D"
    return "F"


def _composite_label(score: float) -> str:
    if score >= 78: return "TIER_1"      # top-quartile across all dimensions
    if score >= 62: return "TIER_2"      # above average, most signals positive
    if score >= 48: return "TIER_3"      # mixed signals, no clear direction
    if score >= 35: return "TIER_4"      # below average, multiple weak signals
    return "TIER_5"                      # bottom-quartile, majority signals negative


def _confidence(scored: int, total: int) -> str:
    if total == 0: return "LOW"
    ratio = scored / total
    if ratio >= 0.75: return "HIGH"
    if ratio >= 0.45: return "MEDIUM"
    return "LOW"


def _safe_float(v, default=None):
    try:
        f = float(v)
        return None if (f != f) else f   # NaN check without importing math
    except (TypeError, ValueError):
        return default


# ── Dimension 1: Price Health ─────────────────────────────────────────────────

def _score_price_health(ohlcv_result: dict) -> dict:
    """
    Scores from run_ohlcv_health() output.

    Signal map  : STRONG=100, NEUTRAL=65, WATCH=40, WEAK=15, INSUFFICIENT_DATA=None
    Regime map  : BULL=+10, NEUTRAL=0, BEAR=-10
    Trend bonus : Upward=+5, Downward=-5
    Spike penalty: spike_down on latest day = -8
    """
    latest = ohlcv_result.get("latest", {})
    sig    = latest.get("signal", "")
    regime = latest.get("regime", "")
    trend  = latest.get("trend", "")
    hs     = _safe_float(latest.get("health_score"))

    signal_map = {"STRONG": 100, "NEUTRAL": 65, "WATCH": 40, "WEAK": 15}
    signals    = []
    scored     = 0
    total      = 3   # signal, regime, trend

    # Base from health_score (0-100 directly)
    base = hs if hs is not None else signal_map.get(sig)
    if base is None:
        return {"score": None, "grade": "F", "label": "Insufficient Data",
                "confidence": "LOW", "signals": ["No OHLCV signal available."]}

    scored += 1
    signals.append(f"Signal: {sig} (health={hs:.1f})" if hs is not None else f"Signal: {sig}")

    # Regime adjustment
    regime_adj = {"BULL": 8, "NEUTRAL": 0, "BEAR": -8}.get(regime, 0)
    if regime:
        scored += 1
        signals.append(f"Regime: {regime} ({regime_adj:+d}pts)")

    # Trend adjustment
    trend_adj = 5 if trend == "Upward" else -5 if trend == "Downward" else 0
    if trend:
        scored += 1
        signals.append(f"Trend: {trend} ({trend_adj:+d}pts)")

    # Spike penalty
    spike_adj = -8 if latest.get("spike_down") else 0
    if spike_adj:
        signals.append("Spike down detected (-8pts)")

    raw   = base + regime_adj + trend_adj + spike_adj
    score = max(0.0, min(100.0, raw))

    label_map = {"STRONG": "Strong Uptrend", "NEUTRAL": "Stable", "WATCH": "Weakening", "WEAK": "Downtrend"}
    if regime == "BULL" and sig in ("STRONG", "NEUTRAL"):
        label = "Confirmed Uptrend"
    elif regime == "BEAR" and sig in ("WEAK", "WATCH"):
        label = "Confirmed Downtrend"
    else:
        label = label_map.get(sig, ohlcv_result.get("market_phase", "Transition"))

    return {
        "score":      round(score, 1),
        "grade":      _grade(score),
        "label":      label,
        "confidence": _confidence(scored, total),
        "signals":    signals,
    }


# ── Dimension 2: Fundamental ──────────────────────────────────────────────────

def _score_fundamental(balance_result: dict) -> dict:
    """
    Scores from run_balance_sheet() output.

    Uses full_ratios DataFrame (has AdjustedStatus after sector overlay).
    Status scoring per ratio:
        green  = +2 pts
        amber  = +1 pt
        red    = -1 pt
        gray   = 0 (skip from denominator)
    Trend bonus: up = +0.5, down = -0.5 per ratio
    Category weights: Profitability=1.5x, Growth=1.3x, Liquidity=1.2x, others=1.0x
    Sector overlay: TAILWIND = +5 final, HEADWIND = -5 final
    """
    full_ratios = balance_result.get("full_ratios")
    if full_ratios is None or (hasattr(full_ratios, "empty") and full_ratios.empty):
        return {"score": None, "grade": "F", "label": "No Financial Data",
                "confidence": "LOW", "signals": ["Balance sheet data unavailable."]}

    cat_weight = {
        "Profitability": 1.5, "Growth": 1.3, "Liquidity": 1.2,
        "Cash Flow": 1.1, "Leverage": 1.0, "Efficiency": 1.0, "Capital Structure": 1.0,
    }
    status_pts = {"green": 2, "amber": 1, "red": -1, "gray": 0}
    trend_pts  = {"up": 0.5, "down": -0.5}

    weighted_sum = 0.0
    max_possible = 0.0
    signals      = []
    scored       = 0
    total        = 0

    for _, row in full_ratios.iterrows():
        status = str(row.get("AdjustedStatus", row.get("Status", "gray"))).lower()
        trend  = str(row.get("Trend", "")).lower()
        cat    = str(row.get("Category", ""))
        name   = str(row.get("Ratio", ""))
        if status == "gray":
            continue
        total += 1
        w      = cat_weight.get(cat, 1.0)
        pts    = (status_pts.get(status, 0) + trend_pts.get(trend, 0)) * w
        max_p  = (2 + 0.5) * w
        weighted_sum += pts
        max_possible += max_p
        scored += 1
        if status in ("green", "red"):
            signals.append(f"{name}: {status.upper()} ({trend})")

    if max_possible == 0:
        return {"score": None, "grade": "F", "label": "No Scoreable Ratios",
                "confidence": "LOW", "signals": ["All ratios returned gray."]}

    # Normalise to 0-100
    score = ((weighted_sum + max_possible) / (2 * max_possible)) * 100

    # Sector overlay adjustment
    overlay   = balance_result.get("sector_overlay", {})
    direction = overlay.get("direction", "NEUTRAL")
    overlay_adj = 5 if direction == "TAILWIND" else -5 if direction == "HEADWIND" else 0
    if overlay_adj:
        signals.append(f"Sector overlay: {direction} ({overlay_adj:+d}pts)")

    score = max(0.0, min(100.0, score + overlay_adj))

    # Count green/red for label
    green_count = sum(1 for _, r in full_ratios.iterrows()
                      if str(r.get("AdjustedStatus", "")).lower() == "green")
    red_count   = sum(1 for _, r in full_ratios.iterrows()
                      if str(r.get("AdjustedStatus", "")).lower() == "red")

    if score >= 70:
        label = "Fundamentally Strong"
    elif score >= 55:
        label = "Fundamentally Stable"
    elif score >= 40:
        label = "Mixed Fundamentals"
    else:
        label = "Fundamentally Weak"

    signals.insert(0, f"{green_count} green / {red_count} red ratios out of {total} scored.")

    return {
        "score":      round(score, 1),
        "grade":      _grade(score),
        "label":      label,
        "confidence": _confidence(scored, total),
        "signals":    signals[:10],   # cap to avoid huge JSON
    }


# ── Dimension 3: Ownership ────────────────────────────────────────────────────

def _score_ownership(holding_result: dict) -> dict:
    """
    Scores from run_stock_holding() output.

    Metric scoring:
        Institutional Ownership %  : green=+15, amber=+5, red=-5
        Insider Ownership %        : gray (informational only, no score)
        Holder Concentration (HHI) : green=+10, amber=+5, red=-15  (inverted: low HHI = good)
        Insider Net Buy %          : green=+20, amber=0, red=-15
        Annualised Volatility %    : green=+10, amber=+5, red=-10

    Holding signal:
        ACCUMULATION = +10, STABLE = 0, DISTRIBUTION = -10
    """
    full_metrics   = holding_result.get("full_metrics")
    holding_signal = holding_result.get("holding_signal", "STABLE")

    metric_weights = {
        "Institutional Ownership %":  {"green": 15, "amber":  5, "red":  -5},
        "Holder Concentration (HHI)": {"green": 10, "amber":  5, "red": -15},
        "Annualised Volatility % (30d)": {"green": 10, "amber": 5, "red": -10},
    }
    insider_buy_weight = {"green": 20, "amber": 0, "red": -15}

    base   = 50.0   # neutral starting point
    total  = 0
    scored = 0
    signals = []

    if full_metrics is not None and not (hasattr(full_metrics, "empty") and full_metrics.empty):
        for _, row in full_metrics.iterrows():
            name   = str(row.get("Metric", ""))
            status = str(row.get("AdjustedStatus", row.get("Status", "gray"))).lower()
            if status == "gray":
                continue
            total += 1

            # Insider net buy — dynamic key name
            if "Insider Net Buy" in name:
                pts = insider_buy_weight.get(status, 0)
                base += pts; scored += 1
                signals.append(f"Insider activity: {status.upper()} ({pts:+d}pts)")
                continue

            w = metric_weights.get(name)
            if w:
                pts = w.get(status, 0)
                base += pts; scored += 1
                signals.append(f"{name}: {status.upper()} ({pts:+d}pts)")

    # Holding signal from sector overlay
    sig_adj = {"ACCUMULATION": 10, "STABLE": 0, "DISTRIBUTION": -10}.get(holding_signal, 0)
    base += sig_adj
    if sig_adj != 0:
        signals.append(f"Sector holding signal: {holding_signal} ({sig_adj:+d}pts)")
        total += 1; scored += 1

    score = max(0.0, min(100.0, base))

    if score >= 70:   label = "Strong Institutional Backing"
    elif score >= 55: label = "Stable Ownership"
    elif score >= 40: label = "Mixed Ownership Signals"
    else:             label = "Weak / Distributing"

    if not signals:
        signals = ["Ownership data unavailable or all gray."]

    return {
        "score":      round(score, 1),
        "grade":      _grade(score),
        "label":      label,
        "confidence": _confidence(scored, max(total, 1)),
        "signals":    signals,
    }


# ── Dimension 4: Sector Fit ───────────────────────────────────────────────────

def _score_sector_fit(correlation_result: dict) -> dict:
    """
    Scores from run_correlation() output.

    Components:
      a) Top-sector correlation strength (100d)
         |corr| >= 0.7 → 30pts, >= 0.5 → 20pts, >= 0.3 → 10pts, < 0.3 → 0pts

      b) Health alignment
         ALIGNED=25, COMPANY_LEADING=20, COMPANY_LAGGING=10, INSUFFICIENT_DATA=0

      c) Outperformance (100d, primary top sector)
         OUTPERFORMING=20, NEUTRAL=10, UNDERPERFORMING=0, INSUFFICIENT_DATA=5

      d) Spike alignment (primary top sector)
         HIGH=15, MODERATE=10, LOW=5

      e) Sector health of top sector
         STRONG=10, NEUTRAL=7, WATCH=4, WEAK=0
    """
    top_sectors  = correlation_result.get("top_sectors", [])
    health_ctx   = correlation_result.get("health_by_top", {})
    rel_growth   = correlation_result.get("relative_growth", {})
    rel_spikes   = correlation_result.get("relative_spikes", {})

    score   = 0.0
    total   = 5
    scored  = 0
    signals = []

    # a) Correlation strength of #1 sector
    if top_sectors:
        t1   = top_sectors[0]
        corr = _safe_float(t1.get(f"corr_100d"))
        if corr is not None:
            abs_c = abs(corr)
            pts   = 30 if abs_c >= 0.7 else 20 if abs_c >= 0.5 else 10 if abs_c >= 0.3 else 0
            score += pts; scored += 1
            signals.append(f"Top sector {t1['sector']} corr_100d={corr:.3f} ({pts}pts)")

    # b) Health alignment
    alignment = health_ctx.get("health_alignment", "")
    align_pts = {"ALIGNED": 25, "COMPANY_LEADING": 20, "COMPANY_LAGGING": 10, "INSUFFICIENT_DATA": 0}
    if alignment:
        pts = align_pts.get(alignment, 0)
        score += pts; scored += 1
        signals.append(f"Health alignment: {alignment} ({pts}pts)")

    # c) Outperformance vs primary top sector
    if top_sectors:
        primary = top_sectors[0]["sector"]
        rg      = rel_growth.get(primary, {})
        direction = rg.get("direction", "")
        dir_pts = {"OUTPERFORMING": 20, "NEUTRAL": 10, "UNDERPERFORMING": 0, "INSUFFICIENT_DATA": 5}
        if direction:
            pts = dir_pts.get(direction, 5)
            score += pts; scored += 1
            signals.append(f"Outperformance vs {primary}: {direction} ({pts}pts)")

    # d) Spike alignment vs primary top sector
    if top_sectors:
        primary = top_sectors[0]["sector"]
        sp      = rel_spikes.get(primary, {})
        sa      = sp.get("spike_alignment", "")
        sa_pts  = {"HIGH": 15, "MODERATE": 10, "LOW": 5}
        if sa:
            pts = sa_pts.get(sa, 0)
            score += pts; scored += 1
            signals.append(f"Spike alignment with {primary}: {sa} ({pts}pts)")

    # e) Top sector's own health signal
    if health_ctx.get("sectors"):
        top_sec_health = health_ctx["sectors"][0]
        se_sig = top_sec_health.get("signal", "")
        sig_pts = {"STRONG": 10, "NEUTRAL": 7, "WATCH": 4, "WEAK": 0, "INSUFFICIENT_DATA": 0}
        if se_sig:
            pts = sig_pts.get(se_sig, 0)
            score += pts; scored += 1
            signals.append(f"Top sector signal: {se_sig} ({pts}pts)")

    score = max(0.0, min(100.0, score))

    if score >= 70:   label = "Strong Sector Alignment"
    elif score >= 50: label = "Moderate Sector Fit"
    elif score >= 30: label = "Weak Sector Fit"
    else:             label = "Sector Misaligned"

    if not signals:
        signals = ["Correlation data unavailable."]

    return {
        "score":      round(score, 1),
        "grade":      _grade(score),
        "label":      label,
        "confidence": _confidence(scored, total),
        "signals":    signals,
    }


# ── Composite scorer ──────────────────────────────────────────────────────────

# Default weights — override by passing weights= to run_classifier()
DEFAULT_WEIGHTS = {
    "price_health": 0.30,
    "fundamental":  0.35,
    "ownership":    0.15,
    "sector_fit":   0.20,
}


def _composite(dims: dict, weights: dict) -> dict:
    """
    Weighted average of all four dimension scores.
    Dimensions with None score are excluded and weights redistributed.
    """
    valid   = {k: v for k, v in dims.items() if v.get("score") is not None}
    if not valid:
        return {"score": None, "grade": "F", "tier": "INSUFFICIENT_DATA",
                "confidence": "LOW", "dimensions_used": []}

    total_w = sum(weights.get(k, 0.25) for k in valid)
    score   = sum(weights.get(k, 0.25) * valid[k]["score"] for k in valid) / total_w

    # Confidence: worst of all dimension confidences
    conf_order = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
    min_conf   = min(conf_order[v["confidence"]] for v in valid.values())
    conf_label = {3: "HIGH", 2: "MEDIUM", 1: "LOW"}[min_conf]

    # Penalise if fewer than 3 dimensions scored
    if len(valid) < 3:
        score      = max(0.0, score - 10)
        conf_label = "LOW"

    score = round(score, 1)
    tier  = _composite_label(score)

    return {
        "score":           score,
        "grade":           _grade(score),
        "tier":            tier,
        "confidence":      conf_label,
        "dimensions_used": list(valid.keys()),
    }


# ── Filter helpers ────────────────────────────────────────────────────────────

def _passes_filter(composite: dict, dims: dict, min_score: float, require_dims: list) -> tuple:
    """
    Returns (passes: bool, reasons: list[str])
    """
    reasons = []
    score   = composite.get("score")

    if score is None:
        return False, ["Insufficient data to classify."]

    if score < min_score:
        reasons.append(f"Composite score {score} below threshold {min_score}.")

    for dim in require_dims:
        d = dims.get(dim, {})
        if d.get("score") is None or d["score"] < 40:
            reasons.append(f"{dim} score too low ({d.get('score', 'N/A')}).")

    return (len(reasons) == 0), reasons


# ── Master function ───────────────────────────────────────────────────────────

def run_classifier(
    ohlcv_result:        dict,
    balance_result:      dict,
    holding_result:      dict,
    correlation_result:  dict,
    min_composite_score: float = 50.0,
    require_dims:        list  = None,
    weights:             dict  = None,
) -> dict:
    """
    Parameters
    ----------
    weights : dict | None
        Custom dimension weights, e.g. {"fundamental": 0.50, "price_health": 0.25,
        "ownership": 0.10, "sector_fit": 0.15}.
        Defaults to DEFAULT_WEIGHTS if None.
        Weights are redistributed automatically when a dimension has no data.
    """
    if require_dims is None:
        require_dims = ["fundamental"]
    if weights is None:
        weights = DEFAULT_WEIGHTS

    ticker  = (balance_result.get("ticker") or
               holding_result.get("ticker") or
               ohlcv_result.get("name", ""))
    company = ohlcv_result.get("name", ticker)
    date    = ohlcv_result.get("latest", {}).get("date", "")

    dims = {
        "price_health": _score_price_health(ohlcv_result),
        "fundamental":  _score_fundamental(balance_result),
        "ownership":    _score_ownership(holding_result),
        "sector_fit":   _score_sector_fit(correlation_result),
    }

    composite = _composite(dims, weights)
    passes, reasons = _passes_filter(composite, dims, min_composite_score, require_dims)

    tier  = composite.get("tier", "INSUFFICIENT_DATA")
    score = composite.get("score")
    conf  = composite.get("confidence", "LOW")

    summary = (
        f"{company} — {tier} "
        f"(score={score}, grade={composite.get('grade', 'F')}, confidence={conf}). "
        f"{'PASSES filter.' if passes else 'FILTERED OUT: ' + '; '.join(reasons)}"
    )

    return {
        "ticker":     ticker,
        "company":    company,
        "date":       date,
        "dimensions": dims,
        "composite":  composite,
        "filter":     {"passes": passes, "reasons": reasons},
        "summary":    summary,
    }
