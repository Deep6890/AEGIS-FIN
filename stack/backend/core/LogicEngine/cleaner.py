import pandas as pd

# Engine 1 cleaning
def dataCleaning(df):
    data = df.copy()
    data.dropna(inplace=True)
    
    cutoff = data['Volume'].quantile(0.965)
    data = data[(data['Volume'] <= cutoff)]
    print(data.shape)
    return data

# Engine 2 cleaning
def dataCleaning_engine2(df):
    data = df.copy()
    data.dropna(inplace=True)
    print(data.shape)
    return data
