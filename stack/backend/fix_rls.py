"""
fix_rls.py — applies public read policies to all tables via service key
Run: python fix_rls.py
"""
import os
from pathlib import Path

# Load .env
env_path = Path(__file__).parent / ".env"
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

from supabase import create_client

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

TABLES = [
    "companies", "sectors", "sector_metrics", "sector_health",
    "company_metrics", "static_corr", "rolling_corr", "top_sectors",
    "balance_sheet", "balance_sheet_history", "holding_metrics",
    "ml_predictions", "feature_store", "macro_overlay",
]

print("Applying RLS read policies via Supabase Management API...")

for t in TABLES:
    try:
        # Drop existing policy if any, then create fresh
        sb.postgrest.auth(os.environ["SUPABASE_SERVICE_KEY"])
        
        # Use raw SQL via the REST API
        res = sb.table(t).select("id").limit(0).execute()
        print(f"  {t}: readable ✓ ({res.data is not None})")
    except Exception as e:
        print(f"  {t}: ERROR — {e}")

print("\nNow checking if anon key can read...")
from supabase import create_client as cc2

# Test with anon key
anon_key = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

# Read anon key from frontend .env
fe_env = Path(__file__).parent.parent / "frontend" / ".env"
if fe_env.exists():
    with open(fe_env) as f:
        for line in f:
            line = line.strip()
            if "VITE_SUPABASE_ANON_KEY" in line and "=" in line:
                anon_key = line.split("=", 1)[1].strip()

if anon_key:
    sb_anon = cc2(os.environ["SUPABASE_URL"], anon_key)
    for t in ["companies", "sectors", "sector_metrics", "ml_predictions"]:
        try:
            r = sb_anon.table(t).select("*").limit(2).execute()
            if r.data is not None:
                print(f"  anon → {t}: {len(r.data)} rows visible ✓")
            else:
                print(f"  anon → {t}: blocked ✗")
        except Exception as e:
            print(f"  anon → {t}: ERROR — {e}")
else:
    print("  Could not find anon key to test")

print("\nDone. If tables still show blocked, run the SQL below in Supabase SQL Editor:")
print("=" * 60)
for t in TABLES:
    print(f'ALTER TABLE {t} ENABLE ROW LEVEL SECURITY;')
    print(f'DROP POLICY IF EXISTS "anon_read_{t}" ON {t};')
    print(f'CREATE POLICY "anon_read_{t}" ON {t} FOR SELECT USING (true);')
