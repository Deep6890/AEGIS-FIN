"""
scheduler.py
------------
Daily auto-scheduler for the AEGIS-FIN pipeline.
Runs the full batch every weekday at 18:30 IST (13:00 UTC) — after NSE market close.

Usage
-----
  # Start the scheduler (runs forever)
  python scheduler.py

  # Run once immediately then schedule
  python scheduler.py --run-now

  # Custom time (24h HH:MM UTC)
  python scheduler.py --time 14:00
"""

import os, sys, time, argparse, threading
from datetime import datetime, timezone
from pathlib import Path

# ── Path setup ────────────────────────────────────────────────────────────────
_BACKEND_DIR = Path(__file__).parent
sys.path.insert(0, str(_BACKEND_DIR))

# ── Load .env ─────────────────────────────────────────────────────────────────
_env_path = _BACKEND_DIR / ".env"
if _env_path.exists():
    with open(_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

try:
    import schedule
except ImportError:
    print("Installing schedule library...")
    os.system(f"{sys.executable} -m pip install schedule")
    import schedule

from run_pipeline import run_batch, log


# ── Pipeline job ──────────────────────────────────────────────────────────────
_running = threading.Lock()

def pipeline_job():
    if not _running.acquire(blocking=False):
        log("Pipeline already running — skipping this trigger", "WARN")
        return
    try:
        log("Scheduled pipeline job started")
        run_batch(resume=True)
        log("Scheduled pipeline job completed")
    except Exception as e:
        log(f"Scheduled pipeline job FAILED: {e}", "ERROR")
    finally:
        _running.release()


# ── Scheduler ─────────────────────────────────────────────────────────────────
def start_scheduler(run_time_utc: str = "13:00", run_now: bool = False):
    log(f"AEGIS-FIN Scheduler starting — daily run at {run_time_utc} UTC (weekdays)")

    # Schedule weekdays only
    schedule.every().monday.at(run_time_utc).do(pipeline_job)
    schedule.every().tuesday.at(run_time_utc).do(pipeline_job)
    schedule.every().wednesday.at(run_time_utc).do(pipeline_job)
    schedule.every().thursday.at(run_time_utc).do(pipeline_job)
    schedule.every().friday.at(run_time_utc).do(pipeline_job)

    if run_now:
        log("--run-now flag set — triggering pipeline immediately")
        t = threading.Thread(target=pipeline_job, daemon=True)
        t.start()

    log("Scheduler running. Press Ctrl+C to stop.")
    try:
        while True:
            schedule.run_pending()
            next_run = schedule.next_run()
            if next_run:
                delta = (next_run - datetime.now()).total_seconds()
                hrs, rem = divmod(int(delta), 3600)
                mins = rem // 60
                print(f"\r  Next run in {hrs}h {mins}m  ({next_run.strftime('%a %Y-%m-%d %H:%M')})   ", end="", flush=True)
            time.sleep(30)
    except KeyboardInterrupt:
        log("Scheduler stopped by user")


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    p = argparse.ArgumentParser(description="AEGIS-FIN Daily Scheduler")
    p.add_argument("--time",    default="13:00", help="UTC time to run daily (HH:MM)")
    p.add_argument("--run-now", action="store_true", help="Also run immediately on start")
    args = p.parse_args()
    start_scheduler(run_time_utc=args.time, run_now=args.run_now)
