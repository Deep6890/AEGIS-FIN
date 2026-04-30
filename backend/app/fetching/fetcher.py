"""
fetcher.py — Central data fetcher for AEGIS-FIN
------------------------------------------------
THE ONLY FILE IN THE SYSTEM THAT IMPORTS YFINANCE.

All other modules receive data as plain dicts / DataFrames passed in.
Nothing else fetches from yfinance directly.
"""

import time
import warnings
import numpy as np
import pandas as pd
import yfinance as yf
from datetime import date, datetime, timezone

from app.logger import get_logger

warnings.filterwarnings("ignore")

log = get_logger(__name__)

# ── Ticker registries ─────────────────────────────────────────────────────────

SECTOR_TICKERS = {
    "Bank Nifty":    "^NSEBANK",
    "IT Sector":     "^CNXIT",
    "Auto Sector":   "^CNXAUTO",
    "Metal Sector":  "^CNXMETAL",
    "Realty Sector": "^CNXREALTY",
    "FMCG Sector":   "^CNXFMCG",
    "Pharma Sector": "^CNXPHARMA",
    "Energy Sector": "^CNXENERGY",
}

MACRO_TICKERS = {
    "Nifty":     "^NSEI",
    "Sensex":    "^BSESN",
    "Gold":      "GC=F",
    "Crude Oil": "CL=F",
    "USD-INR":   "INR=X",
    "India VIX": "^INDIAVIX",
}

ALL_SECTOR_TICKERS = {**SECTOR_TICKERS, **MACRO_TICKERS}


# ── Internal retry (with logging) ─────────────────────────────────────────────

def _retry(fn, label: str = "", retries: int = 3, delay: float = 1.0):
    """
    Retry a zero-argument callable with exponential back-off.

    Parameters
    ----------
    fn      : callable  Zero-argument function to call.
    label   : str       Human-readable label for log messages.
    retries : int       Maximum attempts (default 3).
    delay   : float     Base sleep in seconds; actual = delay * 2^attempt (default 1.0).

    Returns
    -------
    Result of fn() on success, or None on final failure.
    All failures are logged — no silent swallowing.
    """
    last_error = None
    for i in range(retries):
        try:
            return fn()
        except Exception as exc:
            last_error = exc
            if i < retries - 1:
                wait = delay * (2 ** i)
                log.warning("fetch.retry", label=label, attempt=i + 1,
                            retries=retries, wait_s=wait, error=str(exc))
                time.sleep(wait)
            else:
                log.error("fetch.failed", label=label, attempts=retries, error=str(exc))
    return None


def _clean_df(df: pd.DataFrame) -> pd.DataFrame:
    """Flatten MultiIndex columns, reset index, ensure Date column."""
    if df is None or df.empty:
        return pd.DataFrame()
    df = df.copy()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[0] for c in df.columns]
    df = df.reset_index()
    # yfinance index name varies: 'Date', 'Datetime', 'Price', or 'index'
    for candidate in ("Datetime", "Price", "index"):
        if "Date" not in df.columns and candidate in df.columns:
            df = df.rename(columns={candidate: "Date"})
            break
    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(df["Date"])
    return df


# ── OHLCV — one day ───────────────────────────────────────────────────────────

