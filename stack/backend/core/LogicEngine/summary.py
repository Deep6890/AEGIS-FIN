import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from stockMarketLoader import load_sector_index
# from discribtion import dataDiscribtion
from cleaner import dataCleaning, dataCleaning_engine2
from visulization import visualize, visualize_engine2
import matplotlib.pyplot as plt

# Engine 1 Summary
def run_engine1_summary():
    it = load_sector_index("^CNXIT")
    nifty = load_sector_index("^NSEI")

    # dataDiscribtion(it)
    # dataDiscribtion(nifty)

    it = dataCleaning(it)
    nifty = dataCleaning(nifty)

    visualize(it)
    visualize(nifty)
    
    # Line plot comparison
    plt.figure(figsize=(14, 6))
    plt.plot(it['Date'], it['Close'], label='IT Sector', linewidth=2)
    plt.plot(nifty['Date'], nifty['Close'], label='Nifty', linewidth=2)
    plt.xlabel('Date')
    plt.ylabel('Close Price')
    plt.title('IT Sector vs Nifty Comparison')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()

# Engine 2 Summary
def run_engine2_summary(ticker="63MOONS.NS"):
    from engine2.engine_2 import load_company_data
    
    data = load_company_data(ticker)
    print(f"\nCompany: {ticker}")
    print(f"Data shape: {data.shape}")
    
    data = dataCleaning_engine2(data)
    visualize_engine2(data)

if __name__ == "__main__":
    print("\n\nRunning Engine 2 Summary...")
    # run_engine2_summary()
    run_engine1_summary()