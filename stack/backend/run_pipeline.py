"""
run_pipeline.py  v3.0
---------------------
Daily batch runner — reads sme_companies_loan_analysis.csv,
runs all 9 pipeline layers per company, pushes to Supabase.

Features:
  - Pre-computes sectors ONCE (shared across all companies)
  - 3-year data retention enforced in gateway
  - One row per (company, date) — no duplicates
  - Null balance sheet rows skipped
  - Progress tracking — resume after crash
  - Designed to run via GitHub Actions (no manual steps)

Usage:
  python run_pipeline.py              # all companies
  python run_pipeline.py --resume     # skip already done today
  python run_pipeline.py --start 0 --end 20
  python run_pipeline.py --dry        # no Supabase push
"""

import os, sys, csv, time, json, argparse, traceback
from datetime import datetime, timezone
from pathlib import Path

_BACKEND_DIR   = Path(__file__).parent
_LOGIC_DIR     = _BACKEND_DIR / "logic" / "LogicEngine"
_CSV_PATH      = _BACKEND_DIR / "logic" / "sme_companies_loan_analysis.csv"
_LOG_PATH      = _BACKEND_DIR / "pipeline_run.log"
_PROGRESS_PATH = _BACKEND_DIR / ".pipeline_progress.json"

for p in [str(_LOGIC_DIR), str(_LOGIC_DIR/"sector"),
          str(_LOGIC_DIR/"company"), str(_LOGIC_DIR/"correlation")]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Load .env
env_path = _BACKEND_DIR / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


def log(msg: str, level: str = "INFO"):
    ts   = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    line = f"[{ts}] [{level}] {msg}"
    print(line, flush=True)
    with open(_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def load_progress() -> dict:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if _PROGRESS_PATH.exists():
        with open(_PROGRESS_PATH) as f:
            p = json.load(f)
        # Reset progress if it's from a previous day
        if p.get("date") != today:
            return {"date": today, "completed": [], "failed": []}
        return p
    return {"date": today, "completed": [], "failed": []}


def save_progress(p: dict):
    with open(_PROGRESS_PATH, "w") as f:
        json.dump(p, f, indent=2)


def load_companies() -> list:
    companies, seen = [], set()
    with open(_CSV_PATH, newline="", encoding="utf-8") as f:
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
            companies.append({"name": name, "ticker": yf_ticker})
    return companies


def run_batch(start: int = 0, end: int = None, dry: bool = False, resume: bool = False):
    from logic.LogicEngine.aegis_pipeline import run_full_pipeline
    from logic.LogicEngine.sector.sector_engine import run_all_sectors, SECTOR_INDICES
    from logic.LogicEngine.sector.sector_health import run_all_sector_health, rolling_health_matrix
    from logic.LogicEngine.data_utils import load_sector_index, clean_sector_data

    companies = load_companies()
    if end is None:
        end = len(companies)
    batch = companies[start:end]

    progress = load_progress() if resume else {
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "completed": [], "failed": []
    }

    log(f"{'='*60}")
    log(f"AEGIS-FIN Pipeline  |  {len(batch)} companies  |  dry={dry}  |  resume={resume}")
    log(f"{'='*60}")

    # ── Pre-compute sectors ONCE ──────────────────────────────────────────────
    log("Pre-computing sector data (shared across all companies)...")
    try:
        sector_metrics = run_all_sectors()
        sector_raw = {}
        for name, ticker in SECTOR_INDICES.items():
            try:
                df = clean_sector_data(load_sector_index(ticker))
                sector_raw[name] = df
            except Exception as e:
                log(f"  Sector {name} raw fetch failed: {e}", "WARN")
        health_dfs    = run_all_sector_health(sector_raw)
        health_matrix = rolling_health_matrix(health_dfs)
        log(f"Sectors ready: {len(sector_metrics)} metrics, {len(health_dfs)} health dfs")
    except Exception as e:
        log(f"FATAL: Sector pre-computation failed: {e}", "ERROR")
        traceback.print_exc()
        return

    # ── Gateway ───────────────────────────────────────────────────────────────
    gateway = None
    if not dry:
        try:
            from db.supabase_gateway import AegisGateway
            gateway = AegisGateway()
            # Push sector data once (not per company)
            log("Pushing sector metrics and health to Supabase...")
            run_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")
            gateway._push_sector_metrics(run_at, sector_metrics)
            gateway._push_sector_health(run_at, health_dfs)
            log("Sector data pushed.")
        except Exception as e:
            log(f"FATAL: Cannot connect to Supabase: {e}", "ERROR")
            return

    ok_count = fail_count = skip_count = 0

    for i, company in enumerate(batch):
        name   = company["name"]
        ticker = company["ticker"]
        idx    = start + i + 1

        if resume and name in progress["completed"]:
            log(f"[{idx}/{len(batch)+start}] SKIP: {name}")
            skip_count += 1
            continue

        log(f"[{idx}/{len(batch)+start}] {name} ({ticker})")
        t0 = time.time()

        try:
            result = run_full_pipeline(
                ticker       = ticker,
                display_name = name,
                precomputed_sector_metrics = sector_metrics,
                precomputed_sector_raw     = sector_raw,
                precomputed_health_dfs     = health_dfs,
                precomputed_health_matrix  = health_matrix,
                skip_sector_output         = False,
            )

            if "error" in result:
                raise ValueError(result["error"])

            if not dry and gateway:
                gateway.push(result)

            elapsed = time.time() - t0
            log(f"  ✔ Done in {elapsed:.1f}s")
            progress["completed"].append(name)
            ok_count += 1

        except Exception as e:
            elapsed = time.time() - t0
            log(f"  ✘ FAILED in {elapsed:.1f}s: {e}", "ERROR")
            progress["failed"].append({"name": name, "ticker": ticker, "error": str(e)})
            fail_count += 1

        save_progress(progress)
        time.sleep(1)  # avoid Yahoo Finance rate limit

    log(f"BATCH COMPLETE  |  ok={ok_count}  failed={fail_count}  skipped={skip_count}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--start",  type=int, default=0)
    p.add_argument("--end",    type=int, default=None)
    p.add_argument("--dry",    action="store_true")
    p.add_argument("--resume", action="store_true")
    args = p.parse_args()
    run_batch(start=args.start, end=args.end, dry=args.dry, resume=args.resume)