def fetch_ohlcv_today(ticker: str, name: str) -> dict:
    """
    Fetch the latest single trading-day OHLCV record.

    Returns
    -------
    {
        name, ticker, date, fetched_at,
        open, high, low, close, volume,
        prev_close, change_pct,
        error: str | None
    }
    """
    fetched_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    base = {
        "name": name, "ticker": ticker, "fetched_at": fetched_at,
        "date": None, "open": None, "high": None, "low": None,
        "close": None, "volume": None, "prev_close": None,
        "change_pct": None, "error": None,
    }

    log.debug("fetch.ohlcv_today.start", ticker=ticker, name=name)

    raw = _retry(
        lambda: yf.download(ticker, period="5d", auto_adjust=True, progress=False),
        label=f"ohlcv_today:{ticker}",
    )
    if raw is None or raw.empty:
        msg = f"No data returned for {ticker}"
        log.error("fetch.ohlcv_today.empty", ticker=ticker)
        base["error"] = msg
        return base

    df = _clean_df(raw)
    if df.empty or "Close" not in df.columns:
        msg = f"Missing Close column for {ticker}"
        log.error("fetch.ohlcv_today.no_close", ticker=ticker)
        base["error"] = msg
        return base

    df = df.sort_values("Date").tail(2).reset_index(drop=True)
    latest = df.iloc[-1]

    def _f(v):
        return round(float(v), 4) if (v is not None and not pd.isna(v)) else None

    prev_close = _f(df.iloc[-2]["Close"]) if len(df) >= 2 else None
    close      = _f(latest["Close"])
    change_pct = None
    if close is not None and prev_close is not None and prev_close != 0:
        change_pct = round((close - prev_close) / prev_close * 100, 4)

    base.update({
        "date":       str(latest["Date"].date()) if pd.notna(latest["Date"]) else None,
        "open":       _f(latest.get("Open")),
        "high":       _f(latest.get("High")),
        "low":        _f(latest.get("Low")),
        "close":      close,
        "volume":     int(latest["Volume"]) if ("Volume" in latest.index
                          and latest["Volume"] is not None
                          and not pd.isna(latest["Volume"])) else None,
        "prev_close": prev_close,
        "change_pct": change_pct,
    })
    log.info("fetch.ohlcv_today.ok", ticker=ticker, date=base["date"], close=close)
    return base


def fetch_ohlcv_history(ticker: str, name: str, period: str = "3y") -> pd.DataFrame:
    """
    Fetch full OHLCV history. Returns empty DataFrame on failure.
    Columns: Date, Open, High, Low, Close, Volume, name
    """
    log.debug("fetch.ohlcv_history.start", ticker=ticker, period=period)
    raw = _retry(
        lambda: yf.download(ticker, period=period, auto_adjust=True, progress=False),
        label=f"ohlcv_history:{ticker}",
    )
    if raw is None or raw.empty:
        log.error("fetch.ohlcv_history.empty", ticker=ticker)
        return pd.DataFrame()
    df = _clean_df(raw)
    df["name"] = name
    df = df.sort_values("Date").reset_index(drop=True)
    log.info("fetch.ohlcv_history.ok", ticker=ticker, rows=len(df))
    return df


# ── Financials — quarterly ────────────────────────────────────────────────────

def fetch_financials(ticker: str, audit_window: int = 20) -> dict:
    """
    Fetch quarterly financial statements. Update cadence: quarterly.

    Returns
    -------
    { ticker, fetched_at, income, balance, cashflow, info, error }
    """
    fetched_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    result = {
        "ticker": ticker, "fetched_at": fetched_at,
        "income": pd.DataFrame(), "balance": pd.DataFrame(),
        "cashflow": pd.DataFrame(), "info": {}, "error": None,
    }

    def _tidy(raw):
        if raw is None:
            return pd.DataFrame()
        if isinstance(raw, pd.DataFrame) and raw.empty:
            return pd.DataFrame()
        df = raw.T.copy()
        df.index = pd.to_datetime(df.index)
        return df.sort_index(ascending=False).head(audit_window)

    def _fetch_prop(fn, label):
        """Fetch a yfinance property; treat empty DataFrame as failure for retry."""
        result = _retry(fn, label=label)
        if result is None or (isinstance(result, pd.DataFrame) and result.empty):
            return None
        return result

    log.debug("fetch.financials.start", ticker=ticker)
    try:
        t = yf.Ticker(ticker)
        result["income"]   = _tidy(_fetch_prop(lambda: t.quarterly_financials,    label=f"income:{ticker}"))
        result["balance"]  = _tidy(_fetch_prop(lambda: t.quarterly_balance_sheet, label=f"balance:{ticker}"))
        result["cashflow"] = _tidy(_fetch_prop(lambda: t.quarterly_cashflow,      label=f"cashflow:{ticker}"))
        result["info"]     = _retry(lambda: t.info, label=f"info:{ticker}") or {}
        log.info("fetch.financials.ok", ticker=ticker,
                 income_rows=len(result["income"]),
                 balance_rows=len(result["balance"]),
                 cashflow_rows=len(result["cashflow"]))
    except Exception as exc:
        log.error("fetch.financials.exception", ticker=ticker, error=str(exc))
        result["error"] = str(exc)

    return result


