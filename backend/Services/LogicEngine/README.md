# AEGIS-FIN LogicEngine

A multi-module financial analysis pipeline for Indian equities. Ingests market data, computes health signals, analyses fundamentals and ownership patterns, measures cross-sectional correlations, and produces a composite classification score for any company.

> Produces signals, scores, tiers, and grades — never buy/sell recommendations.

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — for local dev, the defaults (STORE_BACKEND=memory) work out of the box
```

### 3. Run the enhanced pipeline with fresh data

```bash
# Complete setup: truncate data, update schema, and run pipeline
python setup_and_run_pipeline.py

# Or with specific companies
python setup_and_run_pipeline.py --companies TCS.NS,INFY.NS,HDFCBANK.NS

# Or force refresh without truncating
python setup_and_run_pipeline.py --force --skip-truncate
```

### 4. Or run individual steps

```python
from LogicEngine.pipeline import run_sectors, run_daily, run_batch

# Fetch and process all sector + macro health data first (run once per day)
sector_results = run_sectors()

# Run full analysis for a single company
result = run_daily("TCS.NS", "TCS", sector_results=sector_results)
print(result["classifier"]["composite"])

# Or run a batch of companies (sectors computed once, shared across all)
companies = [("TCS.NS", "TCS"), ("INFY.NS", "Infosys"), ("HDFCBANK.NS", "HDFC Bank")]
results = run_batch(companies, sector_results=sector_results)
```

---

## Enhanced Analytics Features

The pipeline now includes comprehensive insights and analysis:

- **Balance Sheet Insights**: Category scoring (Profitability, Liquidity, Leverage, Efficiency, Growth), key strengths/concerns, sector comparison, trend analysis, and recommendations
- **Stock Holding Insights**: Ownership breakdown with pie charts, top holders analysis, insider activity, volatility metrics, 52-week price analysis, and IT sector correlation
- **IT Sector Correlation**: Automatic correlation analysis with IT sector for all companies
- **Data Validation**: No null values in critical fields, comprehensive error handling
- **Multi-Page Analytics**: Separate pages for different aspects of analysis

---

## Database Management

### Truncate and Reset

To start fresh with a clean database:

```bash
# Truncate all data and update schema
python truncate_and_update.py

# Or use the complete setup script
python setup_and_run_pipeline.py
```

### Schema Updates

The schema includes new tables for insights:

- `balance_sheet_insights` — Comprehensive balance sheet analysis with scores and recommendations
- `stock_holding_insights` — Shareholding patterns with pie chart data and IT correlation

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `STORE_BACKEND` | `memory` | `memory` (in-process) or `supabase` (persistent) |
| `SUPABASE_URL` | — | Supabase project URL (required when backend=supabase) |
| `SUPABASE_KEY` | — | Supabase service-role key (required when backend=supabase) |
| `AEGIS_LOG_LEVEL` | `INFO` | `DEBUG` / `INFO` / `WARNING` / `ERROR` |
| `AEGIS_LOG_FORMAT` | `text` | `text` or `json` |

---

## Supabase Setup (optional)

To persist data across restarts, use the Supabase backend:

1. Create a project at [supabase.com](https://supabase.com)
2. Run the schema in the SQL editor:
   ```
   LogicEngine/store/supabase_schema.sql
   ```
3. Copy your project URL and service-role key into `.env`:
   ```
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_KEY=<service-role-key>
   STORE_BACKEND=supabase
   ```

---

## Running Tests

```bash
pytest LogicEngine/tests/ -v
```

With coverage:

```bash
pytest LogicEngine/tests/ --cov=LogicEngine --cov-report=term-missing
```

---

## Project Structure

```
LogicEngine/
├── fetching/          # yfinance wrapper — the only file that imports yfinance
├── analysis/          # OHLCV health, balance sheet ratios, stock holding metrics
├── correlation/       # Cross-sectional correlation vs sectors + macro
├── validation/        # Relationship validator (three-stage correlation check)
├── classifier/        # Tier/grade assignment (TIER_1–TIER_5, grades A–F)
├── store/             # Data persistence layer
│   ├── data_store.py      # Abstract interface + MemoryStore
│   ├── supabase_store.py  # Supabase implementation
│   ├── supabase_schema.sql
│   └── adapters.py        # Module I/O bridge
├── tests/             # Unit tests
├── pipeline.py        # Orchestration — run_sector_pipeline / run_company_pipeline
├── schema.py          # Input validation
├── logger.py          # Structured logging
├── setup_and_run_pipeline.py  # Complete setup and pipeline execution
├── truncate_and_update.py     # Data truncation and schema updates
├── run_enhanced_pipeline.py   # Enhanced pipeline runner
└── ARCHITECTURE.md    # Full architecture reference
```

---

## Pipeline Cadence

| Data | Cadence | Function |
|---|---|---|
| OHLCV / health / correlation / classifier | Daily | `run_daily()` / `run_batch()` |
| Balance sheet / stock holding | Quarterly | `run_daily()` (skipped if current quarter already in DB) |
| Balance sheet insights / stock holding insights | Quarterly | Automatically generated and saved |
| Sector + macro health | Daily | `run_sectors()` |

The pipeline is stateless and idempotent — safe to call repeatedly.

---

## Accessing Enhanced Analytics

After running the pipeline, access the enhanced analytics in the frontend:

- **Enhanced Balance Sheet**: `/enhanced-balance` — Category scoring, insights, charts
- **Enhanced Stock Holdings**: `/enhanced-holdings` — Ownership breakdown, top holders, IT correlation
- **Filtering & Classification**: `/filtering` — Advanced filtering and company classification
- **Market Intelligence**: `/market-intelligence` — Market overview and trends
- **Sector Intelligence**: `/sector-intelligence` — Sector-specific analysis
- **Correlation Explorer**: `/correlation-explorer` — Company correlation analysis
