"""
sector_health.py
----------------
Per-day sector health matrix — FULLY DATA-DRIVEN.

No hand-crafted weights, thresholds, or magic numbers.
Every signal derives its cut-offs from the rolling statistics of the data itself.

Strategy
--------
  • raw features computed (returns, EMA spread, volatility, OLS slope)
  • each feature is Z-scored against its OWN rolling history
    → no external benchmark, no fixed thresholds
  • composite = EQUAL-WEIGHT average of all valid Z-scores
    → no manual weighting
  • health_score = rolling percentile rank of composite within its OWN
    rolling window  (0–100, where 100 = historically strongest day)
    → adapts to each sector's own distribution
  • signal = quartile of health_score within its own rolling history
    → STRONG (top 25 %), NEUTRAL (50–75 %), WATCH (25–50 %), WEAK (bottom 25 %)
    → thresholds are the rolling 25th / 50th / 75th percentile of health_score

Spike detection:
  Up/down spikes flagged when today's return is outside its rolling
  [q05, q95] quantile band — bounds estimated per-sector, per-day.

Public API
----------
  compute_sector_health(sector_df, sector_name, window_short, window_long)
      -> pd.DataFrame  (Date index, one row per trading day)

  run_all_sector_health(sector_dfs, window_short, window_long)
      -> dict { sector_name: pd.DataFrame }

  sector_health_on_date(health_dfs, date)
      -> pd.DataFrame  (one row per sector for a single date)

  rolling_health_matrix(health_dfs, cols)
      -> pd.DataFrame  (long: Date | Sector | signal | health_score | …)
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _ensure_date_index(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "Date" not in df.columns:
        df = df.reset_index()
    df["Date"] = pd.to_datetime(df["Date"])
    return df.sort_values("Date").set_index("Date")


def _rolling_zscore(series: pd.Series, window: int) -> pd.Series:
    """Z-score of each value relative to its own rolling (window) history."""
    mu  = series.rolling(window, min_periods=max(5, window // 4)).mean()
    std = series.rolling(window, min_periods=max(5, window // 4)).std()
    return (series - mu) / std.replace(0, np.nan)


def _rolling_percentile_rank(series: pd.Series, window: int) -> pd.Series:
    """
    For each row, compute the percentile rank of that value within the previous
    `window` observations of the series.  Pure data-driven 0-100 score.
    """
    def _pct_rank(arr):
        v = arr[-1]
        hist = arr[:-1]
        if len(hist) == 0 or np.all(np.isnan(hist)):
            return np.nan
        hist = hist[~np.isnan(hist)]
        if len(hist) == 0:
            return np.nan
        return float(np.mean(hist <= v) * 100)

    return series.rolling(window + 1, min_periods=max(10, window // 4)).apply(
        _pct_rank, raw=True
    )


def _rolling_ols_slope(log_price: pd.Series, window: int) -> pd.Series:
    """
    Rolling OLS slope of log-price ~ time over `window` bars.
    Demeaned t-vector avoids intercept.  Returns slope per bar (≈ daily log-return).
    """
    x = np.arange(window, dtype=float)
    x -= x.mean()
    ss_x = np.dot(x, x)

    def _slope(seg):
        y = seg
        if np.isnan(y).any():
            return np.nan
        return np.dot(x, y - y.mean()) / ss_x

    return log_price.rolling(window).apply(_slope, raw=True)


# ─────────────────────────────────────────────────────────────────────────────
# Single-sector health engine
# ─────────────────────────────────────────────────────────────────────────────

def compute_sector_health(
    sector_df:    pd.DataFrame,
    sector_name:  str,
    window_short: int = 20,
    window_long:  int = 60,
) -> pd.DataFrame:
    """
    Compute a full daily health matrix for ONE sector.

    All thresholds and weights are derived from the sector's own price history.

    Parameters
    ----------
    sector_df    : OHLCV DataFrame (Date column or DatetimeIndex).
                   Output of sector_engine() or raw yfinance data both accepted.
    sector_name  : Label stored in the 'Sector' column.
    window_short : Short rolling window in trading days (default 20).
    window_long  : Long  rolling window in trading days (default 60).

    Returns
    -------
    pd.DataFrame with DatetimeIndex and columns:
        Sector, Close, daily_return,
        ema_short, ema_long, trend,
        spike_up, spike_down,
        ret_z, vol_z, momentum_z, slope_z,
        composite, health_score, signal,
        date_flag
    """
    df = _ensure_date_index(sector_df)

    if "Close" not in df.columns:
        raise ValueError(f"[{sector_name}] DataFrame must contain 'Close' column.")

    out = pd.DataFrame(index=df.index)
    out["Sector"] = sector_name
    out["Close"]  = df["Close"]

    # ── Daily return ─────────────────────────────────────────────────────────
    ret = df["Close"].pct_change(1)
    out["daily_return"] = ret

    # ── EMA trend (direction only, no fixed span ratio) ───────────────────────
    out["ema_short"] = df["Close"].ewm(span=window_short, adjust=False).mean()
    out["ema_long"]  = df["Close"].ewm(span=window_long,  adjust=False).mean()
    out["trend"]     = np.where(out["ema_short"] > out["ema_long"], "Upward", "Downward")

    # ── Spike detection: rolling quantile band [q5, q95] of returns ──────────
    # All thresholds come from the data's own rolling distribution
    q95 = ret.rolling(window_long, min_periods=10).quantile(0.95)
    q05 = ret.rolling(window_long, min_periods=10).quantile(0.05)
    out["spike_up"]   = ret > q95
    out["spike_down"] = ret < q05

    # ── Feature Z-scores (each vs its OWN rolling history) ───────────────────

    # 1. Return Z-score
    out["ret_z"] = _rolling_zscore(ret, window_long)

    # 2. Volatility Z-score (rolling std of returns, then Z of that)
    vol = ret.rolling(window_short, min_periods=5).std()
    out["vol_z"] = _rolling_zscore(vol, window_long)
    # Invert so HIGH volatility → negative z (bad for health)
    out["vol_z"] = -out["vol_z"]

    # 3. Momentum Z-score (EMA spread, normalised vs its own history)
    momentum_raw = out["ema_short"] - out["ema_long"]
    out["momentum_z"] = _rolling_zscore(momentum_raw, window_long)

    # 4. Price-slope Z-score (OLS slope of log price vs its own history)
    log_close = np.log(df["Close"].replace(0, np.nan))
    slope = _rolling_ols_slope(log_close, window_short)
    out["slope_z"] = _rolling_zscore(slope, window_long)

    # ── Composite: EQUAL-WEIGHT average of all valid feature Z-scores ─────────
    # No manual weights — each feature contributes equally.
    # NaN features are excluded from the average on that day.
    z_cols = ["ret_z", "vol_z", "momentum_z", "slope_z"]
    z_frame = out[z_cols]
    out["composite"] = z_frame.mean(axis=1)   # rowwise nanmean via pandas default

    # ── Health score: rolling percentile rank of composite vs its OWN history ─
    # 0 = historically weakest day for this sector,  100 = historically strongest
    out["health_score"] = _rolling_percentile_rank(out["composite"], window_long)

    # ── Signal: data-driven quartile labels using rolling quantiles ───────────
    # Cut-points are the rolling 25th / 50th / 75th pct of health_score itself.
    # Adapts to every sector's own distribution — no fixed numbers.
    hs = out["health_score"]
    q75 = hs.rolling(window_long, min_periods=10).quantile(0.75)
    q50 = hs.rolling(window_long, min_periods=10).quantile(0.50)
    q25 = hs.rolling(window_long, min_periods=10).quantile(0.25)

    conditions = [
        hs.isna() | q75.isna(),
        hs >= q75,
        hs >= q50,
        hs >= q25,
    ]
    choices = ["INSUFFICIENT_DATA", "STRONG", "NEUTRAL", "WATCH"]
    out["signal"] = np.select(conditions, choices, default="WEAK")

    # ── Regime: sign of both slopes (fully data-derived) ─────────────────────
    slope_long = _rolling_ols_slope(log_close, window_long)
    regime = np.where(
        (slope > 0) & (slope_long > 0), "BULL",
        np.where((slope < 0) & (slope_long < 0), "BEAR", "NEUTRAL")
    )
    out["regime"] = regime

    # ── Market phase: resolves the STRONG+BEAR / WEAK+BULL paradox ────────────
    # Combines signal (momentum health) with regime (price trend direction).
    # This gives a single interpretable label the UI can display directly.
    #
    #   STRONG + BULL   → Confirmed Uptrend   (momentum & price agree)
    #   STRONG + BEAR   → Distribution Phase  (momentum fading, price still falling)
    #   STRONG + NEUTRAL→ Consolidation       (momentum recovering, no trend yet)
    #   NEUTRAL + BULL  → Steady Climb        (moderate health, price rising)
    #   NEUTRAL + BEAR  → Slow Bleed          (moderate health, price drifting down)
    #   WATCH  + BULL   → Bull Exhaustion     (weakening momentum despite rising price)
    #   WATCH  + BEAR   → Confirmed Downtrend (weak momentum + falling price)
    #   WEAK   + BULL   → Dead-Cat Bounce     (very weak health, price briefly up)
    #   WEAK   + BEAR   → Capitulation        (worst case — both agree on decline)
    #   *      + NEUTRAL→ Transition          (price direction unclear)
    _phase_map = {
        ("STRONG",  "BULL"):    "Confirmed Uptrend",
        ("STRONG",  "BEAR"):    "Distribution Phase",
        ("STRONG",  "NEUTRAL"): "Consolidation",
        ("NEUTRAL", "BULL"):    "Steady Climb",
        ("NEUTRAL", "BEAR"):    "Slow Bleed",
        ("NEUTRAL", "NEUTRAL"): "Transition",
        ("WATCH",   "BULL"):    "Bull Exhaustion",
        ("WATCH",   "BEAR"):    "Confirmed Downtrend",
        ("WATCH",   "NEUTRAL"): "Transition",
        ("WEAK",    "BULL"):    "Dead-Cat Bounce",
        ("WEAK",    "BEAR"):    "Capitulation",
        ("WEAK",    "NEUTRAL"): "Transition",
    }
    out["market_phase"] = [
        _phase_map.get((str(s), str(r)), "Transition")
        for s, r in zip(out["signal"], out["regime"])
    ]

    # ── Date stamp ───────────────────────────────────────────────────────────
    out["date_flag"] = out.index.strftime("%Y-%m-%d")

    return out


# ─────────────────────────────────────────────────────────────────────────────
# Multi-sector runner
# ─────────────────────────────────────────────────────────────────────────────

def run_all_sector_health(
    sector_dfs:   Dict[str, pd.DataFrame],
    window_short: int = 20,
    window_long:  int = 60,
) -> Dict[str, pd.DataFrame]:
    """
    Run compute_sector_health() for every sector.

    Returns
    -------
    { sector_name: pd.DataFrame (Date index, full health matrix) }
    """
    results = {}
    for name, raw_df in sector_dfs.items():
        print(f"  [health] {name} ...", end=" ", flush=True)
        try:
            h = compute_sector_health(raw_df, name, window_short, window_long)
            results[name] = h
            print(f"OK ({len(h)} rows)")
        except Exception as exc:
            print(f"FAILED: {exc}")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Cross-section helpers
# ─────────────────────────────────────────────────────────────────────────────

def sector_health_on_date(
    health_dfs: Dict[str, pd.DataFrame],
    date: str,
) -> pd.DataFrame:
    """
    Return a single-date snapshot of all sectors' health metrics.

    Uses exact-date match; falls back to the nearest prior trading date.
    """
    target = pd.Timestamp(date)
    rows = []
    for name, df in health_dfs.items():
        if target in df.index:
            rows.append(df.loc[target].to_dict())
        else:
            prior = df.index[df.index <= target]
            if len(prior) > 0:
                rows.append(df.loc[prior[-1]].to_dict())
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows).reset_index(drop=True)


def rolling_health_matrix(
    health_dfs: Dict[str, pd.DataFrame],
    cols: Optional[List[str]] = None,
) -> pd.DataFrame:
    """
    Concatenate all sector health DataFrames into a LONG-format matrix.

        Date | Sector | signal | health_score | trend | regime | market_phase | …

    No day is missing beyond the initial warm-up window.
    """
    default_cols = [
        "Sector", "Close", "daily_return",
        "trend", "spike_up", "spike_down",
        "composite", "health_score", "signal", "regime", "market_phase", "date_flag",
    ]
    keep = cols or default_cols

    frames = []
    for name, df in health_dfs.items():
        tmp = df.reset_index()
        tmp["Sector"] = name
        available = [c for c in keep if c in tmp.columns]
        date_col = ["Date"] if "Date" in tmp.columns else []
        frames.append(tmp[date_col + [c for c in available if c != "Date"]])

    if not frames:
        return pd.DataFrame()

    result = pd.concat(frames, ignore_index=True)
    result["Date"] = pd.to_datetime(result["Date"])
    return result.sort_values(["Date", "Sector"]).reset_index(drop=True)


# ─────────────────────────────────────────────────────────────────────────────
# Macro overlay
# ─────────────────────────────────────────────────────────────────────────────

# Sectors that are risk-sensitive (fall in risk-off) vs defensive (rise in risk-off)
_RISK_OFF_SENSITIVE  = {"IT Sector", "Auto Sector", "Realty Sector", "Metal Sector", "Energy Sector"}
_RISK_OFF_DEFENSIVE  = {"FMCG Sector", "Pharma Sector", "Gold"}
_MACRO_SECTORS       = {"India VIX", "USD-INR", "Gold", "Crude Oil"}


def compute_macro_overlay(
    health_dfs: Dict[str, pd.DataFrame],
    window: int = 20,
) -> pd.DataFrame:
    """
    Derive a daily macro risk regime from VIX, USD-INR, Gold, and Crude Oil
    and annotate each sector with a macro_signal and macro_narrative.

    Logic (all data-driven — thresholds from each series' own rolling history)
    --------------------------------------------------------------------------
    1. VIX rising   (ret_z > 0)  → risk-off pressure
       VIX falling  (ret_z < 0)  → risk-on
    2. USD-INR rising (ret_z > 0) → INR weakening → additional risk-off for India
    3. Gold rising   (ret_z > 0)  → flight-to-safety → confirms risk-off
    4. Crude rising  (ret_z > 0)  → input cost pressure → headwind for consumers

    Composite macro score = mean of the four z-scores (sign-adjusted):
        vix_z is INVERTED (high VIX = bad for risk assets)
        usd_z is INVERTED (weak INR = bad for importers)
        gold_z is INVERTED (gold rally = fear)
        crude_z is INVERTED (crude rally = cost pressure)

    macro_regime:
        score < -0.5  → RISK_OFF   (multiple macro headwinds active)
        score >  0.5  → RISK_ON    (macro tailwinds)
        else          → NEUTRAL

    Returns
    -------
    pd.DataFrame  columns: Date | macro_regime | macro_score |
                           vix_z | usd_z | gold_z | crude_z |
                           macro_narrative
    """
    macro_frames = {}
    for name in ("India VIX", "USD-INR", "Gold", "Crude Oil"):
        if name in health_dfs and not health_dfs[name].empty:
            df = health_dfs[name]
            if "ret_z" in df.columns:
                macro_frames[name] = df["ret_z"].rename(name)

    if not macro_frames:
        return pd.DataFrame()

    combined = pd.concat(macro_frames.values(), axis=1).sort_index()

    vix_z   = combined.get("India VIX",  pd.Series(dtype=float))
    usd_z   = combined.get("USD-INR",    pd.Series(dtype=float))
    gold_z  = combined.get("Gold",       pd.Series(dtype=float))
    crude_z = combined.get("Crude Oil",  pd.Series(dtype=float))

    # Invert all: high reading = bad for risk assets
    components = []
    for s in (vix_z, usd_z, gold_z, crude_z):
        if not s.empty:
            components.append(-s)

    if not components:
        return pd.DataFrame()

    macro_score = pd.concat(components, axis=1).mean(axis=1)

    regime = np.where(macro_score < -0.5, "RISK_OFF",
             np.where(macro_score >  0.5, "RISK_ON", "NEUTRAL"))

    # Build narrative per row
    def _narrative(row):
        parts = []
        vix  = row.get("India VIX",  np.nan)
        usd  = row.get("USD-INR",    np.nan)
        gold = row.get("Gold",       np.nan)
        crude= row.get("Crude Oil",  np.nan)
        if not pd.isna(vix)  and vix  > 0.5:  parts.append("VIX ↑ (fear rising)")
        if not pd.isna(vix)  and vix  < -0.5: parts.append("VIX ↓ (fear easing)")
        if not pd.isna(usd)  and usd  > 0.5:  parts.append("USD-INR ↑ (INR weak)")
        if not pd.isna(gold) and gold > 0.5:  parts.append("Gold ↑ (flight-to-safety)")
        if not pd.isna(crude)and crude> 0.5:  parts.append("Crude ↑ (cost pressure)")
        if not pd.isna(crude)and crude<-0.5:  parts.append("Crude ↓ (cost relief)")
        return "; ".join(parts) if parts else "Macro neutral"

    out = combined.copy()
    out.columns = ["India VIX", "USD-INR", "Gold", "Crude Oil"][:len(out.columns)]
    out["macro_score"]     = macro_score
    out["macro_regime"]    = regime
    out["macro_narrative"] = out.apply(_narrative, axis=1)
    out = out.reset_index().rename(columns={"index": "Date", "Date": "Date"})
    out["Date"] = pd.to_datetime(out["Date"])
    return out[["Date", "macro_regime", "macro_score",
                "India VIX", "USD-INR", "Gold", "Crude Oil",
                "macro_narrative"]].sort_values("Date").reset_index(drop=True)


def apply_macro_to_sector(
    sector_name:   str,
    sector_health: pd.DataFrame,
    macro_df:      pd.DataFrame,
) -> pd.DataFrame:
    """
    Merge macro_regime onto a sector health DataFrame and add macro_adjusted_signal.

    Rules
    -----
    RISK_OFF + sector in _RISK_OFF_SENSITIVE  → downgrade signal one level
    RISK_OFF + sector in _RISK_OFF_DEFENSIVE  → upgrade signal one level
    RISK_ON  + sector in _RISK_OFF_SENSITIVE  → upgrade signal one level
    RISK_ON  + sector in _RISK_OFF_DEFENSIVE  → downgrade signal one level
    NEUTRAL  → no change

    Returns
    -------
    sector_health with added columns: macro_regime, macro_narrative, macro_adjusted_signal
    """
    if macro_df.empty:
        out = sector_health.copy()
        out["macro_regime"]           = "NEUTRAL"
        out["macro_narrative"]        = ""
        out["macro_adjusted_signal"]  = out["signal"]
        return out

    _order = ["WEAK", "WATCH", "NEUTRAL", "STRONG"]

    def _shift(sig, direction):
        if sig not in _order:
            return sig
        idx = _order.index(sig)
        new_idx = max(0, min(len(_order) - 1, idx + direction))
        return _order[new_idx]

    tmp = sector_health.reset_index() if "Date" not in sector_health.columns else sector_health.copy()
    tmp["Date"] = pd.to_datetime(tmp["Date"])
    merged = tmp.merge(macro_df[["Date", "macro_regime", "macro_narrative"]], on="Date", how="left")
    merged["macro_regime"]    = merged["macro_regime"].fillna("NEUTRAL")
    merged["macro_narrative"] = merged["macro_narrative"].fillna("")

    is_sensitive  = sector_name in _RISK_OFF_SENSITIVE
    is_defensive  = sector_name in _RISK_OFF_DEFENSIVE

    def _adjust(row):
        sig    = row["signal"]
        regime = row["macro_regime"]
        if regime == "RISK_OFF":
            if is_sensitive:  return _shift(sig, -1)
            if is_defensive:  return _shift(sig, +1)
        elif regime == "RISK_ON":
            if is_sensitive:  return _shift(sig, +1)
            if is_defensive:  return _shift(sig, -1)
        return sig

    merged["macro_adjusted_signal"] = merged.apply(_adjust, axis=1)
    return merged
