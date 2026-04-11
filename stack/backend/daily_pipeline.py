"""
daily_pipeline.py
-----------------
Smart daily pipeline that:
1. Runs at scheduled time each day
2. Processes all companies with latest data
3. Automatically cleans up old data after successful run
4. Keeps only necessary data for operations
5. Logs everything for monitoring

Usage:
  python daily_pipeline.py                    # Run once now
  python daily_pipeline.py --schedule         # Run daily at 18:30 IST (13:00 UTC)
  python daily_pipeline.py --schedule --time 14:00  # Custom time (UTC)
"""

import os, sys, time, argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Setup paths
_BACKEND_DIR = Path(__file__).parent
sys.path.insert(0, str(_BACKEND_DIR))

# Load .env
env_path = _BACKEND_DIR / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

try:
    import schedule
    from supabase import create_client
except ImportError:
    print("Installing required packages...")
    os.system(f"{sys.executable} -m pip install schedule supabase")
    import schedule
    from supabase import create_client

from run_pipeline import run_batch, log


# ── Configuration ─────────────────────────────────────────────────────────────
RETENTION_DAYS = 180  # Keep last 6 months of data
CLEANUP_AFTER_RUN = True  # Auto-cleanup after successful pipeline run


# ── Cleanup Function ──────────────────────────────────────────────────────────
def cleanup_old_data():
    """Remove data older than RETENTION_DAYS to free up storage."""
    log("Starting automatic data cleanup...")
    
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).strftime("%Y-%m-%d")
    
    try:
        sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
        log(f"Connected to Supabase - removing data older than {cutoff_date}")
    except Exception as e:
        log(f"Cleanup failed - cannot connect to Supabase: {e}", "ERROR")
        return False
    
    # Tables to clean
    date_tables = [
        "sector_metrics",
        "sector_health", 
        "macro_overlay",
        "company_metrics",
        "static_corr",
        "rolling_corr",
        "top_sectors",
        "balance_sheet",
        "balance_sheet_history",
        "holding_metrics",
        "ml_predictions",
        "feature_store",
    ]
    
    run_at_tables = ["pipeline_log"]
    
    total_deleted = 0
    errors = []
    
    # Clean date-based tables
    for table in date_tables:
        try:
            result = sb.table(table).delete().lt("date", cutoff_date).execute()
            count = len(result.data) if result.data else 0
            total_deleted += count
            if count > 0:
                log(f"  ✓ {table}: deleted {count} rows")
        except Exception as e:
            error_msg = str(e)
            if "statement timeout" not in error_msg.lower():
                errors.append(f"{table}: {error_msg}")
                log(f"  ✗ {table}: {error_msg}", "WARN")
    
    # Clean run_at-based tables
    for table in run_at_tables:
        try:
            result = sb.table(table).delete().lt("run_at", cutoff_date).execute()
            count = len(result.data) if result.data else 0
            total_deleted += count
            if count > 0:
                log(f"  ✓ {table}: deleted {count} rows")
        except Exception as e:
            errors.append(f"{table}: {str(e)}")
            log(f"  ✗ {table}: {e}", "WARN")
    
    if total_deleted > 0:
        log(f"Cleanup complete: {total_deleted} rows deleted")
    else:
        log("Cleanup complete: no old data to remove")
    
    if errors:
        log(f"Cleanup had {len(errors)} errors (may be timeouts - will retry next run)", "WARN")
    
    return len(errors) == 0


# ── Daily Pipeline Job ───────────────────────────────────────────────────────
def daily_pipeline_job():
    """Main pipeline job that runs daily."""
    log("="*70)
    log("DAILY PIPELINE JOB STARTED")
    log("="*70)
    
    start_time = time.time()
    
    try:
        # Step 1: Run the full pipeline
        log("Step 1/2: Running full pipeline batch...")
        run_batch(resume=True)
        
        # Step 2: Cleanup old data (if enabled)
        if CLEANUP_AFTER_RUN:
            log("Step 2/2: Cleaning up old data...")
            cleanup_old_data()
        else:
            log("Step 2/2: Skipped (CLEANUP_AFTER_RUN=False)")
        
        elapsed = time.time() - start_time
        log("="*70)
        log(f"DAILY PIPELINE JOB COMPLETED in {elapsed/60:.1f} minutes")
        log("="*70)
        
    except Exception as e:
        elapsed = time.time() - start_time
        log("="*70)
        log(f"DAILY PIPELINE JOB FAILED after {elapsed/60:.1f} minutes: {e}", "ERROR")
        log("="*70)
        import traceback
        traceback.print_exc()


# ── Scheduler ─────────────────────────────────────────────────────────────────
def start_scheduler(run_time_utc: str = "13:00"):
    """Start the daily scheduler."""
    log(f"Daily Pipeline Scheduler starting")
    log(f"Schedule: Every weekday at {run_time_utc} UTC (18:30 IST)")
    log(f"Retention: {RETENTION_DAYS} days ({RETENTION_DAYS/30:.1f} months)")
    log(f"Auto-cleanup: {'Enabled' if CLEANUP_AFTER_RUN else 'Disabled'}")
    
    # Schedule for weekdays only (market days)
    schedule.every().monday.at(run_time_utc).do(daily_pipeline_job)
    schedule.every().tuesday.at(run_time_utc).do(daily_pipeline_job)
    schedule.every().wednesday.at(run_time_utc).do(daily_pipeline_job)
    schedule.every().thursday.at(run_time_utc).do(daily_pipeline_job)
    schedule.every().friday.at(run_time_utc).do(daily_pipeline_job)
    
    log("Scheduler running. Press Ctrl+C to stop.")
    log("")
    
    try:
        while True:
            schedule.run_pending()
            next_run = schedule.next_run()
            if next_run:
                delta = (next_run - datetime.now()).total_seconds()
                hrs, rem = divmod(int(delta), 3600)
                mins = rem // 60
                print(f"\r  ⏰ Next run in {hrs}h {mins}m  ({next_run.strftime('%a %Y-%m-%d %H:%M UTC')})   ", end="", flush=True)
            time.sleep(30)
    except KeyboardInterrupt:
        log("\nScheduler stopped by user")


# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AEGIS-FIN Daily Pipeline with Auto-Cleanup")
    parser.add_argument("--schedule", action="store_true", 
                       help="Run as scheduled job (default: run once now)")
    parser.add_argument("--time", default="13:00", 
                       help="UTC time for daily run (HH:MM, default: 13:00 = 18:30 IST)")
    parser.add_argument("--retention-days", type=int, default=180,
                       help="Days of data to keep (default: 180 = 6 months)")
    parser.add_argument("--no-cleanup", action="store_true",
                       help="Disable automatic cleanup after pipeline run")
    
    args = parser.parse_args()
    
    # Update configuration
    RETENTION_DAYS = args.retention_days
    CLEANUP_AFTER_RUN = not args.no_cleanup
    
    if args.schedule:
        # Run as scheduled job
        start_scheduler(run_time_utc=args.time)
    else:
        # Run once immediately
        log("Running pipeline once (use --schedule for daily automation)")
        daily_pipeline_job()
