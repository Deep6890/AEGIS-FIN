"""
aegis_pipeline.py
-----------------
Master orchestrator for the full AEGIS-FIN analytical pipeline.

Layer execution order
---------------------
  1. Sector Engine        → raw sector metrics (all days)
  2. Sector Health        → daily health matrices (trend / spike / regime / score)
  3. Company Engine       → raw company metrics (all days)
  4. Rolling Correlation  → full time-series correlation (all days, all windows)
  5. Sector Sift          → top-N most correlated sectors for the company
  6. Balance Sheet        → financial ratios + sector overlay (audit_window=20q)
  7. Stock Holding        → holder patterns + sector overlay

Each layer builds on the previous.  Only the top-correlated sectors (Layer 5)
feed into Layers 6 and 7.

Usage
-----
  python aegis_pipeline.py
  python aegis_pipeline.py --company TCS.NS --name TCS --top 5

Outputs
-------
  • Console summary for every layer
  • Optional TSV / CSV exports to --output dir
"""

import sys
import os
import argparse

# ── Path bootstrap ────────────────────────────────────────────────────────────
_PIPE_DIR         = os.path.dirname(os.path.abspath(__file__))
_LOGIC_ENGINE_DIR = _PIPE_DIR
_SECTOR_DIR       = os.path.join(_LOGIC_ENGINE_DIR, "sector")
_COMPANY_DIR      = os.path.join(_LOGIC_ENGINE_DIR, "company")
_CORR_DIR         = os.path.join(_LOGIC_ENGINE_DIR, "correlation")