# ── Holders — quarterly ───────────────────────────────────────────────────────

def fetch_holders(ticker: str) -> dict:
    """
    Fetch shareholding / holder data. Update cadence: quarterly.

    Returns
    -------
    { ticker, fetched_at, institutional, major, insider_trans,
      price_history, info, error }
    """
    fetched_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    result = {
        "ticker": ticker, "fetched_at": fetched_at,
        "institutional": pd.DataFrame(), "major": pd.DataFrame(),
        "insider_trans": pd.DataFrame(), "price_history": pd.DataFrame(),
        "info": {}, "error": None,
    }

    def _safe_fetch(fn, label):
        r = _retry(fn, label=label)
        if r is None:
            return pd.DataFrame()
        if isinstance(r, pd.DataFrame):
            return r if not r.empty else pd.DataFrame()
        return pd.DataFrame()

    log.debug("fetch.holders.start", ticker=ticker)
    try:
        t = yf.Ticker(ticker)
        result["institutional"] = _safe_fetch(lambda: t.institutional_holders, f"institutional:{ticker}")
        result["major"]         = _safe_fetch(lambda: t.major_holders,         f"major:{ticker}")
        result["insider_trans"] = _safe_fetch(lambda: t.insider_transactions,  f"insider:{ticker}")
        result["info"]          = _retry(lambda: t.info, label=f"info:{ticker}") or {}

        ph = _safe_fetch(lambda: yf.download(ticker, period="5y", auto_adjust=True, progress=False),
                         f"price_history:{ticker}")
        if not ph.empty:
            ph = _clean_df(ph)
        result["price_history"] = ph
        log.info("fetch.holders.ok", ticker=ticker,
                 institutional_rows=len(result["institutional"]),
                 price_history_rows=len(result["price_history"]))
    except Exception as exc:
        log.error("fetch.holders.exception", ticker=ticker, error=str(exc))
        result["error"] = str(exc)

    return result


# ── Batch helpers ─────────────────────────────────────────────────────────────

def fetch_all_sectors_today() -> dict:
    """Fetch today's OHLCV for all sector indices."""
    fetched_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    log.info("fetch.all_sectors_today.start", count=len(SECTOR_TICKERS))
    sectors = {name: fetch_ohlcv_today(ticker, name) for name, ticker in SECTOR_TICKERS.items()}
    errors  = [n for n, d in sectors.items() if d.get("error")]
    log.info("fetch.all_sectors_today.done", total=len(sectors), errors=len(errors))
    return {"fetched_at": fetched_at, "sectors": sectors}


def fetch_all_macro_today() -> dict:
    """Fetch today's OHLCV for all 6 macro assets."""
    fetched_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    log.info("fetch.all_macro_today.start", count=len(MACRO_TICKERS))
    macro  = {name: fetch_ohlcv_today(ticker, name) for name, ticker in MACRO_TICKERS.items()}
    errors = [n for n, d in macro.items() if d.get("error")]
    log.info("fetch.all_macro_today.done", total=len(macro), errors=len(errors))
    return {"fetched_at": fetched_at, "macro": macro}


def fetch_company_today(ticker: str, name: str) -> dict:
    """Fetch today's OHLCV for a single company ticker."""
    return fetch_ohlcv_today(ticker, name)


def fetch_sector_histories() -> dict:
    """Fetch full OHLCV history for all sectors + macro assets (3y)."""
    fetched_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    log.info("fetch.sector_histories.start", count=len(ALL_SECTOR_TICKERS))
    data = {}
    for name, ticker in ALL_SECTOR_TICKERS.items():
        df = fetch_ohlcv_history(ticker, name, period="3y")
        if not df.empty:
            data[name] = df
    log.info("fetch.sector_histories.done", loaded=len(data), total=len(ALL_SECTOR_TICKERS))
    return {"fetched_at": fetched_at, "data": data}
