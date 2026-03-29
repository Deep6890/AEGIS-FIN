-- =============================================================================
-- AEGIS-FIN  Normalized Supabase Schema  v2.0
-- =============================================================================
-- Run this ENTIRE file in the Supabase SQL Editor.
-- It drops all old tables first, then creates the normalized structure.
--
-- Normalization design
-- --------------------
--   Before: company TEXT + sector TEXT repeated in EVERY row of every table
--           → 547 companies × 8915 rows = 4.8M duplicate strings
--
--   After:  Two lookup tables (companies, sectors) hold the string ONCE.
--           All data tables store only the INTEGER id → tiny FK joins.
--
-- Table map
-- ---------
--   companies          master company registry
--   sectors            master sector registry
--   sector_metrics     derived metrics per sector per day          (sector_id, date)
--   sector_health      daily health scores per sector              (sector_id, date)
--   company_metrics    price metrics per company per day           (company_id, date)
--   static_corr        Pearson corr: company vs sector             (company_id, sector_id, date)
--   rolling_corr       rolling corr time-series                    (company_id, sector_id, date, window)
--   top_sectors        ranked top-N sectors per company per run    (company_id, run_at, rank)
--   balance_sheet      financial ratios snapshot                   (company_id, run_at, ratio)
--   balance_sheet_history  historical ratio time-series           (company_id, date, ratio)
--   holding_metrics    shareholder metrics per company per run     (company_id, run_at, metric)
--   ml_predictions     survival scores per company per run        (company_id, date, model_version)
--   feature_store      ML input features per company per day      (company_id, date)
-- =============================================================================


-- ── Drop all old tables (cascade removes dependent views/indexes) ─────────────

DROP TABLE IF EXISTS feature_store         CASCADE;
DROP TABLE IF EXISTS ml_predictions        CASCADE;
DROP TABLE IF EXISTS holding_metrics       CASCADE;
DROP TABLE IF EXISTS balance_sheet_history CASCADE;
DROP TABLE IF EXISTS balance_sheet         CASCADE;
DROP TABLE IF EXISTS top_sectors           CASCADE;
DROP TABLE IF EXISTS rolling_corr          CASCADE;
DROP TABLE IF EXISTS static_corr           CASCADE;
DROP TABLE IF EXISTS company_metrics       CASCADE;
DROP TABLE IF EXISTS sector_health         CASCADE;
DROP TABLE IF EXISTS sector_metrics        CASCADE;
DROP TABLE IF EXISTS health_matrix         CASCADE;
DROP TABLE IF EXISTS health_dfs            CASCADE;
DROP TABLE IF EXISTS sector_raw            CASCADE;
DROP TABLE IF EXISTS sectors               CASCADE;
DROP TABLE IF EXISTS companies             CASCADE;


-- =============================================================================
-- LOOKUP TABLES  (strings stored ONCE, referenced by integer id everywhere)
-- =============================================================================

