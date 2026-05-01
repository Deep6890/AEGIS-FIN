"""
fix_all.py - Seed sectors + run full pipeline including insights
Run: venv\\Scripts\\python.exe backend\\fix_all.py
"""
import os, sys, time
sys.path.insert(0, 'backend')

_env = 'backend/.env'
for l in open(_env):
    l = l.strip()
    if '=' in l and not l.startswith('#'):
        k, _, v = l.partition('=')
        os.environ.setdefault(k.strip(), v.strip())

import supabase as sb
client = sb.create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])

# ── Step 1: Seed sectors ──────────────────────────────────────────────────────
print("Step 1: Seeding sectors...")
SECTORS = [
    {'name': 'Bank Nifty',    'yf_ticker': '^NSEBANK',   'sector_type': 'sector', 'is_active': True},
    {'name': 'IT Sector',     'yf_ticker': '^CNXIT',     'sector_type': 'sector', 'is_active': True},
    {'name': 'Auto Sector',   'yf_ticker': '^CNXAUTO',   'sector_type': 'sector', 'is_active': True},
    {'name': 'Metal Sector',  'yf_ticker': '^CNXMETAL',  'sector_type': 'sector', 'is_active': True},
    {'name': 'Pharma Sector', 'yf_ticker': '^CNXPHARMA', 'sector_type': 'sector', 'is_active': True},
    {'name': 'FMCG Sector',   'yf_ticker': '^CNXFMCG',   'sector_type': 'sector', 'is_active': True},
    {'name': 'Energy Sector', 'yf_ticker': '^CNXENERGY', 'sector_type': 'sector', 'is_active': True},
    {'name': 'Nifty',         'yf_ticker': '^NSEI',      'sector_type': 'macro',  'is_active': True},
    {'name': 'Sensex',        'yf_ticker': '^BSESN',     'sector_type': 'macro',  'is_active': True},
    {'name': 'India VIX',     'yf_ticker': '^INDIAVIX',  'sector_type': 'macro',  'is_active': True},
]
r = client.table('sectors').upsert(SECTORS, on_conflict='name').execute()
print(f"  Upserted {len(r.data or [])} sectors")

sectors = client.table('sectors').select('id,name,yf_ticker').eq('is_active', True).execute().data or []
companies = client.table('companies').select('id,ticker,name').eq('is_active', True).execute().data or []
print(f"  {len(sectors)} sectors, {len(companies)} companies loaded")

# ── Step 2: Ingest sector OHLCV (3y) ─────────────────────────────────────────
print("\nStep 2: Ingesting sector OHLCV (3 years)...")
from app.pipelines import ingest_ohlcv, ohlcv_pipeline, correlation_pipeline, classifier_pipeline

result = ingest_ohlcv.run_sectors()
ok = sum(1 for r in result if not r.get('error'))
fail = sum(1 for r in result if r.get('error'))
print(f"  Sectors: ok={ok} fail={fail}")
for r in result:
    if r.get('error'):
        print(f"  FAILED {r['sector']}: {r['error'][:60]}")

# ── Step 3: Sector health ─────────────────────────────────────────────────────
print("\nStep 3: Computing sector health...")
sector_ids = []
for s in sectors:
    try:
        ohlcv_pipeline.run_sector(s['id'], s['name'])
        sector_ids.append(s['id'])
        print(f"  {s['name']} ok")
    except Exception as e:
        print(f"  {s['name']} FAILED: {e}")

# ── Step 4: Re-run company correlations (now with real sectors) ───────────────
print(f"\nStep 4: Re-computing correlations ({len(companies)} companies x {len(sector_ids)} sectors)...")
ok = fail = 0
for co in companies:
    try:
        correlation_pipeline.run(co['id'], sector_ids)
        ok += 1
    except Exception as e:
        print(f"  {co['ticker']} FAILED: {e}")
        fail += 1
print(f"  ok={ok} fail={fail}")

# ── Step 5: Run classifier + insights ────────────────────────────────────────
print(f"\nStep 5: Running classifier + insights ({len(companies)} companies)...")
ok = fail = skip = 0
for co in companies:
    try:
        result = classifier_pipeline.run(co['id'])
        if result.get('skipped'):
            skip += 1
        else:
            ok += 1
    except Exception as e:
        print(f"  {co['ticker']} FAILED: {e}")
        fail += 1
print(f"  ok={ok} skip={skip} fail={fail}")

print("\nAll done! Your DB now has:")
print("  - sector_ohlcv_raw: 3y sector price data")
print("  - sector_health: sector health scores")
print("  - correlation_scores: company vs sector correlations")
print("  - company_insights: final scores + signals for all 25 companies")
