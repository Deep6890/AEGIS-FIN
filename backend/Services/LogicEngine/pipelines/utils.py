import numpy as np


def safe_float(v) -> float | None:
    if v is None:
        return None
    try:
        f = float(v)
        return None if (np.isnan(f) or np.isinf(f)) else round(f, 6)
    except Exception:
        return None


RATIO_ID = {
    "Gross Margin %": 1, "Net Profit Margin %": 2, "EBITDA Margin %": 3,
    "ROE %": 4, "ROA %": 5, "Current Ratio": 6, "Quick Ratio": 7,
    "Cash Ratio": 8, "Debt/Equity": 9, "Debt/Assets": 10,
    "Interest Coverage": 11, "Asset Turnover": 12, "Inventory Turnover": 13,
    "Receivables Turnover": 14, "CFO/Net Income": 15, "FCF Margin %": 16,
    "Revenue Growth %": 17, "Net Income Growth %": 18, "Equity Ratio %": 19,
    "Equity Growth %": 20, "Debt/EBITDA": 21, "Capex/Revenue %": 22,
    "Cash/Assets %": 23, "R&D/Revenue %": 24, "Intangibles/Assets %": 25,
    "Equity/Assets % (Cap Adequacy)": 26,
}

METRIC_ID = {
    "Institutional Ownership %": 1, "Insider Ownership %": 2,
    "Promoter Holding %": 3, "FII Holding %": 4, "DII Holding %": 5,
    "Public Float %": 6, "Holder Concentration (HHI)": 7,
    "Top 10 Holders %": 8, "Insider Net Buy %": 9,
    "Annualised Volatility %": 10, "52W High Distance %": 11,
    "52W Low Distance %": 12, "Market Cap (Cr)": 13,
    "Shares Outstanding (Cr)": 14,
}
