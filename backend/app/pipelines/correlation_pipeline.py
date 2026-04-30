import numpy as np
import pandas as pd
from datetime import date, timedelta
from app.pipelines.db import _client
from app.pipelines.utils import safe_float as _f

_BATCH_SIZE = 500


def fetch_data(company_id: str, sector_ids: list[str],
               limit: int = 756) -> dict:
    co_rows = (
        _client.table("ohlcv_health")
        .select("date,composite,health_score,spike_up,spike_down,daily_return")
        .eq("company_id", company_id)
        .order("date", desc=False)
        .limit(limit)
        .execute()
        .data or []
    )
    sector_data = {}
    for sid in sector_ids:
        rows = (
            _client.table("sector_health")
            .select("date,composite,health_score,spike_up,spike_down,daily_return")
            .eq("sector_id", sid)
            .order("date", desc=False)
            .limit(limit)
            .execute()
            .data or []
        )
        if rows:
            sector_data[sid] = rows
    return {"company": co_rows, "sectors": sector_data}


def process_data(raw: dict) -> list[dict]:
    if not raw["company"]:
        return []
    co_df = _to_df(raw["company"])
    if co_df.empty:
        return []
    today   = str(date.today())
    results = []

    for sector_id, se_rows in raw["sectors"].items():
        se_df = _to_df(se_rows)
        if se_df.empty:
            continue

        aligned = co_df.join(se_df, how="inner",
                             lsuffix="_co", rsuffix="_se")
        # drop rows where any required column is NaN
        required = ["composite_co", "composite_se",
                    "daily_return_co", "daily_return_se"]
        aligned = aligned.dropna(subset=required)
        if len(aligned) < 5:
            continue

        n_up = int(aligned["spike_up_co"].fillna(False).astype(bool).sum())
        n_dn = int(aligned["spike_down_co"].fillna(False).astype(bool).sum())

        results.append({
            "sector_id":      sector_id,
            "date":           today,
            "corr_full":      _pearson(aligned["composite_co"],
                                       aligned["composite_se"]),
            "corr_20d":       _roll_last(aligned["composite_co"],
                                         aligned["composite_se"], 20),
            "corr_60d":       _roll_last(aligned["composite_co"],
                                         aligned["composite_se"], 60),
            "corr_100d":      _roll_last(aligned["composite_co"],
                                         aligned["composite_se"], 100),
            "outperf_20d":    _outperf(aligned["daily_return_co"],
                                       aligned["daily_return_se"], 20),
            "outperf_60d":    _outperf(aligned["daily_return_co"],
                                       aligned["daily_return_se"], 60),
            "outperf_100d":   _outperf(aligned["daily_return_co"],
                                       aligned["daily_return_se"], 100),
            "aligned_up_pct": _f(
                (aligned["spike_up_co"].fillna(False).astype(bool) &
                 aligned["spike_up_se"].fillna(False).astype(bool)).sum()
                / n_up * 100
            ) if n_up else None,
            "aligned_dn_pct": _f(
                (aligned["spike_down_co"].fillna(False).astype(bool) &
                 aligned["spike_down_se"].fillna(False).astype(bool)).sum()
                / n_dn * 100
            ) if n_dn else None,
            "avg_top_health": _f(float(
                aligned["health_score_se"].dropna().mean()
            )) if not aligned["health_score_se"].dropna().empty else None,
        })
    return results


def push_data(company_id: str, rows: list[dict]) -> None:
    if not rows:
        return
    for r in rows:
        r["company_id"] = company_id
    for i in range(0, len(rows), _BATCH_SIZE):
        _client.table("correlation_scores").upsert(
            rows[i:i + _BATCH_SIZE],
            on_conflict="company_id,sector_id,date"
        ).execute()
    _delete_old(company_id)


def run(company_id: str, sector_ids: list[str]) -> dict:
    rows = process_data(fetch_data(company_id, sector_ids))
    push_data(company_id, rows)
    return {"company_id": company_id, "sector_pairs": len(rows)}


def _delete_old(company_id: str) -> None:
    cutoff = (date.today() - timedelta(days=3 * 365)).isoformat()
    _client.table("correlation_scores").delete()\
        .eq("company_id", company_id)\
        .lt("date", cutoff)\
        .execute()


def _to_df(rows: list[dict]) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    return df.set_index("date").sort_index()


def _pearson(a: pd.Series, b: pd.Series) -> float | None:
    a, b = a.dropna(), b.dropna()
    aligned = pd.concat([a, b], axis=1).dropna()
    if len(aligned) < 5:
        return None
    v = float(aligned.iloc[:, 0].corr(aligned.iloc[:, 1]))
    return None if np.isnan(v) else round(v, 6)


def _roll_last(a: pd.Series, b: pd.Series, w: int) -> float | None:
    aligned = pd.concat([a, b], axis=1).dropna()
    if len(aligned) < w:
        return None
    rc = aligned.iloc[:, 0].rolling(w).corr(aligned.iloc[:, 1]).dropna()
    return _f(rc.iloc[-1]) if not rc.empty else None


def _outperf(co: pd.Series, se: pd.Series, w: int) -> float | None:
    tail = pd.concat([co, se], axis=1).dropna().tail(w)
    if len(tail) < w // 2:
        return None
    return _f(
        float((1 + tail.iloc[:, 0]).prod() - 1) * 100
        - float((1 + tail.iloc[:, 1]).prod() - 1) * 100
    )
