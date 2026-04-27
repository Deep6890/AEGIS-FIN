"""
supabase_store.py
-----------------
Supabase-backed implementation of the DataStore interface.

Design
------
  • Uses the official supabase-py client (supabase>=2.0).
  • Every write is an UPSERT (ON CONFLICT DO UPDATE) keyed on the composite
    primary key defined in supabase_schema.sql.
  • Retention is enforced server-side via the trim_retention / trim_retention_sector
    Postgres functions defined in supabase_schema.sql.
  • Reads return plain dicts — no DataFrames cross the store boundary.
  • Company and sector names are resolved to UUIDs via an in-process LRU cache
    so repeated lookups don't hit the DB on every row.

Table mapping (Python name → Supabase table name)
--------------------------------------------------
  ohlcv_raw             → ohlcv_raw
  ohlcv_health          → ohlcv_health
  sector_ohlcv_raw      → sector_ohlcv_raw
  sector_health         → sector_health
  macro_health          → sector_health         (macro assets live in the same table)
  correlation           → correlation
  classifier            → classifier
  balance_sheet_ratios  → balance_sheet_ratios
  balance_sheet_hist    → balance_sheet_hist
  stock_holding         → stock_holding

Entity key mapping
------------------
  ticker  → companies.id  (UUID)
  sector  → sectors.id    (UUID)
  name    → sectors.id    (UUID, for macro assets)

Retention limits (rows per entity)
-----------------------------------
  ohlcv_raw / ohlcv_health / sector_ohlcv_raw / sector_health : 756
  correlation / classifier                                     : 252
  balance_sheet_ratios                                         :  20
  balance_sheet_hist                                           :  80
  stock_holding                                                :  12
"""

import json
import os
from datetime import date, datetime
from functools import lru_cache
from typing import Any, Dict, List, Optional

from .data_store import DataStore, RETENTION, _DATE_KEY, _current_quarter

# ---------------------------------------------------------------------------
# Lazy import — supabase-py is only required when SupabaseStore is used
# ---------------------------------------------------------------------------
try:
    from supabase import create_client, Client as SupabaseClient
    _SUPABASE_AVAILABLE = True
except ImportError:
    _SUPABASE_AVAILABLE = False
    SupabaseClient = None  # type: ignore


# ---------------------------------------------------------------------------
# Ratio / metric name → DB id mapping (seeded in supabase_schema.sql)
# ---------------------------------------------------------------------------

_RATIO_NAME_TO_ID: Dict[str, int] = {
    "Gross Margin %":           1,
    "Net Profit Margin %":      2,
    "EBITDA Margin %":          3,
    "ROE %":                    4,
    "ROA %":                    5,
    "Current Ratio":            6,
    "Quick Ratio":              7,
    "Cash Ratio":               8,
    "Debt/Equity":              9,
    "Debt/Assets":             10,
    "Interest Coverage":       11,
    "Asset Turnover":          12,
    "Inventory Turnover":      13,
    "Receivables Turnover":    14,
    "CFO/Net Income":          15,
    "FCF Margin %":            16,
    "Revenue Growth %":        17,
    "Net Income Growth %":     18,
    "Equity Ratio":            19,
    "Equity Growth %":         20,
}

_METRIC_NAME_TO_ID: Dict[str, int] = {
    "Institutional Ownership %":  1,
    "Insider Ownership %":        2,
    "Promoter Holding %":         3,
    "FII Holding %":              4,
    "DII Holding %":              5,
    "Public Float %":             6,
    "Holder Concentration (HHI)": 7,
    "Top 10 Holders %":           8,
    "Insider Net Buy %":          9,
    "Annualised Volatility %":    10,
    "52W High Distance %":        11,
    "52W Low Distance %":         12,
    "Market Cap (Cr)":            13,
    "Shares Outstanding (Cr)":    14,
}

_RETENTION = RETENTION

