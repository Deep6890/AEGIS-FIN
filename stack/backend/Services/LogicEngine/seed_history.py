"""
seed_history.py — One-time setup: clear all data, seed 3 years, run full analysis
----------------------------------------------------------------------------------
Run this ONCE before going live. It:

  1. Clears ALL rows from every Supabase table (fresh start)
  2. Seeds 3 years of OHLCV history for all sectors + your companies
  3. Runs the full analysis pipeline (health, balance sheet, holding,
     correlation, classifier) for every company
  4. Self-deletes on success

After this, the daily pipeline (pipeline.py) pushes only today's row each day.

Usage
-----
    python LogicEngine/seed_history.py

Edit the COMPANIES list below before running.
"""

import os
import sys

# ── Path + .env ───────────────────────────────────────────────────────────────
_here = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_here)
if _root not in sys.path:
    sys.path.insert(0, _root)

_env = os.path.join(_here, ".env")
if os.path.exists(_env):
    with open(_env) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

# =============================================================================
# ── ADD YOUR COMPANIES HERE ───────────────────────────────────────────────────
# Format: (yfinance_ticker, display_name)
# NSE tickers end with .NS  |  BSE tickers end with .BO
# =============================================================================

COMPANIES = [
    ("TCS.NS",       "TCS"),
    ("INFY.NS",      "Infosys"),
    ("HDFCBANK.NS",  "HDFC Bank"),
    ("RELIANCE.NS",  "Reliance"),
    ("ICICIBANK.NS", "ICICI Bank"),
    # Add more companies here...
]

# =============================================================================

from LogicEngine.store.data_store import configure_store, get_store
from LogicEngine.fetching.fetcher import fetch_ohlcv_history, ALL_SECTOR_TICKERS
from LogicEngine.store.adapters import save_ohlcv_history, save_sector_history
from LogicEngine.pipeline import run_sectors, run_batch

configure_store()
store   = get_store()
backend = os.environ.get("STORE_BACKEND", "memory")

G = "\033[92m"; R = "\033[91m"; Y = "\033[93m"; B = "\033[94m"; X = "\033[0m"

def banner(msg):
    print(f"\n{B}{'='*62}{X}\n{B}  {msg}{X}\n{B}{'='*62}{X}")

def ok(msg):   print(f"  {G}OK  {X}  {msg}")
def err(msg):  print(f"  {R}ERR {X}  {msg}")
def info(msg): print(f"  {Y}... {X}  {msg}")


banner("AEGIS-FIN — Seed History (one-time setup)")
print(f"  Backend  : {backend}")
print(f"  Sectors  : {len(ALL_SECTOR_TICKERS)}")
print(f"  Companies: {len(COMPANIES)}")

errors = []

# =============================================================================
# STEP 1 — Clear all tables
# =============================================================================
banner("Step 1 / 4 — Clear all Supabase tables")

if backend != "supabase":
    print(f"  {Y}Skipping clear — backend is '{backend}', not supabase{X}")
else:
    # Tables to clear in dependency order (child tables first)
    TABLES_TO_CLEAR = [
        "classifier",
        "correlation",
        "ohlcv_health",
        "ohlcv_raw",
        "balance_sheet_hist",
        "balance_sheet_ratios",
        "stock_holding",
        "sector_health",
        "sector_ohlcv_raw",
    ]
    # companies and sectors are dimension tables — clear companies only
    # (sectors are seeded by schema SQL and should stay)

    client = store._client

    for table in TABLES_TO_CLEAR:
        try:
            # Delete all rows — Supabase requires a filter, use neq on id
            resp = client.table(table).delete().neq("id", 0).execute()
            deleted = len(resp.data) if resp.data else "?"
            ok(f"Cleared {table} ({deleted} rows)")
        except Exception as exc:
            err(f"Failed to clear {table}: {exc}")
            errors.append(f"clear:{table}")

    # Clear companies table too (will be re-created on first write)
    try:
        resp = client.table("companies").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        ok(f"Cleared companies ({len(resp.data) if resp.data else '?'} rows)")
    except Exception as exc:
        err(f"Failed to clear companies: {exc}")

    # Reset in-process caches
    store._company_id_cache.clear()
    store._sector_id_cache.clear()
    print(f"\n  {G}All tables cleared.{X}")

