import joblib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"

model = joblib.load(MODEL_DIR / "loan_default.pkl")
feature_order = joblib.load(MODEL_DIR / "loan_default_feature_order.pkl")

city_map = joblib.load(MODEL_DIR / "loan_default_city_map.pkl")
bank_map = joblib.load(MODEL_DIR / "loan_default_bank_map.pkl")
bank_state_map = joblib.load(MODEL_DIR / "loan_default_bank_state_map.pkl")