# ---------------------------------------------------------------------------
# Allowed columns per table — only these are sent to Supabase.
# Any extra columns produced by the analysis modules are silently dropped.
# company_id / sector_id are injected by the write methods, not listed here.
# ---------------------------------------------------------------------------
_TABLE_COLUMNS: Dict[str, set] = {
    "ohlcv_raw": {
        "date", "open", "high", "low", "close", "volume", "adj_close",
    },
    "sector_ohlcv_raw": {
        "date", "open", "high", "low", "close", "volume", "adj_close",
    },
    "ohlcv_health": {
        "date", "close", "daily_return", "ema_short", "ema_long",
        "trend", "spike_up", "spike_down",
        "ret_z", "vol_z", "momentum_z", "slope_z", "composite",
        "health_score", "signal", "regime", "market_phase",
    },
    "sector_health": {
        "date", "close", "daily_return", "ema_short", "ema_long",
        "trend", "spike_up", "spike_down",
        "ret_z", "vol_z", "momentum_z", "slope_z", "composite",
        "health_score", "signal", "regime", "market_phase",
    },
    "correlation": {
        "date", "windows", "company_vs_sectors", "top_sectors",
        "health_by_top", "relative_growth", "relative_spikes",
        "sift_latest", "insights",
    },
    "classifier": {
        "date", "composite_score", "composite_tier", "composite_grade",
        "price_score", "fundamental_score", "ownership_score", "sector_fit_score",
        "dimensions", "composite", "filter", "summary",
    },
    "balance_sheet_ratios": {
        "ratio_id", "period", "value", "yoy_pct", "hist_pct_rank",
        "status", "adjusted_status", "trend",
        "sector_direction", "sector_pressure", "sector_narrative",
    },
    "balance_sheet_hist": {
        "ratio_id", "date", "value",
    },
    "stock_holding": {
        "metric_id", "period", "value", "status", "adjusted_status", "trend",
        "holding_signal", "sector_signal", "sector_pressure",
    },}


