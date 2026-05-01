"""
seed_definitions.py — Seed ratio_definitions and holding_metric_definitions
Run once: venv\\Scripts\\python.exe backend\\seed_definitions.py
"""
import os, sys
from pathlib import Path

_here = Path(__file__).parent
_env  = _here / ".env"
if _env.exists():
    for line in open(_env):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

sys.path.insert(0, str(_here))
from supabase import create_client

client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

RATIOS = [
    (1,  "Gross Margin %",                "Profitability",     True),
    (2,  "Net Profit Margin %",           "Profitability",     True),
    (3,  "EBITDA Margin %",               "Profitability",     True),
    (4,  "ROE %",                         "Profitability",     True),
    (5,  "ROA %",                         "Profitability",     True),
    (6,  "Current Ratio",                 "Liquidity",         True),
    (7,  "Quick Ratio",                   "Liquidity",         True),
    (8,  "Cash Ratio",                    "Liquidity",         True),
    (9,  "Debt/Equity",                   "Leverage",          False),
    (10, "Debt/Assets",                   "Leverage",          False),
    (11, "Interest Coverage",             "Leverage",          True),
    (12, "Asset Turnover",                "Efficiency",        True),
    (13, "Inventory Turnover",            "Efficiency",        True),
    (14, "Receivables Turnover",          "Efficiency",        True),
    (15, "CFO/Net Income",                "Cash Flow",         True),
    (16, "FCF Margin %",                  "Cash Flow",         True),
    (17, "Revenue Growth %",              "Growth",            True),
    (18, "Net Income Growth %",           "Growth",            True),
    (19, "Equity Ratio %",                "Capital Structure", True),
    (20, "Equity Growth %",               "Capital Structure", True),
    (21, "Debt/EBITDA",                   "Leverage",          False),
    (22, "Capex/Revenue %",               "Efficiency",        False),
    (23, "Cash/Assets %",                 "Profitability",     True),
    (24, "R&D/Revenue %",                 "Profitability",     True),
    (25, "Intangibles/Assets %",          "Capital Structure", False),
    (26, "Equity/Assets % (Cap Adequacy)","Capital Structure", True),
]

METRICS = [
    (1,  "Institutional Ownership %",  "Ownership"),
    (2,  "Insider Ownership %",        "Ownership"),
    (3,  "Promoter Holding %",         "Ownership"),
    (4,  "FII Holding %",              "Ownership"),
    (5,  "DII Holding %",              "Ownership"),
    (6,  "Public Float %",             "Ownership"),
    (7,  "Holder Concentration (HHI)", "Ownership"),
    (8,  "Top 10 Holders %",           "Ownership"),
    (9,  "Insider Net Buy %",          "Ownership"),
    (10, "Annualised Volatility %",    "Risk"),
    (11, "52W High Distance %",        "Risk"),
    (12, "52W Low Distance %",         "Risk"),
    (13, "Market Cap (Cr)",            "Size"),
    (14, "Shares Outstanding (Cr)",    "Size"),
]

# Check existing
existing_r = {r["id"] for r in (client.table("ratio_definitions").select("id").execute().data or [])}
existing_m = {r["id"] for r in (client.table("holding_metric_definitions").select("id").execute().data or [])}

ratio_rows = [
    {"id": id_, "name": name, "category": cat, "higher_is_better": hib}
    for id_, name, cat, hib in RATIOS if id_ not in existing_r
]
metric_rows = [
    {"id": id_, "name": name, "category": cat}
    for id_, name, cat in METRICS if id_ not in existing_m
]

if ratio_rows:
    client.table("ratio_definitions").insert(ratio_rows).execute()
    print(f"Inserted {len(ratio_rows)} ratio_definitions OK")
else:
    print("ratio_definitions already populated OK")

if metric_rows:
    client.table("holding_metric_definitions").insert(metric_rows).execute()
    print(f"Inserted {len(metric_rows)} holding_metric_definitions OK")
else:
    print("holding_metric_definitions already populated OK")

# Verify
r = client.table("ratio_definitions").select("id").execute()
m = client.table("holding_metric_definitions").select("id").execute()
print(f"\nratio_definitions: {len(r.data)} rows")
print(f"holding_metric_definitions: {len(m.data)} rows")
print("\nNow run: venv\\Scripts\\python.exe backend\\scheduler.py --run-now --once")
