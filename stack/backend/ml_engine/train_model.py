"""
train_model.py
--------------
Trains the survival model on all historical data in Supabase
and saves it to ml_engine/model.joblib.

Run: python ml_engine/train_model.py
Auto-runs weekly via GitHub Actions.
"""
import os, sys, json
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import TimeSeriesSplit, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score

_BACKEND = Path(__file__).parent.parent
sys.path.insert(0, str(_BACKEND))

# Load .env
env_path = _BACKEND / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

MODEL_PATH = Path(__file__).parent / "model.joblib"
META_PATH  = Path(__file__).parent / "model_meta.json"

FEATURES = [
    "debt_to_equity", "current_ratio", "revenue_growth",
    "sector_correlation_60d", "sector_health_score",
    "hhi_concentration", "institutional_holding",
]


def load_training_data() -> pd.DataFrame:
    """Pull feature_store + balance_sheet_history from Supabase to build training set."""
    from supabase import create_client
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

    print("Loading feature store...")
    rows = []
    offset = 0
    while True:
        r = sb.table("feature_store").select("*").range(offset, offset + 999).execute()
        if not r.data:
            break
        rows.extend(r.data)
        if len(r.data) < 1000:
            break
        offset += 1000

    if not rows:
        print("No feature store data found.")
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["company_id", "date"])

    # Generate proxy distress labels:
    # If a company's sector_health_score drops below 20 AND
    # debt_to_equity > 2.0 in the NEXT 90 days → label = 1
    df["label"] = 0
    for cid, grp in df.groupby("company_id"):
        grp = grp.sort_values("date").copy()
        # Future health score (shift back 3 rows ≈ 90 days of quarterly data)
        future_health = grp["sector_health_score"].shift(-3)
        future_de     = grp["debt_to_equity"].shift(-3)
        distress = ((future_health < 20) | (future_de > 3.0)).fillna(False)
        df.loc[grp.index, "label"] = distress.astype(int).values

    df = df.dropna(subset=FEATURES)
    print(f"Training set: {len(df)} rows, {df['label'].sum()} distress labels")
    return df


def train(df: pd.DataFrame):
    X = df[FEATURES].fillna(0).values
    y = df["label"].values

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", GradientBoostingClassifier(
            n_estimators=200, max_depth=4,
            learning_rate=0.05, subsample=0.8,
            random_state=42
        )),
    ])

    # Walk-forward CV
    tscv = TimeSeriesSplit(n_splits=5)
    scores = cross_val_score(model, X, y, cv=tscv, scoring="roc_auc")
    print(f"CV AUC: {scores.mean():.3f} ± {scores.std():.3f}")

    model.fit(X, y)

    meta = {
        "trained_at": pd.Timestamp.now().isoformat(),
        "n_samples":  int(len(df)),
        "n_distress": int(df["label"].sum()),
        "cv_auc_mean": float(scores.mean()),
        "cv_auc_std":  float(scores.std()),
        "features":   FEATURES,
        "model_version": "v2.0",
    }

    joblib.dump(model, MODEL_PATH)
    with open(META_PATH, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"Model saved → {MODEL_PATH}")
    print(f"Meta  saved → {META_PATH}")
    return model, meta


if __name__ == "__main__":
    df = load_training_data()
    if len(df) >= 50:
        train(df)
    else:
        print(f"Not enough data ({len(df)} rows). Need ≥50. Skipping training.")
