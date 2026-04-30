"""
data_store.py — Supabase-only data store for AEGIS-FIN
-------------------------------------------------------
Single backend: Supabase/PostgreSQL (cloud).
MemoryStore removed — all data persists to Supabase.

Tables and retention
--------------------
  Table                  Key              Max rows  Cadence
  ohlcv_raw              ticker + date    756       daily (3 trading years)
  ohlcv_health           ticker + date    756       daily
  sector_ohlcv_raw       sector + date    756       daily
  sector_health          sector + date    756       daily
  macro_health           name   + date    756       daily
  correlation            ticker + date    252       daily (1 year)
  classifier             ticker + date    252       daily
  balance_sheet_ratios   ticker + period   20       quarterly
  balance_sheet_hist     ticker + date     80       quarterly
  stock_holding          ticker + period   12       quarterly
"""

import os
from abc import ABC, abstractmethod
from datetime import date, datetime
from typing import List, Optional


RETENTION = {
    "ohlcv_raw":            756,
    "ohlcv_health":         756,
    "sector_ohlcv_raw":     756,
    "sector_health":        756,
    "macro_health":         756,
    "correlation":          252,
    "classifier":           252,
    "balance_sheet_ratios":  20,
    "balance_sheet_hist":    80,
    "stock_holding":         12,
}

_DATE_KEY = {
    "ohlcv_raw":            "date",
    "ohlcv_health":         "date",
    "sector_ohlcv_raw":     "date",
    "sector_health":        "date",
    "macro_health":         "date",
    "correlation":          "date",
    "classifier":           "date",
    "balance_sheet_ratios": "period",
    "balance_sheet_hist":   "date",
    "stock_holding":        "period",
}


# =============================================================================
# Abstract base
# =============================================================================

class DataStore(ABC):

    @abstractmethod
    def write(self, table: str, entity_key: str, rows: List[dict]) -> None:
        """Upsert rows. Retention enforced: oldest rows pruned when count > limit."""

    @abstractmethod
    def read(self, table: str, entity_key: str, limit: Optional[int] = None) -> List[dict]:
        """Return rows newest-first, up to limit."""

    @abstractmethod
    def delete(self, table: str, entity_key: str, before_date: Optional[str] = None) -> int:
        """
        Delete rows for entity_key.
        before_date: delete only rows strictly before this date/period.
        None: delete all rows for entity_key.
        Returns number of rows deleted.
        """

    # ── Convenience writes ────────────────────────────────────────────────────

    def write_ohlcv_raw(self, ticker, rows):           self.write("ohlcv_raw", ticker, rows)
    def write_ohlcv_health(self, ticker, rows):        self.write("ohlcv_health", ticker, rows)
    def write_sector_ohlcv_raw(self, sector, rows):    self.write("sector_ohlcv_raw", sector, rows)
    def write_sector_health(self, sector, rows):       self.write("sector_health", sector, rows)
    def write_macro_health(self, name, rows):          self.write("macro_health", name, rows)
    def write_correlation(self, ticker, rows):         self.write("correlation", ticker, rows)
    def write_classifier(self, ticker, rows):          self.write("classifier", ticker, rows)
    def write_balance_sheet_ratios(self, ticker, rows):self.write("balance_sheet_ratios", ticker, rows)
    def write_balance_sheet_hist(self, ticker, rows):  self.write("balance_sheet_hist", ticker, rows)
    def write_stock_holding(self, ticker, rows):       self.write("stock_holding", ticker, rows)

    # ── Convenience reads ─────────────────────────────────────────────────────

    def read_ohlcv_raw(self, ticker, limit=None):           return self.read("ohlcv_raw", ticker, limit)
    def read_ohlcv_health(self, ticker, limit=None):        return self.read("ohlcv_health", ticker, limit)
    def read_sector_ohlcv_raw(self, sector, limit=None):    return self.read("sector_ohlcv_raw", sector, limit)
    def read_sector_health(self, sector, limit=None):       return self.read("sector_health", sector, limit)
    def read_macro_health(self, name, limit=None):          return self.read("macro_health", name, limit)
    def read_correlation(self, ticker, limit=None):         return self.read("correlation", ticker, limit)
    def read_classifier(self, ticker, limit=None):          return self.read("classifier", ticker, limit)
    def read_balance_sheet_ratios(self, ticker):            return self.read("balance_sheet_ratios", ticker)
    def read_balance_sheet_hist(self, ticker, limit=None):  return self.read("balance_sheet_hist", ticker, limit)
    def read_stock_holding(self, ticker):                   return self.read("stock_holding", ticker)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def latest_date(self, table: str, entity_key: str) -> Optional[str]:
        rows = self.read(table, entity_key, limit=1)
        if not rows:
            return None
        return rows[0].get(_DATE_KEY.get(table, "date"))

    def needs_daily_update(self, entity_key: str, table: str = "ohlcv_raw") -> bool:
        latest = self.latest_date(table, entity_key)
        return latest is None or latest < date.today().isoformat()

    def needs_quarterly_update(self, ticker: str, table: str = "balance_sheet_ratios") -> bool:
        latest = self.latest_date(table, ticker)
        return latest is None or latest < _current_quarter()

    def row_count(self, table: str, entity_key: str) -> int:
        return len(self.read(table, entity_key))


# =============================================================================
# Singleton — Supabase only
# =============================================================================

_store: Optional[DataStore] = None


def get_store() -> DataStore:
    """
    Return the global SupabaseStore instance.
    Initialised once on first call using SUPABASE_URL and SUPABASE_KEY env vars.
    """
    global _store
    if _store is None:
        from .supabase_store import SupabaseStore
        _store = SupabaseStore()
    return _store


# =============================================================================
# Helpers
# =============================================================================

def _current_quarter() -> str:
    today = date.today()
    q = (today.month - 1) // 3 + 1
    return f"{today.year}-Q{q}"


def date_to_quarter(date_str: str) -> str:
    d = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
    q = (d.month - 1) // 3 + 1
    return f"{d.year}-Q{q}"
