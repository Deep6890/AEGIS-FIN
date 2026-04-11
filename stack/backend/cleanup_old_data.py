"""
cleanup_old_data.py
-------------------
Manually prune data older than 6 months from all tables to stay within Supabase free tier.
Run this script periodically or when approaching storage limits.
"""

import os
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables from .env file
load_dotenv()

# 6-month retention policy
RETENTION_CUTOFF = (datetime.now(timezone.utc) - timedelta(days=180)).strftime("%Y-%m-%d")

def cleanup_database():
    """Delete rows older than 6 months from all time-series tables."""
    
    # Check if environment variables are loaded
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_KEY"):
        print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not found in environment")
        print("   Make sure .env file exists in backend/ directory with:")
        print("   SUPABASE_URL=your_url")
        print("   SUPABASE_SERVICE_KEY=your_key")
        return
    
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
    
    # Tables with 'date' column
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
    
    # Tables with 'run_at' column
    run_at_tables = [
        "pipeline_log",
    ]
    
    print(f"🧹 Cleaning up data older than {RETENTION_CUTOFF}")
    print("=" * 60)
    
    total_deleted = 0
    
    # Clean date-based tables
    for table in date_tables:
        try:
            result = sb.table(table).delete().lt("date", RETENTION_CUTOFF).execute()
            count = len(result.data) if result.data else 0
            total_deleted += count
            print(f"✓ {table:25s} - deleted {count:4d} rows")
        except Exception as e:
            print(f"✗ {table:25s} - error: {e}")
    
    # Clean run_at-based tables
    for table in run_at_tables:
        try:
            result = sb.table(table).delete().lt("run_at", RETENTION_CUTOFF).execute()
            count = len(result.data) if result.data else 0
            total_deleted += count
            print(f"✓ {table:25s} - deleted {count:4d} rows")
        except Exception as e:
            print(f"✗ {table:25s} - error: {e}")
    
    print("=" * 60)
    print(f"🎉 Total rows deleted: {total_deleted}")
    print(f"📊 Retention policy: Keep last 6 months (since {RETENTION_CUTOFF})")


if __name__ == "__main__":
    cleanup_database()
