"""
scheduler.py — AEGIS-FIN Production Daily Scheduler
----------------------------------------------------
Runs the full 9-layer pipeline once per day at 18:30 IST (13:00 UTC)
after NSE market close (15:30 IST).

Deploy on Railway:
  - Set START_COMMAND = python scheduler.py
  - Set env vars: SUPABASE_URL, SUPABASE_KEY, STORE_BACKEND=supabase

The scheduler:
  1. Loads all active companies from Supabase
  2. Runs sector pipeline once (shared across all companies)
  3. Runs company pipeline for each active company
  4. Logs results to pipeline_log table
  5. Sleeps until next scheduled run

Environment Variables:
  SUPABASE_URL       — Supabase project URL
  SUPABASE_KEY       — Supabase service-role key
  STORE_BACKEND      — must be "supabase"
  PIPELINE_HOUR_UTC  — hour to run (default: 13 = 18:30 IST)
  PIPELINE_MIN_UTC   — minute to run (default: 0)
  AEGIS_LOG_LEVEL    — INFO | DEBUG | WARNING
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

# ── Add Services to path ──────────────────────────────────────────────────────
_services_dir = str(_here / "Services")
_logic_dir    = str(_here / "Services" / "LogicEngine")
for _p in [_services_dir, _logic_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, os.environ.get("AEGIS_LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("aegis.scheduler")

# ── Schedule config ───────────────────────────────────────────────────────────
PIPELINE_HOUR = int(os.environ.get("PIPELINE_HOUR_UTC", "13"))   # 18:30 IST
PIPELINE_MIN  = int(os.environ.get("PIPELINE_MIN_UTC",  "0"))

# ── Graceful shutdown ─────────────────────────────────────────────────────────
_shutdown = False

def _handle_signal(sig, frame):
    global _shutdown
    log.info(f"Received signal {sig} — shutting down after current run")
    _shutdown = True

signal.signal(signal.SIGTERM, _handle_signal)
signal.signal(signal.SIGINT,  _handle_signal)


# =============================================================================
# Pipeline runner
# =============================================================================

def load_active_companies() -> list:
    """Load all active companies from Supabase."""
    from supabase import create_client
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_KEY"]
    client = create_client(url, key)
    resp = client.table("companies").select("ticker, name").eq("is_active", True).execute()
    return [(r["ticker"], r["name"]) for r in (resp.data or [])]


def log_pipeline_run(results: list, run_date: str, duration_s: float):
    """Write pipeline run summary to pipeline_log table."""
    try:
        from supabase import create_client
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_KEY"]
        client = create_client(url, key)

        total   = len(results)
        success = sum(1 for r in results if not r.get("errors"))
        failed  = total - success

        client.table("pipeline_log").insert({
            "run_at":      run_date,
            "status":      "success" if failed == 0 else "partial",
            "company":     f"{total} companies",
            "duration_s":  round(duration_s, 1),
            "details": json.dumps({
                "total":   total,
                "success": success,
                "failed":  failed,
                "errors":  [
                    {"ticker": r["ticker"], "errors": r["errors"]}
                    for r in results if r.get("errors")
                ][:20],  # cap at 20 error entries
            }),
        }).execute()
        log.info(f"Pipeline log written: {success}/{total} succeeded in {duration_s:.1f}s")
    except Exception as e:
        log.error(f"Failed to write pipeline log: {e}")


def run_pipeline():
    """Execute the full daily pipeline."""
    from LogicEngine.store.data_store import configure_store
    from LogicEngine.pipeline import run_sectors, run_batch

    configure_store()

    run_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    log.info(f"=== AEGIS-FIN Daily Pipeline — {run_date} ===")

    t0 = time.time()

    # Step 1: Load companies
    try:
        companies = load_active_companies()
        log.info(f"Loaded {len(companies)} active companies")
    except Exception as e:
        log.error(f"Failed to load companies: {e}")
        return

    if not companies:
        log.warning("No active companies found — skipping pipeline")
        return

    # Step 2: Run sector pipeline (once, shared)
    log.info("Running sector pipeline...")
    try:
        sector_results = run_sectors(force=False)
        log.info(f"Sector pipeline done: {len(sector_results)} sectors processed")
    except Exception as e:
        log.error(f"Sector pipeline failed: {e}")
        sector_results = {}

    # Step 3: Run company pipeline (batch)
    log.info(f"Running company pipeline for {len(companies)} companies...")
    try:
        results = run_batch(companies, sector_results=sector_results, force=False)
    except Exception as e:
        log.error(f"Batch pipeline failed: {e}")
        results = []

    duration = time.time() - t0

    # Step 4: Log results
    success = sum(1 for r in results if not r.get("errors"))
    log.info(f"Pipeline complete: {success}/{len(results)} succeeded in {duration:.1f}s")

    log_pipeline_run(results, run_date, duration)

    return results


# =============================================================================
# Scheduler loop
# =============================================================================

def seconds_until_next_run() -> float:
    """Calculate seconds until next scheduled run time (UTC)."""
    now = datetime.now(timezone.utc)
    target = now.replace(hour=PIPELINE_HOUR, minute=PIPELINE_MIN, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()


def main():
    log.info(f"AEGIS-FIN Scheduler starting — runs daily at {PIPELINE_HOUR:02d}:{PIPELINE_MIN:02d} UTC")
    log.info(f"Store backend: {os.environ.get('STORE_BACKEND', 'memory')}")

    # Validate required env vars
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_KEY"):
        log.error("SUPABASE_URL and SUPABASE_KEY must be set")
        sys.exit(1)

    if os.environ.get("STORE_BACKEND", "memory") != "supabase":
        log.warning("STORE_BACKEND is not 'supabase' — pipeline will use in-memory store")

    # Run immediately on startup if --run-now flag is passed
    if "--run-now" in sys.argv:
        log.info("--run-now flag detected — running pipeline immediately")
        run_pipeline()
        if "--once" in sys.argv:
            log.info("--once flag detected — exiting after single run")
            sys.exit(0)

    while not _shutdown:
        wait = seconds_until_next_run()
        next_run = datetime.now(timezone.utc) + timedelta(seconds=wait)
        log.info(f"Next pipeline run at {next_run.strftime('%Y-%m-%d %H:%M:%S UTC')} (in {wait/3600:.1f}h)")

        # Sleep in 60s chunks so we can respond to shutdown signals
        slept = 0
        while slept < wait and not _shutdown:
            chunk = min(60, wait - slept)
            time.sleep(chunk)
            slept += chunk

        if _shutdown:
            break

        log.info("Starting scheduled pipeline run...")
        try:
            run_pipeline()
        except Exception as e:
            log.error(f"Pipeline run failed with unhandled exception: {e}", exc_info=True)

    log.info("Scheduler stopped")


if __name__ == "__main__":
    main()
