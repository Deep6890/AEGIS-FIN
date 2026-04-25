"""
csv_onboard.py — CSV-driven company onboarding for AEGIS-FIN
-------------------------------------------------------------
Usage:
    python csv_onboard.py path/to/companies.csv

CSV must have at minimum a column named one of:
    "NSE/BSE Ticker", "Ticker", "ticker", "Symbol", "symbol"

What it does:
    1. Reads tickers from the CSV
    2. Checks which already exist in Supabase (have OHLCV history)
    3. For NEW companies: fetches 1 year of OHLCV history + runs full pipeline
    4. For EXISTING companies: runs today's daily update only (1 row)
    5. Prints a summary of what was done

After first onboarding, the daily pipeline handles everything automatically.
"""

import os
import sys
import csv
import json
import argparse
from datetime import date, timedelta
from pathlib import Path

# ── Path + .env ───────────────────────────────────────────────────────────────
_here = Path(__file__).parent
_env  = _here / ".env"
if _env.exists():
    with open(_env) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

# Add LogicEngine to path
if str(_here.parent) not in sys.path:
    sys.path.insert(0, str(_here.parent))

# ── Colours ───────────────────────────────────────────────────────────────────
G = "\033[92m"; R = "\033[91m"; Y = "\033[93m"; B = "\033[94m"; X = "\033[0m"

def ok(msg):   print(f"  {G}✓{X}  {msg}")
def err(msg):  print(f"  {R}✗{X}  {msg}")
def info(msg): print(f"  {Y}…{X}  {msg}")
def banner(t): print(f"\n{B}{'─'*60}{X}\n{B}  {t}{X}\n{B}{'─'*60}{X}")


# ── CSV parsing ───────────────────────────────────────────────────────────────

TICKER_COLUMNS = [
    "NSE/BSE Ticker", "Ticker", "ticker", "Symbol", "symbol",
    "TICKER", "NSE Ticker", "BSE Ticker", "Stock Symbol",
]

NAME_COLUMNS = [
    "Company Name", "Name", "name", "Company", "company",
    "COMPANY NAME", "CompanyName",
]

def parse_csv(path: str) -> list[dict]:
    """
    Parse CSV and return list of {ticker, name} dicts.
    Tries multiple column name variants.
    """
    rows = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []

        ticker_col = next((c for c in TICKER_COLUMNS if c in headers), None)
        name_col   = next((c for c in NAME_COLUMNS   if c in headers), None)

        if not ticker_col:
            raise ValueError(
                f"No ticker column found. Expected one of: {TICKER_COLUMNS}\n"
                f"Found columns: {headers}"
            )

        for row in reader:
            ticker = row.get(ticker_col, "").strip()
            name   = row.get(name_col, ticker).strip() if name_col else ticker
            if ticker:
                rows.append({"ticker": ticker, "name": name or ticker})

    return rows


def normalize_ticker(ticker: str) -> str:
    """
    Normalize ticker to yfinance format.
    - If no suffix, assume NSE (.NS)
    - .BO stays as .BO
    - ^NSEI etc. stay as-is
    """
    t = ticker.strip().upper()
    if t.startswith("^") or "=" in t or "." in t:
        return t
    return f"{t}.NS"


# ── DB helpers ────────────────────────────────────────────────────────────────

def check_company_exists(store, ticker: str) -> bool:
    """Return True if company has any OHLCV history in DB."""
    try:
        count = store.row_count("ohlcv_raw", ticker)
        return count > 0
    except Exception:
        return False


def get_company_row_count(store, ticker: str) -> int:
    """Return number of OHLCV rows for this ticker."""
    try:
        return store.row_count("ohlcv_raw", ticker)
    except Exception:
        return 0


# ── Onboarding ────────────────────────────────────────────────────────────────

def onboard_new_company(ticker: str, name: str, sector_results: dict) -> dict:
    """
    Full onboarding for a brand-new company:
    1. Fetch 1 year of OHLCV history
    2. Save to DB
    3. Run full pipeline (health, balance sheet, holdings, correlation, classifier)
    """
    from LogicEngine.fetching.fetcher import fetch_ohlcv_history
    from LogicEngine.store.adapters import save_ohlcv_history
    from LogicEngine.pipeline import run_daily

    info(f"Onboarding NEW company: {name} ({ticker})")

    # Step 1: Fetch 1 year of history
    info(f"  Fetching 1 year OHLCV history for {ticker}...")
    df = fetch_ohlcv_history(ticker, name, period="1y")
    if df.empty:
        err(f"  No OHLCV data returned for {ticker} — skipping")
        return {"ticker": ticker, "name": name, "status": "failed", "reason": "no_ohlcv_data"}

    # Step 2: Save history to DB
    save_ohlcv_history(ticker, df)
    ok(f"  Saved {len(df)} rows of OHLCV history for {ticker}")

    # Step 3: Run full pipeline (uses the history we just saved)
    info(f"  Running full analysis pipeline for {ticker}...")
    result = run_daily(ticker, name, sector_results=sector_results, force=True)

    errors = result.get("errors", [])
    clf    = result.get("classifier")
    score  = clf.get("composite", {}).get("score") if clf else None
    tier   = clf.get("composite", {}).get("tier")  if clf else None

    if errors:
        err(f"  Pipeline errors for {ticker}: {errors}")
    else:
        ok(f"  Pipeline complete: tier={tier}  score={score}")

    return {
        "ticker":   ticker,
        "name":     name,
        "status":   "onboarded" if not errors else "partial",
        "rows":     len(df),
        "score":    score,
        "tier":     tier,
        "errors":   errors,
    }


