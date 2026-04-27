"""
seed_history.py — One-time historical data seeder for AEGIS-FIN
---------------------------------------------------------------
Run this ONCE when setting up a new Supabase project.
Fetches 3 years of OHLCV history for all sectors and a default
set of companies, saves to DB, then runs the full pipeline.

Usage:
    python seed_history.py
    python seed_history.py --companies TCS.NS,INFY.NS,HDFCBANK.NS
    python seed_history.py --skip-sectors   (if sectors already seeded)

After this completes, the daily scheduler handles everything automatically.
"""

import os
import sys
import argparse
from pathlib import Path

# ── Path + .env ───────────────────────────────────────────────────────────────
_here = Path(__file__).parent
_env  = _here / ".env"
if not _env.exists():
    _env = _here.parent.parent / ".env"   # fallback to backend/.env

if _env.exists():
    with open(_env) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

sys.path.insert(0, str(_here.parent))
sys.path.insert(0, str(_here))

# ── Colours ───────────────────────────────────────────────────────────────────
G = "\033[92m"; R = "\033[91m"; Y = "\033[93m"; B = "\033[94m"; X = "\033[0m"
def ok(m):     print(f"  {G}OK   {X} {m}")
def err(m):    print(f"  {R}ERR  {X} {m}")
def info(m):   print(f"  {Y}...  {X} {m}")
def banner(t): print(f"\n{B}{'='*60}{X}\n{B}  {t}{X}\n{B}{'='*60}{X}")

# ── Default companies to seed ─────────────────────────────────────────────────
DEFAULT_COMPANIES = [
    ("TCS.NS",        "TCS"),
    ("INFY.NS",       "Infosys"),
    ("HDFCBANK.NS",   "HDFC Bank"),
    ("RELIANCE.NS",   "Reliance"),
    ("ICICIBANK.NS",  "ICICI Bank"),
]


def main():
    parser = argparse.ArgumentParser(description="AEGIS-FIN Historical Data Seeder")
    parser.add_argument("--companies", type=str, default="",
                        help="Comma-separated tickers e.g. TCS.NS,INFY.NS")
    parser.add_argument("--skip-sectors", action="store_true",
                        help="Skip sector seeding (if already done)")
    parser.add_argument("--period", type=str, default="3y",
                        help="History period: 1y, 2y, 3y (default: 3y)")
    args = parser.parse_args()

    banner("AEGIS-FIN — Historical Data Seeder")

    # ── Validate env ──────────────────────────────────────────────────────────
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_KEY"):
        err("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        sys.exit(1)

    if os.environ.get("STORE_BACKEND", "memory") != "supabase":
        err("STORE_BACKEND must be 'supabase' — set it in .env")
        sys.exit(1)

    ok(f"Supabase URL: {os.environ['SUPABASE_URL']}")

    # ── Configure store ───────────────────────────────────────────────────────
    from LogicEngine.store.data_store import configure_store
    configure_store()
    ok("Store configured")

    from LogicEngine.fetching.fetcher import (
        fetch_ohlcv_history, ALL_SECTOR_TICKERS
    )
    from LogicEngine.store.adapters import save_ohlcv_history, save_sector_history

    # ── Step 1: Seed sector history ───────────────────────────────────────────
    if not args.skip_sectors:
        banner(f"Step 1 / 3 — Seed sector OHLCV history ({args.period})")
        sector_ok = 0
        for name, ticker in ALL_SECTOR_TICKERS.items():
            info(f"Fetching {name} ({ticker}) ...")
            df = fetch_ohlcv_history(ticker, name, period=args.period)
            if df.empty:
                err(f"{name}: no data returned")
                continue
            save_sector_history(name, df)
            ok(f"{name}: {len(df)} rows")
            sector_ok += 1
        print(f"\n  Sectors seeded: {sector_ok}/{len(ALL_SECTOR_TICKERS)}")
    else:
        ok("Skipping sector seeding (--skip-sectors)")

    # ── Step 2: Seed company history ──────────────────────────────────────────
    if args.companies:
        tickers = [t.strip() for t in args.companies.split(",") if t.strip()]
        companies = [(t, t.replace(".NS", "").replace(".BO", "")) for t in tickers]
    else:
        companies = DEFAULT_COMPANIES

    banner(f"Step 2 / 3 — Seed company OHLCV history ({args.period})")
    company_ok = 0
    for ticker, name in companies:
        info(f"Fetching {name} ({ticker}) ...")
        df = fetch_ohlcv_history(ticker, name, period=args.period)
        if df.empty:
            err(f"{name}: no data returned")
            continue
        save_ohlcv_history(ticker, df)
        ok(f"{name}: {len(df)} rows")
        company_ok += 1
    print(f"\n  Companies seeded: {company_ok}/{len(companies)}")

    # ── Step 3: Run full pipeline ─────────────────────────────────────────────
    banner("Step 3 / 3 — Run full analysis pipeline")
    from LogicEngine.pipeline import run_sectors, run_batch

    info("Running sector health engine ...")
    sector_results = run_sectors(force=True)
    ok(f"Sectors: {len(sector_results)} processed")

    info(f"Running company pipeline for {len(companies)} companies ...")
    results = run_batch(companies, sector_results=sector_results, force=True)

    # ── Summary ───────────────────────────────────────────────────────────────
    banner("Summary")
    passed = [r for r in results if not r.get("errors")]
    failed = [r for r in results if r.get("errors")]

    for r in results:
        clf   = r.get("classifier", {})
        score = clf.get("composite", {}).get("score") if clf else None
        tier  = clf.get("composite", {}).get("tier")  if clf else None
        if r.get("errors"):
            err(f"{r['ticker']}: {r['errors']}")
        else:
            ok(f"{r['ticker']}: tier={tier}  score={score}  grade={clf.get('composite', {}).get('grade') if clf else None}")

    print(f"\n  Passed : {len(passed)}")
    print(f"  Errors : {len(failed)}")

    if failed:
        print(f"\n  {Y}Seed completed with errors. Fix the issues above and re-run.{X}")
        print(f"  This script was NOT deleted.")
    else:
        print(f"\n  {G}Seed complete! All data is in Supabase.{X}")
        print(f"  Refresh the frontend to see your data.")


if __name__ == "__main__":
    main()
