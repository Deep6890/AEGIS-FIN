"""
cleanup_old_data_simple.py
---------------------------
Manually prune data older than 6 months from all tables to stay within Supabase free tier.
This version loads .env manually without requiring python-dotenv package.
"""

import os
from datetime import datetime, timezone, timedelta
from supabase import create_client

# Load .env file manually
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
        print(f"✓ Loaded environment from {env_path}")
    else:
        print(f"❌ .env file not found at {env_path}")
        return False
    return True

# 6-month retention policy
RETENTION_CUTOFF = (datetime.now(timezone.utc) - timedelta(days=180)).strftime("%Y-%m-%d")

def cleanup_database():
    """Delete rows older than 6 months from all time-series tables."""
    
    # Load environment variables
    if not load_env():
        return
    
    # Check if environment variables are loaded
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_KEY"):
        print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not found in .env file")
        print("   Make sure .env file exists in backend/ directory with:")
        print("   SUPABASE_URL=your_url")
        print("   SUPABASE_SERVICE_KEY=your_key")
        return
    
    try:
        sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
        print("✓ Connected to Supabase")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        return
    
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
    
    print(f"\n🧹 Cleaning up data older than {RETENTION_CUTOFF}")
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
