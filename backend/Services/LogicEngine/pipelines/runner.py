from LogicEngine.pipelines.db import _client
from LogicEngine.pipelines import ingest_ohlcv, ohlcv_pipeline, correlation_pipeline


def _companies() -> list[dict]:
    return (
        _client.table("companies")
        .select("id,ticker,name")
        .eq("is_active", True)
        .execute()
        .data or []
    )


def _sectors() -> list[dict]:
    return (
        _client.table("sectors")
        .select("id,name,yf_ticker")
        .eq("is_active", True)
        .execute()
        .data or []
    )


def _is_seeded() -> bool:
    """True if ohlcv_raw already has data — seed already ran."""
    rows = (
        _client.table("ohlcv_raw")
        .select("date")
        .limit(1)
        .execute()
        .data or []
    )
    return len(rows) > 0


def _sectors_have_health(sector_ids: list[str]) -> list[str]:
    """
    Return only sector IDs that have at least one row in sector_health.
    Correlation must not run against sectors with no processed data.
    """
    valid = []
    for sid in sector_ids:
        rows = (
            _client.table("sector_health")
            .select("date")
            .eq("sector_id", sid)
            .limit(1)
            .execute()
            .data or []
        )
        if rows:
            valid.append(sid)
    return valid


def _safe_run(fn, label: str) -> dict:
    try:
        return fn()
    except Exception as e:
        return {"error": str(e), "label": label}


def run_seed() -> dict:
    """
    One-time initial seed.
    Skipped automatically if data already exists — safe to call repeatedly.
    """
    if _is_seeded():
        return {"status": "already_seeded", "skipped": True}

    companies  = _companies()
    sectors    = _sectors()
    sector_ids = [s["id"] for s in sectors]

    ingest = ingest_ohlcv.run()

    health_sec = []
    for s in sectors:
        health_sec.append(_safe_run(
            lambda sid=s["id"], name=s["name"]: ohlcv_pipeline.run_sector(sid, name),
            label=s["name"],
        ))

    health_co = []
    for co in companies:
        health_co.append(_safe_run(
            lambda cid=co["id"], name=co["name"]: ohlcv_pipeline.run(cid, name),
            label=co["ticker"],
        ))

    valid_sector_ids = _sectors_have_health(sector_ids)
    corr = []
    for co in companies:
        corr.append(_safe_run(
            lambda cid=co["id"]: correlation_pipeline.run(cid, valid_sector_ids),
            label=co["ticker"],
        ))

    return {
        "status":     "seeded",
        "ingest":     ingest,
        "health_sec": health_sec,
        "health_co":  health_co,
        "correlation": corr,
    }


def run_daily() -> dict:
    """
    Daily incremental update.
    Each entity is isolated — one failure does not stop others.
    Sectors are validated before correlation runs.
    """
    companies  = _companies()
    sectors    = _sectors()
    sector_ids = [s["id"] for s in sectors]

    ingest = ingest_ohlcv.run()

    health_sec = []
    for s in sectors:
        health_sec.append(_safe_run(
            lambda sid=s["id"], name=s["name"]: ohlcv_pipeline.run_sector(sid, name),
            label=s["name"],
        ))

    health_co = []
    for co in companies:
        health_co.append(_safe_run(
            lambda cid=co["id"], name=co["name"]: ohlcv_pipeline.run(cid, name),
            label=co["ticker"],
        ))

    valid_sector_ids = _sectors_have_health(sector_ids)
    corr = []
    for co in companies:
        corr.append(_safe_run(
            lambda cid=co["id"]: correlation_pipeline.run(cid, valid_sector_ids),
            label=co["ticker"],
        ))

    return {
        "ingest":      ingest,
        "health_sec":  health_sec,
        "health_co":   health_co,
        "correlation": corr,
    }
