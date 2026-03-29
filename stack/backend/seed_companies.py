"""
seed_companies.py
-----------------
Pushes all companies from sme_companies_loan_analysis.csv
directly into the Supabase companies table.
No pipeline needed — just seeds the registry.

Run: python seed_companies.py
"""
import os, csv
from pathlib import Path

# Load .env
with open(Path(__file__).parent / ".env") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

from supabase import create_client

sb  = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
csv_path = Path(__file__).parent / "logic" / "sme_companies_loan_analysis.csv"

companies = []
with open(csv_path, newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        name   = row["Company Name"].strip()
        ticker = row["NSE/BSE Ticker"].strip()
        exch   = row["Exchange Index"].strip()

        if not name or not ticker:
            continue

        # Build Yahoo Finance ticker
        if "NSE" in exch and not ticker.endswith(".NS"):
            yf_ticker = ticker + ".NS"
        elif "BSE" in exch and not ticker.endswith(".BO"):
            yf_ticker = ticker + ".BO"
        else:
            yf_ticker = ticker

        companies.append({
            "name":     name,
            "ticker":   yf_ticker,
            "exchange": exch,
        })

print(f"Seeding {len(companies)} companies...")

# Deduplicate by name (keep last occurrence)
seen = {}
for c in companies:
    seen[c["name"]] = c
unique = list(seen.values())
print(f"  {len(unique)} unique names after dedup")

# Upsert in batches of 50
ok = 0
for i in range(0, len(unique), 50):
    batch = unique[i:i+50]
    res = sb.table("companies").upsert(batch, on_conflict="name").execute()
    ok += len(res.data)
    print(f"  {ok}/{len(unique)} done")

print(f"\nDone. {ok} companies in Supabase.")

# Verify
total = sb.table("companies").select("id", count="exact").execute()
print(f"Total in DB: {total.count}")
