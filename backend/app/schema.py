"""
schema.py — Input validation for AEGIS-FIN analysis modules
"""
from dataclasses import dataclass, field
from typing import List
import pandas as pd


@dataclass
class ValidationResult:
    ok: bool = True
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


def validate_financials(data: dict, ticker: str = "") -> ValidationResult:
    vr = ValidationResult()
    if not isinstance(data, dict):
        vr.ok = False
        vr.errors.append("financials_data must be a dict")
        return vr
    for key in ("income", "balance", "cashflow"):
        val = data.get(key)
        if val is None or (isinstance(val, pd.DataFrame) and val.empty):
            vr.warnings.append(f"{key} is empty for {ticker}")
    if data.get("error"):
        vr.ok = False
        vr.errors.append(f"fetch error: {data['error']}")
    return vr


def validate_holders(data: dict, ticker: str = "") -> ValidationResult:
    vr = ValidationResult()
    if not isinstance(data, dict):
        vr.ok = False
        vr.errors.append("holder_data must be a dict")
        return vr
    if data.get("error"):
        vr.ok = False
        vr.errors.append(f"fetch error: {data['error']}")
    return vr
