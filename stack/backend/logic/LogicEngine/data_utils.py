"""
data_utils.py
─────────────
Data loading and cleaning utilities shared by all engines.
"""

import yfinance as yf
import pandas as pd
import numpy as np
import time
from functools import wraps


def retry_yf_fetch(fn, retries=3, delay=1.0):
    """
    Exponential backoff wrapper for yfinance calls to avoid silent failures
    when processing hundreds of SME companies in bulk.
    """
    for attempt in range(retries):
        try:
            return fn()
        except Exception as e:
            if attempt == retries - 1:
                print(f"    [!] API Rate limit / fetch failed after {retries} attempts: {e}")
                return None
            time.sleep(delay * (2 ** attempt))

def load_sector_index(ticker: str) -> pd.DataFrame:
    """Download OHLCV data for a sector index from Yahoo Finance (Max 3 years for optimal ML limits)."""
    data = retry_yf_fetch(lambda: yf.download(ticker, period="3y", auto_adjust=True, progress=False))
    if data is not None and isinstance(data.columns, pd.MultiIndex):
        data.columns = [col[0] for col in data.columns]
    return data.reset_index() if data is not None else pd.DataFrame()


def clean_sector_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Drop null rows and winsorize extreme volume spikes (clip at top 3.5 percentile)
    to prevent distorting rolling metrics while preserving important structural days.
    """
    data = df.copy().dropna(subset=["Close", "High", "Low"])
    if "Volume" in data.columns and data["Volume"].nunique() > 1:
        cutoff = data["Volume"].quantile(0.965)
        # Winsorize: clip volumes above 96.5th percentile rather than deleting them
        data["Volume"] = np.clip(data["Volume"], a_min=None, a_max=cutoff)
    return data


def load_company_data(ticker: str) -> pd.DataFrame:
    """Download OHLCV data for a single company ticker from Yahoo Finance (Max 3 years for optimal ML limits)."""
    data = retry_yf_fetch(lambda: yf.download(ticker, period="3y", auto_adjust=True, progress=False))
    if data is not None and isinstance(data.columns, pd.MultiIndex):
        data.columns = [col[0] for col in data.columns]
    return data.reset_index() if data is not None else pd.DataFrame()
