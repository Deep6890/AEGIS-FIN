"""
seed_top25.py — Seed top 25 NSE companies and run full 3-year pipeline
----------------------------------------------------------------------
Run once:
    venv\\Scripts\\python.exe backend\\seed_top25.py
"""

import os, sys, time, logging
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

sys.path.insert(0, str(_here))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger("seed_top25")

# ── Validate env ──────────────────────────────────────────────────────────────
url = os.environ.get("SUPABASE_URL", "")
key = os.environ.get("SUPABASE_KEY", "") or os.environ.get("SUPABASE_SERVICE_KEY", "")
if not url or not key:
    log.error("SUPABASE_URL and SUPABASE_KEY must be set in backend/.env")
    sys.exit(1)

from supabase import create_client
client = create_client(url, key)

# ── Top 25 NSE companies ──────────────────────────────────────────────────────
TOP25 = [
    {"ticker": "RELIANCE.NS",   "name": "Reliance Industries",       "exchange": "NSE", "is_active": True},
    {"ticker": "TCS.NS",        "name": "Tata Consultancy Services", "exchange": "NSE", "is_active": True},
    {"ticker": "HDFCBANK.NS",   "name": "HDFC Bank",                 "exchange": "NSE", "is_active": True},
    {"ticker": "INFY.NS",       "name": "Infosys",                   "exchange": "NSE", "is_active": True},
    {"ticker": "ICICIBANK.NS",  "name": "ICICI Bank",                "exchange": "NSE", "is_active": True},
    {"ticker": "HINDUNILVR.NS", "name": "Hindustan Unilever",        "exchange": "NSE", "is_active": True},
    {"ticker": "SBIN.NS",       "name": "State Bank of India",       "exchange": "NSE", "is_active": True},
    {"ticker": "BHARTIARTL.NS", "name": "Bharti Airtel",             "exchange": "NSE", "is_active": True},
    {"ticker": "ITC.NS",        "name": "ITC",                       "exchange": "NSE", "is_active": True},
    {"ticker": "KOTAKBANK.NS",  "name": "Kotak Mahindra Bank",       "exchange": "NSE", "is_active": True},
    {"ticker": "LT.NS",         "name": "Larsen & Toubro",           "exchange": "NSE", "is_active": True},
    {"ticker": "AXISBANK.NS",   "name": "Axis Bank",                 "exchange": "NSE", "is_active": True},
    {"ticker": "ASIANPAINT.NS", "name": "Asian Paints",              "exchange": "NSE", "is_active": True},
    {"ticker": "MARUTI.NS",     "name": "Maruti Suzuki",             "exchange": "NSE", "is_active": True},
    {"ticker": "SUNPHARMA.NS",  "name": "Sun Pharmaceutical",        "exchange": "NSE", "is_active": True},
    {"ticker": "TITAN.NS",      "name": "Titan Company",             "exchange": "NSE", "is_active": True},
    {"ticker": "WIPRO.NS",      "name": "Wipro",                     "exchange": "NSE", "is_active": True},
    {"ticker": "ULTRACEMCO.NS", "name": "UltraTech Cement",          "exchange": "NSE", "is_active": True},
    {"ticker": "BAJFINANCE.NS", "name": "Bajaj Finance",             "exchange": "NSE", "is_active": True},
    {"ticker": "NESTLEIND.NS",  "name": "Nestle India",              "exchange": "NSE", "is_active": True},
    {"ticker": "POWERGRID.NS",  "name": "Power Grid Corp",           "exchange": "NSE", "is_active": True},
    {"ticker": "NTPC.NS",       "name": "NTPC",                      "exchange": "NSE", "is_active": True},
    {"ticker": "ONGC.NS",       "name": "Oil & Natural Gas Corp",    "exchange": "NSE", "is_active": True},
    {"ticker": "HCLTECH.NS",    "name": "HCL Technologies",          "exchange": "NSE", "is_active": True},
    {"ticker": "BAJAJFINSV.NS", "name": "Bajaj Finserv",             "exchange": "NSE", "is_active": True},
]

TOP25_TICKERS = [c["ticker"] for c in TOP25]
# Also keep old NS ticker inactive-safe in case it exists in DB
TOP25_TICKERS.append("TATAMOTORS.NS")
TOP25_TICKERS.append("TATAMOTORS.BO")