-- ── companies ─────────────────────────────────────────────────────────────────
CREATE TABLE companies (
    id          BIGSERIAL   PRIMARY KEY,
    name        TEXT        NOT NULL UNIQUE,   -- display name  e.g. "TCS"
    ticker      TEXT,                           -- e.g. "TCS.NS"
    exchange    TEXT,                           -- e.g. "NSE"
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_companies_name   ON companies (name);
CREATE INDEX idx_companies_ticker ON companies (ticker);


-- ── sectors ───────────────────────────────────────────────────────────────────
CREATE TABLE sectors (
    id          BIGSERIAL   PRIMARY KEY,
    name        TEXT        NOT NULL UNIQUE,   -- e.g. "Bank Nifty"
    ticker      TEXT,                           -- e.g. "^NSEBANK"
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sectors_name ON sectors (name);


-- =============================================================================
-- SECTOR DATA TABLES  (global — one set for all companies)
-- =============================================================================

-- ── sector_metrics ────────────────────────────────────────────────────────────
-- Layer 1: computed metrics per sector per trading day
CREATE TABLE sector_metrics (
    id                      BIGSERIAL   PRIMARY KEY,
    run_at                  TEXT        NOT NULL,      -- ISO UTC timestamp of pipeline run
    sector_id               BIGINT      NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    date                    DATE        NOT NULL,
    close                   FLOAT8,
    sector_return_1d        FLOAT8,
    sector_return_5d        FLOAT8,
    sector_return_20d       FLOAT8,
    sector_volatility_20d   FLOAT8,
    sector_atr              FLOAT8,
    sector_drawdown_20d     FLOAT8,
    sector_volume_ratio     FLOAT8,
    sector_momentum         FLOAT8,
    sector_trend            TEXT,

    CONSTRAINT uq_sector_metrics UNIQUE (sector_id, date)
);
CREATE INDEX idx_sector_metrics_sector_date ON sector_metrics (sector_id, date);
CREATE INDEX idx_sector_metrics_date        ON sector_metrics (date);


-- ── sector_health ─────────────────────────────────────────────────────────────
-- Layer 2: full daily health signal per sector (was health_dfs + health_matrix combined)
CREATE TABLE sector_health (
    id              BIGSERIAL   PRIMARY KEY,
    run_at          TEXT        NOT NULL,
    sector_id       BIGINT      NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    date            DATE        NOT NULL,
    close           FLOAT8,
    daily_return    FLOAT8,
    ema_short       FLOAT8,
    ema_long        FLOAT8,
    trend           TEXT,
    spike_up        BOOLEAN,
    spike_down      BOOLEAN,
    ret_z           FLOAT8,
    vol_z           FLOAT8,
    momentum_z      FLOAT8,
    slope_z         FLOAT8,
    composite       FLOAT8,
    health_score    FLOAT8,
    signal          TEXT,       -- STRONG / NEUTRAL / WATCH / WEAK
    regime          TEXT,       -- BULL / NEUTRAL / BEAR

    CONSTRAINT uq_sector_health UNIQUE (sector_id, date)
);
CREATE INDEX idx_sector_health_sector_date ON sector_health (sector_id, date);
CREATE INDEX idx_sector_health_date        ON sector_health (date);
CREATE INDEX idx_sector_health_signal      ON sector_health (signal);


-- =============================================================================
-- COMPANY DATA TABLES  (per company — references companies lookup)
-- =============================================================================

-- ── company_metrics ───────────────────────────────────────────────────────────
-- Layer 3: price-derived metrics per company per trading day
CREATE TABLE company_metrics (
    id                      BIGSERIAL   PRIMARY KEY,
    run_at                  TEXT        NOT NULL,
    company_id              BIGINT      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date                    DATE        NOT NULL,
    close                   FLOAT8,
    company_return_1d       FLOAT8,
    company_return_5d       FLOAT8,
    company_return_20d      FLOAT8,
    company_volatility_20d  FLOAT8,
    company_atr             FLOAT8,
    company_drawdown_20d    FLOAT8,
    company_volume_ratio    FLOAT8,
    company_momentum        FLOAT8,
    company_trend           TEXT,

    CONSTRAINT uq_company_metrics UNIQUE (company_id, date)
);
CREATE INDEX idx_company_metrics_company_date ON company_metrics (company_id, date);


-- ── static_corr ───────────────────────────────────────────────────────────────
-- Layer 4a: one-shot Pearson correlation of company vs each sector
CREATE TABLE static_corr (
    id              BIGSERIAL   PRIMARY KEY,
    run_at          TEXT        NOT NULL,
    company_id      BIGINT      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sector_id       BIGINT      NOT NULL REFERENCES sectors(id)   ON DELETE CASCADE,
    date            DATE        NOT NULL,
    return_1d       FLOAT8,
    return_5d       FLOAT8,
    return_20d      FLOAT8,
    volatility_20d  FLOAT8,
    atr             FLOAT8,
    drawdown_20d    FLOAT8,
    volume_ratio    FLOAT8,
    momentum        FLOAT8,

    CONSTRAINT uq_static_corr UNIQUE (company_id, sector_id, date)
);
CREATE INDEX idx_static_corr_company_date ON static_corr (company_id, date);
CREATE INDEX idx_static_corr_sector       ON static_corr (sector_id);


-- ── rolling_corr ──────────────────────────────────────────────────────────────
-- Layer 4b: daily rolling correlation per (company, sector, window)
CREATE TABLE rolling_corr (
    id              BIGSERIAL   PRIMARY KEY,
    run_at          TEXT        NOT NULL,
    company_id      BIGINT      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sector_id       BIGINT      NOT NULL REFERENCES sectors(id)   ON DELETE CASCADE,
    date            DATE        NOT NULL,
    window_days     INTEGER     NOT NULL,   -- rolling window in days e.g. 20 / 60 / 100
    return_1d       FLOAT8,
    return_5d       FLOAT8,
    return_20d      FLOAT8,
    volatility_20d  FLOAT8,
    atr             FLOAT8,
    drawdown_20d    FLOAT8,
    volume_ratio    FLOAT8,
    momentum        FLOAT8,

    CONSTRAINT uq_rolling_corr UNIQUE (company_id, sector_id, date, window_days)
);
CREATE INDEX idx_rolling_corr_company_date ON rolling_corr (company_id, date);
CREATE INDEX idx_rolling_corr_sector       ON rolling_corr (sector_id);


-- ── top_sectors ───────────────────────────────────────────────────────────────
-- Layer 5: ranked top-N most correlated sectors for a company per run
CREATE TABLE top_sectors (
    id          BIGSERIAL   PRIMARY KEY,
    run_at      TEXT        NOT NULL,
    company_id  BIGINT      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sector_id   BIGINT      NOT NULL REFERENCES sectors(id)   ON DELETE CASCADE,
    date        DATE        NOT NULL,
    rank        INTEGER     NOT NULL,   -- 1 = most correlated

    CONSTRAINT uq_top_sectors UNIQUE (company_id, date, rank)
);
CREATE INDEX idx_top_sectors_company_date ON top_sectors (company_id, date);


-- ── balance_sheet ─────────────────────────────────────────────────────────────
-- Layer 6: latest financial ratio snapshot per company per run
CREATE TABLE balance_sheet (
    id                  BIGSERIAL   PRIMARY KEY,
    run_at              TEXT        NOT NULL,
    company_id          BIGINT      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date                DATE        NOT NULL,   -- reporting quarter end date
    ratio               TEXT        NOT NULL,   -- e.g. "Gross Margin %"
    value               FLOAT8,
    value_str           TEXT,                   -- formatted display string
    yoy_pct             FLOAT8,                 -- year-over-year % change
    hist_pct_rank       FLOAT8,                 -- percentile rank vs own history
    status              TEXT,                   -- green / amber / red / gray
    trend               TEXT,                   -- up / down
    description         TEXT,
    category            TEXT,                   -- Profitability / Liquidity / etc.
    sector_pressure     FLOAT8,
    sector_pressure_pct FLOAT8,
    adjusted_status     TEXT,
    sector_narrative    TEXT,

    CONSTRAINT uq_balance_sheet UNIQUE (company_id, date, ratio)
);
CREATE INDEX idx_balance_sheet_company_date ON balance_sheet (company_id, date);
CREATE INDEX idx_balance_sheet_ratio        ON balance_sheet (ratio);


-- ── balance_sheet_history ─────────────────────────────────────────────────────
-- Layer 6b: historical ratio values time-series (for ML training)
CREATE TABLE balance_sheet_history (
    id          BIGSERIAL   PRIMARY KEY,
    run_at      TEXT        NOT NULL,
    company_id  BIGINT      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date        DATE        NOT NULL,
    ratio       TEXT        NOT NULL,
    value       FLOAT8,

    CONSTRAINT uq_bs_history UNIQUE (company_id, date, ratio)
);
CREATE INDEX idx_bs_history_company_date ON balance_sheet_history (company_id, date);


-- ── holding_metrics ───────────────────────────────────────────────────────────
-- Layer 7: shareholder pattern metrics per company per run
CREATE TABLE holding_metrics (
    id                  BIGSERIAL   PRIMARY KEY,
    run_at              TEXT        NOT NULL,
    company_id          BIGINT      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date                DATE        NOT NULL,
    metric              TEXT        NOT NULL,   -- e.g. "HHI Concentration"
    value               FLOAT8,
    status              TEXT,
    trend               TEXT,
    description         TEXT,
    category            TEXT,
    sector_pressure     FLOAT8,
    sector_pressure_pct FLOAT8,
    sector_signal       TEXT,
    adjusted_status     TEXT,

    CONSTRAINT uq_holding_metrics UNIQUE (company_id, date, metric)
);
CREATE INDEX idx_holding_metrics_company_date ON holding_metrics (company_id, date);


-- ── ml_predictions ────────────────────────────────────────────────────────────
-- Layer 8: survival score from ML model per company per run
CREATE TABLE ml_predictions (
    id                      BIGSERIAL   PRIMARY KEY,
    run_at                  TEXT        NOT NULL,
    company_id              BIGINT      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date                    DATE        NOT NULL,
    model_version           TEXT        NOT NULL,   -- e.g. "v1.0"
    survival_score          FLOAT8,                 -- 0–100 (100 = healthiest)
    distress_probability    FLOAT8,                 -- 0–100 %
    explanation_json        TEXT,                   -- SHAP breakdown JSON

    CONSTRAINT uq_ml_predictions UNIQUE (company_id, date, model_version)
);
CREATE INDEX idx_ml_predictions_company_date  ON ml_predictions (company_id, date);
CREATE INDEX idx_ml_predictions_model_version ON ml_predictions (model_version);


-- ── feature_store ─────────────────────────────────────────────────────────────
-- Layer 9: the exact ML input features used (audit trail for retraining)
CREATE TABLE feature_store (
    id                      BIGSERIAL   PRIMARY KEY,
    run_at                  TEXT        NOT NULL,
    company_id              BIGINT      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date                    DATE        NOT NULL,
    debt_to_equity          FLOAT8,
    current_ratio           FLOAT8,
    revenue_growth          FLOAT8,
    sector_correlation_60d  FLOAT8,
    sector_health_score     FLOAT8,
    hhi_concentration       FLOAT8,
    institutional_holding   FLOAT8,

    CONSTRAINT uq_feature_store UNIQUE (company_id, date)
);
CREATE INDEX idx_feature_store_company_date ON feature_store (company_id, date);


-- =============================================================================
-- SEED LOOKUP TABLES  (known sectors)
-- =============================================================================

INSERT INTO sectors (name, ticker) VALUES
    ('Bank Nifty',    '^NSEBANK'),
    ('IT Sector',     '^CNXIT'),
    ('Auto Sector',   '^CNXAUTO'),
    ('Metal Sector',  '^CNXMETAL'),
    ('Realty Sector', '^CNXREALTY'),
    ('FMCG Sector',   '^CNXFMCG'),
    ('Pharma Sector', '^CNXPHARMA'),
    ('Energy Sector', '^CNXENERGY'),
    ('Gold',          'GC=F'),
    ('Crude Oil',     'CL=F'),
    ('USD-INR',       'INR=X'),
    ('India VIX',     '^INDIAVIX')
ON CONFLICT (name) DO NOTHING;


-- =============================================================================
-- SCHEMA PATCH v2.1  — run in Supabase SQL Editor after the base schema
-- =============================================================================

-- ── Add market_phase to sector_health ────────────────────────────────────────
ALTER TABLE sector_health
    ADD COLUMN IF NOT EXISTS market_phase TEXT;   -- e.g. "Distribution Phase"

-- ── macro_overlay ─────────────────────────────────────────────────────────────
-- Daily macro risk regime derived from VIX, USD-INR, Gold, Crude Oil
DROP TABLE IF EXISTS macro_overlay CASCADE;
CREATE TABLE macro_overlay (
    id               BIGSERIAL   PRIMARY KEY,
    run_at           TEXT        NOT NULL,
    date             DATE        NOT NULL,
    macro_regime     TEXT        NOT NULL,   -- RISK_OFF / RISK_ON / NEUTRAL
    macro_score      FLOAT8,                 -- composite z-score (negative = risk-off)
    vix_z            FLOAT8,
    usd_z            FLOAT8,
    gold_z           FLOAT8,
    crude_z          FLOAT8,
    macro_narrative  TEXT,

    CONSTRAINT uq_macro_overlay UNIQUE (date)
);
CREATE INDEX idx_macro_overlay_date   ON macro_overlay (date);
CREATE INDEX idx_macro_overlay_regime ON macro_overlay (macro_regime);
