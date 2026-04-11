#!/usr/bin/env python3
"""Quick test to verify database connection and data"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

print("=" * 60)
print("Testing Database Connection")
print("=" * 60)

# Test with service key (should always work)
print("\n1. Testing with SERVICE KEY...")
sb_service = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
result = sb_service.table("sectors").select("*").limit(5).execute()
print(f"✅ Service key works! Found {len(result.data)} sectors")
for sector in result.data[:3]:
    print(f"   - {sector['name']} ({sector['ticker']})")

# Test with anon key (this is what frontend uses)
if SUPABASE_ANON_KEY:
    print("\n2. Testing with ANON KEY (frontend uses this)...")
    sb_anon = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    try:
        result = sb_anon.table("sectors").select("*").limit(5).execute()
        print(f"✅ Anon key works! Found {len(result.data)} sectors")
        for sector in result.data[:3]:
            print(f"   - {sector['name']} ({sector['ticker']})")
    except Exception as e:
        print(f"❌ Anon key FAILED: {e}")
        print("\n⚠️  RLS policies are blocking anonymous access!")
        print("   Go to Supabase Dashboard → SQL Editor and run:")
        print("   ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;")
        print("   CREATE POLICY \"anon_read_sectors\" ON sectors FOR SELECT USING (true);")
else:
    print("\n⚠️  SUPABASE_ANON_KEY not found in .env")
    print("   Add it from Supabase Dashboard → Settings → API")

# Test sector_health
print("\n3. Testing sector_health table...")
result = sb_service.table("sector_health").select("*").limit(5).execute()
print(f"✅ Found {len(result.data)} sector_health entries")
if result.data:
    h = result.data[0]
    print(f"   Latest: {h.get('date')} - Signal: {h.get('signal')}")

# Test macro_overlay
print("\n4. Testing macro_overlay table...")
result = sb_service.table("macro_overlay").select("*").limit(1).execute()
print(f"✅ Found {len(result.data)} macro entries")
if result.data:
    m = result.data[0]
    print(f"   Latest: {m.get('date')} - Regime: {m.get('macro_regime')}")

# Test companies
print("\n5. Testing companies table...")
result = sb_service.table("companies").select("*").limit(5).execute()
print(f"✅ Found {len(result.data)} companies")
if result.data:
    for c in result.data[:3]:
        print(f"   - {c['name']} ({c['ticker']})")
else:
    print("   ⚠️  No companies yet - run the pipeline to populate")

print("\n" + "=" * 60)
print("Database Test Complete!")
print("=" * 60)
