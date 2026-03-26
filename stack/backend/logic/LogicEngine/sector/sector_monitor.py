"""
sector_monitor.py
-----------------
Runs the EXACT TrendCaster engine pipeline on two separate groups:

  MACRO  : Nifty, Sensex, Gold, Crude Oil, USD-INR, India VIX
           → tells you the market environment (risk-on / risk-off)

  SECTORS: Bank Nifty, IT, Auto, Metal, Realty, FMCG, Pharma, Energy
           → tells you which sector to be in

Cross-reference logic:
  - macro_score  = mean composite_score of all macro assets
  - sector_score = each sector's own composite_score
  - adjusted_score = sector_score - macro_score
      → positive = sector is outperforming the macro environment
      → negative = sector is just riding the macro wave (not trustable)

Trust signal uses composite_score history (20d vs 5d) with adaptive thresholds.

Public API
----------
  run_sector_monitor(macro_dfs, sector_dfs)  ->  dict with keys:
      "macro"    : pd.DataFrame  (macro asset states)
      "sectors"  : pd.DataFrame  (sector states + adjusted score)
      "macro_score" : float      (overall market environment score)
"""

import sys
import os
import numpy as np
import pandas as pd
from typing import Dict, Tuple

# ── Import EXACT TrendCaster engine + cleaner ─────────────────────────────────
# Resolve TrendCaster path via env var, then common sibling dirs, then the
# hard-coded fallback so the module still works in the original layout.
import os as _os
_TC_LOGIC_CANDIDATES = [
    _os.environ.get("TRENDCASTER_LOGIC", ""),
    _os.path.join("E:\\", "TrendCaster", "Backend", "Logic"),
    _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))),
                  "..", "..", "..", "TrendCaster", "Backend", "Logic"),
]

_TC_LOADED = False
for _tc in _TC_LOGIC_CANDIDATES:
    if not _tc or not _os.path.isdir(_tc):
        continue
    for _sub in [_tc, _os.path.join(_tc, "engine2"), _os.path.join(_tc, "processor")]:
        if _sub not in sys.path:
            sys.path.insert(0, _sub)
    try:
        from engine  import engine                                        # engine2/engine.py
        from cleaner import normalize_features, create_composite_score   # processor/cleaner.py
        _TC_LOADED = True
        break
    except ImportError:
        pass
    if _TC_LOADED:
        break

if not _TC_LOADED:
    raise ImportError(
        "Could not import TrendCaster engine/cleaner.  "
        "Set the TRENDCASTER_LOGIC environment variable to the path of "
        "TrendCaster/Backend/Logic or ensure E:\\TrendCaster\\Backend\\Logic exists."
    )


# ── Single asset pipeline ─────────────────────────────────────────────────────

def _run_pipeline(raw_df: pd.DataFrame, name: str) -> pd.DataFrame:
    """
    Full TrendCaster pipeline for one asset:
      clean → engine → normalize_features → create_composite_score
    Returns the full history DataFrame, integer-indexed, with daily_return merged.
    Returns empty DataFrame on failure.
    """
    df = raw_df.copy()
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values("Date").reset_index(drop=True)
    df["daily_return"] = df["Close"].pct_change(1)

    signals = engine(df[["Date", "Close"]].copy(), name)
    signals = normalize_features(signals)
    signals = create_composite_score(signals)
    signals = signals.dropna(subset=["composite_score"]).reset_index(drop=True)

    if signals.empty:
        return pd.DataFrame()

    signals["Date"] = pd.to_datetime(signals["Date"])
    signals = signals.merge(df[["Date", "daily_return"]], on="Date", how="left")
    return signals


# ── Trust signal ──────────────────────────────────────────────────────────────

def _trust_signal(composite: pd.Series, window: int = 20) -> pd.Series:
    """
    Adaptive thresholds: ±0.25 * std of the series.
    Operates on a clean integer-indexed Series.
    """
    s      = composite.reset_index(drop=True)
    std    = s.std()
    hi     =  0.25 * std
    lo     = -0.25 * std
    m20    = s.rolling(window).mean()
    m5     = s.rolling(5).mean()

    out = []
    for i in range(len(s)):
        v20, v5 = m20.iloc[i], m5.iloc[i]
        if pd.isna(v20) or pd.isna(v5):
            out.append("INSUFFICIENT_DATA")
        elif v20 > hi and v5 < lo:
            out.append("WATCH")     # was strong 20d, now turning down
        elif v20 > hi and v5 > hi:
            out.append("STRONG")
        elif v20 < lo:
            out.append("WEAK")
        else:
            out.append("NEUTRAL")

    return pd.Series(out)


# ── Snapshot builder ──────────────────────────────────────────────────────────

def _latest_snapshot(name: str, history: pd.DataFrame) -> dict:
    """Extract the latest-row snapshot dict from a full history DataFrame."""
    latest = history.iloc[-1]
    dr     = latest["daily_return"]
    return {
        "name":                name,
        "date":                latest["Date"],
        "daily_return_pct":    round(float(dr) * 100, 3) if pd.notna(dr) else None,
        "daily_status":        "UP" if pd.notna(dr) and dr >= 0 else "DOWN",
        "trend_strength_z":    round(float(latest["trend_strength_z"]), 4),
        "trend_consistency_z": round(float(latest["trend_consistency_z"]), 4),
        "volatility_regime_z": round(float(latest["volatility_regime_z"]), 4),
        "momentum_accel_z":    round(float(latest["momentum_acceleration_z"]), 4),
        "cycle_position_z":    round(float(latest["cycle_position_z"]), 4),
        "composite_score":     round(float(latest["composite_score"]), 4),
        "trust_signal":        latest["trust_signal"],
    }


