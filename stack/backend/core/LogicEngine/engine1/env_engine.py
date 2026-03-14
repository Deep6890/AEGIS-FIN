import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from stockMarketLoader import load_sector_index
from cleaner import dataCleaning
import pandas as pd
import numpy as np

def engine_2(sector_df, market_df, sector_name):
    """
    Engine 2 — Sector & Market Analysis
    Computes multi-dimensional, continuous metrics for sector performance
    relative to the market without hard-coded scores. Works for the full dataframe.
    """

    df = sector_df.copy().sort_index()
    mkt = market_df.copy().sort_index()

    # Fix both as same place
    df = df.join(mkt[['Close']], rsuffix='_mkt', how='inner')

    # Return is simple difference in closing prices to keep units consistent across assets
    df['ret'] = df['Close'].diff()
    df['mkt_ret'] = df['Close_mkt'].diff()
    df['rel_ret'] = df['ret'] - df['mkt_ret']  # Relative performance vs market


    # Rolling 30-day volatility (standard deviation) that shows how far from 30 days 
    df['vol_30'] = df['ret'].rolling(30).std()
    df['mkt_vol_30'] = df['mkt_ret'].rolling(30).std()
    df['vol_ratio'] = df['vol_30'] / df['mkt_vol_30']
    # High ratio means sector more volatile than market
    # helps detect periods of abnormal risk or calm

    # current return vs previous period
    df['direction_ratio'] = df['ret'].rolling(30).mean() / df['ret'].rolling(30).mean().shift(1)
    # Captures relative momentum

    # Multiple rolling windows to measure trend stability
    windows = [20, 50, 180, 252]  
    trend_std = pd.DataFrame(index=df.index)
    for w in windows:
        trend_std[f'trend_std_{w}'] = df['rel_ret'].rolling(w).std()
    df['trend_score'] = trend_std.mean(axis=1)
    # Stable trends indicate reliable momentum, less noise


    df['capital_flow_30'] = df['rel_ret'].rolling(30).mean()
    # Positive values = inflow, negative = outflow

    # Maximum drop from peak
    df['cum_max'] = df['Close'].cummax()
    df['drawdown'] = (df['Close'] - df['cum_max']) / df['cum_max']

    df['mkt_cum_max'] = df['Close_mkt'].cummax()
    df['mkt_drawdown'] = (df['Close_mkt'] - df['mkt_cum_max']) / df['mkt_cum_max']

    df['rel_drawdown'] = df['drawdown'] - df['mkt_drawdown']
    # Shows sector resilience vs market in downturns


    df['vol_z_30'] = (df['vol_30'] - df['vol_30'].mean()) / df['vol_30'].std()
    # Extreme volatility movements captured as z-score
    # Helps detect sudden spikes in market stress
    
    history_offsets = {
        "today": 0,
        "20_days_ago": 20,
        "3_months_ago": 60,
        "1_year_ago": 252
    }

    historical_scores = {}
    for label, offset in history_offsets.items():
        if offset < len(df):
            idx = df.index[-1 - offset]
            historical_scores[label] = {
                "vol_ratio": df.at[idx, 'vol_ratio'],
                "direction_ratio": df.at[idx, 'direction_ratio'],
                "trend_score": df.at[idx, 'trend_score'],
                "capital_flow": df.at[idx, 'capital_flow_30'],
                "rel_drawdown": df.at[idx, 'rel_drawdown'],
                "vol_shock": df.at[idx, 'vol_z_30']
            }

    return df, historical_scores


def mainExe():
    pd.set_option('display.max_columns', None)

    indices = {
        "IT": "^CNXIT",
        "BANK": "^NSEBANK",
        "AUTO": "^CNXAUTO",
        "FMCG": "^CNXFMCG",
        "PHARMA": "^CNXPHARMA",
        "METAL": "^CNXMETAL",
        "REALTY": "^CNXREALTY"
    }
    nifty = load_sector_index("^NSEI")
    nifty = dataCleaning(nifty)

    all_results = {}

    for sector_name, ticker in indices.items():
        print(f"Processing {sector_name}...")
        sector_data = load_sector_index(ticker)
        sector_data = dataCleaning(sector_data)
        df, hist_scores = engine_2(sector_data, nifty, sector_name)
        all_results[sector_name] = {"full_df": df, "historical_scores": hist_scores}
        print(f"{sector_name} processed. Sample metrics:")
        # print(df.tail(3))
        print("Historical comparison:", hist_scores)
    
    return all_results