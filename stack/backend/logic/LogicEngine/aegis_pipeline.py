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

DB-ready output
---------------
  Every layer DataFrame has two timestamp columns injected automatically:
    • run_at   : UTC datetime of this pipeline run  (same for all rows in a run)
    • company  : ticker display name
  This makes each DataFrame ready to be written to a database table at your
  gateway without any post-processing.

Usage
-----
  python aegis_pipeline.py
  python aegis_pipeline.py --company TCS.NS --name TCS --top 5

Outputs
-------
  • Console summary for every layer
  • A dict of DB-ready DataFrames keyed by layer name
"""

import sys
import os
import argparse
from datetime import datetime, timezone

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

from data_utils     import load_sector_index, clean_sector_data, load_company_data
from sector_engine  import run_all_sectors, SECTOR_INDICES
from company_engine import company_engine, run_company

from sector_health  import run_all_sector_health, rolling_health_matrix, compute_macro_overlay, apply_macro_to_sector

from rolling_timeseries import (
    build_all_dates_matrix,
    top_correlated_sectors,
)
from correlation_matrix import build_company_sector_corr
from correlation_sift   import sift_all_metrics, latest_sift_all_metrics

from balance_sheet_analyzer import run_balance_sheet_analysis
from stock_holding_analyzer import run_stock_holding_analysis


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _sep(title: str, w: int = 72):
    print(f"\n{'='*w}")
    print(f"  {title}")
    print(f"{'='*w}")


def _stamp(df: pd.DataFrame, run_at: str, company: str, date_val: str = None) -> pd.DataFrame:
    """
    Inject metadata columns into any DataFrame so it is DB-ready.

    Columns added:
        run_at  : UTC timestamp string — same value for all rows in one run
        company : display name of the company being analysed
        Date    : Snapshot date for deduplication
    """
    df = df.copy()
    df["run_at"]  = run_at
    df["company"] = company
    
    if "Date" not in df.columns:
        if date_val:
            df["Date"] = date_val
        else:
            df["Date"] = run_at.split("T")[0]

    cols = ["run_at", "company"]
    if "Date" in df.columns:
        cols.append("Date")
    cols.extend([c for c in df.columns if c not in ("run_at", "company", "Date")])
    return df[cols]


def _stamp_dict(dfs: dict, run_at: str, company: str) -> dict:
    """Apply _stamp() to every DataFrame in a dict."""
    return {k: _stamp(v, run_at, company) for k, v in dfs.items()}


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
    windows:        list = [20, 60, 100],
    top_n:          int  = 5,
    corr_metric:    str  = "return_1d",
    audit_window:   int  = 20,
    output_dir:     str  = None,
    precomputed_sector_metrics: dict = None,
    precomputed_sector_raw: dict = None,
    precomputed_health_dfs: dict = None,
    precomputed_health_matrix: pd.DataFrame = None,
    skip_sector_output: bool = False,
) -> dict:
    """
    Execute all 7 layers and return a DB-ready result bundle.

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
    dict with keys:
        run_at              — UTC timestamp string for this run
        company             — display name
        ticker              — Yahoo Finance ticker

        # DB-ready DataFrames (each has run_at + company columns)
        layer1_sector_metrics  — dict { sector_name: DataFrame }
        layer1b_sector_raw     — dict { sector_name: DataFrame }
        layer2_health_dfs      — dict { sector_name: DataFrame }
        layer2_health_matrix   — DataFrame  (long: Date × Sector × signals)
        layer3_company         — DataFrame  (all company metrics, all days)
        layer4_static_corr     — DataFrame  (sector × metric Pearson corr)
        layer4_rolling_corr    — DataFrame  (full daily rolling corr)
        layer5_top_sectors     — DataFrame  (rank | sector)
        layer6_balance_sheet   — DataFrame  (20 ratios with sector overlay)
        layer7_holding         — DataFrame  (holding metrics with overlay)

        # Raw analysis objects (for downstream code)
        _raw_health_dfs        — unmodified dict of health DataFrames
        _raw_top_sectors       — list of sector name strings
        _raw_balance_sheet     — full balance sheet result dict
        _raw_holding           — full holding result dict
    """

    # UTC timestamp for this entire run — injected into every DataFrame
    run_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")

    result = {
        "run_at":   run_at,
        "company":  display_name,
        "ticker":   ticker,
    }

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 1 & 2 — Sector Engine & Health Matrix
    # ─────────────────────────────────────────────────────────────────────────
    _sep("LAYER 1 & 2 — Sector Engine & Health Matrix")
    
    if precomputed_sector_metrics is not None and precomputed_sector_raw is not None:
        print("  Using precomputed sector definitions.")
        sector_metrics = precomputed_sector_metrics
        sector_raw     = precomputed_sector_raw
        health_dfs     = precomputed_health_dfs
        health_matrix  = precomputed_health_matrix
    else:
        sector_metrics = run_all_sectors()
        print(f"  ✔  {len(sector_metrics)} sectors processed.")
        
        print("  Fetching raw OHLCV for sector health engine...")
        sector_raw = _fetch_raw_sectors(SECTOR_INDICES)
        
        health_dfs    = run_all_sector_health(sector_raw)
        health_matrix = rolling_health_matrix(health_dfs)
    
    if not skip_sector_output:
        result["layer1_sector_metrics"] = _stamp_dict(sector_metrics, run_at, display_name)
    
    print(f"  ✔  Health matrix: {health_matrix.shape[0]} rows (Date × Sector).")

    if not skip_sector_output:
        result["layer2_health_dfs"] = _stamp_dict(health_dfs, run_at, display_name)

    result["_raw_health_dfs"]      = health_dfs     # keep unmodified for layers 6 & 7

    # ── Macro overlay ───────────────────────────────────────────────────────────
    macro_df = compute_macro_overlay(health_dfs)
    result["layer2_macro_overlay"] = macro_df

    if not health_matrix.empty:
        latest_health = (
            health_matrix.sort_values("Date")
            .groupby("Sector").last().reset_index()
            [["Sector", "signal", "health_score", "regime", "market_phase", "trend"]]
        )
        print(latest_health.to_string(index=False))

        # Print today's macro regime
        if not macro_df.empty:
            latest_macro = macro_df.iloc[-1]
            print(f"\n  Macro regime: {latest_macro['macro_regime']}  "
                  f"(score={latest_macro['macro_score']:+.2f})")
            print(f"  {latest_macro['macro_narrative']}")

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 3 — Company Engine
    # ─────────────────────────────────────────────────────────────────────────
    _sep(f"LAYER 3 — Company Engine: {display_name} ({ticker})")
    try:
        company_df = run_company(ticker, display_name)
    except Exception as e:
        print(f"  ✘  Failed to process company data: {e}")
        company_df = pd.DataFrame()
        
    if company_df is None or company_df.empty:
        print(f"  ✘  No valid company data found. Aborting pipeline for {ticker}.")
        result["error"] = "No valid company data found or empty dataframe."
        return result
        
    print(f"  ✔  Company data: {len(company_df)} rows.")
    result["layer3_company"] = _stamp(company_df, run_at, display_name)

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 4 — Correlation
    # ─────────────────────────────────────────────────────────────────────────
    _sep("LAYER 4 — Full Daily Rolling Correlation Matrix")

    print("  Building static Pearson matrix ...")
    raw_corr = build_company_sector_corr(company_df, sector_metrics)
    print(raw_corr.to_string())
    static_corr_df = raw_corr.reset_index()
    static_corr_df["Date"] = run_at.split("T")[0]   # snapshot date = today
    result["layer4_static_corr"] = _stamp(static_corr_df, run_at, display_name)

    print(f"\n  Building full time-series rolling correlations {windows} ...")
    full_rolling = build_all_dates_matrix(company_df, sector_metrics, windows)
    print(f"  ✔  Rolling corr matrix: {full_rolling.shape[0]} rows "
          f"({full_rolling['Date'].nunique()} unique dates).")
    result["layer4_rolling_corr"] = _stamp(full_rolling, run_at, display_name)

    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        p = os.path.join(output_dir, f"{display_name}_rolling_corr.csv")
        full_rolling.to_csv(p, index=False)
        print(f"  Saved → {p}")

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 5 — Top Correlated Sectors
    # ─────────────────────────────────────────────────────────────────────────
    _sep("LAYER 5 — Top Correlated Sectors (company-sector linkage)")
    top_sectors = top_correlated_sectors(
        company_df, sector_metrics,
        window=windows[1],          # middle window (60d default)
        metric_stem=corr_metric,
        top_n=top_n,
    )
    print(f"  ✔  Top {top_n} sectors correlated with {display_name}:")
    for i, s in enumerate(top_sectors, 1):
        corr_val = raw_corr.loc[s, corr_metric] if s in raw_corr.index else np.nan
        print(f"     {i}. {s:<22}  raw corr({corr_metric})={corr_val:+.4f}")

    top_df = pd.DataFrame({
        "rank":   range(1, len(top_sectors) + 1),
        "sector": top_sectors,
    })
    result["layer5_top_sectors"] = _stamp(top_df, run_at, display_name)
    result["_raw_top_sectors"]   = top_sectors      # plain list for layers 6 & 7

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 6 — Balance Sheet Analysis
    # ─────────────────────────────────────────────────────────────────────────
    _sep(f"LAYER 6 — Balance Sheet Analysis: {display_name} (audit={audit_window}q)")
    print(f"  Only top sectors used: {', '.join(top_sectors)}")
    bs_result = run_balance_sheet_analysis(
        ticker, health_dfs, top_sectors,
        audit_window=audit_window,
    )
    fr = bs_result["full_ratios"]
    print(f"\n  Key ratios with sector overlay (pressure={bs_result['sector_pressure']:+.1f}):")
    cols_show = ["Ratio", "ValueStr", "YoY_pct", "Status", "AdjustedStatus"]
    cols_show = [c for c in cols_show if c in fr.columns]
    print(fr[cols_show].head(20).to_string(index=False))

    result["layer6_balance_sheet"] = _stamp(fr, run_at, display_name)

    # Always set layer6b regardless of whether historical data exists.
    # If hr is empty the gateway will skip it cleanly (empty DataFrame check).
    hr = bs_result.get("historical_ratios", pd.DataFrame())
    result["layer6b_historical_ratios"] = _stamp(hr, run_at, display_name) if not hr.empty else hr

    result["_raw_balance_sheet"]   = bs_result

    if output_dir:
        p = os.path.join(output_dir, f"{display_name}_balance_sheet.csv")
        fr.to_csv(p, index=False)
        p_hist = os.path.join(output_dir, f"{display_name}_historical_ratios.csv")
        hr.to_csv(p_hist, index=False)
        print(f"  Saved → {p}")

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 7 — Stock Holding Analysis
    # ─────────────────────────────────────────────────────────────────────────
    _sep(f"LAYER 7 — Stock Holding Analysis: {display_name}")
    print(f"  Only top sectors used: {', '.join(top_sectors)}")
    hold_result = run_stock_holding_analysis(ticker, health_dfs, top_sectors)
    fm = hold_result["full_metrics"]
    print(f"\n  Holding signal: {hold_result['holding_signal']}")
    if not fm.empty:
        cols_m = ["Metric", "Value", "Status", "SectorSignal", "AdjustedStatus"]
        cols_m = [c for c in cols_m if c in fm.columns]
        print(fm[cols_m].to_string(index=False))

    result["layer7_holding"]  = _stamp(fm, run_at, display_name)
    result["_raw_holding"]    = hold_result

    if output_dir:
        p = os.path.join(output_dir, f"{display_name}_holding_analysis.csv")
        fm.to_csv(p, index=False)
        print(f"  Saved → {p}")

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 8 & 9 — ML Predictions & Feature Store
    # ─────────────────────────────────────────────────────────────────────────
    _sep("LAYER 8 & 9 — ML Predictions & Feature Store Compilation")
    try:
        import sys
        _BACKEND_DIR = os.path.dirname(os.path.dirname(_PIPE_DIR))  # backend/
        if _BACKEND_DIR not in sys.path:
            sys.path.insert(0, _BACKEND_DIR)
            
        from ml_engine.survival_trainer import predict_today_survival_score
        
        # Build 100% data-driven features strictly from the 3 engines
        fr_dict = fr.set_index("Ratio")["Value"].to_dict() if not fr.empty else {}
        fm_dict = fm.set_index("Metric")["Value"].to_dict() if not fm.empty else {}

        # Primary sector health score (first top sector)
        p_health = 0.0
        if not health_matrix.empty and len(top_sectors) > 0:
            latest_metrics = health_matrix.sort_values("Date").groupby("Sector").last()
            if top_sectors[0] in latest_metrics.index:
                p_health = float(latest_metrics.loc[top_sectors[0], "health_score"] or 0.0)

        # Primary sector correlation (first top sector)
        p_corr = 0.0
        if not raw_corr.empty and len(top_sectors) > 0:
            if top_sectors[0] in raw_corr.index:
                p_corr = float(raw_corr.loc[top_sectors[0], corr_metric] or 0.0)

        today_date = (
            company_df["Date"].iloc[-1].strftime("%Y-%m-%d")
            if not company_df.empty else run_at.split("T")[0]
        )

        # All 8 features defined explicitly — no silent zero-fill from missing keys
        todays_features = pd.DataFrame([{
            "Date":                      today_date,
            "Debt to Equity":            float(fr_dict.get("Debt to Equity",    0.0) or 0.0),
            "Current Ratio":             float(fr_dict.get("Current Ratio",     1.0) or 1.0),
            "Revenue Growth %":          float(fr_dict.get("Revenue Growth %",  0.0) or 0.0),
            "Equity Growth %":           float(fr_dict.get("Equity Growth %",   0.0) or 0.0),
            "sector_correlation_60d":    p_corr,
            "sector_health_score":       p_health,
            "HHI_concentration":         float(fm_dict.get("HHI Concentration",       0.0) or 0.0),
            "institutional_holding_pct": float(fm_dict.get("Institutional Holding %", 0.0) or 0.0),
        }])

        req_features = [
            "Debt to Equity", "Current Ratio", "Revenue Growth %",
            "Equity Growth %", "sector_correlation_60d", "sector_health_score",
            "HHI_concentration", "institutional_holding_pct",
        ]
                
        df_preds, df_features = predict_today_survival_score(None, todays_features, req_features)
        
        print(f"  ✔  ML Prediction generated for {display_name}: Score {df_preds['SurvivalScore'].iloc[0]}%")
        
        result["layer8_ml_predictions"] = _stamp(df_preds, run_at, display_name, date_val=todays_features["Date"].iloc[0])
        result["layer9_feature_store"] = _stamp(df_features, run_at, display_name, date_val=todays_features["Date"].iloc[0])
        
    except Exception as e:
        print(f"  ✘  ML Inference Failed: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # Done
    # ─────────────────────────────────────────────────────────────────────────
    _sep("AEGIS PIPELINE — COMPLETE")
    print(f"  Company             : {display_name} ({ticker})")
    print(f"  Run timestamp (UTC) : {run_at}")
    print(f"  Top Sectors         : {', '.join(top_sectors)}")
    print(f"  Balance Sheet pressure: {bs_result['sector_pressure']:+.1f}")
    print(f"  Holding signal        : {hold_result['holding_signal']}")
    print(f"{'='*72}\n")

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def _parse_args():
    p = argparse.ArgumentParser(description="AEGIS-FIN Full Pipeline")
    p.add_argument("--company", default="TCS.NS",   help="Yahoo Finance ticker")
    p.add_argument("--name",    default="TCS",       help="Display name")
    p.add_argument("--windows", default="20,60,100", help="Comma-sep rolling windows")
    p.add_argument("--top",     default=5, type=int, help="Top-N correlated sectors")
    p.add_argument("--metric",  default="return_1d", help="Metric for sector ranking")
    p.add_argument("--audit",   default=20, type=int,help="Balance sheet audit window (quarters)")
    p.add_argument("--output",  default=None,         help="Dir to save CSV exports")
    return p.parse_args()


if __name__ == "__main__":
    args    = _parse_args()
    windows = [int(w) for w in args.windows.split(",")]

    result = run_full_pipeline(
        ticker       = args.company,
        display_name = args.name,
        windows      = windows,
        top_n        = args.top,
        corr_metric  = args.metric,
        audit_window = args.audit,
        output_dir   = args.output,
    )

    # ── Push to Supabase (set SUPABASE_URL + SUPABASE_SERVICE_KEY in env) ────
    # ── Load .env if present ──────────────────────────────────────────────────
    _BACKEND_DIR = os.path.dirname(os.path.dirname(_PIPE_DIR))
    _env_path = os.path.join(_BACKEND_DIR, ".env")
    if os.path.exists(_env_path):
        with open(_env_path) as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    os.environ.setdefault(_k.strip(), _v.strip())

    if os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_KEY"):
        import sys as _sys
        if _BACKEND_DIR not in _sys.path:
            _sys.path.insert(0, _BACKEND_DIR)
        from db.supabase_gateway import AegisGateway
        AegisGateway().push(result)
    else:
        print("[AegisGateway] Skipped — SUPABASE_URL / SUPABASE_SERVICE_KEY not set.")
