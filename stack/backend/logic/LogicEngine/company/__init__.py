# company package
# Modules:
#   company_engine          - raw AEGIS metrics for a single company ticker
#   balance_sheet_analyzer  - financial ratios + sector-health overlay (audit_window=20q)
#   stock_holding_analyzer  - holder patterns + sector-health overlay

from .company_engine import company_engine, run_company, COMPANY_METRIC_COLS
from .balance_sheet_analyzer import (
    fetch_balance_sheet,
    compute_financial_ratios,
    sector_overlay,
    run_balance_sheet_analysis,
)
from .stock_holding_analyzer import (
    fetch_holder_data,
    compute_holding_metrics,
    sector_holding_overlay,
    run_stock_holding_analysis,
)

__all__ = [
    # engine
    "COMPANY_METRIC_COLS",
    "company_engine",
    "run_company",
    # balance sheet
    "fetch_balance_sheet",
    "compute_financial_ratios",
    "sector_overlay",
    "run_balance_sheet_analysis",
    # holding
    "fetch_holder_data",
    "compute_holding_metrics",
    "sector_holding_overlay",
    "run_stock_holding_analysis",
]