for _p in [_LOGIC_ENGINE_DIR, _SECTOR_DIR, _COMPANY_DIR, _CORR_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

# ── Imports ───────────────────────────────────────────────────────────────────
import pandas as pd
import numpy as np

from data_utils    import load_sector_index, clean_sector_data, load_company_data
from sector_engine import run_all_sectors, SECTOR_INDICES
from company_engine import company_engine, run_company

from sector_health import run_all_sector_health, rolling_health_matrix

from rolling_timeseries import (
    build_all_dates_matrix,
    top_correlated_sectors,
)
from correlation_matrix import build_company_sector_corr
from correlation_sift   import sift_all_metrics, latest_sift_all_metrics

from balance_sheet_analyzer  import run_balance_sheet_analysis
from stock_holding_analyzer  import run_stock_holding_analysis


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _sep(title: str, w: int = 72):
    print(f"\n{'='*w}")
    print(f"  {title}")
    print(f"{'='*w}")


def _fetch_raw_sectors(registry: dict) -> dict:
    """Fetch raw OHLCV for all tickers in registry."""
    raw = {}
    for name, ticker in registry.items():
        print(f"  {name} ({ticker}) ...", end=" ", flush=True)
        try:
            df = clean_sector_data(load_sector_index(ticker))
            raw[name] = df
            print(f"OK ({len(df)} rows)")
        except Exception as e:
            print(f"FAILED: {e}")
    return raw


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline
# ─────────────────────────────────────────────────────────────────────────────

def run_full_pipeline(
    ticker:         str,
    display_name:   str,
    windows:        list  = [20, 60, 100],
    top_n:          int   = 5,
    corr_metric:    str   = "return_1d",
    audit_window:   int   = 20,
    output_dir:     str   = None,
) -> dict:
    """
    Execute all 7 layers and return a result bundle.

    Parameters
    ----------
    ticker       : Yahoo Finance ticker for the company  (e.g. 'TCS.NS')
    display_name : Human-readable name
    windows      : Rolling correlation windows in days
    top_n        : Number of top-correlated sectors to use downstream
    corr_metric  : Metric stem for sector ranking  ('return_1d' default)
    audit_window : Trailing quarters for balance sheet
    output_dir   : If set, save CSV exports here

    Returns
    -------
    large dict with keys:
        sector_dfs, sector_metrics, health_dfs, health_matrix,
        company_df, correlation_matrix, full_rolling_corr,
        top_sectors, balance_sheet, holding_analysis
    """

    result = {}

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 1 — Sector Engine (processed metrics)
    # ─────────────────────────────────────────────────────────────────────────
    _sep("LAYER 1 — Sector Engine")
    sector_metrics = run_all_sectors()      # {name: df with sector_ metrics}
    result["sector_metrics"] = sector_metrics
    print(f"  ✔  {len(sector_metrics)} sectors processed.")

    # Also fetch raw OHLCV for sector health (needs High/Low/Volume)
    _sep("LAYER 1b — Fetching raw OHLCV for sector health engine")
    sector_raw = _fetch_raw_sectors(SECTOR_INDICES)
    result["sector_raw"] = sector_raw

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 2 — Sector Health (full daily matrix)
    # ─────────────────────────────────────────────────────────────────────────
    _sep("LAYER 2 — Sector Health Matrix")
    health_dfs = run_all_sector_health(sector_raw)
    result["health_dfs"] = health_dfs

    health_matrix = rolling_health_matrix(health_dfs)
    result["health_matrix"] = health_matrix
    print(f"  ✔  Health matrix: {health_matrix.shape[0]} rows (Date x Sector).")

    # Quick per-sector summary
    if not health_matrix.empty:
        latest_health = (
            health_matrix
            .sort_values("Date")
            .groupby("Sector")
            .last()
            .reset_index()
            [["Sector", "signal", "health_score", "regime", "trend"]]
        )
        print(latest_health.to_string(index=False))

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 3 — Company Engine
    # ─────────────────────────────────────────────────────────────────────────
    _sep(f"LAYER 3 — Company Engine: {display_name} ({ticker})")
    company_df = run_company(ticker, display_name)
    result["company_df"] = company_df
    print(f"  ✔  Company data: {len(company_df)} rows.")

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 4 — Full Rolling Correlation (all days, all windows)
    # ─────────────────────────────────────────────────────────────────────────
    _sep("LAYER 4 — Full Daily Rolling Correlation Matrix")
    print("  Building static Pearson matrix ...")
    raw_corr = build_company_sector_corr(company_df, sector_metrics)
    print(raw_corr.to_string())
    result["correlation_matrix"] = raw_corr

    print(f"\n  Building full time-series rolling correlations {windows} ...")
    full_rolling = build_all_dates_matrix(company_df, sector_metrics, windows)
    result["full_rolling_corr"] = full_rolling
    print(f"  ✔  Rolling corr matrix: {full_rolling.shape[0]} rows "
          f"({full_rolling['Date'].nunique()} unique dates).")

    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        p = os.path.join(output_dir, f"{display_name}_rolling_corr.csv")
        full_rolling.to_csv(p, index=False)
        print(f"  Saved → {p}")

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 5 — Top correlated sectors
    # ─────────────────────────────────────────────────────────────────────────
    _sep("LAYER 5 — Top Correlated Sectors (company-sector linkage)")
    top_sectors = top_correlated_sectors(
        company_df, sector_metrics,
        window=windows[1],      # use middle window (60d default)
        metric_stem=corr_metric,
        top_n=top_n,
    )
    result["top_sectors"] = top_sectors
    print(f"  ✔  Top {top_n} sectors correlated with {display_name}:")
    for i, s in enumerate(top_sectors, 1):
        corr_val = raw_corr.loc[s, corr_metric] if s in raw_corr.index else np.nan
        print(f"     {i}. {s:<22}  raw corr({corr_metric})={corr_val:+.4f}")

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 6 — Balance Sheet Analysis (with sector overlay)
    # ─────────────────────────────────────────────────────────────────────────
    _sep(f"LAYER 6 — Balance Sheet Analysis: {display_name} (audit={audit_window}q)")
    print(f"  Only top sectors used: {', '.join(top_sectors)}")
    bs_result = run_balance_sheet_analysis(
        ticker, health_dfs, top_sectors,
        audit_window=audit_window,
    )
    result["balance_sheet"] = bs_result

    fr = bs_result["full_ratios"]
    print(f"\n  Key ratios with sector overlay (pressure={bs_result['sector_pressure']:+.1f}):")
    cols_show = ["Ratio", "ValueStr", "YoY_pct", "Status", "AdjustedStatus"]
    cols_show = [c for c in cols_show if c in fr.columns]
    print(fr[cols_show].head(20).to_string(index=False))

    if output_dir:
        p = os.path.join(output_dir, f"{display_name}_balance_sheet.csv")
        fr.to_csv(p, index=False)
        print(f"  Saved → {p}")

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 7 — Stock Holding Analysis (with sector overlay)
    # ─────────────────────────────────────────────────────────────────────────
    _sep(f"LAYER 7 — Stock Holding Analysis: {display_name}")
    print(f"  Only top sectors used: {', '.join(top_sectors)}")
    hold_result = run_stock_holding_analysis(
        ticker, health_dfs, top_sectors,
    )
    result["holding_analysis"] = hold_result

    fm = hold_result["full_metrics"]
    print(f"\n  Holding signal: {hold_result['holding_signal']}")
    if not fm.empty:
        cols_m = ["Metric", "Value", "Status", "SectorSignal", "AdjustedStatus"]
        cols_m = [c for c in cols_m if c in fm.columns]
        print(fm[cols_m].to_string(index=False))

    if output_dir:
        p = os.path.join(output_dir, f"{display_name}_holding_analysis.csv")
        fm.to_csv(p, index=False)
        print(f"  Saved → {p}")

    # ─────────────────────────────────────────────────────────────────────────
    # Done
    # ─────────────────────────────────────────────────────────────────────────
    _sep("AEGIS PIPELINE — COMPLETE")
    print(f"  Company  : {display_name} ({ticker})")
    print(f"  Top Sectors: {', '.join(top_sectors)}")
    print(f"  Balance Sheet pressure: {bs_result['sector_pressure']:+.1f}")
    print(f"  Holding signal        : {hold_result['holding_signal']}")
    print(f"{'='*72}\n")

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def _parse_args():
    p = argparse.ArgumentParser(description="AEGIS-FIN Full Pipeline")
    p.add_argument("--company",  default="TCS.NS",    help="Yahoo Finance ticker")
    p.add_argument("--name",     default="TCS",        help="Display name")
    p.add_argument("--windows",  default="20,60,100",  help="Comma-sep rolling windows")
    p.add_argument("--top",      default=5, type=int,  help="Top-N correlated sectors")
    p.add_argument("--metric",   default="return_1d",  help="Metric for sector ranking")
    p.add_argument("--audit",    default=20, type=int, help="Balance sheet audit window (quarters)")
    p.add_argument("--output",   default=None,          help="Dir to save CSV exports")
    return p.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    windows = [int(w) for w in args.windows.split(",")]

    run_full_pipeline(
        ticker       = args.company,
        display_name = args.name,
        windows      = windows,
        top_n        = args.top,
        corr_metric  = args.metric,
        audit_window = args.audit,
        output_dir   = args.output,
    )
