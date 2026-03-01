import numpy as np
import pandas as pd 
import yfinance as yf
import matplotlib.pyplot as plt
import seaborn as sns
import os

# loading the cloud data
def load_sector_index(index_name):
    data = yf.download(
        index_name,
        period="max",
        auto_adjust=True,
        progress=False
    )
    
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = [col[0] if col[0] in ['Open','High','Low','Close','Volume'] else col[1] for col in data.columns]

    data = data.reset_index()

    return data

# finding the Data discribtions 
def dataDiscribtion(df):
    data = df.copy()
    print("\n\nShape of the dataset : ",df.shape)
    print("\nTotal unique value according to columns : ")
    for i in data.columns:
        print(f'\n{i} have {data[i].nunique()} unique values') 

    # print("\nTotal null values columns wise : ")
    for i in data.columns:
        if(data[i].isnull().sum() > 0):
            print(f'\n{i} have {data[i].isnull().sum()} null values')

    fig, axes = plt.subplots(2, 3, figsize=(12, 6))

    axes[0,0].boxplot(data['Open'])
    axes[0,0].set_title("Open")

    axes[0,1].boxplot(data['High'])
    axes[0,1].set_title("High")

    axes[0,2].boxplot(data['Low'])
    axes[0,2].set_title("Low")

    axes[1,0].boxplot(data['Close'])
    axes[1,0].set_title("Close")

    axes[1,1].boxplot(data['Volume'])
    axes[1,1].set_title("Volume")
    axes[1,2].axis('off')
    plt.show()
    
# Data cleaning     
def dataCleaning(df):
    data = df.copy()
    data.dropna(inplace=True)
    
    cutoff = data['Volume'].quantile(0.965)
    data = data[(data['Volume'] <= cutoff)]
    print(data.shape)
    return data

# visualization
def visualize(df):

    fig, axes = plt.subplots(2, 3, figsize=(15, 8))

    sns.histplot(df['Close'], kde=True, color="Red", ax=axes[0,0])
    axes[0,0].set_title("Close")

    sns.histplot(df['Open'], kde=True, color="Green", ax=axes[0,1])
    axes[0,1].set_title("Open")

    sns.histplot(df['High'], kde=True, color="Blue", ax=axes[0,2])
    axes[0,2].set_title("High")

    sns.histplot(df['Low'], kde=True, color="Orange", ax=axes[1,0])
    axes[1,0].set_title("Low")

    sns.histplot(df['Volume'], kde=True, color="Purple", ax=axes[1,1])
    axes[1,1].set_title("Volume")

    # remove empty plot (bottom right)
    fig.delaxes(axes[1,2])

    # plt.tight_layout()
    plt.show()
    
    
# main engine with logic 
def engine_1(sector_df, market_df, sector):
    
    df = sector_df.copy().sort_index()
    mkt = market_df.copy().sort_index()

    df = df.join(mkt[['Close']], rsuffix='_mkt', how='inner')

    # RETURNS 
    df['ret'] = df['Close'].pct_change()
    df['mkt_ret'] = df['Close_mkt'].pct_change()

    # VOLATILITY 
    df['vol_20'] = df['ret'].rolling(20).std()
    df['mkt_vol_20'] = df['mkt_ret'].rolling(20).std()
    df['vol_ratio'] = df['vol_20'] / df['mkt_vol_20']

    latest = df.iloc[-1]

    # STABILITY 
    if latest['vol_ratio'] <= 1.0:
        stability_score = 1      # Stable
    elif latest['vol_ratio'] <= 1.4:
        stability_score = 0      # Fragile
    else:
        stability_score = -1     # Chaotic

    # DIRECTION 
    df['ma20'] = df['Close'].rolling(20).mean()
    df['ma50'] = df['Close'].rolling(50).mean()
    df['ma200'] = df['Close'].rolling(200).mean()

    if df['ma20'].iloc[-1] > df['ma50'].iloc[-1] > df['ma200'].iloc[-1]:
        direction_score = 1
    elif df['ma20'].iloc[-1] < df['ma50'].iloc[-1] < df['ma200'].iloc[-1]:
        direction_score = -1
    else:
        direction_score = 0

    # CONSISTENCY 
    df['outperform'] = (df['ret'] > df['mkt_ret']).astype(int)

    win_ratio = df['outperform'].rolling(60).mean().iloc[-1]

    if win_ratio >= 0.60:
        consistency_score = 1     # Strong leadership
    elif win_ratio >= 0.45:
        consistency_score = 0     # Mixed participation
    else:
        consistency_score = -1    # Weak / rotational

    # CAPITAL FLOW 
    df['relative'] = df['ret'] - df['mkt_ret']
    rolling_rs = df['relative'].rolling(20).mean().iloc[-1]
    capital_score = 1 if rolling_rs > 0 else -1

    # STRESS
    df['cum_max'] = df['Close'].cummax()
    df['drawdown'] = (df['Close'] - df['cum_max']) / df['cum_max']
    max_dd = df['drawdown'].min()

    if max_dd > -0.1:
        stress_score = 0
    elif max_dd > -0.3:
        stress_score = -1
    else:
        stress_score = -2

    # REGIME
    if direction_score == 1 and stress_score >= -1:
        regime_score = 1   # Expansion / Stable
    elif direction_score == -1 and stress_score <= -1:
        regime_score = -1  # Contraction
    else:
        regime_score = 0   # Transition

    # SHOCK
    df['vol_z'] = (df['vol_20'] - df['vol_20'].mean()) / df['vol_20'].std()

    if df['vol_z'].iloc[-1] > 2:
        shock_score = 1    # Shock present
    else:
        shock_score = 0

    # FINAL SCORE
    final_score = (
        stability_score +
        direction_score +
        consistency_score +
        capital_score +
        stress_score
    )

    df['Date'] = pd.to_datetime(df['Date'])
    df = df.set_index('Date')
    prediction_date = df.index[-1].date()

    return pd.DataFrame({
        "Prediction_Date": [prediction_date],
        "Sector": [sector],
        "Stability_Score": [stability_score],
        "Direction_Score": [direction_score],
        "Consistency_Score": [consistency_score],
        "Capital_Score": [capital_score],
        "Stress_Score": [stress_score],
        "Regime_Score": [regime_score],
        "Shock_Score": [shock_score],
        "Final_Score": [final_score]
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