"""
scheduler.py — AEGIS-FIN Production Scheduler
----------------------------------------------
Runs daily at 13:00 UTC (18:30 IST) on Railway.
- OHLCV + health + correlation: every weekday
- Balance sheet + holding: quarterly (once per quarter per company)

Deploy: Railway sets START_COMMAND = python scheduler.py
Env vars required: SUPABASE_URL, SUPABASE_KEY, STORE_BACKEND=supabase
"""

import os
import sys
import time
import json
import signal
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ── Load .env ─────────────────────────────────────────────────────────────────
_here = Path(__file__).parent
_env  = _here / ".env"
if _env.exists():
    with open(_env) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

# ── Path setup ────────────────────────────────────────────────────────────────
if str(_here) not in sys.path:
    sys.path.insert(0, str(_here))

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, os.environ.get("AEGIS_LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger("aegis.scheduler")

# ── Schedule config ───────────────────────────────────────────────────────────
PIPELINE_HOUR = int(os.environ.get("PIPELINE_HOUR_UTC", "13"))
PIPELINE_MIN  = int(os.environ.get("PIPELINE_MIN_UTC",  "0"))

# ── Graceful shutdown ─────────────────────────────────────────────────────────
_shutdown = False

def _handle_signal(sig, frame):
    global _shutdown
    log.info(f"Signal {sig} received — shutting down after current run")
    _shutdown = True

signal.signal(signal.SIGTERM, _handle_signal)
signal.signal(signal.SIGINT,  _handle_signal)


# =============================================================================
# Helpers
# =============================================================================

def _current_quarter() -> str:
    today = datetime.now(timezone.utc).date()
    q = (today.month - 1) // 3 + 1
    return f"{today.year}-Q{q}"


def _needs_quarterly_update(client, company_id: str) -> bool:
    """True if balance_sheet_scores has no row for the current quarter."""
    quarter = _current_quarter()
    rows = (
        client.table("balance_sheet_scores")
        .select("ratio_id")
        .eq("company_id", company_id)
        .eq("period", quarter)
        .limit(1)
        .execute()
        .data or []
    )
    return len(rows) == 0


def _log_run(client, status: str, detail: dict, duration_s: float):
    try:
        client.table("pipeline_log").insert({
            "run_at":     datetime.now(timezone.utc).isoformat(),
            "status":     status,
            "company":    f"{detail.get('total', 0)} companies",
            "duration_s": round(duration_s, 1),
            "layers_json": json.dumps(detail),
        }).execute()
    except Exception as e:
        log.error(f"Failed to write pipeline_log: {e}")


# =============================================================================
# Pipeline
# =============================================================================

def run_pipeline():
    from supabase import create_client
    from app.pipelines import ingest_ohlcv, ohlcv_pipeline, correlation_pipeline
    from app.pipelines import fundamental_pipeline

    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_KEY"]
    client = create_client(url, key)

    run_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    log.info(f"=== AEGIS-FIN Daily Pipeline — {run_date} ===")
    t0 = time.time()

    # ── Load entities ─────────────────────────────────────────────────────────
    companies = (
        client.table("companies")
        .select("id,ticker,name")
        .eq("is_active", True)
        .execute()
        .data or []
    )
    sectors = (
        client.table("sectors")
        .select("id,name,yf_ticker")
        .eq("is_active", True)
        .execute()
        .data or []
    )
    log.info(f"Loaded {len(companies)} companies, {len(sectors)} sectors")

    if not companies:
        log.warning("No active companies — skipping pipeline")
        return

    # ── Step 1: Ingest OHLCV (incremental — only new rows) ───────────────────
    log.info("Step 1: OHLCV ingest...")
    try:
        ingest_ohlcv.run()
        log.info("OHLCV ingest done")
    except Exception as e:
        log.error(f"OHLCV ingest failed: {e}")

    # ── Step 2: Sector health ─────────────────────────────────────────────────
    log.info("Step 2: Sector health...")
    sector_ids = []
    for s in sectors:
        try:
            ohlcv_pipeline.run_sector(s["id"], s["name"])
            sector_ids.append(s["id"])
        except Exception as e:
            log.error(f"Sector health failed: {s['name']} — {e}")

    # ── Step 3: Company health ────────────────────────────────────────────────
    log.info(f"Step 3: Company health ({len(companies)} companies)...")
    ok = fail = 0
    for co in companies:
        try:
            ohlcv_pipeline.run(co["id"], co["name"])
            ok += 1
        except Exception as e:
            log.error(f"Company health failed: {co['ticker']} — {e}")
            fail += 1
    log.info(f"Company health: ok={ok} fail={fail}")

    # ── Step 4: Correlation ───────────────────────────────────────────────────
    log.info(f"Step 4: Correlation ({len(companies)} companies)...")
    ok = fail = 0
    for co in companies:
        try:
            correlation_pipeline.run(co["id"], sector_ids)
            ok += 1
        except Exception as e:
            log.error(f"Correlation failed: {co['ticker']} — {e}")
            fail += 1
    log.info(f"Correlation: ok={ok} fail={fail}")

    # ── Step 5: Fundamentals (quarterly — skip if already done this quarter) ──
    quarter = _current_quarter()
    log.info(f"Step 5: Fundamentals — quarter={quarter}")
    ok = fail = skip = 0
    for co in companies:
        try:
            if not _needs_quarterly_update(client, co["id"]):
                skip += 1
                continue
            fundamental_pipeline.run(
                ticker=co["ticker"],
                company_id=co["id"],
            )
            ok += 1
            time.sleep(0.5)  # rate limit yfinance
        except Exception as e:
            log.error(f"Fundamentals failed: {co['ticker']} — {e}")
            fail += 1
    log.info(f"Fundamentals: ok={ok} skip={skip} fail={fail}")

    duration = time.time() - t0
    total = len(companies)
    log.info(f"Pipeline complete in {duration:.1f}s")

    _log_run(client, "success", {
        "total": total, "duration_s": round(duration, 1),
        "quarter": quarter, "fundamentals_updated": ok,
    }, duration)


# =============================================================================
# Scheduler loop
# =============================================================================

def _seconds_until_next_run() -> float:
    now    = datetime.now(timezone.utc)
    target = now.replace(hour=PIPELINE_HOUR, minute=PIPELINE_MIN,
                         second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()


def main():
    # Validate env
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_KEY"):
        log.error("SUPABASE_URL and SUPABASE_KEY must be set")
        sys.exit(1)

    log.info(f"Scheduler starting — daily at {PIPELINE_HOUR:02d}:{PIPELINE_MIN:02d} UTC")

    if "--run-now" in sys.argv:
        log.info("--run-now: running pipeline immediately")
        try:
            run_pipeline()
        except Exception as e:
            log.error(f"Pipeline failed: {e}", exc_info=True)
            sys.exit(1)
        if "--once" in sys.argv:
            log.info("--once: exiting")
            sys.exit(0)

    while not _shutdown:
        wait = _seconds_until_next_run()
        next_dt = datetime.now(timezone.utc) + timedelta(seconds=wait)
        log.info(f"Next run at {next_dt.strftime('%Y-%m-%d %H:%M UTC')} (in {wait/3600:.1f}h)")

        slept = 0.0
        while slept < wait and not _shutdown:
            chunk = min(60.0, wait - slept)
            time.sleep(chunk)
            slept += chunk

        if _shutdown:
            break

        log.info("Starting scheduled pipeline run...")
        try:
            run_pipeline()
        except Exception as e:
            log.error(f"Pipeline run failed: {e}", exc_info=True)

    log.info("Scheduler stopped")


if __name__ == "__main__":
    main()
