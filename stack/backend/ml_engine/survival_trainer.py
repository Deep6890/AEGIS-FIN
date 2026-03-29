"""
survival_trainer.py  v2.0
--------------------------
Predicts company survival score (0-100) using:
  - Saved trained model (model.joblib) if available
  - Rule-based fallback using actual feature values if no model yet

Model is trained separately via train_model.py (weekly via GitHub Actions).
"""
import pandas as pd
import numpy as np
from pathlib import Path
import joblib, json

_MODEL_PATH = Path(__file__).parent / "model.joblib"
_META_PATH  = Path(__file__).parent / "model_meta.json"


def _load_model():
    if _MODEL_PATH.exists():
        try:
            return joblib.load(_MODEL_PATH)
        except Exception:
            pass
    return None


def _get_model_version() -> str:
    if _META_PATH.exists():
        try:
            with open(_META_PATH) as f:
                return json.load(f).get("model_version", "v1.0")
        except Exception:
            pass
    return "v1.0"


def _rule_based_probs(X: pd.DataFrame) -> np.ndarray:
    """
    Compute distress probability from feature values when no trained model exists.
    Base = 30%. Each feature shifts it up or down. Clipped to [5%, 95%].
    """
    probs = []
    for _, row in X.iterrows():
        de     = float(row.get("Debt to Equity",            0) or 0)
        cr     = float(row.get("Current Ratio",             1) or 1)
        rev_g  = float(row.get("Revenue Growth %",          0) or 0)
        eq_g   = float(row.get("Equity Growth %",           0) or 0)
        corr   = float(row.get("sector_correlation_60d",    0) or 0)
        health = float(row.get("sector_health_score",      50) or 50)
        hhi    = float(row.get("HHI_concentration",         0) or 0)
        inst   = float(row.get("institutional_holding_pct", 0) or 0)

        risk = 0.30
        if   de > 3.0:  risk += 0.15
        elif de > 2.0:  risk += 0.08
        elif de > 1.0:  risk += 0.03
        elif de < 0.5:  risk -= 0.08

        if   cr < 0.8:  risk += 0.12
        elif cr < 1.2:  risk += 0.05
        elif cr > 2.0:  risk -= 0.08

        if   rev_g < -20: risk += 0.12
        elif rev_g <   0: risk += 0.05
        elif rev_g >  40: risk -= 0.12
        elif rev_g >  20: risk -= 0.08

        if   eq_g < -15: risk += 0.10
        elif eq_g <   0: risk += 0.04
        elif eq_g >  15: risk -= 0.06

        if   corr < -0.5: risk += 0.08
        elif corr < -0.2: risk += 0.03
        elif corr >  0.5: risk -= 0.05

        if   health < 25: risk += 0.10
        elif health < 50: risk += 0.04
        elif health > 75: risk -= 0.08

        if   hhi > 0.7: risk += 0.08
        elif hhi > 0.5: risk += 0.04
        elif hhi < 0.2: risk -= 0.05

        if   inst < 0.05: risk += 0.08
        elif inst < 0.15: risk += 0.03
        elif inst > 0.40: risk -= 0.08

        probs.append(float(np.clip(risk, 0.05, 0.95)))
    return np.array(probs)


def predict_today_survival_score(model, todays_features: pd.DataFrame, features: list):
    """
    Returns (predictions_df, feature_store_df) ready for Supabase.
    `model` param kept for API compatibility — we always load from disk.
    """
    saved_model   = _load_model()
    model_version = _get_model_version()
    X_today       = todays_features[features].copy().fillna(0)

    if saved_model is not None:
        X_mapped = pd.DataFrame({
            "debt_to_equity":         X_today.get("Debt to Equity",            0),
            "current_ratio":          X_today.get("Current Ratio",             1),
            "revenue_growth":         X_today.get("Revenue Growth %",          0),
            "sector_correlation_60d": X_today.get("sector_correlation_60d",    0),
            "sector_health_score":    X_today.get("sector_health_score",       50),
            "hhi_concentration":      X_today.get("HHI_concentration",         0),
            "institutional_holding":  X_today.get("institutional_holding_pct", 0),
        })
        try:
            probs = saved_model.predict_proba(X_mapped.values)[:, 1]
        except Exception:
            probs = _rule_based_probs(X_today)
    else:
        probs = _rule_based_probs(X_today)

    scores = 100.0 * (1 - probs)

    dates_iter = (
        todays_features["Date"].tolist()
        if "Date" in todays_features.columns
        else todays_features.index.tolist()
    )

    predictions, feature_records = [], []
    for i, date_val in enumerate(dates_iter):
        dt_str = date_val.strftime("%Y-%m-%d") if hasattr(date_val, "strftime") else str(date_val)
        predictions.append({
            "Date":                dt_str,
            "model_version":       model_version,
            "SurvivalScore":       round(float(scores[i]), 2),
            "DistressProbability": round(float(probs[i] * 100), 2),
            "ExplanationJSON":     None,
        })
        row = X_today.iloc[i].to_dict()
        feature_records.append({
            "Date":                  dt_str,
            "DebtToEquity":          float(row.get("Debt to Equity",            0) or 0),
            "CurrentRatio":          float(row.get("Current Ratio",             0) or 0),
            "RevenueGrowth":         float(row.get("Revenue Growth %",          0) or 0),
            "SectorCorrelation60d":  float(row.get("sector_correlation_60d",    0) or 0),
            "SectorHealthScore":     float(row.get("sector_health_score",       0) or 0),
            "HHIConcentration":      float(row.get("HHI_concentration",         0) or 0),
            "InstitutionalHolding":  float(row.get("institutional_holding_pct", 0) or 0),
        })

    return pd.DataFrame(predictions), pd.DataFrame(feature_records)
