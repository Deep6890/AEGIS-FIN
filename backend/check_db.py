import os, json
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

URL = os.environ['SUPABASE_URL']
KEY = os.environ.get('SUPABASE_SERVICE_KEY') or os.environ.get('SUPABASE_KEY')
sb = create_client(URL, KEY)

# List all tables by trying each one
TABLES = ['companies','sectors','sector_metrics','sector_health','company_metrics',
          'static_corr','rolling_corr','top_sectors','balance_sheet','balance_sheet_history',
          'holding_metrics','ml_predictions','feature_store','macro_overlay','pipeline_log']

print("=== TABLE STATUS ===")
for t in TABLES:
    try:
        r = sb.table(t).select('*').limit(1).execute()
        print(f"  ✅ {t}: {len(r.data)} rows (sample)")
        if r.data:
            print(f"     keys: {list(r.data[0].keys())}")
    except Exception as e:
        print(f"  ❌ {t}: {str(e)[:80]}")

print("\n=== companies sample ===")
try:
    r = sb.table('companies').select('id,name,ticker').limit(8).execute()
    for c in r.data:
        print(f"  {c['id']} | {c['name']} | {c['ticker']}")
except Exception as e:
    print(f"Error: {e}")

print("\n=== static_corr sample ===")
try:
    r = sb.table('static_corr').select('*').limit(1).execute()
    if r.data:
        print(json.dumps(r.data[0], indent=2)[:1500])
except Exception as e:
    print(f"Error: {e}")

print("\n=== top_sectors sample ===")
try:
    r = sb.table('top_sectors').select('*').limit(2).execute()
    if r.data:
        print(json.dumps(r.data[0], indent=2)[:800])
except Exception as e:
    print(f"Error: {e}")
