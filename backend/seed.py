"""
seed.py — One-time seed for AEGIS-FIN
--------------------------------------
1. Applies schema (supabase_schema.sql) — idempotent
2. Seeds all companies from sme_companies_loan_analysis.csv
3. Verifies sectors are present

Run ONCE before first pipeline run:
    python seed.py

Safe to re-run — all operations are upserts / IF NOT EXISTS.
"""

import os
import csv
import sys
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

# ── Path setup ────────────────────────────────────────────────────────────────
sys.path.insert(0, str(_here))

from supabase import create_client

url = os.environ.get("SUPABASE_URL", "")
key = os.environ.get("SUPABASE_KEY", "")
if not url or not key:
    print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in backend/.env")
    sys.exit(1)

client = create_client(url, key)

CSV_PATH = _here / "data" / "sme_companies_loan_analysis.csv"

# =============================================================================
# Step 1: Verify sectors exist
# =============================================================================
print("Checking sectors...")
sectors = client.table("sectors").select("name").execute().data or []
if not sectors:
    print("  No sectors found — run supabase_schema.sql in Supabase SQL Editor first")
    sys.exit(1)
print(f"  {len(sectors)} sectors found ✓")

# =============================================================================
# Step 2: Seed companies
# =============================================================================
print(f"\nReading companies from {CSV_PATH.name}...")

companies = []
seen = set()
with open(CSV_PATH, newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        name   = row.get("Company Name", "").strip()
        ticker = row.get("NSE/BSE Ticker", "").strip()
        exch   = row.get("Exchange Index", "").strip()
        if not name or not ticker or name in seen:
            continue
        seen.add(name)

        if "NSE" in exch and not ticker.endswith(".NS"):
            yf_ticker = ticker + ".NS"
        elif "BSE" in exch and not ticker.endswith(".BO"):
            yf_ticker = ticker + ".BO"
        else:
            yf_ticker = ticker

        companies.append({
            "ticker":    yf_ticker,
            "name":      name,
            "exchange":  exch or "NSE",
            "is_active": True,
        })

print(f"  {len(companies)} unique companies to seed")

# Upsert in batches of 50
ok = 0
for i in range(0, len(companies), 50):
    batch = companies[i:i + 50]
    res = client.table("companies").upsert(
        batch, on_conflict="ticker"
    ).execute()
    ok += len(res.data or [])
    print(f"  {min(i + 50, len(companies))}/{len(companies)} seeded...", end="\r")

print(f"\n  {ok} companies upserted ✓")

# =============================================================================
# Step 3: Verify
# =============================================================================
total = client.table("companies").select("id", count="exact").execute()
print(f"\nTotal companies in DB: {total.count}")
print("\nSeed complete. Now run the pipeline:")
print("  python scheduler.py --run-now --once")