# =============================================================================
# Step 1: Deactivate all existing companies not in top 25
# =============================================================================
log.info("Step 1: Deactivating companies not in top 25...")
existing = client.table("companies").select("id,ticker,is_active").execute().data or []
deactivated = 0
for co in existing:
    if co["ticker"] not in TOP25_TICKERS and co.get("is_active"):
        client.table("companies").update({"is_active": False}).eq("id", co["id"]).execute()
        deactivated += 1
log.info(f"  Deactivated {deactivated} companies ✓")

# =============================================================================
# Step 2: Upsert top 25 companies
# =============================================================================
log.info("Step 2: Upserting top 25 companies...")
res = client.table("companies").upsert(TOP25, on_conflict="ticker").execute()
log.info(f"  Upserted {len(res.data or [])} companies ✓")

# Verify
active = client.table("companies").select("id,ticker,name").eq("is_active", True).execute().data or []
log.info(f"  Active companies in DB: {len(active)}")
for co in active:
    log.info(f"    {co['ticker']:20s}  {co['name']}")

# =============================================================================
# Step 3: Run full pipeline (3y OHLCV + health + correlation + fundamentals)
# =============================================================================
log.info("\nStep 3: Running full pipeline (this will take 10-20 minutes)...")
log.info("  Fetching 3 years of OHLCV for all 25 companies + sectors...")

from app.pipelines import ingest_ohlcv, ohlcv_pipeline, correlation_pipeline, fundamental_pipeline

companies = client.table("companies").select("id,ticker,name").eq("is_active", True).execute().data or []
sectors   = client.table("sectors").select("id,name,yf_ticker").eq("is_active", True).execute().data or []

t0 = time.time()

# ── 3a: Ingest OHLCV (3y for new companies, incremental for existing) ─────────
log.info("  [3a] Ingesting OHLCV data...")
try:
    result = ingest_ohlcv.run()
    co_results = result.get("companies", [])
    ok   = sum(1 for r in co_results if not r.get("error"))
    fail = sum(1 for r in co_results if r.get("error"))
    total_rows = sum(r.get("pushed", 0) for r in co_results)
    log.info(f"       Companies: ok={ok} fail={fail} total_rows_pushed={total_rows}")
    for r in co_results:
        if r.get("error"):
            log.warning(f"       FAILED {r['ticker']}: {r['error']}")
except Exception as e:
    log.error(f"  OHLCV ingest failed: {e}")

# ── 3b: Sector health ─────────────────────────────────────────────────────────
log.info("  [3b] Computing sector health...")
sector_ids = []
for s in sectors:
    try:
        ohlcv_pipeline.run_sector(s["id"], s["name"])
        sector_ids.append(s["id"])
        log.info(f"       {s['name']} ✓")
    except Exception as e:
        log.error(f"       {s['name']} FAILED: {e}")

# ── 3c: Company health ────────────────────────────────────────────────────────
log.info(f"  [3c] Computing company health ({len(companies)} companies)...")
ok = fail = 0
for co in companies:
    try:
        ohlcv_pipeline.run(co["id"], co["name"])
        ok += 1
    except Exception as e:
        log.error(f"       {co['ticker']} FAILED: {e}")
        fail += 1
log.info(f"       ok={ok} fail={fail}")

# ── 3d: Correlation ───────────────────────────────────────────────────────────
log.info(f"  [3d] Computing correlations ({len(companies)} companies)...")
ok = fail = 0
for co in companies:
    try:
        correlation_pipeline.run(co["id"], sector_ids)
        ok += 1
    except Exception as e:
        log.error(f"       {co['ticker']} FAILED: {e}")
        fail += 1
log.info(f"       ok={ok} fail={fail}")

# ── 3e: Fundamentals ─────────────────────────────────────────────────────────
log.info(f"  [3e] Fetching fundamentals ({len(companies)} companies)...")
ok = fail = 0
for co in companies:
    try:
        fundamental_pipeline.run(ticker=co["ticker"], company_id=co["id"])
        ok += 1
        time.sleep(0.5)  # rate-limit yfinance
    except Exception as e:
        log.error(f"       {co['ticker']} FAILED: {e}")
        fail += 1
log.info(f"       ok={ok} fail={fail}")

duration = time.time() - t0
log.info(f"\n✅ Done in {duration/60:.1f} minutes")
log.info("   Daily pipeline will keep data updated automatically via scheduler.py")
