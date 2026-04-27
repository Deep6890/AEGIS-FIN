"""
pipeline.py — Production daily pipeline for AEGIS-FIN
------------------------------------------------------
Designed to run once per day. Each run:

  1. Sectors  — fetch today's 1 OHLCV row per sector/macro, upsert to Supabase,
                delete rows older than 3 years, run health engine on full history.

  2. Per company — fetch today's 1 OHLCV row, upsert, delete rows > 3 years,
                   run health engine on full 3-year history from DB.

  3. Balance sheet + stock holding — quarterly only (skipped if current quarter
                already in DB). Fetches fresh data, runs analysis, saves to DB.

  4. Correlation — runs daily from in-memory ohlcv_result + sector_results.
                   Saves one JSON row per company per day.

  5. Classifier — runs daily using all 4 inputs. Saves one JSON row per day.

Usage
-----
    from LogicEngine.pipeline import run_daily, run_sectors

    # Single company
    result = run_daily("TCS.NS", "TCS")

    # Multiple companies — run sectors once, reuse for all companies
    companies = [("TCS.NS", "TCS"), ("INFY.NS", "Infosys"), ("HDFCBANK.NS", "HDFC Bank")]
    sectors   = run_sectors()
    results   = run_batch(companies, sector_results=sectors)
"""

import os
from datetime import date
from typing import List, Optional, Tuple

# ── Load .env on import ───────────────────────────────────────────────────────
_here = os.path.dirname(os.path.abspath(__file__))
_env  = os.path.join(_here, ".env")
if os.path.exists(_env):
    with open(_env) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())

from LogicEngine.logger import get_logger
from LogicEngine.store.data_store import configure_store, get_store, _current_quarter

configure_store()
log = get_logger(__name__)

_MACRO_NAMES = {"India VIX", "USD-INR", "Gold", "Crude Oil", "Nifty", "Sensex"}


def _cutoff() -> str:
    """Date string exactly 3 years ago — rows before this are pruned."""
    today = date.today()
    return f"{today.year - 3}-{today.month:02d}-{today.day:02d}"


# =============================================================================
# SECTOR PIPELINE
# =============================================================================

def run_sectors(force: bool = False) -> dict:
    """
    Fetch today's OHLCV for all 14 sectors + macro assets.
    Upserts today's row, deletes rows older than 3 years, runs health engine.

    Parameters
    ----------
    force : re-fetch even if today's data already exists

    Returns
    -------
    dict { sector_name: run_ohlcv_health() result }
    """
    from LogicEngine.fetching.fetcher import fetch_ohlcv_today, ALL_SECTOR_TICKERS
    from LogicEngine.analysis.ohlcv_health import run_ohlcv_health
    from LogicEngine.store.adapters import (
        save_sector_ohlcv_today, save_sector_health, save_macro_health,
        load_sector_history_df, needs_sector_update,
    )

    log.info("pipeline.sectors.start", count=len(ALL_SECTOR_TICKERS))
    results = {}
    store   = get_store()
    cutoff  = _cutoff()

    for sector_name, yf_ticker in ALL_SECTOR_TICKERS.items():
        try:
            # Push today's single row if not already done today
            if force or needs_sector_update(sector_name):
                today_data = fetch_ohlcv_today(yf_ticker, sector_name)
                if today_data.get("error") or not today_data.get("date"):
                    log.error("pipeline.sectors.fetch_failed", sector=sector_name,
                              error=today_data.get("error"))
                    continue
                save_sector_ohlcv_today(sector_name, today_data)
                # Prune rows older than 3 years
                store.delete("sector_ohlcv_raw", sector_name, before_date=cutoff)
                log.info("pipeline.sectors.row_pushed", sector=sector_name,
                         date=today_data.get("date"))

            # Load full history from DB, run health engine
            hist_df = load_sector_history_df(sector_name)
            if hist_df.empty:
                log.warning("pipeline.sectors.no_history", sector=sector_name)
                continue

            result = run_ohlcv_health(hist_df, sector_name, label_col="Sector")
            results[sector_name] = result

            # Save health rows + prune
            if sector_name in _MACRO_NAMES:
                save_macro_health(sector_name, result)
            else:
                save_sector_health(sector_name, result)
            store.delete("sector_health", sector_name, before_date=cutoff)

            health_score = result.get("health_score")
            log.info("pipeline.sectors.health_ok", sector=sector_name,
                     health_score=round(health_score, 2) if health_score is not None else None,
                     signal=result.get("signal"))

        except Exception as exc:
            log.error("pipeline.sectors.failed", sector=sector_name, error=str(exc))

    log.info("pipeline.sectors.done", processed=len(results))
    return results


