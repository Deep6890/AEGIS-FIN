"""
run_sector_monitor.py
---------------------
Entry point for the AEGIS sector daily monitor.

Usage
-----
  python sector/run_sector_monitor.py
"""

import sys
import os

_SECTOR_DIR       = os.path.dirname(os.path.abspath(__file__))
_LOGIC_ENGINE_DIR = os.path.dirname(_SECTOR_DIR)

for _p in [_SECTOR_DIR, _LOGIC_ENGINE_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from data_utils     import load_sector_index, clean_sector_data
from sector_monitor import run_sector_monitor, print_sector_monitor

# ── Macro assets: market-wide environment signals ─────────────────────────────
MACRO = {
    "Nifty":      "^NSEI",
    "Sensex":     "^BSESN",
    "Gold":       "GC=F",
    "Crude Oil":  "CL=F",
    "USD-INR":    "INR=X",
    "India VIX":  "^INDIAVIX",
}

# ── Investable sectors: where to put money ────────────────────────────────────
SECTORS = {
    "Bank Nifty":    "^NSEBANK",
    "IT Sector":     "^CNXIT",
    "Auto Sector":   "^CNXAUTO",
    "Metal Sector":  "^CNXMETAL",
    "Realty Sector": "^CNXREALTY",
    "FMCG Sector":   "^CNXFMCG",
    "Pharma Sector": "^CNXPHARMA",
    "Energy Sector": "^CNXENERGY",
}


def _fetch(registry: dict) -> dict:
    dfs = {}
    for name, ticker in registry.items():
        print(f"  {name} ...", end=" ", flush=True)
        try:
            df = clean_sector_data(load_sector_index(ticker))
            dfs[name] = df
            print(f"OK ({len(df)} rows)")
        except Exception as e:
            print(f"FAILED: {e}")
    return dfs


def main():
    print("\nFetching macro assets...")
    macro_dfs = _fetch(MACRO)

    print("\nFetching sector data...")
    sector_dfs = _fetch(SECTORS)

    print("\nRunning sector monitor...")
    result = run_sector_monitor(macro_dfs, sector_dfs)
    print_sector_monitor(result)


if __name__ == "__main__":
    main()
