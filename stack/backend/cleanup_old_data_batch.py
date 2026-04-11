"""
cleanup_old_data_batch.py
--------------------------
Manually prune data older than 6 months using batch deletion to avoid timeouts.
Deletes in smaller chunks for large tables.
"""

import os
import time
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

def cleanup_table_batch(sb, table, date_col, batch_size=1000):
    """Delete old rows from a table in batches to avoid timeout."""
    total_deleted = 0
    
    while True:
        try:
            # Delete in batches
            result = sb.table(table).delete().lt(date_col, RETENTION_CUTOFF).limit(batch_size).execute()
            count = len(result.data) if result.data else 0
            
            if count == 0:
                break
            
            total_deleted += count
            print(f"  ... deleted {count} rows (total: {total_deleted})", end='\r')
            
            # Small delay to avoid rate limiting
            time.sleep(0.1)
            
        except Exception as e:
            print(f"\n  Error during batch deletion: {e}")
            break
    
    return total_deleted

def cleanup_database():
    """Delete rows older than 6 months from all time-series tables."""
    
    # Load environment variables
    if not load_env():
        return
    
    # Check if environment variables are loaded
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_KEY"):
        print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not found in .env file")
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
    
    print(f"\n🧹 Cleaning up data older than {RETENTION_CUTOFF} (batch mode)")
    print("=" * 60)
    
    total_deleted = 0
    
    # Clean date-based tables
    for table in date_tables:
        try:
            print(f"Processing {table}...", end=' ')
            count = cleanup_table_batch(sb, table, "date", batch_size=500)
            total_deleted += count
            print(f"\n✓ {table:25s} - deleted {count:4d} rows")
        except Exception as e:
            print(f"\n✗ {table:25s} - error: {e}")
    
    # Clean run_at-based tables
    for table in run_at_tables:
        try:
            print(f"Processing {table}...", end=' ')
            count = cleanup_table_batch(sb, table, "run_at", batch_size=500)
            total_deleted += count
            print(f"\n✓ {table:25s} - deleted {count:4d} rows")
        except Exception as e:
            print(f"\n✗ {table:25s} - error: {e}")
    
    print("=" * 60)
    print(f"🎉 Total rows deleted: {total_deleted}")
    print(f"📊 Retention policy: Keep last 6 months (since {RETENTION_CUTOFF})")


if __name__ == "__main__":
    cleanup_database()
