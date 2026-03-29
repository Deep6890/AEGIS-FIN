"""
AEGIS-FIN  LogicEngine
======================
Top-level package.  Import individual sub-packages for specific functionality:

  from LogicEngine.correlation import build_all_dates_matrix, top_correlated_sectors
  from LogicEngine.sector      import run_all_sectors, run_all_sector_health
  from LogicEngine.company     import run_balance_sheet_analysis, run_stock_holding_analysis

Or run the master pipeline directly:
  python aegis_pipeline.py --company TCS.NS --name TCS --output ./results
"""

__version__ = "2.0.0"
