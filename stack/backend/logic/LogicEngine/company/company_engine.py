"""
company_engine.py
─────────────────
Computes the standard AEGIS metric set for individual company tickers.
Output schema is identical to sector_engine (same stems, different prefix).
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from data_utils import load_company_data
from common_engine import calculate_common_metrics


COMPANY_METRIC_COLS = [
    "Close",
    "company_return_1d",
    "company_return_5d",
    "company_return_20d",
    "company_volatility_20d",
    "company_atr",
    "company_drawdown_20d",
    "company_volume_ratio",
    "company_momentum",
    "company_trend",
    "Company",
]


def company_engine(df: pd.DataFrame, company: str) -> pd.DataFrame:
    """
    Compute AEGIS metrics for a single company ticker.

    Returns a tidy DataFrame with Date as a column and all COMPANY_METRIC_COLS.
    """
    df = calculate_common_metrics(df.copy(), prefix="company_")
    df["Company"] = company
    return df[COMPANY_METRIC_COLS].copy().reset_index()


def run_company(ticker: str, display_name: str = None) -> pd.DataFrame:
    """
    Fetch and process a single company ticker.

    Parameters
    ----------
    ticker       : str   Yahoo Finance ticker, e.g. 'TCS.NS'
    display_name : str   Label stored in the 'Company' column (defaults to ticker).
    """
    name = display_name or ticker
    print(f"  {name} ({ticker}) ...", end=" ", flush=True)
    df = company_engine(load_company_data(ticker), name)
    print(f"OK ({len(df)} rows)")
    return df