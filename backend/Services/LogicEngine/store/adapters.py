"""
adapters.py
-----------
Translation layer between module outputs and Supabase.
Flattens DataFrames → rows for writes, reconstructs rows → DataFrames for reads.
All data goes to Supabase cloud — no local storage.

Writes  : save_ohlcv_today, save_ohlcv_history, save_sector_ohlcv_today,
          save_sector_history, save_macro_today,
          save_ohlcv_health, save_sector_health, save_macro_health,
          save_balance_sheet, save_stock_holding, save_correlation

Reads   : load_ohlcv_history_df, load_sector_history_df,
          load_ohlcv_health_history, load_sector_health_history,
          load_balance_sheet_data, load_holding_data, load_correlation_latest

Cadence : needs_ohlcv_update, needs_sector_update,
          needs_balance_sheet_update, needs_holding_update
"""

import numpy as np
import pandas as pd
from datetime import date
from typing import Optional

from .data_store import get_store, date_to_quarter


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe(v):
    """Convert numpy scalars / NaN to JSON-safe Python types."""
    if v is None:
        return None
    if isinstance(v, float) and (v != v):   # NaN
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return float(v)
    if isinstance(v, (np.bool_,)):
        return bool(v)
    return v


def _row_from_series(s: pd.Series, extra: dict = None) -> dict:
    row = {k: _safe(v) for k, v in s.items()}
    if extra:
        row.update(extra)
    return row


def _df_to_rows(df: pd.DataFrame, extra: dict = None) -> list:
    rows = []
    for _, s in df.iterrows():
        row = _row_from_series(s, extra)
        rows.append(row)
    return rows


# ── Fetcher outputs → store ───────────────────────────────────────────────────

def save_ohlcv_today(ticker: str, ohlcv_dict: dict) -> None:
    """Save one-day OHLCV record from fetch_ohlcv_today()."""
    if ohlcv_dict.get("error") or not ohlcv_dict.get("date"):
        return
    # Skip if close is None — DB has NOT NULL constraint on close
    if ohlcv_dict.get("close") is None:
        return
    row = {k: _safe(v) for k, v in ohlcv_dict.items() if k != "error"}
    row["ticker"] = ticker
    get_store().write_ohlcv_raw(ticker, [row])


def save_ohlcv_history(ticker: str, df: pd.DataFrame) -> None:
    """Save full OHLCV history DataFrame from fetch_ohlcv_history()."""
    if df is None or df.empty:
        return
    df = df.copy()
    if "Date" in df.columns:
        df["date"] = df["Date"].astype(str).str[:10]
    # Normalise OHLCV column names to lowercase for Supabase schema compatibility
    rename = {c: c.lower() for c in ("Open", "High", "Low", "Close", "Volume", "Adj Close")}
    df = df.rename(columns=rename)
    # Drop rows where close is null — DB has NOT NULL constraint
    if "close" in df.columns:
        df = df[df["close"].notna() & (df["close"] != 0)]
    df["ticker"] = ticker
    get_store().write_ohlcv_raw(ticker, _df_to_rows(df))


def save_sector_ohlcv_today(sector: str, ohlcv_dict: dict) -> None:
    if ohlcv_dict.get("error") or not ohlcv_dict.get("date"):
        return
    # Skip if close is None — DB has NOT NULL constraint on close
    if ohlcv_dict.get("close") is None:
        return
    row = {k: _safe(v) for k, v in ohlcv_dict.items() if k != "error"}
    row["sector"] = sector
    get_store().write_sector_ohlcv_raw(sector, [row])


def save_sector_history(sector: str, df: pd.DataFrame) -> None:
    if df is None or df.empty:
        return
    df = df.copy()
    if "Date" in df.columns:
        df["date"] = df["Date"].astype(str).str[:10]
    # Normalise OHLCV column names to lowercase for Supabase schema compatibility
    rename = {c: c.lower() for c in ("Open", "High", "Low", "Close", "Volume", "Adj Close")}
    df = df.rename(columns=rename)
    # Drop rows where close is null — DB has NOT NULL constraint
    if "close" in df.columns:
        df = df[df["close"].notna() & (df["close"] != 0)]
    df["sector"] = sector
    get_store().write_sector_ohlcv_raw(sector, _df_to_rows(df))


