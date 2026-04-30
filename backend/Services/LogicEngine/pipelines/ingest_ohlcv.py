import numpy as np
import pandas as pd
import yfinance as yf
import warnings
from datetime import date, timedelta
from LogicEngine.pipelines.db import _client

warnings.filterwarnings("ignore")

_RETENTION_ROWS = 756   # ~3 trading years
_BATCH_SIZE     = 500   # Supabase safe upsert batch


def _load_companies() -> list[dict]:
    return (
        _client.table("companies")
        .select("id,ticker,name")
        .eq("is_active", True)
        .execute()
        .data or []
    )


def _load_sectors() -> list[dict]:
    return (
        _client.table("sectors")
        .select("id,name,yf_ticker")
        .eq("is_active", True)
        .execute()
        .data or []
    )


def _latest_date(table: str, id_col: str, entity_id: str) -> str | None:
    rows = (
        _client.table(table)
        .select("date")
        .eq(id_col, entity_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
        .data or []
    )
    return rows[0]["date"] if rows else None


def _fetch_since(yf_ticker: str, since: str | None) -> pd.DataFrame:
    today = date.today().isoformat()
    try:
        if since is None:
            raw = yf.download(yf_ticker, period="3y",
                              auto_adjust=True, progress=False)
        else:
            start = (date.fromisoformat(since) + timedelta(days=1)).isoformat()
            if start > today:
                return pd.DataFrame()
            raw = yf.download(yf_ticker, start=start, end=today,
                              auto_adjust=True, progress=False)
    except Exception:
        return pd.DataFrame()

    if raw is None or raw.empty:
        return pd.DataFrame()

    df = raw.copy()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[0] for c in df.columns]
    df = df.reset_index()
    for candidate in ("Datetime", "Price", "index"):
        if "Date" not in df.columns and candidate in df.columns:
            df = df.rename(columns={candidate: "Date"})
            break
    df["Date"] = pd.to_datetime(df["Date"])
    return df.sort_values("Date").reset_index(drop=True)


def _build_rows(df: pd.DataFrame, id_col: str, entity_id: str) -> list[dict]:
    rows = []
    for _, r in df.iterrows():
        close = _f(r.get("Close"))
        if close is None:
            continue
        rows.append({
            id_col:    entity_id,
            "date":    str(r["Date"].date()),
            "open":    _f(r.get("Open")),
            "high":    _f(r.get("High")),
            "low":     _f(r.get("Low")),
            "close":   close,
            "volume":  int(r["Volume"]) if _nn(r.get("Volume")) else None,
        })
    return rows


def _upsert_batched(table: str, conflict: str, rows: list[dict]) -> None:
    for i in range(0, len(rows), _BATCH_SIZE):
        _client.table(table).upsert(
            rows[i:i + _BATCH_SIZE], on_conflict=conflict
        ).execute()


def _delete_old(table: str, id_col: str, entity_id: str) -> None:
    cutoff = (date.today() - timedelta(days=3 * 365)).isoformat()
    _client.table(table).delete()\
        .eq(id_col, entity_id)\
        .lt("date", cutoff)\
        .execute()


def _ingest_entity(table: str, conflict: str, id_col: str,
                   entity_id: str, yf_ticker: str) -> int:
    since = _latest_date(table, id_col, entity_id)
    df    = _fetch_since(yf_ticker, since)
    rows  = _build_rows(df, id_col, entity_id)
    if rows:
        _upsert_batched(table, conflict, rows)
        _delete_old(table, id_col, entity_id)
    return len(rows)


def run_companies() -> list[dict]:
    results = []
    for co in _load_companies():
        try:
            pushed = _ingest_entity(
                "ohlcv_raw", "company_id,date",
                "company_id", co["id"], co["ticker"],
            )
            results.append({"ticker": co["ticker"], "pushed": pushed})
        except Exception as e:
            results.append({"ticker": co["ticker"], "pushed": 0, "error": str(e)})
    return results


def run_sectors() -> list[dict]:
    results = []
    for sec in _load_sectors():
        try:
            pushed = _ingest_entity(
                "sector_ohlcv_raw", "sector_id,date",
                "sector_id", sec["id"], sec["yf_ticker"],
            )
            results.append({"sector": sec["name"], "pushed": pushed})
        except Exception as e:
            results.append({"sector": sec["name"], "pushed": 0, "error": str(e)})
    return results


def run() -> dict:
    return {"companies": run_companies(), "sectors": run_sectors()}


def _f(v) -> float | None:
    if v is None:
        return None
    try:
        f = float(v)
        return None if (np.isnan(f) or np.isinf(f)) else round(f, 6)
    except Exception:
        return None


def _nn(v) -> bool:
    try:
        return v is not None and not np.isnan(float(v))
    except Exception:
        return False