class SupabaseStore(DataStore):
    """
    Supabase-backed DataStore.

    Parameters
    ----------
    url : str   Supabase project URL  (SUPABASE_URL env var)
    key : str   Supabase service-role key  (SUPABASE_KEY env var)
    """

    def __init__(self, url: str = "", key: str = ""):
        if not _SUPABASE_AVAILABLE:
            raise ImportError(
                "supabase-py is not installed. "
                "Run: pip install supabase"
            )
        self._url = url or os.environ.get("SUPABASE_URL", "")
        self._key = key or os.environ.get("SUPABASE_KEY", "")
        if not self._url or not self._key:
            raise ValueError(
                "SupabaseStore requires SUPABASE_URL and SUPABASE_KEY. "
                "Set them as environment variables or pass url= and key= explicitly."
            )
        self._client: SupabaseClient = create_client(self._url, self._key)
        # In-process caches: name → UUID string
        self._company_id_cache: Dict[str, str] = {}
        self._sector_id_cache:  Dict[str, str] = {}

    # =========================================================================
    # Entity resolution  (ticker / sector name → UUID)
    # =========================================================================

    def _resolve_company_id(self, ticker: str) -> Optional[str]:
        """Return companies.id for ticker, creating the row if it doesn't exist."""
        if ticker in self._company_id_cache:
            return self._company_id_cache[ticker]
        resp = (
            self._client.table("companies")
            .select("id")
            .eq("ticker", ticker)
            .limit(1)
            .execute()
        )
        if resp.data:
            uid = resp.data[0]["id"]
        else:
            # Auto-register unknown tickers so data is never silently dropped
            ins = (
                self._client.table("companies")
                .insert({"ticker": ticker, "name": ticker, "exchange": "NSE"})
                .execute()
            )
            uid = ins.data[0]["id"]
        self._company_id_cache[ticker] = uid
        return uid

    def _resolve_sector_id(self, name: str) -> Optional[str]:
        """Return sectors.id for sector/macro name, creating the row if needed."""
        if name in self._sector_id_cache:
            return self._sector_id_cache[name]
        resp = (
            self._client.table("sectors")
            .select("id")
            .eq("name", name)
            .limit(1)
            .execute()
        )
        if resp.data:
            uid = resp.data[0]["id"]
        else:
            ins = (
                self._client.table("sectors")
                .insert({"name": name, "yf_ticker": name, "sector_type": "macro"})
                .execute()
            )
            uid = ins.data[0]["id"]
        self._sector_id_cache[name] = uid
        return uid

    # =========================================================================
    # Internal helpers
    # =========================================================================

    @staticmethod
    def _safe(v: Any) -> Any:
        """Convert numpy scalars / NaN / date objects to JSON-safe Python types."""
        if v is None:
            return None
        # NaN check without importing numpy
        if isinstance(v, float) and v != v:
            return None
        if isinstance(v, (date, datetime)):
            return v.isoformat()
        # numpy types (if numpy is available)
        try:
            import numpy as np
            if isinstance(v, np.integer):
                return int(v)
            if isinstance(v, np.floating):
                return float(v)
            if isinstance(v, np.bool_):
                return bool(v)
        except ImportError:
            pass
        return v

    def _clean_row(self, row: dict) -> dict:
        return {k: self._safe(v) for k, v in row.items()}

    def _filter_columns(self, row: dict, table: str) -> dict:
        """Keep only columns that exist in the Supabase schema for this table."""
        allowed = _TABLE_COLUMNS.get(table)
        if allowed is None:
            return row  # unknown table — pass through unchanged
        return {k: v for k, v in row.items() if k in allowed}

    def _trim(self, table: str, company_id: str, max_rows: int) -> None:
        """Call the server-side retention trim function."""
        self._client.rpc(
            "trim_retention",
            {"p_table": table, "p_company_id": company_id, "p_max_rows": max_rows},
        ).execute()

    def _trim_sector(self, table: str, sector_id: str, max_rows: int) -> None:
        self._client.rpc(
            "trim_retention_sector",
            {"p_table": table, "p_sector_id": sector_id, "p_max_rows": max_rows},
        ).execute()

    # =========================================================================
    # Core write / read  (implements DataStore abstract methods)
    # =========================================================================

    def write(self, table: str, entity_key: str, rows: List[dict]) -> None:
        """
        Upsert rows into the Supabase table.

        Routing:
          ohlcv_raw / ohlcv_health / correlation / classifier /
          balance_sheet_* / stock_holding  → company-keyed tables
          sector_ohlcv_raw / sector_health / macro_health → sector-keyed tables
        """
        if not rows:
            return

        sector_tables = {"sector_ohlcv_raw", "sector_health", "macro_health"}

        if table in sector_tables:
            self._write_sector_table(table, entity_key, rows)
        elif table == "balance_sheet_ratios":
            self._write_balance_sheet_ratios(entity_key, rows)
        elif table == "balance_sheet_hist":
            self._write_balance_sheet_hist(entity_key, rows)
        elif table == "stock_holding":
            self._write_stock_holding(entity_key, rows)
        else:
            self._write_company_table(table, entity_key, rows)

    def read(self, table: str, entity_key: str, limit: Optional[int] = None) -> List[dict]:
        """Return rows newest-first, up to limit."""
        sector_tables = {"sector_ohlcv_raw", "sector_health", "macro_health"}

        if table in sector_tables:
            return self._read_sector_table(table, entity_key, limit)
        elif table == "balance_sheet_ratios":
            return self._read_balance_sheet_ratios(entity_key, limit)
        elif table == "balance_sheet_hist":
            return self._read_balance_sheet_hist(entity_key, limit)
        elif table == "stock_holding":
            return self._read_stock_holding(entity_key, limit)
        else:
            return self._read_company_table(table, entity_key, limit)

    # =========================================================================
    # Company-keyed tables  (ohlcv_raw, ohlcv_health, correlation, classifier)
    # =========================================================================

    def _write_company_table(self, table: str, ticker: str, rows: List[dict]) -> None:
        company_id = self._resolve_company_id(ticker)
        if not company_id:
            return
        date_key  = _DATE_KEY.get(table, "date")
        max_rows  = _RETENTION.get(table, 252)
        db_table  = table  # Python name == DB table name for these tables

        upsert_rows = []
        for row in rows:
            r = self._clean_row(row)
            r["company_id"] = company_id
            # Normalise date field
            if date_key in r and r[date_key]:
                r[date_key] = str(r[date_key])[:10]
            # Remove entity-key columns that don't exist in DB schema
            r.pop("ticker", None)
            r.pop("sector", None)
            r.pop("name",   None)
            # Strip any extra columns not in the schema
            r = self._filter_columns(r, db_table)
            r["company_id"] = company_id   # re-inject after filter
            upsert_rows.append(r)

        if upsert_rows:
            self._client.table(db_table).upsert(
                upsert_rows,
                on_conflict=f"company_id,{date_key}",
            ).execute()
            self._trim(db_table, company_id, max_rows)

    def _read_company_table(
        self, table: str, ticker: str, limit: Optional[int]
    ) -> List[dict]:
        company_id = self._resolve_company_id(ticker)
        if not company_id:
            return []
        date_key = _DATE_KEY.get(table, "date")
        q = (
            self._client.table(table)
            .select("*")
            .eq("company_id", company_id)
            .order(date_key, desc=True)
        )
        if limit:
            q = q.limit(limit)
        resp = q.execute()
        rows = resp.data or []
        # Re-inject ticker so callers don't need to know about UUIDs
        for r in rows:
            r.setdefault("ticker", ticker)
        return rows

    # =========================================================================
    # Sector-keyed tables  (sector_ohlcv_raw, sector_health, macro_health)
    # =========================================================================

    def _write_sector_table(self, table: str, name: str, rows: List[dict]) -> None:
        sector_id = self._resolve_sector_id(name)
        if not sector_id:
            return
        # macro_health rows go into sector_health table
        db_table = "sector_health" if table == "macro_health" else table
        max_rows = _RETENTION.get(table, 756)

        upsert_rows = []
        for row in rows:
            r = self._clean_row(row)
            r["sector_id"] = sector_id
            if "date" in r and r["date"]:
                r["date"] = str(r["date"])[:10]
            r.pop("sector", None)
            r.pop("name",   None)
            r.pop("ticker", None)
            # Strip any extra columns not in the schema
            r = self._filter_columns(r, db_table)
            r["sector_id"] = sector_id   # re-inject after filter
            upsert_rows.append(r)

        if upsert_rows:
            self._client.table(db_table).upsert(
                upsert_rows,
                on_conflict="sector_id,date",
            ).execute()
            self._trim_sector(db_table, sector_id, max_rows)

    def _read_sector_table(
        self, table: str, name: str, limit: Optional[int]
    ) -> List[dict]:
        sector_id = self._resolve_sector_id(name)
        if not sector_id:
            return []
        db_table = "sector_health" if table == "macro_health" else table
        q = (
            self._client.table(db_table)
            .select("*")
            .eq("sector_id", sector_id)
            .order("date", desc=True)
        )
        if limit:
            q = q.limit(limit)
        resp = q.execute()
        rows = resp.data or []
        for r in rows:
            r.setdefault("sector", name)
            r.setdefault("name",   name)
        return rows

    # =========================================================================
    # balance_sheet_ratios  (normalised: one row per ratio per quarter)
    # =========================================================================

    def _write_balance_sheet_ratios(self, ticker: str, rows: List[dict]) -> None:
        """
        Each row from adapters.py has a 'Ratio' column (ratio name string).
        We resolve it to ratio_id before upserting.
        """
        company_id = self._resolve_company_id(ticker)
        if not company_id:
            return
        max_rows = _RETENTION.get("balance_sheet_ratios", 20)

        upsert_rows = []
        for row in rows:
            r = self._clean_row(row)
            ratio_name = r.pop("Ratio", None) or r.pop("ratio", None)
            ratio_id   = _RATIO_NAME_TO_ID.get(ratio_name) if ratio_name else None
            if ratio_id is None:
                continue  # skip unknown ratios
            r["company_id"] = company_id
            r["ratio_id"]   = ratio_id
            # Map adapter column names → DB column names
            r["value"]          = r.pop("Value",        r.get("value"))
            r["yoy_pct"]        = r.pop("YoY_pct",      r.get("yoy_pct"))
            r["hist_pct_rank"]  = r.pop("HistPctRank",  r.get("hist_pct_rank"))
            r["status"]         = r.pop("Status",        r.get("status"))
            r["adjusted_status"]= r.pop("AdjustedStatus", r.get("adjusted_status"))
            r["trend"]          = r.pop("Trend",         r.get("trend"))
            # Strip any extra columns not in the schema, then re-inject FKs
            r = self._filter_columns(r, "balance_sheet_ratios")
            r["company_id"] = company_id
            r["ratio_id"]   = ratio_id
            upsert_rows.append(r)
        if upsert_rows:
            self._client.table("balance_sheet_ratios").upsert(
                upsert_rows,
                on_conflict="company_id,ratio_id,period",
            ).execute()
            # Trim: keep only the most recent max_rows distinct periods per company
            self._client.rpc(
                "trim_retention",
                {"p_table": "balance_sheet_ratios",
                 "p_company_id": company_id,
                 "p_max_rows": max_rows * len(_RATIO_NAME_TO_ID)},
            ).execute()

    def _read_balance_sheet_ratios(
        self, ticker: str, limit: Optional[int] = None
    ) -> List[dict]:
        company_id = self._resolve_company_id(ticker)
        if not company_id:
            return []
        q = (
            self._client.table("balance_sheet_ratios")
            .select("*, ratio_definitions(name, category, description)")
            .eq("company_id", company_id)
            .order("period", desc=True)
        )
        if limit:
            q = q.limit(limit)
        resp = q.execute()
        rows = []
        for r in (resp.data or []):
            rd = r.pop("ratio_definitions", {}) or {}
            r["Ratio"]       = rd.get("name",        r.get("ratio_id"))
            r["Category"]    = rd.get("category",    "")
            r["Description"] = rd.get("description", "")
            r["Value"]       = r.pop("value",         None)
            r["YoY_pct"]     = r.pop("yoy_pct",       None)
            r["HistPctRank"] = r.pop("hist_pct_rank",  None)
            r["Status"]      = r.pop("status",         None)
            r["AdjustedStatus"] = r.pop("adjusted_status", None)
            r["Trend"]       = r.pop("trend",          None)
            r.setdefault("ticker", ticker)
            rows.append(r)
        return rows

    # =========================================================================
    # balance_sheet_hist  (historical ratio time-series)
    # =========================================================================

    def _write_balance_sheet_hist(self, ticker: str, rows: List[dict]) -> None:
        company_id = self._resolve_company_id(ticker)
        if not company_id:
            return
        max_rows = _RETENTION.get("balance_sheet_hist", 80)

        upsert_rows = []
        for row in rows:
            r = self._clean_row(row)
            ratio_name = r.pop("Ratio", None) or r.pop("ratio", None)
            ratio_id   = _RATIO_NAME_TO_ID.get(ratio_name) if ratio_name else None
            if ratio_id is None:
                continue
            r["company_id"] = company_id
            r["ratio_id"]   = ratio_id
            r["value"]      = r.pop("Value", r.get("value"))
            if "date" in r and r["date"]:
                r["date"] = str(r["date"])[:10]
            for col in ("ticker", "sector", "name"):
                r.pop(col, None)
            upsert_rows.append(r)

        if upsert_rows:
            self._client.table("balance_sheet_hist").upsert(
                upsert_rows,
                on_conflict="company_id,ratio_id,date",
            ).execute()
            self._trim("balance_sheet_hist", company_id,
                       max_rows * len(_RATIO_NAME_TO_ID))

    def _read_balance_sheet_hist(
        self, ticker: str, limit: Optional[int] = None
    ) -> List[dict]:
        company_id = self._resolve_company_id(ticker)
        if not company_id:
            return []
        q = (
            self._client.table("balance_sheet_hist")
            .select("*, ratio_definitions(name)")
            .eq("company_id", company_id)
            .order("date", desc=True)
        )
        if limit:
            q = q.limit(limit)
        resp = q.execute()
        rows = []
        for r in (resp.data or []):
            rd = r.pop("ratio_definitions", {}) or {}
            r["Ratio"] = rd.get("name", r.get("ratio_id"))
            r["Value"] = r.pop("value", None)
            r.setdefault("ticker", ticker)
            rows.append(r)
        return rows

    # =========================================================================
    # stock_holding  (normalised: one row per metric per quarter)
    # =========================================================================

    def _write_stock_holding(self, ticker: str, rows: List[dict]) -> None:
        company_id = self._resolve_company_id(ticker)
        if not company_id:
            return
        max_rows = _RETENTION.get("stock_holding", 12)

        upsert_rows = []
        for row in rows:
            r = self._clean_row(row)
            metric_name = r.pop("Metric", None) or r.pop("metric", None)
            metric_id   = _METRIC_NAME_TO_ID.get(metric_name) if metric_name else None
            if metric_id is None:
                continue
            r["company_id"] = company_id
            r["metric_id"]  = metric_id
            r["value"]          = r.pop("Value",         r.get("value"))
            r["status"]         = r.pop("Status",         r.get("status"))
            r["adjusted_status"]= r.pop("AdjustedStatus", r.get("adjusted_status"))
            r["trend"]          = r.pop("Trend",          r.get("trend"))
            for col in ("ticker", "sector", "name", "Description", "Category",
                        "description", "category", "Insight", "InsightSeverity",
                        "insight", "insight_severity"):
                r.pop(col, None)
            # Apply column filter to drop anything not in schema
            r = self._filter_columns(r, "stock_holding")
            r["company_id"] = company_id
            r["metric_id"]  = metric_id
            upsert_rows.append(r)

        if upsert_rows:
            self._client.table("stock_holding").upsert(
                upsert_rows,
                on_conflict="company_id,metric_id,period",
            ).execute()
            self._trim("stock_holding", company_id,
                       max_rows * len(_METRIC_NAME_TO_ID))

    def _read_stock_holding(
        self, ticker: str, limit: Optional[int] = None
    ) -> List[dict]:
        company_id = self._resolve_company_id(ticker)
        if not company_id:
            return []
        q = (
            self._client.table("stock_holding")
            .select("*, holding_metric_definitions(name, category, description)")
            .eq("company_id", company_id)
            .order("period", desc=True)
        )
        if limit:
            q = q.limit(limit)
        resp = q.execute()
        rows = []
        for r in (resp.data or []):
            md = r.pop("holding_metric_definitions", {}) or {}
            r["Metric"]      = md.get("name",        r.get("metric_id"))
            r["Category"]    = md.get("category",    "")
            r["Description"] = md.get("description", "")
            r["Value"]       = r.pop("value",         None)
            r["Status"]      = r.pop("status",         None)
            r["AdjustedStatus"] = r.pop("adjusted_status", None)
            r["Trend"]       = r.pop("trend",          None)
            r.setdefault("ticker", ticker)
            rows.append(r)
        return rows

    # =========================================================================
    # BALANCE SHEET INSIGHTS
    # =========================================================================

    def write_balance_sheet_insights(self, ticker: str, insights_dict: dict) -> None:
        """Write balance sheet insights to the database."""
        company_id = self._resolve_company_id(ticker)
        if not company_id:
            return
        
        period = self._get_period()
        row = {
            "company_id": company_id,
            "period": period,
            "profitability_score": insights_dict.get("profitability_score"),
            "liquidity_score": insights_dict.get("liquidity_score"),
            "leverage_score": insights_dict.get("leverage_score"),
            "efficiency_score": insights_dict.get("efficiency_score"),
            "growth_score": insights_dict.get("growth_score"),
            "overall_score": insights_dict.get("overall_score"),
            "key_strengths": insights_dict.get("key_strengths", []),
            "key_concerns": insights_dict.get("key_concerns", []),
            "sector_comparison": insights_dict.get("sector_comparison", {}),
            "trend_analysis": insights_dict.get("trend_analysis", {}),
            "recommendations": insights_dict.get("recommendations", []),
        }
        
        self._client.table("balance_sheet_insights").upsert(
            [row],
            on_conflict="company_id,period",
        ).execute()

    # =========================================================================
    # STOCK HOLDING INSIGHTS
    # =========================================================================

    def write_stock_holding_insights(self, ticker: str, insights_dict: dict) -> None:
        """Write stock holding insights to the database."""
        company_id = self._resolve_company_id(ticker)
        if not company_id:
            return
        
        period = self._get_period()
        row = {
            "company_id": company_id,
            "period": period,
            "ownership_score": insights_dict.get("ownership_score"),
            "concentration_score": insights_dict.get("concentration_score"),
            "activity_score": insights_dict.get("activity_score"),
            "risk_score": insights_dict.get("risk_score"),
            "overall_score": insights_dict.get("overall_score"),
            "ownership_breakdown": insights_dict.get("ownership_breakdown", {}),
            "top_holders_breakdown": insights_dict.get("top_holders_breakdown", {}),
            "key_insights": insights_dict.get("key_insights", []),
            "risk_factors": insights_dict.get("risk_factors", []),
            "sector_comparison": insights_dict.get("sector_comparison", {}),
            "it_sector_correlation": insights_dict.get("it_sector_correlation", {}),
        }
        
        self._client.table("stock_holding_insights").upsert(
            [row],
            on_conflict="company_id,period",
        ).execute()

    def _get_period(self) -> str:
        """Get the current quarter in YYYY-QN format."""
        today = date.today()
        quarter = (today.month - 1) // 3 + 1
        return f"{today.year}-Q{quarter}"

    # =========================================================================
    # Helper queries  (override DataStore defaults for efficiency)
    # =========================================================================

    def latest_date(self, table: str, entity_key: str) -> Optional[str]:
        """Single-row query instead of fetching all rows."""
        sector_tables = {"sector_ohlcv_raw", "sector_health", "macro_health"}
        date_key = _DATE_KEY.get(table, "date")

        if table in sector_tables:
            sector_id = self._resolve_sector_id(entity_key)
            if not sector_id:
                return None
            db_table = "sector_health" if table == "macro_health" else table
            resp = (
                self._client.table(db_table)
                .select(date_key)
                .eq("sector_id", sector_id)
                .order(date_key, desc=True)
                .limit(1)
                .execute()
            )
        else:
            company_id = self._resolve_company_id(entity_key)
            if not company_id:
                return None
            resp = (
                self._client.table(table)
                .select(date_key)
                .eq("company_id", company_id)
                .order(date_key, desc=True)
                .limit(1)
                .execute()
            )

        if resp.data:
            return str(resp.data[0].get(date_key, ""))[:10]
        return None

    def row_count(self, table: str, entity_key: str) -> int:
        """Use Supabase count() instead of fetching all rows."""
        sector_tables = {"sector_ohlcv_raw", "sector_health", "macro_health"}
        if table in sector_tables:
            sector_id = self._resolve_sector_id(entity_key)
            if not sector_id:
                return 0
            db_table = "sector_health" if table == "macro_health" else table
            resp = (
                self._client.table(db_table)
                .select("id", count="exact")
                .eq("sector_id", sector_id)
                .execute()
            )
        else:
            company_id = self._resolve_company_id(entity_key)
            if not company_id:
                return 0
            resp = (
                self._client.table(table)
                .select("id", count="exact")
                .eq("company_id", company_id)
                .execute()
            )
        return resp.count or 0

    # =========================================================================
    # Delete
    # =========================================================================

    def delete(self, table: str, entity_key: str, before_date: Optional[str] = None) -> int:
        """
        Delete rows for entity_key, optionally only those before a cutoff date.

        Parameters
        ----------
        table       : table name
        entity_key  : ticker or sector/macro name
        before_date : "YYYY-MM-DD" or "YYYY-QN" — only rows strictly before
                      this value are deleted. None = delete all rows.

        Returns
        -------
        int  number of rows deleted (Supabase returns count via prefer=count)
        """
        sector_tables = {"sector_ohlcv_raw", "sector_health", "macro_health"}
        date_key      = _DATE_KEY.get(table, "date")

        if table in sector_tables:
            entity_id = self._resolve_sector_id(entity_key)
            id_col    = "sector_id"
            db_table  = "sector_health" if table == "macro_health" else table
        else:
            entity_id = self._resolve_company_id(entity_key)
            id_col    = "company_id"
            db_table  = table

        if not entity_id:
            return 0

        q = self._client.table(db_table).delete().eq(id_col, entity_id)
        if before_date is not None:
            q = q.lt(date_key, before_date)   # strictly less than cutoff

        resp = q.execute()
        deleted = len(resp.data) if resp.data else 0
        return deleted