def save_macro_today(name: str, ohlcv_dict: dict) -> None:
    if ohlcv_dict.get("error") or not ohlcv_dict.get("date"):
        return
    row = {k: _safe(v) for k, v in ohlcv_dict.items() if k != "error"}
    row["name"] = name
    get_store().write_macro_health(name, [row])


# ── ohlcv_health outputs → store ─────────────────────────────────────────────

def _health_history_rows(result: dict, entity_key: str, key_col: str) -> list:
    """Flatten run_ohlcv_health() history DataFrame into store rows."""
    h = result.get("history", pd.DataFrame())
    if h is None or (hasattr(h, "empty") and h.empty):
        return []
    df = h.reset_index() if "Date" not in h.columns else h.copy()
    if "Date" in df.columns:
        df["date"] = df["Date"].astype(str).str[:10]
    df[key_col] = entity_key
    # Drop the DatetimeIndex column if it got duplicated
    df = df.drop(columns=["Date"], errors="ignore")
    # Normalise any remaining title-case column names to lowercase
    df.columns = [c.lower() if c[0].isupper() else c for c in df.columns]
    return _df_to_rows(df)


def save_ohlcv_health(ticker: str, result: dict) -> None:
    """Save run_ohlcv_health(label_col='Company') result."""
    rows = _health_history_rows(result, ticker, "ticker")
    if rows:
        get_store().write_ohlcv_health(ticker, rows)


def save_sector_health(sector: str, result: dict) -> None:
    """Save run_ohlcv_health(label_col='Sector') result."""
    rows = _health_history_rows(result, sector, "sector")
    if rows:
        get_store().write_sector_health(sector, rows)


def save_macro_health(name: str, result: dict) -> None:
    """Save macro asset run_ohlcv_health() result."""
    rows = _health_history_rows(result, name, "name")
    if rows:
        get_store().write_macro_health(name, rows)


# ── balance_sheet outputs → store ─────────────────────────────────────────────

def save_balance_sheet(ticker: str, result: dict) -> None:
    """
    Save run_balance_sheet() output.

    Stores three tables:
      balance_sheet_ratios — one row per ratio per quarter (period = "YYYY-QN")
      balance_sheet_hist   — historical ratio time-series (Date, Ratio, Value)
      balance_sheet_insights — comprehensive insights and analysis
    """
    full_ratios = result.get("full_ratios")
    hist_df     = result.get("historical_ratios")
    overlay     = result.get("sector_overlay", {})
    insights    = result.get("insights", {})
    breakdown   = result.get("breakdown", {})

    # ── Snapshot ratios (current quarter) ─────────────────────────────────────
    if full_ratios is not None and not (hasattr(full_ratios, "empty") and full_ratios.empty):
        period = date_to_quarter(date.today().isoformat())
        ratio_rows = []
        for _, row in full_ratios.iterrows():
            r = {k: _safe(v) for k, v in row.items()}
            r["ticker"]           = ticker
            r["period"]           = period
            r["sector_direction"] = overlay.get("direction")
            # Clamp sector_pressure to [-9999.9999, 9999.9999] — NUMERIC(8,4)
            sp = overlay.get("pressure")
            r["sector_pressure"]  = _safe(max(-9999.9999, min(9999.9999, float(sp))) if sp is not None and sp == sp else sp)
            r["sector_narrative"] = overlay.get("narrative")
            # Clamp yoy_pct and hist_pct_rank to safe ranges
            if r.get("YoY_pct") is not None and r["YoY_pct"] == r["YoY_pct"]:
                r["YoY_pct"] = max(-99999999.0, min(99999999.0, float(r["YoY_pct"])))
            if r.get("HistPctRank") is not None and r["HistPctRank"] == r["HistPctRank"]:
                r["HistPctRank"] = max(-9999.9999, min(9999.9999, float(r["HistPctRank"])))
            ratio_rows.append(r)
        if ratio_rows:
            get_store().write_balance_sheet_ratios(ticker, ratio_rows)

    # ── Historical ratio time-series ──────────────────────────────────────────
    if hist_df is not None and not (hasattr(hist_df, "empty") and hist_df.empty):
        hist_rows = []
        for _, row in hist_df.iterrows():
            r = {k: _safe(v) for k, v in row.items()}
            # Normalise Date → date (lowercase) for Supabase schema
            if "Date" in r:
                r["date"] = str(r.pop("Date"))[:10]
            elif "date" in r and r["date"]:
                r["date"] = str(r["date"])[:10]
            r["ticker"] = ticker
            hist_rows.append(r)
        if hist_rows:
            get_store().write_balance_sheet_hist(ticker, hist_rows)

    # ── Balance sheet insights ────────────────────────────────────────────────
    if insights:
        insights_data = {
            "profitability_score": breakdown.get("profitability_score", 0),
            "liquidity_score": breakdown.get("liquidity_score", 0),
            "leverage_score": breakdown.get("leverage_score", 0),
            "efficiency_score": breakdown.get("efficiency_score", 0),
            "growth_score": breakdown.get("growth_score", 0),
            "overall_score": breakdown.get("overall_score", 0),
            "key_strengths": insights.get("key_strengths", []),
            "key_concerns": insights.get("key_concerns", []),
            "sector_comparison": insights.get("sector_comparison", {}),
            "trend_analysis": insights.get("trend_analysis", {}),
            "recommendations": insights.get("recommendations", []),
        }
        get_store().write_balance_sheet_insights(ticker, insights_data)


