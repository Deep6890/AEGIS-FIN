"""
data_utils.py
─────────────
Data loading and cleaning utilities shared by all engines.
"""

import yfinance as yf
import pandas as pd


def load_sector_index(ticker: str) -> pd.DataFrame:
    """Download OHLCV data for a sector index from Yahoo Finance."""
    data = yf.download(ticker, period="max", auto_adjust=True, progress=False)
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = [
            col[0] if col[0] in ["Open", "High", "Low", "Close", "Volume"] else col[1]
            for col in data.columns
        ]
    return data.reset_index()


def clean_sector_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Drop null rows and trim extreme volume spikes (top 3.5 percentile)
    that would distort rolling metrics.
    """
    data = df.copy().dropna()
    if "Volume" in data.columns and data["Volume"].nunique() > 1:
        cutoff = data["Volume"].quantile(0.965)
        data = data[data["Volume"] <= cutoff]
    return data


def load_company_data(ticker: str) -> pd.DataFrame:
    """Download OHLCV data for a single company ticker from Yahoo Finance."""
    data = yf.download(ticker, period="max", auto_adjust=True, progress=False)
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = [
            col[0] if col[0] in ["Open", "High", "Low", "Close", "Volume"] else col[1]
            for col in data.columns
        ]
    return data.reset_index()
