"""
run_validation.py
-----------------
Runs relationship validation for a small local IT company (KPIT Technologies).

Usage
-----
  python validation/run_validation.py
  python validation/run_validation.py --company ROUTE.NS --name RouteMobile
"""

import sys
import os
import argparse

_VALIDATION_DIR   = os.path.dirname(os.path.abspath(__file__))
_LOGIC_ENGINE_DIR = os.path.dirname(_VALIDATION_DIR)

for _p in [
    _LOGIC_ENGINE_DIR,
    os.path.join(_LOGIC_ENGINE_DIR, "sector"),
    os.path.join(_LOGIC_ENGINE_DIR, "company"),
    os.path.join(_LOGIC_ENGINE_DIR, "correlation"),
    _VALIDATION_DIR,
]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from sector_engine          import run_all_sectors
from company_engine         import run_company
from relationship_validator import validate_relationships


def main():
    parser = argparse.ArgumentParser(description="AEGIS Relationship Validator")
    parser.add_argument("--company", default="KPITTECH.NS", help="Yahoo Finance ticker")
    parser.add_argument("--name",    default="KPIT Technologies", help="Display name")
    args = parser.parse_args()

    print(f"\nFetching sector data...")
    sector_dfs = run_all_sectors()

    print(f"\nFetching company: {args.name} ({args.company})...")
    company_df = run_company(args.company, args.name)

    print(f"\nRunning relationship validation for {args.name}...")
    result = validate_relationships(company_df, sector_dfs)

    if result.empty:
        print("No sectors passed all validation filters.")
        return

    print(f"\nValidated sectors with persistent correlation to {args.name}:")
    print(f"(metric: return_1d | p < 0.05 | sign consistent across all 3 time periods)\n")
    print(result.to_string(index=False))

    print(f"\nTotal validated sectors: {len(result)}")
    print(f"\nTop sector by correlation strength: {result.iloc[0]['sector']} "
          f"(r={result.iloc[0]['correlation']}, lag={result.iloc[0]['lag_days']}d, "
          f"p={result.iloc[0]['p_value']})")


if __name__ == "__main__":
    main()