# ── stock_holding outputs → store ─────────────────────────────────────────────

def save_stock_holding(ticker: str, result: dict) -> None:
    """
    Save run_stock_holding() output.
    One row per metric per quarter, plus insights.
    """
    full_metrics   = result.get("full_metrics")
    overlay        = result.get("sector_overlay", {})
    holding_signal = result.get("holding_signal", "STABLE")
    insights       = result.get("enhanced_insights", {})
    breakdown      = result.get("breakdown", {})

    if full_metrics is None or (hasattr(full_metrics, "empty") and full_metrics.empty):
        return

    period = date_to_quarter(date.today().isoformat())
    rows   = []
    for _, row in full_metrics.iterrows():
        r = {k: _safe(v) for k, v in row.items()}
        r["ticker"]         = ticker
        r["period"]         = period
        r["holding_signal"] = holding_signal
        r["sector_signal"]  = overlay.get("signal")
        r["sector_pressure"]= _safe(overlay.get("pressure"))
        rows.append(r)

    if rows:
        get_store().write_stock_holding(ticker, rows)

    # ── Stock holding insights ────────────────────────────────────────────────
    if insights:
        insights_data = {
            "ownership_score": breakdown.get("ownership_score", 0),
            "concentration_score": breakdown.get("concentration_score", 0),
            "activity_score": breakdown.get("activity_score", 0),
            "risk_score": breakdown.get("risk_score", 0),
            "overall_score": breakdown.get("overall_score", 0),
            "ownership_breakdown": breakdown.get("ownership_pie", {}),
            "top_holders_breakdown": breakdown.get("top_holders_pie", {}),
            "key_insights": insights.get("key_insights", []),
            "risk_factors": insights.get("risk_factors", []),
            "sector_comparison": insights.get("sector_comparison", {}),
            "it_sector_correlation": result.get("it_sector_correlation", {}),
        }
        get_store().write_stock_holding_insights(ticker, insights_data)


# ── correlation outputs → store ───────────────────────────────────────────────

def save_correlation(ticker: str, result: dict) -> None:
    """
    Save run_correlation() output as a single JSON row per day.
    The full result dict is stored as payload — no flattening needed
    since correlation is consumed as a whole unit.
    """
    today = date.today().isoformat()
    row   = {
        "ticker":             ticker,
        "date":               result.get("date") or today,
        "windows":            result.get("windows"),
        "company_vs_sectors": result.get("company_vs_sectors"),
        "top_sectors":        result.get("top_sectors"),
        "health_by_top":      result.get("health_by_top"),
        "relative_growth":    result.get("relative_growth"),
        "relative_spikes":    result.get("relative_spikes"),
        "sift_latest":        {                          # store only latest sift values, not full series
            sector: {k: v for k, v in sift.items() if k.startswith("latest_")}
            for sector, sift in (result.get("sift") or {}).items()
        },
        "insights":           result.get("insights"),
    }
    get_store().write_correlation(ticker, [row])


