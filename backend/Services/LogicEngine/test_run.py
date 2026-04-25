"""
test_run.py — Pipeline test for AEGIS-FIN
------------------------------------------
Tests the full daily pipeline for one or more companies.

Usage
-----
    python LogicEngine/test_run.py                        # default: TCS.NS
    python LogicEngine/test_run.py INFY.NS Infosys        # single company
    python LogicEngine/test_run.py --batch                # test batch mode
"""

import os
import sys
import traceback
from datetime import date

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

# ── Args ──────────────────────────────────────────────────────────────────────
BATCH_MODE = "--batch" in sys.argv
TICKER     = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "TCS.NS"
NAME       = sys.argv[2] if len(sys.argv) > 2 else "TCS"

G = "\033[92m"; R = "\033[91m"; Y = "\033[93m"; B = "\033[94m"; X = "\033[0m"
passed = failed = 0


def ok(label, detail=""):
    global passed; passed += 1
    print(f"  {G}PASS{X}  {label}" + (f"  →  {detail}" if detail else ""))

def fail(label, err_msg):
    global failed; failed += 1
    print(f"  {R}FAIL{X}  {label}")
    print(f"         {err_msg}")
    if os.environ.get("VERBOSE"):
        traceback.print_exc()

def section(title):
    print(f"\n{B}{'─'*60}{X}\n{B}  {title}{X}\n{B}{'─'*60}{X}")


# =============================================================================
print(f"\n{'='*62}")
print(f"  AEGIS-FIN  |  Pipeline Test  |  {'BATCH' if BATCH_MODE else TICKER}")
print(f"{'='*62}")

# ── 1. Store connection ───────────────────────────────────────────────────────
section("1. Store connection")
try:
    from LogicEngine.store.data_store import configure_store, get_store
    configure_store()
    store   = get_store()
    backend = os.environ.get("STORE_BACKEND", "memory")
    ok("configure_store()", backend)
except Exception as e:
    fail("configure_store()", e); sys.exit(1)

if backend == "supabase":
    try:
        resp  = store._client.table("sectors").select("name").limit(3).execute()
        names = [r["name"] for r in (resp.data or [])]
        assert names, "sectors table empty — run supabase_schema.sql first"
        ok("Supabase ping", f"sectors: {names}")
    except Exception as e:
        fail("Supabase ping", e); sys.exit(1)

# ── 2. Sector pipeline ────────────────────────────────────────────────────────
section("2. Sector pipeline")
sector_results = {}
try:
    from LogicEngine.pipeline import run_sectors
    sector_results = run_sectors()
    assert sector_results, "No sector results — check yfinance connectivity"
    ok("run_sectors()", f"{len(sector_results)} sectors")
    for sname, sr in list(sector_results.items())[:3]:
        print(f"         {sname}: score={sr.get('health_score')}  signal={sr.get('signal')}")
except Exception as e:
    fail("run_sectors()", e)

# ── 3. Company pipeline ───────────────────────────────────────────────────────
if BATCH_MODE:
    section("3. Batch pipeline (TCS + Infosys)")
    try:
        from LogicEngine.pipeline import run_batch
        companies = [("TCS.NS", "TCS"), ("INFY.NS", "Infosys")]
        results   = run_batch(companies, sector_results=sector_results, force=True)
        ok("run_batch()", f"{len(results)} companies processed")
        for r in results:
            comp = r.get("classifier", {}).get("composite", {}) if r.get("classifier") else {}
            errs = r.get("errors", [])
            status = f"tier={comp.get('tier')}  score={comp.get('score')}" if comp else f"errors={errs}"
            print(f"         {r['ticker']}: {status}")
    except Exception as e:
        fail("run_batch()", e)
else:
    section(f"3. Company pipeline  ({TICKER})")
    try:
        from LogicEngine.pipeline import run_daily
        result = run_daily(TICKER, NAME, sector_results=sector_results, force=True)
        errors = result.get("errors", [])

        oh = result.get("ohlcv_health")
        if oh:
            ok("ohlcv_health", f"score={oh.get('health_score')}  signal={oh.get('signal')}  regime={oh.get('regime')}")
        else:
            fail("ohlcv_health", "None returned")

        bs = result.get("balance_sheet")
        if bs:
            ok("balance_sheet", f"period={bs.get('period')}  ratios={bs.get('ratio_count')}  overlay={bs.get('sector_overlay', {}).get('direction')}")
        else:
            print(f"  {Y}SKIP{X}  balance_sheet  (quarterly — already current or fetch failed)")

        sh = result.get("stock_holding")
        if sh:
            ok("stock_holding", f"signal={sh.get('holding_signal')}")
        else:
            print(f"  {Y}SKIP{X}  stock_holding  (quarterly — already current or fetch failed)")

        corr = result.get("correlation")
        if corr:
            top = corr.get("top_sectors") or []
            ok("correlation", f"top={top[0].get('sector') if top else 'n/a'}  insights={len(corr.get('insights') or [])}")
        else:
            fail("correlation", "None returned")

        clf = result.get("classifier")
        if clf:
            comp = clf.get("composite", {})
            ok("classifier", f"tier={comp.get('tier')}  score={comp.get('score')}  grade={comp.get('grade')}  passes={clf.get('filter', {}).get('passes')}")
        else:
            fail("classifier", f"None  (missing: {[n for n,v in [('ohlcv',result.get('ohlcv_health')),('bs',result.get('balance_sheet')),('hold',result.get('stock_holding')),('corr',result.get('correlation'))] if not v]})")

        if errors:
            print(f"\n  {Y}Pipeline errors:{X}")
            for e in errors:
                print(f"    • {e}")

    except Exception as e:
        fail(f"run_daily({TICKER})", e)

# ── 4. Store read-back ────────────────────────────────────────────────────────
section("4. Store read-back")
try:
    from LogicEngine.store.adapters import (
        load_ohlcv_history_df, load_ohlcv_health_history,
        load_correlation_latest, load_classifier_latest,
    )

    df = load_ohlcv_history_df(TICKER)
    if not df.empty:
        ok("load_ohlcv_history_df", f"{len(df)} rows  latest={str(df['Date'].max())[:10]}")
    else:
        fail("load_ohlcv_history_df", "empty — run seed_history.py first")

    hdf = load_ohlcv_health_history(TICKER)
    if not hdf.empty:
        ok("load_ohlcv_health_history", f"{len(hdf)} rows")
    else:
        fail("load_ohlcv_health_history", "empty")

    corr_row = load_correlation_latest(TICKER)
    if corr_row:
        ok("load_correlation_latest", f"date={str(corr_row.get('date',''))[:10]}")
    else:
        fail("load_correlation_latest", "None")

    clf_row = load_classifier_latest(TICKER)
    if clf_row:
        ok("load_classifier_latest", f"tier={clf_row.get('composite_tier')}  score={clf_row.get('composite_score')}")
    else:
        fail("load_classifier_latest", "None")

except Exception as e:
    fail("store read-back", e)

# ── Summary ───────────────────────────────────────────────────────────────────
total = passed + failed
print(f"\n{'='*62}")
print(f"  Passed: {passed}/{total}   Failed: {failed}/{total}")
if failed == 0:
    print(f"  {G}All checks passed — pipeline is operational.{X}")
else:
    print(f"  {R}{failed} check(s) failed.{X}  Set VERBOSE=1 for full tracebacks.")
print(f"{'='*62}\n")
sys.exit(0 if failed == 0 else 1)