def update_existing_company(ticker: str, name: str, sector_results: dict) -> dict:
    """
    Daily update for an already-onboarded company:
    Just runs today's pipeline (fetches 1 new OHLCV row, updates analysis).
    """
    from LogicEngine.pipeline import run_daily

    info(f"Updating EXISTING company: {name} ({ticker})")
    result = run_daily(ticker, name, sector_results=sector_results, force=False)

    errors = result.get("errors", [])
    clf    = result.get("classifier")
    score  = clf.get("composite", {}).get("score") if clf else None

    if errors:
        err(f"  Errors: {errors}")
    else:
        ok(f"  Updated: score={score}")

    return {
        "ticker": ticker,
        "name":   name,
        "status": "updated" if not errors else "partial",
        "score":  score,
        "errors": errors,
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="AEGIS-FIN CSV Company Onboarder")
    parser.add_argument("csv_path", help="Path to CSV file with company tickers")
    parser.add_argument("--dry-run", action="store_true",
                        help="Only check which companies exist, don't run pipeline")
    parser.add_argument("--force-all", action="store_true",
                        help="Re-run full pipeline even for existing companies")
    args = parser.parse_args()

    banner("AEGIS-FIN — CSV Company Onboarder")

    # ── Parse CSV ─────────────────────────────────────────────────────────────
    info(f"Reading CSV: {args.csv_path}")
    try:
        companies = parse_csv(args.csv_path)
    except Exception as e:
        err(f"Failed to parse CSV: {e}")
        sys.exit(1)

    if not companies:
        err("No companies found in CSV")
        sys.exit(1)

    ok(f"Found {len(companies)} companies in CSV")

    # Normalize tickers
    for c in companies:
        c["ticker"] = normalize_ticker(c["ticker"])

    # ── Connect to store ──────────────────────────────────────────────────────
    banner("Connecting to Supabase")
    from LogicEngine.store.data_store import configure_store, get_store
    configure_store()
    store = get_store()
    ok("Connected to store")

    # ── Check which companies exist ───────────────────────────────────────────
    banner("Checking existing companies")
    new_companies      = []
    existing_companies = []

    for c in companies:
        rows = get_company_row_count(store, c["ticker"])
        if rows > 0:
            existing_companies.append({**c, "rows": rows})
            print(f"  {G}EXISTS{X}  {c['name']} ({c['ticker']})  —  {rows} rows in DB")
        else:
            new_companies.append(c)
            print(f"  {Y}NEW   {X}  {c['name']} ({c['ticker']})  —  needs onboarding")

    print(f"\n  Summary: {len(existing_companies)} existing, {len(new_companies)} new")

    if args.dry_run:
        banner("Dry run complete — no changes made")
        # Output JSON for frontend to consume
        result = {
            "total":    len(companies),
            "existing": [{"ticker": c["ticker"], "name": c["name"], "rows": c["rows"]}
                         for c in existing_companies],
            "new":      [{"ticker": c["ticker"], "name": c["name"]}
                         for c in new_companies],
        }
        print(json.dumps(result, indent=2))
        return result

    # ── Run sector pipeline first (needed for all companies) ─────────────────
    banner("Running sector pipeline")
    from LogicEngine.pipeline import run_sectors
    info("Fetching sector data...")
    sector_results = run_sectors(force=False)
    ok(f"Sector pipeline done: {len(sector_results)} sectors")

    # ── Onboard new companies ─────────────────────────────────────────────────
    results = []

    if new_companies:
        banner(f"Onboarding {len(new_companies)} new companies")
        for c in new_companies:
            r = onboard_new_company(c["ticker"], c["name"], sector_results)
            results.append(r)

    # ── Update existing companies ─────────────────────────────────────────────
    if existing_companies:
        banner(f"Updating {len(existing_companies)} existing companies")
        for c in existing_companies:
            if args.force_all:
                r = onboard_new_company(c["ticker"], c["name"], sector_results)
            else:
                r = update_existing_company(c["ticker"], c["name"], sector_results)
            results.append(r)

    # ── Summary ───────────────────────────────────────────────────────────────
    banner("Summary")
    onboarded = [r for r in results if r["status"] == "onboarded"]
    updated   = [r for r in results if r["status"] == "updated"]
    partial   = [r for r in results if r["status"] == "partial"]
    failed    = [r for r in results if r["status"] == "failed"]

    print(f"  Onboarded (new):  {len(onboarded)}")
    print(f"  Updated (daily):  {len(updated)}")
    print(f"  Partial (errors): {len(partial)}")
    print(f"  Failed:           {len(failed)}")

    if failed or partial:
        print(f"\n  {Y}Issues:{X}")
        for r in failed + partial:
            print(f"    {r['ticker']}: {r.get('reason') or r.get('errors')}")

    print(f"\n  {G}Done! Companies are now in Supabase and visible in the frontend.{X}")

    # Output JSON summary
    summary = {
        "total":      len(results),
        "onboarded":  len(onboarded),
        "updated":    len(updated),
        "partial":    len(partial),
        "failed":     len(failed),
        "companies":  results,
    }
    output_path = Path(args.csv_path).parent / "onboard_result.json"
    with open(output_path, "w") as f:
        json.dump(summary, f, indent=2, default=str)
    ok(f"Results saved to {output_path}")

    return summary


if __name__ == "__main__":
    main()
