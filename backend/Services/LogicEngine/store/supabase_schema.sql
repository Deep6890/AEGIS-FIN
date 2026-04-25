-- =============================================================================
-- AEGIS-FIN  —  Supabase / PostgreSQL Schema
-- =============================================================================
-- Execution order is dependency-safe:
--   extensions → sectors → companies (FK to sectors) → lookup tables
--   → time-series tables → functions → triggers → views → seed data
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0.  Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- =============================================================================
-- 1.  LOOKUP / DIMENSION TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1a.  sectors  (created FIRST — companies has a FK to this table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sectors (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT        NOT NULL,
    yf_ticker   TEXT        NOT NULL,
    sector_type TEXT        NOT NULL DEFAULT 'sector',  -- sector | macro
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT sectors_name_uq UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_sectors_name   ON sectors (name);
CREATE INDEX IF NOT EXISTS idx_sectors_type   ON sectors (sector_type);
CREATE INDEX IF NOT EXISTS idx_sectors_ticker ON sectors (yf_ticker);


-- ---------------------------------------------------------------------------
-- 1b.  companies  (FK to sectors declared inline — sectors exists above)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker      TEXT        NOT NULL,
    name        TEXT        NOT NULL,
    exchange    TEXT        NOT NULL DEFAULT 'NSE',
    sector_id   UUID        REFERENCES sectors(id) ON DELETE SET NULL,
    market_cap  NUMERIC(20,2),
    currency    TEXT        NOT NULL DEFAULT 'INR',
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT companies_ticker_exchange_uq UNIQUE (ticker, exchange)
);

CREATE INDEX IF NOT EXISTS idx_companies_ticker    ON companies (ticker);
CREATE INDEX IF NOT EXISTS idx_companies_sector    ON companies (sector_id);
CREATE INDEX IF NOT EXISTS idx_companies_active    ON companies (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING GIN (name gin_trgm_ops);


-- ---------------------------------------------------------------------------
-- 1c.  ratio_definitions  (20 financial ratios)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratio_definitions (
    id               SMALLSERIAL PRIMARY KEY,
    name             TEXT        NOT NULL,
    category         TEXT        NOT NULL,
    description      TEXT,
    higher_is_better BOOLEAN     NOT NULL DEFAULT TRUE,

    CONSTRAINT ratio_def_name_uq UNIQUE (name)
);

INSERT INTO ratio_definitions (name, category, description, higher_is_better) VALUES
  ('Gross Margin %',       'Profitability', 'Gross profit / Revenue',                        TRUE),
  ('Net Profit Margin %',  'Profitability', 'Net income / Revenue',                          TRUE),
  ('EBITDA Margin %',      'Profitability', 'EBITDA / Revenue',                              TRUE),
  ('ROE %',                'Profitability', 'Net income / Shareholders equity',              TRUE),
  ('ROA %',                'Profitability', 'Net income / Total assets',                     TRUE),
  ('Current Ratio',        'Liquidity',     'Current assets / Current liabilities',          TRUE),
  ('Quick Ratio',          'Liquidity',     '(Current assets - Inventory) / Current liab.', TRUE),
  ('Cash Ratio',           'Liquidity',     'Cash / Current liabilities',                    TRUE),
  ('Debt/Equity',          'Leverage',      'Total debt / Shareholders equity',              FALSE),
  ('Debt/Assets',          'Leverage',      'Total debt / Total assets',                     FALSE),
  ('Interest Coverage',    'Leverage',      'EBIT / Interest expense',                       TRUE),
  ('Asset Turnover',       'Efficiency',    'Revenue / Average total assets',                TRUE),
  ('Inventory Turnover',   'Efficiency',    'COGS / Average inventory',                      TRUE),
  ('Receivables Turnover', 'Efficiency',    'Revenue / Average receivables',                 TRUE),
  ('CFO/Net Income',       'CashFlow',      'Operating cash flow / Net income',              TRUE),
  ('FCF Margin %',         'CashFlow',      'Free cash flow / Revenue',                      TRUE),
  ('Revenue Growth %',     'Growth',        'YoY revenue growth',                            TRUE),
  ('Net Income Growth %',  'Growth',        'YoY net income growth',                         TRUE),
  ('Equity Ratio',         'Capital',       'Shareholders equity / Total assets',            TRUE),
  ('Equity Growth %',      'Capital',       'YoY shareholders equity growth',                TRUE)
ON CONFLICT (name) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 1d.  holding_metric_definitions  (5 shareholding metrics)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS holding_metric_definitions (
    id          SMALLSERIAL PRIMARY KEY,
    name        TEXT        NOT NULL,
    category    TEXT        NOT NULL,
    description TEXT,

    CONSTRAINT holding_metric_def_name_uq UNIQUE (name)
);

INSERT INTO holding_metric_definitions (name, category, description) VALUES
  ('Institutional Ownership %',  'Ownership',     '% held by institutions'),
  ('Insider Ownership %',        'Ownership',     '% held by insiders/promoters'),
  ('Holder Concentration (HHI)', 'Concentration', 'HHI of top holders (0=diversified, 1=single)'),
  ('Insider Net Buy %',          'Activity',      'Net insider buy % over lookback window'),
  ('Annualised Volatility 30d',  'Risk',          '30-day annualised price volatility')
ON CONFLICT (name) DO NOTHING;


-- =============================================================================
-- 2.  OHLCV RAW  (daily price data)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ohlcv_raw (
    id          BIGSERIAL,
    company_id  UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date        DATE          NOT NULL,
    open        NUMERIC(20,6),
    high        NUMERIC(20,6),
    low         NUMERIC(20,6),
    close       NUMERIC(20,6) NOT NULL,
    volume      BIGINT,
    adj_close   NUMERIC(20,6),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT ohlcv_raw_company_date_pk PRIMARY KEY (company_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ohlcv_raw_date         ON ohlcv_raw (date DESC);
CREATE INDEX IF NOT EXISTS idx_ohlcv_raw_company_date ON ohlcv_raw (company_id, date DESC);


CREATE TABLE IF NOT EXISTS sector_ohlcv_raw (
    id          BIGSERIAL,
    sector_id   UUID          NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    date        DATE          NOT NULL,
    open        NUMERIC(20,6),
    high        NUMERIC(20,6),
    low         NUMERIC(20,6),
    close       NUMERIC(20,6) NOT NULL,
    volume      BIGINT,
    adj_close   NUMERIC(20,6),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT sector_ohlcv_raw_sector_date_pk PRIMARY KEY (sector_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sector_ohlcv_date ON sector_ohlcv_raw (date DESC);
CREATE INDEX IF NOT EXISTS idx_sector_ohlcv_sid  ON sector_ohlcv_raw (sector_id, date DESC);


-- =============================================================================
-- 3.  HEALTH TABLES  (daily computed metrics)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ohlcv_health (
    id           BIGSERIAL,
    company_id   UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date         DATE          NOT NULL,
    close        NUMERIC(20,6),
    daily_return NUMERIC(20,8),
    ema_short    NUMERIC(20,6),
    ema_long     NUMERIC(20,6),
    trend        TEXT,
    spike_up     BOOLEAN,
    spike_down   BOOLEAN,
    ret_z        NUMERIC(10,6),
    vol_z        NUMERIC(10,6),
    momentum_z   NUMERIC(10,6),
    slope_z      NUMERIC(10,6),
    composite    NUMERIC(10,6),
    health_score NUMERIC(6,2),
    signal       TEXT,
    regime       TEXT,
    market_phase TEXT,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT ohlcv_health_company_date_pk PRIMARY KEY (company_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ohlcv_health_date     ON ohlcv_health (date DESC);
CREATE INDEX IF NOT EXISTS idx_ohlcv_health_signal   ON ohlcv_health (signal);
CREATE INDEX IF NOT EXISTS idx_ohlcv_health_score    ON ohlcv_health (health_score DESC);
CREATE INDEX IF NOT EXISTS idx_ohlcv_health_cid_date ON ohlcv_health (company_id, date DESC);


CREATE TABLE IF NOT EXISTS sector_health (
    id           BIGSERIAL,
    sector_id    UUID          NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    date         DATE          NOT NULL,
    close        NUMERIC(20,6),
    daily_return NUMERIC(20,8),
    ema_short    NUMERIC(20,6),
    ema_long     NUMERIC(20,6),
    trend        TEXT,
    spike_up     BOOLEAN,
    spike_down   BOOLEAN,
    ret_z        NUMERIC(10,6),
    vol_z        NUMERIC(10,6),
    momentum_z   NUMERIC(10,6),
    slope_z      NUMERIC(10,6),
    composite    NUMERIC(10,6),
    health_score NUMERIC(6,2),
    signal       TEXT,
    regime       TEXT,
    market_phase TEXT,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT sector_health_sector_date_pk PRIMARY KEY (sector_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sector_health_date ON sector_health (date DESC);
CREATE INDEX IF NOT EXISTS idx_sector_health_sig  ON sector_health (signal);
CREATE INDEX IF NOT EXISTS idx_sector_health_sid  ON sector_health (sector_id, date DESC);


-- =============================================================================
-- 4.  FINANCIAL FUNDAMENTALS  (quarterly)
-- =============================================================================

CREATE TABLE IF NOT EXISTS balance_sheet_ratios (
    id               BIGSERIAL,
    company_id       UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ratio_id         SMALLINT      NOT NULL REFERENCES ratio_definitions(id),
    period           TEXT          NOT NULL,
    value            NUMERIC(20,6),
    yoy_pct          NUMERIC(12,4),
    hist_pct_rank    NUMERIC(8,4),
    status           TEXT,
    adjusted_status  TEXT,
    trend            TEXT,
    sector_direction TEXT,
    sector_pressure  NUMERIC(8,4),
    sector_narrative TEXT,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT bs_ratios_pk PRIMARY KEY (company_id, ratio_id, period)
);

CREATE INDEX IF NOT EXISTS idx_bs_ratios_company_period ON balance_sheet_ratios (company_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_bs_ratios_ratio          ON balance_sheet_ratios (ratio_id);
CREATE INDEX IF NOT EXISTS idx_bs_ratios_status         ON balance_sheet_ratios (status);
CREATE INDEX IF NOT EXISTS idx_bs_ratios_period         ON balance_sheet_ratios (period DESC);


CREATE TABLE IF NOT EXISTS balance_sheet_hist (
    id          BIGSERIAL,
    company_id  UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ratio_id    SMALLINT      NOT NULL REFERENCES ratio_definitions(id),
    date        DATE          NOT NULL,
    value       NUMERIC(20,6),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT bs_hist_pk PRIMARY KEY (company_id, ratio_id, date)
);

CREATE INDEX IF NOT EXISTS idx_bs_hist_company_date ON balance_sheet_hist (company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bs_hist_ratio        ON balance_sheet_hist (ratio_id);


-- =============================================================================
-- 5.  SHAREHOLDING  (quarterly)
-- =============================================================================

CREATE TABLE IF NOT EXISTS stock_holding (
    id               BIGSERIAL,
    company_id       UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    metric_id        SMALLINT      NOT NULL REFERENCES holding_metric_definitions(id),
    period           TEXT          NOT NULL,
    value            NUMERIC(20,6),
    status           TEXT,
    adjusted_status  TEXT,
    trend            TEXT,
    holding_signal   TEXT,
    sector_signal    TEXT,
    sector_pressure  NUMERIC(8,4),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT stock_holding_pk PRIMARY KEY (company_id, metric_id, period)
);

CREATE INDEX IF NOT EXISTS idx_holding_company_period ON stock_holding (company_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_holding_metric         ON stock_holding (metric_id);
CREATE INDEX IF NOT EXISTS idx_holding_signal         ON stock_holding (holding_signal);


-- =============================================================================
-- 6.  CORRELATION  (daily JSONB blob)
-- =============================================================================

CREATE TABLE IF NOT EXISTS correlation (
    id                 BIGSERIAL,
    company_id         UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date               DATE          NOT NULL,
    windows            JSONB,
    company_vs_sectors JSONB,
    top_sectors        JSONB,
    health_by_top      JSONB,
    relative_growth    JSONB,
    relative_spikes    JSONB,
    sift_latest        JSONB,
    insights           JSONB,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT correlation_pk PRIMARY KEY (company_id, date)
);

CREATE INDEX IF NOT EXISTS idx_correlation_date    ON correlation (date DESC);
CREATE INDEX IF NOT EXISTS idx_correlation_cid     ON correlation (company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_correlation_top_gin ON correlation USING GIN (top_sectors);


-- =============================================================================
-- 7.  CLASSIFIER  (daily JSONB blob)
-- =============================================================================

CREATE TABLE IF NOT EXISTS classifier (
    id                BIGSERIAL,
    company_id        UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date              DATE          NOT NULL,
    composite_score   NUMERIC(6,2),
    composite_tier    TEXT,
    composite_grade   TEXT,
    price_score       NUMERIC(6,2),
    fundamental_score NUMERIC(6,2),
    ownership_score   NUMERIC(6,2),
    sector_fit_score  NUMERIC(6,2),
    dimensions        JSONB,
    composite         JSONB,
    filter            JSONB,
    summary           JSONB,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT classifier_pk PRIMARY KEY (company_id, date)
);

CREATE INDEX IF NOT EXISTS idx_classifier_date      ON classifier (date DESC);
CREATE INDEX IF NOT EXISTS idx_classifier_cid       ON classifier (company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_classifier_composite ON classifier (composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_classifier_tier      ON classifier (composite_tier);
CREATE INDEX IF NOT EXISTS idx_classifier_top_tiers ON classifier (date DESC, composite_score DESC)
    WHERE composite_tier IN ('TIER_1', 'TIER_2');


-- =============================================================================
-- 8.  RETENTION FUNCTIONS
-- =============================================================================

-- Company-keyed tables (ohlcv_raw, ohlcv_health, correlation, classifier,
--                       balance_sheet_ratios, balance_sheet_hist, stock_holding)
CREATE OR REPLACE FUNCTION trim_retention(
    p_table      TEXT,
    p_company_id UUID,
    p_max_rows   INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_date_col TEXT;
    v_sql      TEXT;
BEGIN
    v_date_col := CASE p_table
        WHEN 'balance_sheet_ratios' THEN 'period'
        WHEN 'stock_holding'        THEN 'period'
        ELSE 'date'
    END;

    -- Build and execute a parameterised DELETE that removes rows beyond the
    -- retention window. %I = identifier quoting, %L = literal quoting.
    v_sql := format(
        'DELETE FROM %I WHERE company_id = %L AND %I IN ('
        '  SELECT %I FROM %I WHERE company_id = %L'
        '  ORDER BY %I DESC OFFSET %s'
        ')',
        p_table,
        p_company_id,
        v_date_col,
        v_date_col,
        p_table,
        p_company_id,
        v_date_col,
        p_max_rows
    );

    EXECUTE v_sql;
END;
$$;


-- Sector-keyed tables (sector_ohlcv_raw, sector_health)
CREATE OR REPLACE FUNCTION trim_retention_sector(
    p_table     TEXT,
    p_sector_id UUID,
    p_max_rows  INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_sql TEXT;
BEGIN
    v_sql := format(
        'DELETE FROM %I WHERE sector_id = %L AND date IN ('
        '  SELECT date FROM %I WHERE sector_id = %L'
        '  ORDER BY date DESC OFFSET %s'
        ')',
        p_table,
        p_sector_id,
        p_table,
        p_sector_id,
        p_max_rows
    );

    EXECUTE v_sql;
END;
$$;


-- =============================================================================
-- 9.  UPDATED_AT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_bs_ratios_updated_at
    BEFORE UPDATE ON balance_sheet_ratios
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_holding_updated_at
    BEFORE UPDATE ON stock_holding
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- 10.  VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW v_classifier_latest AS
SELECT DISTINCT ON (c.company_id)
    co.ticker,
    co.name,
    c.date,
    c.composite_score,
    c.composite_tier,
    c.composite_grade,
    c.price_score,
    c.fundamental_score,
    c.ownership_score,
    c.sector_fit_score
FROM classifier c
JOIN companies co ON co.id = c.company_id
ORDER BY c.company_id, c.date DESC;


CREATE OR REPLACE VIEW v_ohlcv_health_latest AS
SELECT DISTINCT ON (h.company_id)
    co.ticker,
    co.name,
    h.date,
    h.close,
    h.health_score,
    h.signal,
    h.regime,
    h.market_phase,
    h.trend
FROM ohlcv_health h
JOIN companies co ON co.id = h.company_id
ORDER BY h.company_id, h.date DESC;


CREATE OR REPLACE VIEW v_sector_health_latest AS
SELECT DISTINCT ON (sh.sector_id)
    s.name        AS sector,
    s.sector_type,
    sh.date,
    sh.health_score,
    sh.signal,
    sh.regime,
    sh.market_phase
FROM sector_health sh
JOIN sectors s ON s.id = sh.sector_id
ORDER BY sh.sector_id, sh.date DESC;


CREATE OR REPLACE VIEW v_top_picks AS
SELECT
    co.ticker,
    co.name,
    c.date,
    c.composite_score,
    c.composite_tier,
    c.composite_grade,
    c.price_score,
    c.fundamental_score,
    c.ownership_score,
    c.sector_fit_score
FROM classifier c
JOIN companies co ON co.id = c.company_id
WHERE c.date = (SELECT MAX(date) FROM classifier)
  AND c.composite_tier IN ('TIER_1', 'TIER_2')
ORDER BY c.composite_score DESC;


CREATE OR REPLACE VIEW v_balance_sheet_latest AS
SELECT
    co.ticker,
    co.name,
    bsr.period,
    rd.name     AS ratio,
    rd.category,
    bsr.value,
    bsr.yoy_pct,
    bsr.hist_pct_rank,
    bsr.status,
    bsr.adjusted_status,
    bsr.trend
FROM balance_sheet_ratios bsr
JOIN companies    co ON co.id  = bsr.company_id
JOIN ratio_definitions rd ON rd.id = bsr.ratio_id
WHERE bsr.period = (
    SELECT MAX(b2.period)
    FROM balance_sheet_ratios b2
    WHERE b2.company_id = bsr.company_id
)
ORDER BY co.ticker, rd.category, rd.name;


-- =============================================================================
-- 11.  ROW-LEVEL SECURITY  (uncomment after adding Supabase auth)
-- =============================================================================
-- ALTER TABLE companies              ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ohlcv_raw              ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ohlcv_health           ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sector_ohlcv_raw       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sector_health          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE balance_sheet_ratios   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE balance_sheet_hist     ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_holding          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE correlation            ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE classifier             ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "service_role_all" ON companies
--     FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
-- (repeat for each table)


-- =============================================================================
-- 12.  SEED DATA  (idempotent — safe to re-run)
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
