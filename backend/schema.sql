-- =============================================================================
-- AEGIS-FIN  —  Supabase / PostgreSQL Schema  (numeric scores only, 3NF)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- 1.  DIMENSION TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS sectors (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT        NOT NULL,
    yf_ticker   TEXT        NOT NULL,
    sector_type TEXT        NOT NULL DEFAULT 'sector',
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT sectors_name_uq UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_sectors_name ON sectors (name);


CREATE TABLE IF NOT EXISTS companies (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker      TEXT        NOT NULL,
    name        TEXT        NOT NULL,
    exchange    TEXT        NOT NULL DEFAULT 'NSE',
    sector_id   UUID        REFERENCES sectors(id) ON DELETE SET NULL,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT companies_ticker_uq UNIQUE (ticker)
);

CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies (ticker);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies (sector_id);


CREATE TABLE IF NOT EXISTS ratio_definitions (
    id               SMALLSERIAL PRIMARY KEY,
    name             TEXT        NOT NULL,
    category         TEXT        NOT NULL,
    higher_is_better BOOLEAN     NOT NULL DEFAULT TRUE,
    CONSTRAINT ratio_def_name_uq UNIQUE (name)
);

INSERT INTO ratio_definitions (name, category, higher_is_better) VALUES
  ('Gross Margin %',                  'Profitability', TRUE),
  ('Net Profit Margin %',             'Profitability', TRUE),
  ('EBITDA Margin %',                 'Profitability', TRUE),
  ('ROE %',                           'Profitability', TRUE),
  ('ROA %',                           'Profitability', TRUE),
  ('Current Ratio',                   'Liquidity',     TRUE),
  ('Quick Ratio',                     'Liquidity',     TRUE),
  ('Cash Ratio',                      'Liquidity',     TRUE),
  ('Debt/Equity',                     'Leverage',      FALSE),
  ('Debt/Assets',                     'Leverage',      FALSE),
  ('Interest Coverage',               'Leverage',      TRUE),
  ('Asset Turnover',                  'Efficiency',    TRUE),
  ('Inventory Turnover',              'Efficiency',    TRUE),
  ('Receivables Turnover',            'Efficiency',    TRUE),
  ('CFO/Net Income',                  'CashFlow',      TRUE),
  ('FCF Margin %',                    'CashFlow',      TRUE),
  ('Revenue Growth %',                'Growth',        TRUE),
  ('Net Income Growth %',             'Growth',        TRUE),
  ('Equity Ratio %',                  'Capital',       TRUE),
  ('Equity Growth %',                 'Capital',       TRUE),
  ('Debt/EBITDA',                     'Leverage',      FALSE),
  ('Capex/Revenue %',                 'Efficiency',    FALSE),
  ('Cash/Assets %',                   'Profitability', TRUE),
  ('R&D/Revenue %',                   'Profitability', TRUE),
  ('Intangibles/Assets %',            'Capital',       FALSE),
  ('Equity/Assets % (Cap Adequacy)',  'Capital',       TRUE)
ON CONFLICT (name) DO NOTHING;


CREATE TABLE IF NOT EXISTS holding_metric_definitions (
    id          SMALLSERIAL PRIMARY KEY,
    name        TEXT        NOT NULL,
    category    TEXT        NOT NULL,
    CONSTRAINT holding_metric_def_name_uq UNIQUE (name)
);

INSERT INTO holding_metric_definitions (name, category) VALUES
  ('Institutional Ownership %',  'Ownership'),
  ('Insider Ownership %',        'Ownership'),
  ('Promoter Holding %',         'Ownership'),
  ('FII Holding %',              'Ownership'),
  ('DII Holding %',              'Ownership'),
  ('Public Float %',             'Ownership'),
  ('Holder Concentration (HHI)', 'Concentration'),
  ('Top 10 Holders %',           'Concentration'),
  ('Insider Net Buy %',          'Activity'),
  ('Annualised Volatility %',    'Risk'),
  ('52W High Distance %',        'Price'),
  ('52W Low Distance %',         'Price'),
  ('Market Cap (Cr)',            'Size'),
  ('Shares Outstanding (Cr)',    'Size')
ON CONFLICT (name) DO NOTHING;


-- =============================================================================
-- 2.  OHLCV RAW  (daily)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ohlcv_raw (
    company_id  UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date        DATE          NOT NULL,
    open        NUMERIC(20,6),
    high        NUMERIC(20,6),
    low         NUMERIC(20,6),
    close       NUMERIC(20,6) NOT NULL,
    volume      BIGINT,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (company_id, date)
);

-- PK (company_id, date) already creates a B-tree index used by DELETE WHERE date < cutoff
CREATE INDEX IF NOT EXISTS idx_ohlcv_raw_date ON ohlcv_raw (company_id, date DESC);


CREATE TABLE IF NOT EXISTS sector_ohlcv_raw (
    sector_id   UUID          NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    date        DATE          NOT NULL,
    open        NUMERIC(20,6),
    high        NUMERIC(20,6),
    low         NUMERIC(20,6),
    close       NUMERIC(20,6) NOT NULL,
    volume      BIGINT,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (sector_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sector_ohlcv_date ON sector_ohlcv_raw (sector_id, date DESC);


-- =============================================================================
-- 3.  OHLCV HEALTH SCORES  (daily — numeric only)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ohlcv_health (
    company_id      UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date            DATE          NOT NULL,
    daily_return    NUMERIC(20,8),
    cum_change_1m   NUMERIC(12,4),
    cum_change_1y   NUMERIC(12,4),
    cum_change_2y   NUMERIC(12,4),
    close_z         NUMERIC(10,6),
    ret_z           NUMERIC(10,6),
    z_change        NUMERIC(10,6),
    cum_z_change    NUMERIC(10,6),
    spike_up        BOOLEAN,
    spike_down      BOOLEAN,
    oc_spark        NUMERIC(10,6),
    volatility      NUMERIC(10,6),
    composite       NUMERIC(10,6),
    health_score    NUMERIC(6,2),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (company_id, date)
);

-- (company_id, date DESC) covers DELETE WHERE company_id = X AND date < cutoff
CREATE INDEX IF NOT EXISTS idx_ohlcv_health_date  ON ohlcv_health (company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ohlcv_health_score ON ohlcv_health (health_score DESC);


CREATE TABLE IF NOT EXISTS sector_health (
    sector_id       UUID          NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    date            DATE          NOT NULL,
    daily_return    NUMERIC(20,8),
    cum_change_1m   NUMERIC(12,4),
    cum_change_1y   NUMERIC(12,4),
    cum_change_2y   NUMERIC(12,4),
    close_z         NUMERIC(10,6),
    ret_z           NUMERIC(10,6),
    z_change        NUMERIC(10,6),
    cum_z_change    NUMERIC(10,6),
    spike_up        BOOLEAN,
    spike_down      BOOLEAN,
    oc_spark        NUMERIC(10,6),
    volatility      NUMERIC(10,6),
    composite       NUMERIC(10,6),
    health_score    NUMERIC(6,2),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (sector_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sector_health_date  ON sector_health (sector_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sector_health_score ON sector_health (health_score DESC);


-- =============================================================================
-- 4.  FUNDAMENTAL SCORES  (quarterly — numeric only)
-- =============================================================================

CREATE TABLE IF NOT EXISTS balance_sheet_scores (
    company_id      UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ratio_id        SMALLINT      NOT NULL REFERENCES ratio_definitions(id),
    period          TEXT          NOT NULL,
    value           NUMERIC(20,6),
    yoy_pct         NUMERIC(12,4),
    hist_pct_rank   NUMERIC(6,2),
    sector_pressure NUMERIC(8,4),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (company_id, ratio_id, period)
);

CREATE INDEX IF NOT EXISTS idx_bs_scores_company_period ON balance_sheet_scores (company_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_bs_scores_ratio          ON balance_sheet_scores (ratio_id);


CREATE TABLE IF NOT EXISTS holding_scores (
    company_id      UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    metric_id       SMALLINT      NOT NULL REFERENCES holding_metric_definitions(id),
    period          TEXT          NOT NULL,
    value           NUMERIC(20,6),
    hist_pct_rank   NUMERIC(6,2),
    sector_pressure NUMERIC(8,4),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (company_id, metric_id, period)
);

CREATE INDEX IF NOT EXISTS idx_holding_scores_company_period ON holding_scores (company_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_holding_scores_metric         ON holding_scores (metric_id);


-- =============================================================================
-- 5.  CORRELATION SCORES  (daily — numeric only)
-- =============================================================================

CREATE TABLE IF NOT EXISTS correlation_scores (
    company_id      UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sector_id       UUID          NOT NULL REFERENCES sectors(id)   ON DELETE CASCADE,
    date            DATE          NOT NULL,
    corr_20d        NUMERIC(8,6),
    corr_60d        NUMERIC(8,6),
    corr_100d       NUMERIC(8,6),
    corr_full       NUMERIC(8,6),
    outperf_20d     NUMERIC(12,4),
    outperf_60d     NUMERIC(12,4),
    outperf_100d    NUMERIC(12,4),
    aligned_up_pct  NUMERIC(6,2),
    aligned_dn_pct  NUMERIC(6,2),
    avg_top_health  NUMERIC(6,2),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (company_id, sector_id, date)
);

-- (company_id, date DESC) covers DELETE WHERE company_id = X AND date < cutoff
CREATE INDEX IF NOT EXISTS idx_corr_company_date ON correlation_scores (company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_corr_sector_date  ON correlation_scores (sector_id,  date DESC);
CREATE INDEX IF NOT EXISTS idx_corr_100d         ON correlation_scores (corr_100d  DESC);


-- =============================================================================
-- 6.  RETENTION FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION trim_company_table(
    p_table      TEXT,
    p_company_id UUID,
    p_max_rows   INT
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    EXECUTE format(
        'DELETE FROM %I WHERE company_id = %L AND date IN ('
        '  SELECT date FROM %I WHERE company_id = %L ORDER BY date DESC OFFSET %s)',
        p_table, p_company_id, p_table, p_company_id, p_max_rows
    );
END;
$$;


CREATE OR REPLACE FUNCTION trim_sector_table(
    p_table     TEXT,
    p_sector_id UUID,
    p_max_rows  INT
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    EXECUTE format(
        'DELETE FROM %I WHERE sector_id = %L AND date IN ('
        '  SELECT date FROM %I WHERE sector_id = %L ORDER BY date DESC OFFSET %s)',
        p_table, p_sector_id, p_table, p_sector_id, p_max_rows
    );
END;
$$;


-- =============================================================================
-- 7.  SEED DATA  (idempotent — safe to re-run)
-- =============================================================================

INSERT INTO sectors (name, yf_ticker, sector_type) VALUES
  ('Bank Nifty',    '^NSEBANK',   'sector'),
  ('IT Sector',     '^CNXIT',     'sector'),
  ('Auto Sector',   '^CNXAUTO',   'sector'),
  ('Metal Sector',  '^CNXMETAL',  'sector'),
  ('Realty Sector', '^CNXREALTY', 'sector'),
  ('FMCG Sector',   '^CNXFMCG',   'sector'),
  ('Pharma Sector', '^CNXPHARMA', 'sector'),
  ('Energy Sector', '^CNXENERGY', 'sector'),
  ('Nifty',         '^NSEI',      'macro'),
  ('Sensex',        '^BSESN',     'macro'),
  ('Gold',          'GC=F',       'macro'),
  ('Crude Oil',     'CL=F',       'macro'),
  ('USD-INR',       'INR=X',      'macro'),
  ('India VIX',     '^INDIAVIX',  'macro')
ON CONFLICT (name) DO NOTHING;


-- =============================================================================
-- 8.  COMPANY INSIGHTS  (daily — classifier + insight outputs)
-- =============================================================================

CREATE TABLE IF NOT EXISTS company_insights (
    company_id              UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date                    DATE          NOT NULL,
    insight_score           NUMERIC(6,2),
    final_score             NUMERIC(6,2),
    class                   TEXT,
    trend_score             NUMERIC(6,2),
    fundamental_score       NUMERIC(6,2),
    sentiment_score         NUMERIC(6,2),
    sector_alignment_score  NUMERIC(6,2),
    momentum                NUMERIC(6,2),
    risk                    NUMERIC(6,2),
    strength                NUMERIC(6,2),
    summary                 TEXT,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (company_id, date)
);

CREATE INDEX IF NOT EXISTS idx_insights_company_date  ON company_insights (company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_insights_score         ON company_insights (insight_score DESC);
CREATE INDEX IF NOT EXISTS idx_insights_class         ON company_insights (class);

-- Allow anon read for frontend
ALTER TABLE company_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_company_insights" ON company_insights;
CREATE POLICY "anon_read_company_insights" ON company_insights FOR SELECT USING (true);