# =============================================================================
# SINGLE COMPANY PIPELINE
# =============================================================================

def run_daily(
    ticker:         str,
    company_name:   str,
    sector_results: Optional[dict] = None,
    top_n:          int = 5,
    force:          bool = False,
) -> dict:
    """
    Run the full daily pipeline for one company.

    Parameters
    ----------
    ticker         : Yahoo Finance ticker, e.g. "TCS.NS"
    company_name   : Display name, e.g. "TCS"
    sector_results : Pre-computed dict from run_sectors(). If None, run_sectors()
                     is called automatically (expensive — pass it in for batches).
    top_n          : Top N correlated sectors to use (default 5).
    force          : Re-run all steps even if today's data already exists.

    Returns
    -------
    dict {
        ticker, company, date,
        ohlcv_health,   # latest snapshot dict
        balance_sheet,  # summary dict or None (quarterly — skipped if current)
        stock_holding,  # summary dict or None (quarterly — skipped if current)
        correlation,    # full correlation dict
        classifier,     # full classifier dict
        errors: list[str]
    }
    """
    from LogicEngine.fetching.fetcher import (
        fetch_ohlcv_today, fetch_financials, fetch_holders,
    )
    from LogicEngine.analysis.ohlcv_health import run_ohlcv_health
    from LogicEngine.analysis.balance_sheet import run_balance_sheet
    from LogicEngine.analysis.stock_holding import run_stock_holding
    from LogicEngine.correlation.correlation import run_correlation
    from LogicEngine.classifier.company_classifier import run_classifier, DEFAULT_WEIGHTS
    from LogicEngine.store.adapters import (
        needs_ohlcv_update, needs_balance_sheet_update, needs_holding_update,
        save_ohlcv_today, save_ohlcv_health,
        save_balance_sheet, save_stock_holding,
        save_correlation, save_classifier,
        load_ohlcv_history_df,
        load_balance_sheet_data, load_holding_data,
    )

    today  = date.today().isoformat()
    cutoff = _cutoff()
    store  = get_store()

    log.info("pipeline.company.start", ticker=ticker, company=company_name)

    out = {
        "ticker": ticker, "company": company_name, "date": today,
        "ohlcv_health": None, "balance_sheet": None,
        "stock_holding": None, "correlation": None,
        "classifier": None, "errors": [],
    }

    # Sectors — auto-run if not provided
    if sector_results is None:
        sector_results = run_sectors(force=force)

    # =========================================================================
    # STEP 1 — OHLCV: push today's 1 row, prune old rows, run health engine
    # =========================================================================
    ohlcv_result = None

    if force or needs_ohlcv_update(ticker):
        today_data = fetch_ohlcv_today(ticker, company_name)
        if today_data.get("error") or not today_data.get("date"):
            out["errors"].append(f"OHLCV fetch failed: {today_data.get('error')}")
            log.error("pipeline.company.ohlcv_fetch_failed", ticker=ticker,
                      error=today_data.get("error"))
        elif today_data.get("close") is None:
            log.warning("pipeline.company.ohlcv_null_close", ticker=ticker,
                        date=today_data.get("date"),
                        note="Market closed or data unavailable — skipping today's row")
        else:
            save_ohlcv_today(ticker, today_data)
            store.delete("ohlcv_raw", ticker, before_date=cutoff)
            log.info("pipeline.company.ohlcv_pushed", ticker=ticker,
                     date=today_data.get("date"), close=today_data.get("close"))

    # Load full 3-year history from DB for health engine
    hist_df = load_ohlcv_history_df(ticker)
    if hist_df.empty:
        out["errors"].append(f"No OHLCV history in DB for {ticker} — run seed_history.py first")
        log.error("pipeline.company.no_history", ticker=ticker)
        return out

    try:
        ohlcv_result = run_ohlcv_health(hist_df, company_name, label_col="Company")
        save_ohlcv_health(ticker, ohlcv_result)
        store.delete("ohlcv_health", ticker, before_date=cutoff)
        out["ohlcv_health"] = ohlcv_result["latest"]
        log.info("pipeline.company.ohlcv_ok", ticker=ticker,
                 health_score=ohlcv_result.get("health_score"),
                 signal=ohlcv_result.get("signal"))
    except Exception as exc:
        out["errors"].append(f"OHLCV health failed: {exc}")
        log.error("pipeline.company.ohlcv_health_failed", ticker=ticker, error=str(exc))
        return out

    # =========================================================================
    # STEP 2 — BALANCE SHEET: quarterly only
    # =========================================================================
    bs_result = None

    if force or needs_balance_sheet_update(ticker):
        try:
            fin = fetch_financials(ticker)
            if not fin.get("error"):
                top_sectors = _top_n_sectors(ohlcv_result, sector_results, top_n)
                bs_result   = run_balance_sheet(fin, sector_results, top_sectors)
                save_balance_sheet(ticker, bs_result)
                out["balance_sheet"] = {
                    "period":         _current_quarter(),
                    "ratio_count":    len(bs_result.get("ratios", [])),
                    "sector_overlay": bs_result.get("sector_overlay"),
                }
                log.info("pipeline.company.balance_sheet_ok", ticker=ticker,
                         ratios=out["balance_sheet"]["ratio_count"])
            else:
                out["errors"].append(f"Financials fetch error: {fin.get('error')}")
        except Exception as exc:
            out["errors"].append(f"Balance sheet failed: {exc}")
            log.error("pipeline.company.balance_sheet_failed", ticker=ticker, error=str(exc))
    else:
        # Load existing quarter from DB for classifier
        stored = load_balance_sheet_data(ticker)
        if stored and not stored.get("ratios", None) is None:
            bs_result = stored

    # =========================================================================
    # STEP 3 — STOCK HOLDING: quarterly only
    # =========================================================================
    hold_result = None

    if force or needs_holding_update(ticker):
        try:
            holders = fetch_holders(ticker)
            if not holders.get("error"):
                top_sectors = _top_n_sectors(ohlcv_result, sector_results, top_n)
                hold_result = run_stock_holding(holders, sector_results, top_sectors)
                save_stock_holding(ticker, hold_result)
                out["stock_holding"] = {
                    "period":         _current_quarter(),
                    "holding_signal": hold_result.get("holding_signal"),
                    "sector_overlay": hold_result.get("sector_overlay"),
                }
                log.info("pipeline.company.holding_ok", ticker=ticker,
                         signal=hold_result.get("holding_signal"))
            else:
                out["errors"].append(f"Holders fetch error: {holders.get('error')}")
        except Exception as exc:
            out["errors"].append(f"Stock holding failed: {exc}")
            log.error("pipeline.company.holding_failed", ticker=ticker, error=str(exc))
    else:
        stored = load_holding_data(ticker)
        if stored:
            hold_result = stored

    # =========================================================================
    # STEP 4 — CORRELATION: daily
    # =========================================================================
    corr_result = None

    if sector_results:
        try:
            corr_result = run_correlation(ohlcv_result, sector_results, top_n=top_n)
            save_correlation(ticker, corr_result)
            store.delete("correlation", ticker, before_date=cutoff)
            out["correlation"] = corr_result
            top = corr_result.get("top_sectors") or []
            log.info("pipeline.company.correlation_ok", ticker=ticker,
                     top_sector=top[0].get("sector", "") if top else "")
        except Exception as exc:
            out["errors"].append(f"Correlation failed: {exc}")
            log.error("pipeline.company.correlation_failed", ticker=ticker, error=str(exc))

    # =========================================================================
    # STEP 5 — CLASSIFIER: daily, needs all 4 inputs
    # =========================================================================
    if ohlcv_result and bs_result and hold_result and corr_result:
        try:
            clf_result = run_classifier(
                ohlcv_result, bs_result, hold_result, corr_result,
                weights=DEFAULT_WEIGHTS,
            )
            save_classifier(ticker, clf_result)
            store.delete("classifier", ticker, before_date=cutoff)
            out["classifier"] = clf_result
            comp = clf_result.get("composite", {})
            log.info("pipeline.company.classifier_ok", ticker=ticker,
                     tier=comp.get("tier"), score=comp.get("score"),
                     grade=comp.get("grade"))
        except Exception as exc:
            out["errors"].append(f"Classifier failed: {exc}")
            log.error("pipeline.company.classifier_failed", ticker=ticker, error=str(exc))
    else:
        missing = [n for n, v in [
            ("ohlcv", ohlcv_result), ("balance_sheet", bs_result),
            ("holding", hold_result), ("correlation", corr_result),
        ] if not v]
        log.warning("pipeline.company.classifier_skipped", ticker=ticker, missing=missing)

    log.info("pipeline.company.done", ticker=ticker, errors=len(out["errors"]),
             tier=out.get("classifier", {}).get("composite", {}).get("tier")
             if out.get("classifier") else None)
    return out


