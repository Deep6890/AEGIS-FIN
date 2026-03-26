"""
common_engine.py
────────────────
Shared metric calculations used by both sector_engine and company_engine.
Input DataFrame must have OHLCV columns and a Date column (or Date index).
"""

import numpy as np
import pandas as pd


def calculate_common_metrics(df: pd.DataFrame, prefix: str = "") -> pd.DataFrame:
    """
    Compute the standard AEGIS metric set on any OHLCV DataFrame.

    Parameters
    ----------
    df     : pd.DataFrame   OHLCV data with Date as a column or index.
    prefix : str            Column prefix, e.g. 'sector_' or 'company_'.

    Returns
    -------
    pd.DataFrame with the original columns plus all computed metric columns.
    """
    df = df.copy()

    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(df["Date"])
        df = df.sort_values("Date").set_index("Date")

    # ── Returns ───────────────────────────────────────────────────────────────
    df[f"{prefix}return_1d"]  = df["Close"].pct_change(1)
    df[f"{prefix}return_5d"]  = df["Close"].pct_change(5)
    df[f"{prefix}return_20d"] = df["Close"].pct_change(20)

    # ── Volatility (20-day rolling std of daily returns) ──────────────────────
    df[f"{prefix}volatility_20d"] = df[f"{prefix}return_1d"].rolling(20).std()

    # ── ATR (Average True Range, 14-day) ─────────────────────────────────────
    if "High" in df.columns and "Low" in df.columns:
        high_low   = df["High"] - df["Low"]
        high_close = np.abs(df["High"] - df["Close"].shift())
        low_close  = np.abs(df["Low"]  - df["Close"].shift())
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        df[f"{prefix}atr"] = true_range.rolling(14).mean()
    else:
        df[f"{prefix}atr"] = np.nan

    # ── Drawdown (20-day rolling max drawdown) ────────────────────────────────
    rolling_max = df["Close"].rolling(20).max()
    df[f"{prefix}drawdown_20d"] = (df["Close"] - rolling_max) / rolling_max

    # ── Volume Ratio (current / 20-day average) ───────────────────────────────
    if "Volume" in df.columns:
        avg_vol = df["Volume"].rolling(20).mean()
        df[f"{prefix}volume_ratio"] = np.where(avg_vol > 0, df["Volume"] / avg_vol, np.nan)
    else:
        df[f"{prefix}volume_ratio"] = np.nan

    # ── Momentum (EMA10 − EMA20) ──────────────────────────────────────────────
    ema10 = df["Close"].ewm(span=10, adjust=False).mean()
    ema20 = df["Close"].ewm(span=20, adjust=False).mean()
    df[f"{prefix}momentum"] = ema10 - ema20

    # ── Trend (direction of momentum) ─────────────────────────────────────────
    df[f"{prefix}trend"] = np.where(df[f"{prefix}momentum"] > 0, "Upward", "Downward")

    return df
