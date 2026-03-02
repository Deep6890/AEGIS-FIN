import yfinance as yf
import pandas as pd

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
