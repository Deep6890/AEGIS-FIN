"""
run_correlation.py
------------------
Entry point for the AEGIS correlation pipeline.

Steps
-----
  1. Fetch one company (default: TCS.NS)
  2. Fetch all sector indices
  3. Build raw Sector x Metric Pearson correlation matrix
  4. Build rolling SIFT Sector x Metric correlation snapshot
  5. Render both as heatmaps

Usage
-----
  python correlation/run_correlation.py
  python correlation/run_correlation.py --company INFY.NS --name Infosys
  python correlation/run_correlation.py --window 90 --save ./output
"""

import sys
import os
import argparse

# ── path bootstrap ────────────────────────────────────────────────────────────
_CORR_DIR         = os.path.dirname(os.path.abspath(__file__))
_LOGIC_ENGINE_DIR = os.path.dirname(_CORR_DIR)

for _p in [_CORR_DIR, _LOGIC_ENGINE_DIR,
           os.path.join(_LOGIC_ENGINE_DIR, "sector"),
           os.path.join(_LOGIC_ENGINE_DIR, "company")]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

# ── imports ───────────────────────────────────────────────────────────────────
import matplotlib.pyplot as plt

from sector_engine      import run_all_sectors
from company_engine     import run_company
from correlation_matrix import build_company_sector_corr, build_rolling_company_corr
from correlation_sift   import sift_all_metrics, latest_sift_all_metrics
from heatmap            import plot_heatmap


def main():
    parser = argparse.ArgumentParser(description="AEGIS-FIN Correlation Engine")
    parser.add_argument("--company", default="TCS.NS", help="Yahoo Finance ticker")
    parser.add_argument("--name",    default="TCS",    help="Display name for company")
    parser.add_argument("--window",  default=60, type=int, help="SIFT rolling window in days")
    parser.add_argument("--save",    default=None, help="Directory to save PNG heatmaps")
    args = parser.parse_args()

    print("Fetching sector data...")
    sector_dfs = run_all_sectors()

    print(f"Fetching company data: {args.name} ({args.company})...")
    company_df = run_company(args.company, args.name)

    print("Building raw correlation matrix...")
    raw_corr = build_company_sector_corr(company_df, sector_dfs)
    print(raw_corr.to_string())

    print("\nBuilding rolling correlations (20d / 60d / 100d)...")
    rolling_corrs = build_rolling_company_corr(company_df, sector_dfs, windows=[20, 60, 100])
    for window, df in rolling_corrs.items():
        print(f"\n--- Rolling {window}d Correlation ---")
        print(df.to_string())

    print(f"\nBuilding SIFT rolling snapshot (window={args.window}d)...")
    sift_snap = latest_sift_all_metrics(
        sift_all_metrics(company_df, sector_dfs, window=args.window)
    )
    print(sift_snap.to_string())

    if args.save:
        os.makedirs(args.save, exist_ok=True)

    plot_heatmap(
        raw_corr,
        title=f"{args.name} vs Sectors - Raw Pearson Correlation",
        output_path=os.path.join(args.save, f"{args.name}_raw_corr.png") if args.save else None,
    )
    plot_heatmap(
        sift_snap,
        title=f"{args.name} vs Sectors - SIFT {args.window}d Rolling Correlation",
        output_path=os.path.join(args.save, f"{args.name}_sift_{args.window}d.png") if args.save else None,
    )

    plt.show()
    print("Done.")


if __name__ == "__main__":
    main()
