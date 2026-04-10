<div align="center">

<img src="https://img.shields.io/badge/AEGIS--FIN-v1.0.0-0f172a?style=for-the-badge&labelColor=0f172a&color=6366f1" alt="version"/>

# AEGIS-FIN

### Unified Business Health Prediction System

*"Don't predict the Revenue. Predict the Behavior."*

<br/>

[![Python](https://img.shields.io/badge/Python-3.8%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![XGBoost](https://img.shields.io/badge/XGBoost-3.2-FF6600?style=flat-square&logo=xgboost&logoColor=white)](https://xgboost.readthedocs.io/)
[![License](https://img.shields.io/badge/License-MIT-a855f7?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-22c55e?style=flat-square)]()

<br/>

[Overview](#overview) · [Architecture](#architecture) · [Pipeline](#the-9-layer-pipeline) · [Frontend](#frontend) · [ML Engine](#ml-engine) · [Database](#database) · [Setup](#setup) · [Usage](#usage)

</div>

---

## Overview

AEGIS-FIN is a next-generation fintech platform built to solve the **MSME credit gap** — the systemic problem where millions of small businesses are rejected by traditional lenders simply because they lack formal audited financials.

Instead of asking *"what does the balance sheet say?"*, AEGIS-FIN asks *"how does this business behave?"*

It fuses **live market data** (NSE sector indices, macro indicators) with **fundamental analysis** (balance sheets, shareholding patterns) and runs it through a **9-layer analytical pipeline** to produce a dynamic **Survival Score** and **Risk Vector** — giving lenders a nuanced recovery index instead of a binary reject/approve.

| Problem | Traditional Flaw | AEGIS-FIN Solution |
|:--------|:-----------------|:-------------------|
| Data Scarcity | Banks reject MSMEs lacking formal P&L paperwork | Behavioral analysis of raw transaction and market signals |
| Static Analysis | Debt/Equity ratios miss daily volatility | Entropy and volatility measurement across rolling windows |
| Market Isolation | Credit models ignore sector crashes | Sector correlation linking company risk to macro trends |
| Delayed Signals | Quarterly reports are 90 days stale | Daily pipeline running post-market close at 18:30 IST |

---

## Architecture

```
+----------------------------------------------------------------------+
|                          AEGIS-FIN                                   |
|                                                                      |
|  +---------------------------------------------------------------+  |
|  |  Frontend  (React 18 + Vite + Tailwind CSS)                   |  |
|  |  Dashboard  Companies  Sectors  Correlation  RiskEngine       |  |
|  |  MacroOverlay  BalanceSheet  PipelineMonitor  Diagnostics     |  |
|  +---------------------------+-----------------------------------+  |
|                              | Supabase JS SDK                      |
|  +---------------------------v-----------------------------------+  |
|  |  Supabase (PostgreSQL)  --  Normalized Schema v2.2            |  |
|  |  13 core tables  3-year rolling retention  RLS policies       |  |
|  +---------------------------^-----------------------------------+  |
|                              | supabase-py gateway                  |
|  +---------------------------+-----------------------------------+  |
|  |  Backend  (Python 3.8+)                                       |  |
|  |                                                               |  |
|  |  scheduler.py  -->  run_pipeline.py  -->  aegis_pipeline.py   |  |
|  |                                                               |  |
|  |  Layer 1-2 : Sector Engine + Health Matrix                    |  |
|  |  Layer 3   : Company Metrics                                  |  |
|  |  Layer 4-5 : Correlation Matrix + Sector Sift                 |  |
|  |  Layer 6-7 : Balance Sheet + Holding Analysis                 |  |
|  |  Layer 8-9 : ML Predictions + Feature Store                   |  |
|  |                                                               |  |
|  |  ML Engine: XGBoost  CatBoost  Gradient Boosting             |  |
|  +---------------------------------------------------------------+  |
+----------------------------------------------------------------------+
```

**Data flow:** `scheduler.py` fires at 13:00 UTC (18:30 IST) every weekday, pre-computes all 12 sector indices once, processes each company through all 9 layers, pushes normalized results to Supabase, and the React frontend queries live data via the Supabase JS SDK.

---

## The 9-Layer Pipeline

The core of AEGIS-FIN is a sequential analytical pipeline defined in `aegis_pipeline.py`. Each layer builds on the previous one.


### Layer 1 — Sector Engine

**File:** `logic/LogicEngine/sector/sector_engine.py`

Downloads and computes daily metrics for **12 NSE sector indices**:

| Index | Ticker | Represents |
|:------|:-------|:-----------|
| Bank Nifty | `^NSEBANK` | Banking sector |
| Nifty IT | `^CNXIT` | Technology |
| Nifty Auto | `^CNXAUTO` | Automobile |
| Nifty Metal | `^CNXMETAL` | Metals and Mining |
| Nifty Realty | `^CNXREALTY` | Real Estate |
| Nifty FMCG | `^CNXFMCG` | Consumer Goods |
| Nifty Pharma | `^CNXPHARMA` | Pharmaceuticals |
| Nifty Energy | `^CNXENERGY` | Energy |
| Gold | `GC=F` | Macro — Safe Haven |
| Crude Oil | `CL=F` | Macro — Input Cost |
| USD-INR | `INR=X` | Macro — Currency |
| India VIX | `^INDIAVIX` | Macro — Fear Index |

Computed metrics per sector per day: `return_1d`, `return_5d`, `return_20d`, `volatility_20d`, `ATR`, `drawdown_20d`, `volume_ratio`, `momentum`, `trend`.

---

### Layer 2 — Sector Health Matrix

**File:** `logic/LogicEngine/sector/sector_health.py`

Converts raw sector metrics into a **daily health score (0-100)** using four sub-signals:

- **Trend Signal** — EMA crossover direction (bullish / bearish / neutral)
- **Spike Signal** — Abnormal volume or price movement detection
- **Regime Signal** — Rolling volatility regime classification (low / medium / high)
- **Macro Overlay** — VIX, USD-INR, Gold, Crude Oil regime adjustments

The composite health score is used downstream to weight company risk.

---

### Layer 3 — Company Engine

**File:** `logic/LogicEngine/company/company_engine.py`

Fetches historical price data for the target company via `yfinance` and computes:

- Daily / 5-day / 20-day returns
- Rolling volatility (20-day)
- Average True Range (ATR)
- Maximum drawdown (20-day window)
- Price momentum score
- Trend classification

---

### Layer 4 — Correlation Matrix

**File:** `logic/LogicEngine/correlation/correlation_matrix.py`

Computes **Pearson correlation** between the company's daily returns and each of the 12 sector indices across three rolling windows:

| Window | Days | Purpose |
|:-------|:-----|:--------|
| Short | 20d | Recent sensitivity |
| Medium | 60d | Quarterly alignment |
| Long | 100d | Structural relationship |

Produces both a static snapshot and a full rolling time-series stored in `rolling_corr`.

---

### Layer 5 — Sector Sift

**File:** `logic/LogicEngine/correlation/correlation_sift.py`

Ranks all 12 sectors by correlation strength and selects the **top-N most influential sectors** for the company. These become the primary risk drivers used in downstream layers. Stored in `top_sectors` with rank and correlation coefficient.

---

### Layer 6 — Balance Sheet Analysis

**File:** `logic/LogicEngine/company/balance_sheet_analyzer.py`

Pulls 20 quarters of financial data and computes 20+ fundamental ratios:

- Debt-to-Equity, Current Ratio, Quick Ratio
- Return on Equity (ROE), Return on Assets (ROA)
- Operating Margin, Net Margin, EBITDA Margin
- Asset Turnover, Inventory Turnover
- Interest Coverage Ratio
- Working Capital metrics

Each ratio is overlaid with the **sector health score** from Layer 2 to produce a sector-adjusted fundamental view. Stored in both `balance_sheet` (latest snapshot) and `balance_sheet_history` (full 20-quarter time-series).

---

### Layer 7 — Stock Holding Analysis

**File:** `logic/LogicEngine/company/stock_holding_analyzer.py`

Analyzes shareholder composition patterns:

- **HHI (Herfindahl-Hirschman Index)** — Ownership concentration risk
- Promoter holding trend (increasing / decreasing)
- Institutional (FII + DII) holding percentage
- Public float analysis
- Quarter-over-quarter holding changes

High promoter pledge combined with declining institutional holding is treated as an elevated risk signal.

---

### Layer 8 — ML Predictions (Survival Score)

**File:** `ml_engine/survival_trainer.py`

Runs the trained model to produce two outputs per company:

- **Survival Score (0-100)** — Higher means healthier; lower signals distress risk
- **Distress Probability (0-100%)** — Probability of financial stress in the next quarter

Falls back to a rule-based scoring engine if no trained model is available.

---

### Layer 9 — Feature Store

**File:** `ml_engine/train_model.py`

Compiles and stores the exact feature vector used for each ML prediction — creating a full audit trail. Enables model retraining, explainability, and drift detection over time.

---

## Frontend

Built with **React 18 + Vite + Tailwind CSS**, the frontend is a fully authenticated single-page application with dark/light mode support.

### Pages

| Route | Page | Description |
|:------|:-----|:------------|
| `/` | Dashboard | System overview — sector health grid, top risk companies, pipeline status |
| `/companies` | Companies | Searchable list of all tracked companies with survival scores |
| `/companies/:id` | Company Detail | Full deep-dive: metrics, correlations, balance sheet, ML score |
| `/sectors` | Sectors | Live sector health scores with trend indicators |
| `/correlation` | Correlation | Interactive correlation heatmap — company vs. all sectors |
| `/risk-engine` | Risk Engine | ML-driven risk scoring interface with feature breakdown |
| `/macro` | Macro Overlay | VIX, USD-INR, Gold, Crude Oil regime analysis |
| `/balance` | Balance Sheet | Financial ratios with sector pressure overlay |
| `/pipeline` | Pipeline Monitor | Real-time pipeline execution tracking and logs |
| `/diagnostics` | Diagnostics | System health, DB connectivity, data freshness checks |
| `/upload` | Upload CSV | Import company data via CSV |
| `/profile` | Profile | User account management |

### State Management

Three React Contexts handle global state:

- `AuthContext` — Supabase session, login/logout, user object
- `AppDataContext` — Shared company and sector data, loading states
- `ThemeContext` — Dark/light mode toggle with localStorage persistence

### Tech Stack

```
React 18.3.1        UI framework
React Router 7.13   Client-side routing
Vite 6.3.5          Build tool and dev server
Tailwind CSS 3.4    Utility-first styling
Recharts 3.8        Data visualization and charts
Lucide React        Icon library
Supabase JS 2.100   Database client and auth
```

---

## ML Engine

**Files:** `stack/backend/ml_engine/`

### Training — `train_model.py`

- Algorithm: **Gradient Boosting** (200 estimators, max_depth=4, learning_rate=0.05)
- Validation: **TimeSeriesSplit** cross-validation (no data leakage)
- Target: Binary distress label derived from future sector health + debt-to-equity threshold
- Output: `model.joblib` + `model_meta.json` (feature names, training date, CV scores)

### Inference — `survival_trainer.py`

- Loads trained model or falls back to rule-based scoring
- Input: Latest row from `feature_store` for the company
- Output: Survival score (0-100) + distress probability (0-100%)
- Fallback: Weighted rule engine using sector health, volatility, and fundamental ratios

### Feature Set (~40 features)

- Sector health scores (12 sectors)
- Company price metrics (returns, volatility, ATR, drawdown, momentum)
- Top-sector correlation coefficients (3 windows x top-5 sectors)
- Balance sheet ratios (debt/equity, current ratio, ROE, margins)
- Holding metrics (HHI, promoter %, institutional %)

---

## Database

**Platform:** Supabase (PostgreSQL) — Normalized Schema v2.2

### Design Philosophy

Before normalization: `company TEXT + sector TEXT` repeated in every row across every table — approximately 4.8M duplicate strings for 547 companies x 8,915 rows.

After: Two lookup tables (`companies`, `sectors`) store strings once. All data tables use integer foreign keys.

### Schema

```
companies              master company registry (id, name, ticker, exchange)
sectors                master sector registry (id, name, ticker)
sector_metrics         computed metrics per sector per day
sector_health          daily health scores per sector
macro_overlay          VIX / USD-INR / Gold / Crude Oil regime data
company_metrics        price metrics per company per day
static_corr            Pearson correlation: company vs sector (snapshot)
rolling_corr           rolling correlation time-series (20d / 60d / 100d)
top_sectors            ranked top-N sectors per company per run
balance_sheet          latest financial ratios snapshot
balance_sheet_history  historical ratio time-series (20 quarters)
holding_metrics        shareholder concentration metrics
ml_predictions         survival scores per company per run
feature_store          exact ML input features (audit trail)
pipeline_log           run metadata, timing, error tracking
```

### Data Retention

A 3-year rolling window is enforced automatically by the Supabase gateway on every write. Old rows are pruned before new ones are inserted — keeping storage lean without manual intervention.

---

## Setup

### Prerequisites

- Python 3.8+
- Node.js 18+
- A [Supabase](https://supabase.com/) project (free tier works)

### 1. Clone

```bash
git clone https://github.com/Deep6890/AEGIS-FIN.git
cd AEGIS-FIN
```

### 2. Database

Open your Supabase project, go to the SQL Editor, paste and run the full contents of:

```
stack/backend/schema.sql
```

### 3. Backend

```bash
cd stack/backend
pip install -r requirements.txt
```

Copy and edit the environment file:

```bash
cp .env.example .env
```

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

Seed the company registry:

```bash
python seed_companies.py
```

### 4. Frontend

```bash
cd stack/frontend
npm install
```

Copy and edit the environment file:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Usage

### Run the Pipeline (Manual)

```bash
cd stack/backend

# Run for all companies
python run_pipeline.py

# Resume after a crash (skips companies already processed today)
python run_pipeline.py --resume

# Run a specific range (useful for testing)
python run_pipeline.py --start 0 --end 20

# Dry run — no Supabase writes
python run_pipeline.py --dry

# Single company
python -m logic.LogicEngine.aegis_pipeline --company TCS.NS --name TCS --top 5
```

### Start the Scheduler (Automated Daily Runs)

```bash
cd stack/backend

# Start the weekday scheduler (fires at 13:00 UTC / 18:30 IST)
python scheduler.py

# Run immediately then continue on schedule
python scheduler.py --run-now
```

### Train / Retrain the ML Model

```bash
cd stack/backend
python ml_engine/train_model.py
```

### Start the Frontend Dev Server

```bash
cd stack/frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
AEGIS-FIN/
|-- DATA/                           Raw MSME datasets (CSV, PDF)
|   |-- MSME Bse DATA/              BSE stock data collection
|   +-- *.csv                       NPA, credit, census data
|
|-- plots/                          Sector model and strategy plots
|-- market-trend-finder.ipynb       Exploratory analysis notebook
|-- requirements.txt                Root-level Python dependencies
|
+-- stack/
    |-- frontend/                   React application
    |   |-- src/
    |   |   |-- pages/              12 route pages
    |   |   |-- components/         Reusable UI components
    |   |   +-- context/            Auth, AppData, Theme contexts
    |   +-- package.json
    |
    +-- backend/                    Python pipeline
        |-- logic/
        |   +-- LogicEngine/
        |       |-- aegis_pipeline.py   Master orchestrator
        |       |-- sector/             Layers 1-2
        |       |-- company/            Layers 3, 6, 7
        |       +-- correlation/        Layers 4-5
        |-- ml_engine/
        |   |-- train_model.py          Model training
        |   +-- survival_trainer.py     Inference
        |-- db/
        |   +-- supabase_gateway.py     DB write layer
        |-- run_pipeline.py             Batch runner
        |-- scheduler.py               Daily trigger
        |-- schema.sql                 DB schema
        +-- requirements.txt
```

---

## Data Sources

| Source | Data | Usage |
|:-------|:-----|:------|
| Yahoo Finance (`yfinance`) | NSE sector indices, company prices | Live pipeline input |
| NSE / BSE | MSME company list (547 companies) | Company registry |
| RBI / MSME Ministry | NPA ratios, credit outstanding, census data | Research and validation |
| MSME Annual Report 2024-25 | Policy context | Background research |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built for the MSME ecosystem &nbsp;·&nbsp; Powered by market intelligence &nbsp;·&nbsp; Driven by behavioral finance

[github.com/Deep6890/AEGIS-FIN](https://github.com/Deep6890/AEGIS-FIN)

</div>
