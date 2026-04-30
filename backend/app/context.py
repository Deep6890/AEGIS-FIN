"""
context.py
----------
Builds the unified company context dict consumed by the UI.
Merges ohlcv, fundamental, correlation, classification, insights.
Never crashes — missing data returns safe defaults.
"""

from app.pipelines.db import _client


def _safe(v, default=None):
    if v is None:
        return default
    try:
        f = float(v)
        return default if (f != f or abs(f) == float("inf")) else f
    except Exception:
        return v


def _company_id_from_ticker(ticker: str) -> str | None:
    rows = (
        _client.table("companies")
        .select("id")
        .eq("ticker", ticker)
        .limit(1)
        .execute()
        .data or []
    )
    return rows[0]["id"] if rows else None


# ── Fetchers ──────────────────────────────────────────────────────────────────

def _ohlcv_context(company_id: str) -> dict:
    latest_rows = (
        _client.table("ohlcv_health")
        .select("*")
        .eq("company_id", company_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
        .data or []
    )
    history_rows = (
        _client.table("ohlcv_health")
        .select("date,health_score,composite,daily_return,cum_change_1m,cum_change_1y,spike_up,spike_down")
        .eq("company_id", company_id)
        .order("date", desc=True)
        .limit(90)
        .execute()
        .data or []
    )
    latest = latest_rows[0] if latest_rows else {}
    return {
        "latest": {
            "date":          latest.get("date"),
            "health_score":  _safe(latest.get("health_score")),
            "composite":     _safe(latest.get("composite")),
            "daily_return":  _safe(latest.get("daily_return")),
            "cum_change_1m": _safe(latest.get("cum_change_1m")),
            "cum_change_1y": _safe(latest.get("cum_change_1y")),
            "cum_change_2y": _safe(latest.get("cum_change_2y")),
            "volatility":    _safe(latest.get("volatility")),
            "ret_z":         _safe(latest.get("ret_z")),
            "close_z":       _safe(latest.get("close_z")),
            "spike_up":      bool(latest.get("spike_up",  False)),
            "spike_down":    bool(latest.get("spike_down", False)),
        },
        "history": list(reversed(history_rows)),
    }


def _fundamental_context(company_id: str) -> dict:
    # Latest period balance sheet
    period_row = (
        _client.table("balance_sheet_scores")
        .select("period")
        .eq("company_id", company_id)
        .order("period", desc=True)
        .limit(1)
        .execute()
        .data or []
    )
    bs_rows = []
    if period_row:
        period = period_row[0]["period"]
        raw = (
            _client.table("balance_sheet_scores")
            .select("ratio_id,period,value,yoy_pct,hist_pct_rank,sector_pressure,ratio_definitions(name,category)")
            .eq("company_id", company_id)
            .eq("period", period)
            .execute()
            .data or []
        )
        for r in raw:
            rd = r.pop("ratio_definitions", {}) or {}
            bs_rows.append({
                "ratio_id":      r.get("ratio_id"),
                "name":          rd.get("name", r.get("ratio_id")),
                "category":      rd.get("category", ""),
                "period":        r.get("period"),
                "value":         _safe(r.get("value")),
                "yoy_pct":       _safe(r.get("yoy_pct")),
                "hist_pct_rank": _safe(r.get("hist_pct_rank")),
            })

    # Latest period holding
    h_period_row = (
        _client.table("holding_scores")
        .select("period")
        .eq("company_id", company_id)
        .order("period", desc=True)
        .limit(1)
        .execute()
        .data or []
    )
    holding_rows = []
    if h_period_row:
        h_period = h_period_row[0]["period"]
        raw = (
            _client.table("holding_scores")
            .select("metric_id,period,value,hist_pct_rank,holding_metric_definitions(name,category)")
            .eq("company_id", company_id)
            .eq("period", h_period)
            .execute()
            .data or []
        )
        for r in raw:
            md = r.pop("holding_metric_definitions", {}) or {}
            holding_rows.append({
                "metric_id":     r.get("metric_id"),
                "name":          md.get("name", r.get("metric_id")),
                "category":      md.get("category", ""),
                "period":        r.get("period"),
                "value":         _safe(r.get("value")),
                "hist_pct_rank": _safe(r.get("hist_pct_rank")),
            })

    return {"balance_sheet": bs_rows, "holding": holding_rows}


def _correlation_context(company_id: str) -> dict:
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
        return {"top_sectors": []}

    latest_date = date_row[0]["date"]
    rows = (
        _client.table("correlation_scores")
        .select("sector_id,corr_20d,corr_60d,corr_100d,corr_full,outperf_60d,avg_top_health,sectors(name)")
        .eq("company_id", company_id)
        .eq("date", latest_date)
        .order("corr_60d", desc=True)
        .execute()
        .data or []
    )
    top_sectors = []
    for r in rows:
        s = r.pop("sectors", {}) or {}
        top_sectors.append({
            "sector_id":    r.get("sector_id"),
            "name":         s.get("name", ""),
            "corr_60d":     _safe(r.get("corr_60d")),
            "corr_100d":    _safe(r.get("corr_100d")),
            "outperf_60d":  _safe(r.get("outperf_60d")),
            "avg_health":   _safe(r.get("avg_top_health")),
        })
    return {"top_sectors": top_sectors}


def _classification_context(company_id: str) -> dict:
    rows = (
        _client.table("company_insights")
        .select("final_score,class,trend_score,fundamental_score,sentiment_score,sector_alignment_score")
        .eq("company_id", company_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
        .data or []
    )
    if not rows:
        return {
            "final_score": None, "class": "NEUTRAL",
            "trend_score": None, "fundamental_score": None,
            "sentiment_score": None, "sector_alignment_score": None,
        }
    r = rows[0]
    return {
        "final_score":            _safe(r.get("final_score")),
        "class":                  r.get("class", "NEUTRAL"),
        "trend_score":            _safe(r.get("trend_score")),
        "fundamental_score":      _safe(r.get("fundamental_score")),
        "sentiment_score":        _safe(r.get("sentiment_score")),
        "sector_alignment_score": _safe(r.get("sector_alignment_score")),
    }


def _insights_context(company_id: str) -> dict:
    rows = (
        _client.table("company_insights")
        .select("date,insight_score,momentum,risk,strength,summary")
        .eq("company_id", company_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
        .data or []
    )
    if not rows:
        return {
            "date": None, "insight_score": None,
            "signals": {"momentum": None, "risk": None, "strength": None},
            "summary": "No insights available.",
        }
    r = rows[0]
    return {
        "date":          r.get("date"),
        "insight_score": _safe(r.get("insight_score")),
        "signals": {
            "momentum": _safe(r.get("momentum")),
            "risk":     _safe(r.get("risk")),
            "strength": _safe(r.get("strength")),
        },
        "summary": r.get("summary", ""),
    }


# ── Public API ────────────────────────────────────────────────────────────────

def build_company_context(company_id: str) -> dict:
    """
    Returns unified company context dict for UI consumption.
    All keys always present — missing data returns None/empty, never crashes.
    """
    try:
        return {
            "company_id":     company_id,
            "ohlcv":          _ohlcv_context(company_id),
            "fundamental":    _fundamental_context(company_id),
            "correlation":    _correlation_context(company_id),
            "classification": _classification_context(company_id),
            "insights":       _insights_context(company_id),
        }
    except Exception as e:
        return {
            "company_id":     company_id,
            "ohlcv":          {"latest": {}, "history": []},
            "fundamental":    {"balance_sheet": [], "holding": []},
            "correlation":    {"top_sectors": []},
            "classification": {"final_score": None, "class": "NEUTRAL"},
            "insights":       {"insight_score": None, "signals": {}, "summary": "Error loading context."},
            "error":          str(e),
        }


def build_companies_list(limit: int = 500) -> list[dict]:
    """
    Returns lightweight list of all active companies with latest insight_score + class.
    Used by Companies page — no heavy data.
    """
    companies = (
        _client.table("companies")
        .select("id,ticker,name,exchange")
        .eq("is_active", True)
        .order("name")
        .limit(limit)
        .execute()
        .data or []
    )
    if not companies:
        return []

    # Batch fetch latest insights for all companies
    ids = [c["id"] for c in companies]
    insight_rows = (
        _client.table("company_insights")
        .select("company_id,insight_score,final_score,class,summary,date")
        .in_("company_id", ids)
        .order("date", desc=True)
        .limit(len(ids) * 2)
        .execute()
        .data or []
    )
    # Keep only latest per company
    insight_map = {}
    for r in insight_rows:
        cid = r["company_id"]
        if cid not in insight_map:
            insight_map[cid] = r

    result = []
    for c in companies:
        ins = insight_map.get(c["id"], {})
        result.append({
            "id":            c["id"],
            "ticker":        c["ticker"],
            "name":          c["name"],
            "exchange":      c["exchange"],
            "insight_score": _safe(ins.get("insight_score")),
            "final_score":   _safe(ins.get("final_score")),
            "class":         ins.get("class", "NEUTRAL"),
            "summary":       ins.get("summary", ""),
        })
    return result