# ── Reads — reconstruct module inputs ─────────────────────────────────────────

def load_ohlcv_history_df(ticker: str, limit: int = 756) -> pd.DataFrame:
    """
    Load stored OHLCV raw rows and return as DataFrame ready for run_ohlcv_health().
    Columns: Date, Open, High, Low, Close, Volume
    """
    rows = get_store().read_ohlcv_raw(ticker, limit)
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    if "date" in df.columns:
        df = df.rename(columns={"date": "Date"})
    df["Date"] = pd.to_datetime(df["Date"])
    # Rename lowercase OHLCV columns back to title-case for the health engine
    rename = {c: c.title() for c in ("open", "high", "low", "close", "volume")}
    df = df.rename(columns=rename)
    return df.sort_values("Date").reset_index(drop=True)


def load_sector_history_df(sector: str, limit: int = 756) -> pd.DataFrame:
    rows = get_store().read_sector_ohlcv_raw(sector, limit)
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    if "date" in df.columns:
        df = df.rename(columns={"date": "Date"})
    df["Date"] = pd.to_datetime(df["Date"])
    # Rename lowercase OHLCV columns back to title-case for the health engine
    rename = {c: c.title() for c in ("open", "high", "low", "close", "volume")}
    df = df.rename(columns=rename)
    return df.sort_values("Date").reset_index(drop=True)


def load_ohlcv_health_history(ticker: str, limit: int = 756) -> pd.DataFrame:
    """
    Load stored ohlcv_health rows as a DataFrame with DatetimeIndex.
    Used by correlation module as the 'history' key of a health result.
    """
    rows = get_store().read_ohlcv_health(ticker, limit)
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    if "date" in df.columns:
        df["Date"] = pd.to_datetime(df["date"])
        df = df.set_index("Date").sort_index()
    return df


def load_sector_health_history(sector: str, limit: int = 756) -> pd.DataFrame:
    rows = get_store().read_sector_health(sector, limit)
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    if "date" in df.columns:
        df["Date"] = pd.to_datetime(df["date"])
        df = df.set_index("Date").sort_index()
    return df


def load_balance_sheet_data(ticker: str) -> dict:
    """
    Reconstruct the financials_data dict expected by run_balance_sheet().
    Returns the most recent quarter's ratio snapshot as a minimal dict.
    Note: income/balance/cashflow DataFrames are not stored — only ratios.
    The caller should use this to check if a new fetch is needed.
    """
    rows = get_store().read_balance_sheet_ratios(ticker)
    return {
        "ticker":  ticker,
        "ratios":  pd.DataFrame(rows) if rows else pd.DataFrame(),
        "periods": list({r.get("period") for r in rows if r.get("period")}),
    }


def load_holding_data(ticker: str) -> dict:
    """
    Reconstruct holding metrics dict for downstream use.
    Returns the most recent quarter's metrics.
    """
    rows = get_store().read_stock_holding(ticker)
    return {
        "ticker":  ticker,
        "metrics": pd.DataFrame(rows) if rows else pd.DataFrame(),
        "periods": list({r.get("period") for r in rows if r.get("period")}),
    }


def load_correlation_latest(ticker: str) -> Optional[dict]:
    rows = get_store().read_correlation(ticker, limit=1)
    return rows[0] if rows else None


# ── Cadence checks ────────────────────────────────────────────────────────────

def needs_ohlcv_update(ticker: str) -> bool:
    return get_store().needs_daily_update(ticker, "ohlcv_raw")


def needs_sector_update(sector: str) -> bool:
    return get_store().needs_daily_update(sector, "sector_ohlcv_raw")


def needs_balance_sheet_update(ticker: str) -> bool:
    return get_store().needs_quarterly_update(ticker, "balance_sheet_ratios")


def needs_holding_update(ticker: str) -> bool:
    return get_store().needs_quarterly_update(ticker, "stock_holding")
