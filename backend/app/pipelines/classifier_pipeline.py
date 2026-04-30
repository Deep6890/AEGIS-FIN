"""
classifier_pipeline.py
-----------------------
Fetches latest processed data per company, runs classifier + insights,
pushes results to company_insights table.
"""

import json
from datetime import date
from app.pipelines.db import _client
from app.analysis.classifier import classify
from app.analysis.insights import generate

_BATCH = 500


def _latest_ohlcv(company_id: str) -> dict:
    rows = (
        _client.table("ohlcv_health")
        .select("*")
        .eq("company_id", company_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
        .data or []
    )
    return rows[0] if rows else {}


def _latest_bs(company_id: str) -> list[dict]:
    """Latest period balance_sheet_scores."""
    period_row = (
        _client.table("balance_sheet_scores")
        .select("period")
        .eq("company_id", company_id)
        .order("period", desc=True)
        .limit(1)
        .execute()
        .data or []
    )
    if not period_row:
        return []
    period = period_row[0]["period"]
    return (
        _client.table("balance_sheet_scores")
        .select("ratio_id,value,hist_pct_rank,sector_pressure")
        .eq("company_id", company_id)
        .eq("period", period)
        .execute()
        .data or []
    )


def _latest_holding(company_id: str) -> list[dict]:
    """Latest period holding_scores."""
    period_row = (
        _client.table("holding_scores")
        .select("period")
        .eq("company_id", company_id)
        .order("period", desc=True)
        .limit(1)
        .execute()
        .data or []
    )
    if not period_row:
        return []
    period = period_row[0]["period"]
    return (
        _client.table("holding_scores")
        .select("metric_id,value,hist_pct_rank,sector_pressure")
        .eq("company_id", company_id)
        .eq("period", period)
        .execute()
        .data or []
    )


def _latest_corr(company_id: str) -> list[dict]:
    """Latest date correlation_scores (all sectors)."""
    date_row = (
        _client.table("correlation_scores")
        .select("date")
        .eq("company_id", company_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
        .data or []
    )
    if not date_row:
        return []
    latest_date = date_row[0]["date"]
    return (
        _client.table("correlation_scores")
        .select("sector_id,corr_20d,corr_60d,corr_100d,corr_full,outperf_60d,avg_top_health")
        .eq("company_id", company_id)
        .eq("date", latest_date)
        .execute()
        .data or []
    )


def _push(rows: list[dict]) -> None:
    if not rows:
        return
    for i in range(0, len(rows), _BATCH):
        _client.table("company_insights").upsert(
            rows[i:i + _BATCH],
            on_conflict="company_id,date"
        ).execute()


def run(company_id: str) -> dict:
    """Run classifier + insights for one company. Returns insight dict."""
    ohlcv   = _latest_ohlcv(company_id)
    bs      = _latest_bs(company_id)
    holding = _latest_holding(company_id)
    corr    = _latest_corr(company_id)

    # Skip if no OHLCV data at all
    if not ohlcv:
        return {"company_id": company_id, "skipped": True}

    clf     = classify(ohlcv, bs, holding, corr)
    insight = generate(company_id, clf, ohlcv)

    row = {
        "company_id":             company_id,
        "date":                   insight["date"],
        "insight_score":          insight["insight_score"],
        "final_score":            insight["final_score"],
        "class":                  insight["class"],
        "trend_score":            clf["trend_score"],
        "fundamental_score":      clf["fundamental_score"],
        "sentiment_score":        clf["sentiment_score"],
        "sector_alignment_score": clf["sector_alignment_score"],
        "momentum":               insight["signals"]["momentum"],
        "risk":                   insight["signals"]["risk"],
        "strength":               insight["signals"]["strength"],
        "summary":                insight["summary"],
    }
    _push([row])
    return insight
