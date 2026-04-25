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

### 3. Run the pipeline

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
└── ARCHITECTURE.md    # Full architecture reference
```

---

## Pipeline Cadence

| Data | Cadence | Function |
|---|---|---|
| OHLCV / health / correlation / classifier | Daily | `run_daily()` / `run_batch()` |
| Balance sheet / stock holding | Quarterly | `run_daily()` (skipped if current quarter already in DB) |
| Sector + macro health | Daily | `run_sectors()` |

The pipeline is stateless and idempotent — safe to call repeatedly.
