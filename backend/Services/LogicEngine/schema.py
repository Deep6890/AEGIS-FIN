"""
schema.py — Input schema validation for AEGIS-FIN
--------------------------------------------------
Validates data coming from yfinance before it enters the analysis pipeline.
Catches column renames, missing fields, and type changes early — before they
cause silent NaN propagation or cryptic KeyErrors deep in the pipeline.

Design
------
  - Lightweight: uses only stdlib + pandas, no external schema library.
  - Non-blocking: validation returns a ValidationResult (ok + warnings list).
    Callers decide whether to abort or proceed with warnings.
  - Covers the three data shapes that enter the system:
      1. OHLCV DataFrame       (from fetch_ohlcv_history / fetch_ohlcv_today)
      2. Financials dict        (from fetch_financials)
      3. Holders dict           (from fetch_holders)

Public API
----------
  validate_ohlcv(df, name)              -> ValidationResult
  validate_financials(data, ticker)     -> ValidationResult
  validate_holders(data, ticker)        -> ValidationResult

  ValidationResult.ok        bool
  ValidationResult.warnings  list[str]   — non-fatal issues
  ValidationResult.errors    list[str]   — fatal issues (ok=False)
  ValidationResult.raise_if_invalid()   — raises ValueError if not ok
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import List


# ── Result type ───────────────────────────────────────────────────────────────

@dataclass
class ValidationResult:
    ok:       bool        = True
    warnings: List[str]   = field(default_factory=list)
    errors:   List[str]   = field(default_factory=list)

    def warn(self, msg: str):
        self.warnings.append(msg)

    def fail(self, msg: str):
        self.errors.append(msg)
        self.ok = False

    def raise_if_invalid(self):
        if not self.ok:
            raise ValueError("Schema validation failed:\n" + "\n".join(self.errors))

    def __repr__(self):
        status = "OK" if self.ok else "INVALID"
        parts  = [f"ValidationResult({status}"]
        if self.errors:   parts.append(f"  errors={self.errors}")
        if self.warnings: parts.append(f"  warnings={self.warnings}")
        return "\n".join(parts) + ")"


# ── OHLCV validation ──────────────────────────────────────────────────────────

# Minimum required columns for the health engine
_OHLCV_REQUIRED = {"Close"}
_OHLCV_OPTIONAL = {"Open", "High", "Low", "Volume", "Date"}
_OHLCV_MIN_ROWS = 61   # need at least window_long + 1 rows for rolling stats


def validate_ohlcv(df: pd.DataFrame, name: str = "") -> ValidationResult:
    """
    Validate an OHLCV DataFrame before passing to run_ohlcv_health().

    Checks
    ------
    - Not None / not empty
    - Has 'Close' column (required)
    - Has Date column or DatetimeIndex
    - Close column is numeric
    - Sufficient rows for rolling windows
    - No all-NaN Close column
    - Warns on missing optional columns
    """
    r = ValidationResult()
    tag = f"[{name}] " if name else ""

    if df is None:
        r.fail(f"{tag}OHLCV DataFrame is None")
        return r

    if not isinstance(df, pd.DataFrame):
        r.fail(f"{tag}Expected pd.DataFrame, got {type(df).__name__}")
        return r

    if df.empty:
        r.fail(f"{tag}OHLCV DataFrame is empty")
        return r

    # Date presence
    has_date_col   = "Date" in df.columns
    has_date_index = isinstance(df.index, pd.DatetimeIndex)
    if not has_date_col and not has_date_index:
        r.fail(f"{tag}No Date column or DatetimeIndex found")

    # Required columns
    for col in _OHLCV_REQUIRED:
        if col not in df.columns:
            r.fail(f"{tag}Required column '{col}' missing")

    if not r.ok:
        return r   # no point checking further

    # Close is numeric
    if not pd.api.types.is_numeric_dtype(df["Close"]):
        r.fail(f"{tag}Column 'Close' is not numeric (dtype={df['Close'].dtype})")

    # All-NaN Close
    if df["Close"].isna().all():
        r.fail(f"{tag}Column 'Close' is all NaN")

    # Sufficient rows
    if len(df) < _OHLCV_MIN_ROWS:
        r.warn(f"{tag}Only {len(df)} rows — need {_OHLCV_MIN_ROWS} for reliable rolling stats")

    # Optional columns
    for col in _OHLCV_OPTIONAL - {"Date"}:
        if col not in df.columns:
            r.warn(f"{tag}Optional column '{col}' missing — some metrics will be skipped")

    # NaN ratio in Close
    nan_pct = df["Close"].isna().mean() * 100
    if nan_pct > 5:
        r.warn(f"{tag}Close column has {nan_pct:.1f}% NaN values")

    return r


# ── Financials validation ─────────────────────────────────────────────────────

# Columns the balance_sheet module reads from each statement
_INCOME_COLS   = {"Total Revenue", "Net Income", "EBIT", "Gross Profit", "EBITDA", "Interest Expense"}
_BALANCE_COLS  = {"Total Assets", "Stockholders Equity", "Current Liabilities", "Current Assets",
                  "Cash And Cash Equivalents", "Inventory", "Receivables", "Long Term Debt", "Current Debt"}
_CASHFLOW_COLS = {"Operating Cash Flow", "Capital Expenditure"}

_FINANCIALS_MIN_QUARTERS = 4   # need at least 4 quarters for percentile status


def validate_financials(data: dict, ticker: str = "") -> ValidationResult:
    """
    Validate a financials dict from fetch_financials() before passing to run_balance_sheet().

    Checks
    ------
    - Dict has required keys
    - No fetch error
    - income / balance / cashflow are DataFrames with rows
    - Key financial columns present (warns on missing, doesn't fail)
    - Sufficient quarterly periods
    """
    r   = ValidationResult()
    tag = f"[{ticker}] " if ticker else ""

    if not isinstance(data, dict):
        r.fail(f"{tag}financials_data must be a dict, got {type(data).__name__}")
        return r

    # Fetch error
    if data.get("error"):
        r.fail(f"{tag}Fetch error: {data['error']}")
        return r

    # Required keys
    for key in ("income", "balance", "cashflow", "info"):
        if key not in data:
            r.fail(f"{tag}Missing key '{key}' in financials_data")

    if not r.ok:
        return r

    # Each statement must be a non-empty DataFrame
    for key, expected_cols in [
        ("income",   _INCOME_COLS),
        ("balance",  _BALANCE_COLS),
        ("cashflow", _CASHFLOW_COLS),
    ]:
        df = data[key]
        if not isinstance(df, pd.DataFrame):
            r.fail(f"{tag}'{key}' must be pd.DataFrame, got {type(df).__name__}")
            continue
        if df.empty:
            r.warn(f"{tag}'{key}' DataFrame is empty — ratios from this statement will be NaN")
            continue
        if len(df) < _FINANCIALS_MIN_QUARTERS:
            r.warn(f"{tag}'{key}' has only {len(df)} quarters — need {_FINANCIALS_MIN_QUARTERS} for status scoring")
        # Check expected columns (warn only — yfinance column names can vary)
        missing = expected_cols - set(df.columns)
        if missing:
            r.warn(f"{tag}'{key}' missing columns: {sorted(missing)} — affected ratios will be NaN")

    # info must be a dict
    if not isinstance(data.get("info"), dict):
        r.warn(f"{tag}'info' is not a dict — company metadata unavailable")

    return r


# ── Holders validation ────────────────────────────────────────────────────────

_INSTITUTIONAL_COLS = {"% Out"}
_INSIDER_COLS       = {"Start Date", "Transaction", "Shares"}


def validate_holders(data: dict, ticker: str = "") -> ValidationResult:
    """
    Validate a holders dict from fetch_holders() before passing to run_stock_holding().

    Checks
    ------
    - Dict has required keys
    - No fetch error
    - institutional / insider_trans are DataFrames (empty is OK — metrics are optional)
    - price_history has Close column and sufficient rows
    - Warns on missing optional columns
    """
    r   = ValidationResult()
    tag = f"[{ticker}] " if ticker else ""

    if not isinstance(data, dict):
        r.fail(f"{tag}holder_data must be a dict, got {type(data).__name__}")
        return r

    if data.get("error"):
        r.fail(f"{tag}Fetch error: {data['error']}")
        return r

    for key in ("institutional", "major", "insider_trans", "price_history", "info"):
        if key not in data:
            r.warn(f"{tag}Missing key '{key}' — related metrics will be skipped")

    # institutional
    inst = data.get("institutional", pd.DataFrame())
    if isinstance(inst, pd.DataFrame) and not inst.empty:
        missing = _INSTITUTIONAL_COLS - set(inst.columns)
        if missing:
            r.warn(f"{tag}institutional_holders missing columns: {sorted(missing)}")

    # insider_trans
    ins = data.get("insider_trans", pd.DataFrame())
    if isinstance(ins, pd.DataFrame) and not ins.empty:
        cols_lower = {c.lower() for c in ins.columns}
        for col in ("start date", "transaction"):
            if col not in cols_lower:
                r.warn(f"{tag}insider_transactions missing column '{col}' — insider activity metric skipped")

    # price_history — needed for volatility
    ph = data.get("price_history", pd.DataFrame())
    if isinstance(ph, pd.DataFrame):
        if ph.empty:
            r.warn(f"{tag}price_history is empty — volatility metric will be skipped")
        elif "Close" not in ph.columns:
            r.warn(f"{tag}price_history missing 'Close' column — volatility metric will be skipped")
        elif len(ph) < 30:
            r.warn(f"{tag}price_history has only {len(ph)} rows — need 30 for 30d volatility")

    return r
