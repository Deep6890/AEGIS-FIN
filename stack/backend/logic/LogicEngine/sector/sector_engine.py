"""
sector_engine.py
────────────────
Computes the standard AEGIS metric set for sector indices.
Output schema is identical to company_engine (same stems, different prefix).
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from data_utils import load_sector_index, clean_sector_data
from common_engine import calculate_common_metrics


SECTOR_METRIC_COLS = [
    "Close",
    "sector_return_1d",
    "sector_return_5d",
    "sector_return_20d",
    "sector_volatility_20d",
    "sector_atr",
    "sector_drawdown_20d",
    "sector_volume_ratio",
    "sector_momentum",
    "sector_trend",
    "Sector",
]

SECTOR_INDICES = {
    "Bank Nifty":    "^NSEBANK",
    "IT Sector":     "^CNXIT",
    "Auto Sector":   "^CNXAUTO",
    "Metal Sector":  "^CNXMETAL",
    "Realty Sector": "^CNXREALTY",
    "FMCG Sector":   "^CNXFMCG",
    "Pharma Sector": "^CNXPHARMA",
    "Energy Sector": "^CNXENERGY",
    "Gold":          "GC=F",
    "Crude Oil":     "CL=F",
    "USD-INR":       "INR=X",
    "India VIX":     "^INDIAVIX",
}


def sector_engine(sector_df: pd.DataFrame, sector_name: str) -> pd.DataFrame:
    """
    Compute AEGIS metrics for a single sector index.

    Returns a tidy DataFrame with Date as a column and all SECTOR_METRIC_COLS.
    """
    df = calculate_common_metrics(sector_df.copy(), prefix="sector_")
    df["Sector"] = sector_name
    return df[SECTOR_METRIC_COLS].copy().reset_index()


def run_all_sectors() -> dict:
    """
    Fetch and process all tracked sector indices.

    Returns
    -------
    dict { sector_name: pd.DataFrame }
    """
    results = {}
    for name, ticker in SECTOR_INDICES.items():
        print(f"  {name} ...", end=" ", flush=True)
        try:
            df = sector_engine(clean_sector_data(load_sector_index(ticker)), name)
            results[name] = df
            print(f"OK ({len(df)} rows)")
        except Exception as exc:
            print(f"FAILED: {exc}")
    return results