# =============================================================================
# STEP 2 — Seed sector OHLCV history (3 years)
# =============================================================================
banner("Step 2 / 4 — Seed sector OHLCV history (3 years)")

for sector_name, yf_ticker in ALL_SECTOR_TICKERS.items():
    info(f"Fetching {sector_name} ({yf_ticker}) ...")
    try:
        df = fetch_ohlcv_history(yf_ticker, sector_name, period="3y")
        if df.empty:
            err(f"{sector_name}: no data returned")
            errors.append(f"sector:{sector_name}")
            continue
        save_sector_history(sector_name, df)
        ok(f"{sector_name}: {len(df)} rows")
    except Exception as exc:
        err(f"{sector_name}: {exc}")
        errors.append(f"sector:{sector_name}")

# =============================================================================
# STEP 3 — Seed company OHLCV history (3 years)
# =============================================================================
banner("Step 3 / 4 — Seed company OHLCV history (3 years)")

for ticker, company_name in COMPANIES:
    info(f"Fetching {company_name} ({ticker}) ...")
    try:
        df = fetch_ohlcv_history(ticker, company_name, period="3y")
        if df.empty:
            err(f"{company_name}: no data returned")
            errors.append(f"company:{ticker}")
            continue
        save_ohlcv_history(ticker, df)
        ok(f"{company_name}: {len(df)} rows")
    except Exception as exc:
        err(f"{company_name}: {exc}")
        errors.append(f"company:{ticker}")

# =============================================================================
# STEP 4 — Run full analysis pipeline for all companies
# =============================================================================
banner("Step 4 / 4 — Run full analysis pipeline")

info("Running sector health engine ...")
try:
    sector_results = run_sectors(force=True)
    ok(f"Sectors: {len(sector_results)} processed")
except Exception as exc:
    err(f"Sector pipeline failed: {exc}")
    sector_results = {}
    errors.append("sector_pipeline")

info(f"Running company pipeline for {len(COMPANIES)} companies ...")
try:
    results = run_batch(COMPANIES, sector_results=sector_results, force=True)
    for r in results:
        clf  = r.get("classifier")
        comp = clf.get("composite", {}) if clf else {}
        errs = r.get("errors", [])
        if errs:
            err(f"{r['ticker']}: {errs}")
            errors.append(f"pipeline:{r['ticker']}")
        else:
            ok(f"{r['ticker']}: tier={comp.get('tier')}  score={comp.get('score')}  grade={comp.get('grade')}")
except Exception as exc:
    err(f"Company pipeline failed: {exc}")
    errors.append("company_pipeline")

# =============================================================================
# Summary
# =============================================================================
banner("Summary")
total_steps = len(ALL_SECTOR_TICKERS) + len(COMPANIES) + 2  # +2 for pipelines
print(f"  Errors : {len(errors)}")
if errors:
    for e in errors:
        print(f"    • {e}")

if errors:
    print(f"\n  {R}Seed completed with errors. Fix the issues above and re-run.{X}")
    print(f"  This script was NOT deleted.\n")
    sys.exit(1)
else:
    print(f"\n  {G}Seed complete. All history loaded and analysis run.{X}")
    print(f"  From now on, run the daily pipeline:")
    print(f"    python LogicEngine/test_run.py")
    print()

    # Self-delete on success
    try:
        os.remove(os.path.abspath(__file__))
        print(f"  {Y}seed_history.py deleted (one-time use complete).{X}\n")
    except Exception:
        print(f"  {Y}Please delete seed_history.py manually.{X}\n")

    sys.exit(0)