# =============================================================================
# BATCH — run multiple companies
# =============================================================================

def run_batch(
    companies:      List[Tuple[str, str]],
    sector_results: Optional[dict] = None,
    top_n:          int = 5,
    force:          bool = False,
) -> List[dict]:
    """
    Run the daily pipeline for a list of companies.

    Parameters
    ----------
    companies      : list of (ticker, name) tuples
                     e.g. [("TCS.NS", "TCS"), ("INFY.NS", "Infosys")]
    sector_results : pre-computed from run_sectors() — computed once if None
    top_n          : top N correlated sectors per company
    force          : re-run all steps even if today's data exists

    Returns
    -------
    list of result dicts, one per company (same structure as run_daily)
    """
    if sector_results is None:
        log.info("pipeline.batch.running_sectors")
        sector_results = run_sectors(force=force)

    log.info("pipeline.batch.start", companies=len(companies))
    results = []

    for ticker, company_name in companies:
        result = run_daily(
            ticker, company_name,
            sector_results=sector_results,
            top_n=top_n,
            force=force,
        )
        results.append(result)
        errors = result.get("errors", [])
        tier   = result.get("classifier", {}).get("composite", {}).get("tier") \
                 if result.get("classifier") else None
        log.info("pipeline.batch.company_done", ticker=ticker,
                 tier=tier, errors=len(errors))

    passed = sum(1 for r in results if not r.get("errors"))
    log.info("pipeline.batch.done", total=len(results), clean=passed,
             with_errors=len(results) - passed)
    return results


# =============================================================================
# Helpers
# =============================================================================

def _top_n_sectors(ohlcv_result: dict, sector_results: dict, top_n: int) -> list:
    if not sector_results:
        return []
    try:
        from LogicEngine.correlation.correlation import run_correlation
        corr = run_correlation(ohlcv_result, sector_results, top_n=top_n)
        return [t["sector"] for t in corr.get("top_sectors", [])]
    except Exception:
        return list(sector_results.keys())[:top_n]
