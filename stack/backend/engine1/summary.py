from env_engine import load_sector_index, dataDiscribtion, dataCleaning, visualize

def run_summary():
    it = load_sector_index("^CNXIT")
    nifty = load_sector_index("^NSEI")

    dataDiscribtion(it)
    dataDiscribtion(nifty)

    it = dataCleaning(it)
    nifty = dataCleaning(nifty)

    visualize(it)
    visualize(nifty)
