"""
fundamental_pipeline.py
-----------------------
Quarterly: balance sheet ratios + stock holding metrics.
Runs only once per quarter per company (caller checks cadence).
"""

from LogicEngine.fetching.fetcher import fetch_financials, fetch_holders
from LogicEngine.analysis.balance_sheet import run_balance_sheet
from LogicEngine.analysis.stock_holding import run_stock_holding
from LogicEngine.pipelines.db import _client
from LogicEngine.pipelines.utils import safe_float as _f, RATIO_ID, METRIC_ID
from datetime import date

_BATCH = 500


def _current_quarter() -> str:
    today = date.today()
    return f"{today.year}-Q{(today.month - 1) // 3 + 1}"


def _upsert(table: str, conflict: str, rows: list) -> None:
    if not rows:
        return
    for i in range(0, len(rows), _BATCH):
        _client.table(table).upsert(
            rows[i:i + _BATCH], on_conflict=conflict
        ).execute()


def run(ticker: str, company_id: str) -> dict:
    period = _current_quarter()
    bs_rows, sh_rows, hist_rows = [], [], []

    # ── Balance sheet ─────────────────────────────────────────────────────────
    fin = fetch_financials(ticker)
    if not fin.get("error"):
        bs = run_balance_sheet(fin)
        full = bs.get("full_ratios")
        pressure = _f(bs.get("sector_overlay", {}).get("pressure"))

        if full is not None and not full.empty:
            for _, row in full.iterrows():
                rid = RATIO_ID.get(str(row.get("Ratio", "")))
                if not rid:
                    continue
                bs_rows.append({
                    "company_id":      company_id,
                    "ratio_id":        rid,
                    "period":          period,
                    "value":           _f(row.get("Value")),
                    "yoy_pct":         _f(row.get("YoY_pct")),
                    "hist_pct_rank":   _f(row.get("HistPctRank")),
                    "sector_pressure": pressure,
                })

        # Historical ratios (balance_sheet_hist)
        hist = bs.get("historical_ratios")
        if hist is not None and not hist.empty:
            for _, row in hist.iterrows():
                rid = RATIO_ID.get(str(row.get("Ratio", "")))
                if not rid:
                    continue
                d = str(row.get("Date", ""))[:10]
                if not d:
                    continue
                v = _f(row.get("Value"))
                if v is None:
                    continue
                hist_rows.append({
                    "company_id": company_id,
                    "ratio_id":   rid,
                    "date":       d,
                    "value":      v,
                })

    # ── Stock holding ─────────────────────────────────────────────────────────
    hld = fetch_holders(ticker)
    if not hld.get("error"):
        sh = run_stock_holding(hld)
        full = sh.get("full_metrics")
        pressure = _f(sh.get("sector_overlay", {}).get("pressure"))

        if full is not None and not full.empty:
            for _, row in full.iterrows():
                mid = METRIC_ID.get(str(row.get("Metric", "")))
                if not mid:
                    continue
                sh_rows.append({
                    "company_id":      company_id,
                    "metric_id":       mid,
                    "period":          period,
                    "value":           _f(row.get("Value")),
                    "hist_pct_rank":   None,
                    "sector_pressure": pressure,
                })

    # ── Push ──────────────────────────────────────────────────────────────────
    _upsert("balance_sheet_scores", "company_id,ratio_id,period",   bs_rows)
    _upsert("balance_sheet_hist",   "company_id,ratio_id,date",     hist_rows)
    _upsert("holding_scores",       "company_id,metric_id,period",  sh_rows)

    return {
        "company_id":   company_id,
        "period":       period,
        "bs_rows":      len(bs_rows),
        "hist_rows":    len(hist_rows),
        "holding_rows": len(sh_rows),
    }
