import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from stockMarketLoader import load_sector_index
from cleaner import dataCleaning
import pandas as pd

# main engine with logic 
import pandas as pd
import numpy as np

def engine_1(sector_df, market_df, sector_name):
    df = sector_df.copy().sort_index()
    mkt = market_df.copy().sort_index()

    # ALIGN DATES
    df = df.join(mkt[['Close']], rsuffix='_mkt', how='inner')

    # RETURNS
    df['ret'] = df['Close'].pct_change()
    df['mkt_ret'] = df['Close_mkt'].pct_change()
    df['rel_ret'] = df['ret'] - df['mkt_ret']

    # VOLATILITY (ENVIRONMENT BASE)
    df['vol_20'] = df['ret'].rolling(20).std()
    df['mkt_vol_20'] = df['mkt_ret'].rolling(20).std()
    df['vol_ratio'] = df['vol_20'] / df['mkt_vol_20']

    vol_ratio = df['vol_ratio'].iloc[-1]

    if vol_ratio <= 0.8:
        stability_score = 4
    elif vol_ratio <= 1.0:
        stability_score = 2
    elif vol_ratio <= 1.3:
        stability_score = 0
    elif vol_ratio <= 1.6:
        stability_score = -2
    else:
        stability_score = -4

    # TREND DIRECTION (RELATIVE)
    ma20 = df['rel_ret'].rolling(20).mean().iloc[-1]
    ma50 = df['rel_ret'].rolling(50).mean().iloc[-1]

    if ma20 > 0 and ma20 > ma50:
        direction_score = 4
    elif ma20 > 0:
        direction_score = 2
    elif ma20 < 0 and ma20 < ma50:
        direction_score = -4
    else:
        direction_score = -2

    # TREND CONSISTENCY
    short_std = df['rel_ret'].rolling(60).std().iloc[-1]
    long_std = df['rel_ret'].rolling(252).std().mean()

    consistency_ratio = short_std / long_std

    if consistency_ratio < 0.7:
        consistency_score = 4
    elif consistency_ratio < 0.9:
        consistency_score = 2
    elif consistency_ratio < 1.2:
        consistency_score = 0
    elif consistency_ratio < 1.5:
        consistency_score = -2
    else:
        consistency_score = -4

    # CAPITAL FLOW (RELATIVE STRENGTH)
    rs_20 = df['rel_ret'].rolling(20).mean().iloc[-1]

    if rs_20 > 0.002:
        capital_score = 4
    elif rs_20 > 0:
        capital_score = 2
    elif rs_20 > -0.002:
        capital_score = -2
    else:
        capital_score = -4

    # DRAWDOWN STRESS (ENV vs MARKET)
    df['cum_max'] = df['Close'].cummax()
    df['drawdown'] = (df['Close'] - df['cum_max']) / df['cum_max']

    df['mkt_cum_max'] = df['Close_mkt'].cummax()
    df['mkt_drawdown'] = (df['Close_mkt'] - df['mkt_cum_max']) / df['mkt_cum_max']

    rel_dd = df['drawdown'].min() - df['mkt_drawdown'].min()

    if rel_dd > -0.05:
        stress_score = 4
    elif rel_dd > -0.15:
        stress_score = 2
    elif rel_dd > -0.30:
        stress_score = -2
    else:
        stress_score = -4

    # Volatality shock 
    df['vol_z'] = (df['vol_20'] - df['vol_20'].mean()) / df['vol_20'].std()

    vol_z = df['vol_z'].iloc[-1]

    if vol_z > 2.5:
        shock_score = -4
    elif vol_z > 1.5:
        shock_score = -2
    else:
        shock_score = 0

    # Final score 
    final_score = np.clip(
        stability_score +
        direction_score +
        consistency_score +
        capital_score +
        stress_score +
        shock_score,
        -4, 4
    )

    return pd.DataFrame({
        "Prediction_Date": [df.index[-1]],
        "Sector": [sector_name],
        "Stability_Score": [stability_score],
        "Direction_Score": [direction_score],
        "Consistency_Score": [consistency_score],
        "Capital_Score": [capital_score],
        "Stress_Score": [stress_score],
        "Shock_Score": [shock_score],
        "Final_Engine1_Score": [final_score]
    })
# Loader function 
def mainExe():
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
        result = engine_1(sector_data, nifty, sector_name)
        all_results[sector_name] = result
        print(result)

    return all_results