# ── Main monitor ──────────────────────────────────────────────────────────────

def run_sector_monitor(
    macro_dfs:  Dict[str, pd.DataFrame],
    sector_dfs: Dict[str, pd.DataFrame],
) -> dict:
    """
    Parameters
    ----------
    macro_dfs  : { name: raw_ohlcv_df }  — macro assets (Nifty, Gold, VIX …)
    sector_dfs : { name: raw_ohlcv_df }  — investable sectors (IT, Bank …)

    Returns
    -------
    {
      "macro_score" : float,           overall macro environment score
      "macro"       : pd.DataFrame,    one row per macro asset
      "sectors"     : pd.DataFrame,    one row per sector + adjusted_score + rank
    }
    """

    # ── 1. Run pipeline on all macro assets ──────────────────────────────────
    macro_rows = []
    for name, raw_df in macro_dfs.items():
        try:
            hist = _run_pipeline(raw_df, name)
            if hist.empty:
                continue
            hist["trust_signal"] = _trust_signal(hist["composite_score"]).values
            macro_rows.append(_latest_snapshot(name, hist))
        except Exception as e:
            print(f"  [macro] FAILED {name}: {e}")

    macro_df = pd.DataFrame(macro_rows) if macro_rows else pd.DataFrame()

    # macro_score = mean composite across all macro assets (market environment)
    macro_score = round(float(macro_df["composite_score"].mean()), 4) \
                  if not macro_df.empty else 0.0

    # ── 2. Run pipeline on all sectors ───────────────────────────────────────
    sector_rows = []
    for name, raw_df in sector_dfs.items():
        try:
            hist = _run_pipeline(raw_df, name)
            if hist.empty:
                continue
            hist["trust_signal"] = _trust_signal(hist["composite_score"]).values
            snap = _latest_snapshot(name, hist)

            # adjusted_score: how much is this sector outperforming the macro env?
            snap["adjusted_score"] = round(snap["composite_score"] - macro_score, 4)
            sector_rows.append(snap)
        except Exception as e:
            print(f"  [sector] FAILED {name}: {e}")

    sectors_df = pd.DataFrame(sector_rows) if sector_rows else pd.DataFrame()

    if not sectors_df.empty:
        # Rank by adjusted_score — sectors genuinely outperforming macro rank higher
        sectors_df["rank"] = sectors_df["adjusted_score"].rank(
            ascending=False, method="dense"
        ).astype(int)
        sectors_df = sectors_df.sort_values("rank").reset_index(drop=True)

    return {
        "macro_score": macro_score,
        "macro":       macro_df,
        "sectors":     sectors_df,
    }


# ── Pretty printer ────────────────────────────────────────────────────────────

def print_sector_monitor(result: dict):
    macro_df   = result["macro"]
    sectors_df = result["sectors"]
    macro_score = result["macro_score"]

    # ── Macro environment ─────────────────────────────────────────────────────
    print(f"\n{'='*72}")
    env = "RISK-ON 🟢" if macro_score > 0 else "RISK-OFF 🔴"
    print(f"  MACRO ENVIRONMENT  —  score={macro_score:+.4f}  [{env}]")
    print(f"{'='*72}")

    if not macro_df.empty:
        print(f"  {'Asset':<16} {'Status':<6} {'Return%':<9} {'Score':<9} {'Trust'}")
        print("  " + "-" * 60)
        for _, row in macro_df.iterrows():
            icon = "▲" if row["daily_status"] == "UP" else "▼"
            ret  = f"{row['daily_return_pct']:>+7.3f}%" if row["daily_return_pct"] is not None else "    N/A"
            print(
                f"  {row['name']:<16} "
                f"{icon} {row['daily_status']:<4} "
                f"{ret}  "
                f"{row['composite_score']:>+7.4f}  "
                f"{row['trust_signal']}"
            )

    # ── Sector ranking ────────────────────────────────────────────────────────
    if not sectors_df.empty:
        date = sectors_df["date"].iloc[0]
        print(f"\n{'='*72}")
        print(f"  SECTOR MONITOR  —  {date}")
        print(f"  (adjusted_score = sector_score - macro_score={macro_score:+.4f})")
        print(f"{'='*72}")
        print(f"  {'Rank':<5} {'Sector':<18} {'Status':<6} {'Return%':<9} "
              f"{'Score':<9} {'Adj.Score':<11} {'Trust'}")
        print("  " + "-" * 68)

        for _, row in sectors_df.iterrows():
            icon = "▲" if row["daily_status"] == "UP" else "▼"
            ret  = f"{row['daily_return_pct']:>+7.3f}%" if row["daily_return_pct"] is not None else "    N/A"
            print(
                f"  {int(row['rank']):<5} "
                f"{row['name']:<18} "
                f"{icon} {row['daily_status']:<4} "
                f"{ret}  "
                f"{row['composite_score']:>+7.4f}  "
                f"{row['adjusted_score']:>+9.4f}  "
                f"{row['trust_signal']}"
            )

        print(f"\n{'─'*72}")
        strong = sectors_df[sectors_df["trust_signal"] == "STRONG"]["name"].tolist()
        watch  = sectors_df[sectors_df["trust_signal"] == "WATCH"]["name"].tolist()
        weak   = sectors_df[sectors_df["trust_signal"] == "WEAK"]["name"].tolist()

        if strong: print(f"  ✅ STRONG : {', '.join(strong)}")
        if watch:  print(f"  ⚠️  WATCH  : {', '.join(watch)}  ← was strong 20d, now turning down")
        if weak:   print(f"  ❌ WEAK   : {', '.join(weak)}")

    print(f"{'='*72}\n")
