from core.model_loader import (
    model,
    feature_order,
    city_map,
    bank_map,
    bank_state_map
)

from core.preprocess import preprocess_input

def predict_loan_default(input_data: dict):

    maps = {
        "city": city_map,
        "bank": bank_map,
        "bank_state": bank_state_map
    }

    X = preprocess_input(input_data, maps, feature_order)

    prob = model.predict_proba(X)[0][1]

    return {
        "prediction": "Default" if prob >= 0.5 else "No Default",
        "default_probability": round(float(prob), 4)
    }
