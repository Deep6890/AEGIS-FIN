import pandas as pd
from engine_2 import load_company_data, engine_2
pd.set_option('display.max_columns', None)
def execute_engine2(ticker="63MOONS.NS"):
    print(f"Loading data for {ticker}...")
    data = load_company_data(ticker)
    print(f"Data loaded: {data.shape[0]} rows")
    
    result = engine_2(data, ticker)
    print("\nCompany Analysis Result:")
    print(result)
    return result

if __name__ == "__main__":
    execute_engine2()
