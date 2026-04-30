import numpy as np
import pandas as pd
from datetime import date, timedelta
from LogicEngine.analysis.ohlcv_health import run_ohlcv_health
from LogicEngine.pipelines.db import _client
from LogicEngine.pipelines.utils import safe_float as _f

_BATCH_SIZE = 500


def fetch_data(company_id: str, limit: int = 756) -> pd.DataFrame:
    rows = (
        _client.table("ohlcv_raw")
        .select("date,open,high,low,close,volume")
        .eq("company_id", company_id)
        .order("date", desc=False)
        .limit(limit)
        .execute()
        .data or []
    )
    return _to_df(rows)


def fetch_sector_data(sector_id: str, limit: int = 756) -> pd.DataFrame:
    rows = (
        _client.table("sector_ohlcv_raw")
        .select("date,open,high,low,close,volume")
        .eq("sector_id", sector_id)
        .order("date", desc=False)
        .limit(limit)
        .execute()
        .data or []
    )
    return _to_df(rows)


def process_data(df: pd.DataFrame, name: str) -> list[dict]:
    if df.empty:
        return []
    try:
        hist = run_ohlcv_health(df, name)["history"].reset_index()
    except Exception:
        return []
    return [
        {
            "date":          str(r["Date"].date()),
            "daily_return":  _f(r.get("daily_return")),
            "cum_change_1m": _f(r.get("cum_change_1m")),
            "cum_change_1y": _f(r.get("cum_change_1y")),
            "cum_change_2y": _f(r.get("cum_change_2y")),
            "close_z":       _f(r.get("close_z")),
            "ret_z":         _f(r.get("ret_z")),
            "z_change":      _f(r.get("z_change")),
            "cum_z_change":  _f(r.get("cum_z_change")),
            "spike_up":      bool(r.get("spike_up", False)),
            "spike_down":    bool(r.get("spike_down", False)),
            "oc_spark":      _f(r.get("oc_spark")),
            "volatility":    _f(r.get("volatility")),
            "composite":     _f(r.get("composite")),
            "health_score":  _f(r.get("health_score")),
        }
        for _, r in hist.iterrows()
    ]


def push_data(company_id: str, rows: list[dict]) -> None:
    if not rows:
        return
    for r in rows:
        r["company_id"] = company_id
    for i in range(0, len(rows), _BATCH_SIZE):
        _client.table("ohlcv_health").upsert(
            rows[i:i + _BATCH_SIZE], on_conflict="company_id,date"
        ).execute()
    _delete_old("ohlcv_health", "company_id", company_id)


def push_sector_data(sector_id: str, rows: list[dict]) -> None:
    if not rows:
        return
    for r in rows:
        r["sector_id"] = sector_id
    for i in range(0, len(rows), _BATCH_SIZE):
        _client.table("sector_health").upsert(
            rows[i:i + _BATCH_SIZE], on_conflict="sector_id,date"
        ).execute()
    _delete_old("sector_health", "sector_id", sector_id)


def run(company_id: str, name: str) -> dict:
    rows = process_data(fetch_data(company_id), name)
    push_data(company_id, rows)
    return {"company_id": company_id, "rows": len(rows)}


def run_sector(sector_id: str, name: str) -> dict:
    rows = process_data(fetch_sector_data(sector_id), name)
    push_sector_data(sector_id, rows)
    return {"sector_id": sector_id, "rows": len(rows)}


def _delete_old(table: str, id_col: str, entity_id: str) -> None:
    cutoff = (date.today() - timedelta(days=3 * 365)).isoformat()
    _client.table(table).delete()\
        .eq(id_col, entity_id)\
        .lt("date", cutoff)\
        .execute()


def _to_df(rows: list[dict]) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    df["Date"] = pd.to_datetime(df["date"])
    return df.rename(columns={"open": "Open", "high": "High",
                               "low": "Low", "close": "Close",
                               "volume": "Volume"})
