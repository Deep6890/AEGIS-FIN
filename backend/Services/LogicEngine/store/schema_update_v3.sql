-- =============================================================================
-- AEGIS-FIN  Schema Update v3
-- Run in Supabase SQL Editor AFTER truncating all data
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: TRUNCATE ALL DATA (fresh start)
-- ---------------------------------------------------------------------------
TRUNCATE TABLE classifier          CASCADE;
TRUNCATE TABLE correlation         CASCADE;
TRUNCATE TABLE stock_holding       CASCADE;
TRUNCATE TABLE balance_sheet_hist  CASCADE;
TRUNCATE TABLE balance_sheet_ratios CASCADE;
TRUNCATE TABLE ohlcv_health        CASCADE;
TRUNCATE TABLE ohlcv_raw           CASCADE;
TRUNCATE TABLE sector_health       CASCADE;
TRUNCATE TABLE sector_ohlcv_raw    CASCADE;
TRUNCATE TABLE pipeline_log        CASCADE;
-- Keep: companies, sectors, ratio_definitions, holding_metric_definitions
-- Keep: user_profiles, csv_sessions

-- ---------------------------------------------------------------------------
-- STEP 2: Add insight columns to balance_sheet_ratios
-- ---------------------------------------------------------------------------
ALTER TABLE balance_sheet_ratios
    ADD COLUMN IF NOT EXISTS insight          TEXT,
    ADD COLUMN IF NOT EXISTS insight_severity TEXT DEFAULT 'neutral';
    -- insight_severity: positive | negative | neutral | warning

-- ---------------------------------------------------------------------------
-- STEP 3: Expand holding_metric_definitions with new metrics
-- ---------------------------------------------------------------------------
INSERT INTO holding_metric_definitions (name, category, description) VALUES
  ('Public Float %',             'Ownership',     '% shares available for public trading'),
  ('Top 10 Holders %',           'Concentration', '% held by top 10 institutional holders'),
  ('Promoter Holding %',         'Ownership',     '% held by promoters/founders'),
  ('FII Holding %',              'Ownership',     '% held by Foreign Institutional Investors'),
  ('DII Holding %',              'Ownership',     '% held by Domestic Institutional Investors'),
  ('Shares Outstanding (Cr)',    'Size',          'Total shares outstanding in crores'),
  ('52W High Distance %',        'Price',         '% below 52-week high'),
  ('52W Low Distance %',         'Price',         '% above 52-week low')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- STEP 4: Add insight + breakdown columns to stock_holding
-- ---------------------------------------------------------------------------
ALTER TABLE stock_holding
    ADD COLUMN IF NOT EXISTS insight          TEXT,
    ADD COLUMN IF NOT EXISTS insight_severity TEXT DEFAULT 'neutral',
    ADD COLUMN IF NOT EXISTS raw_breakdown    JSONB;
    -- raw_breakdown: stores top holder names/percentages for pie chart

-- ---------------------------------------------------------------------------
-- STEP 5: Add sector_companies view — which companies correlate with each sector
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_sector_companies AS
SELECT
    s.name                                          AS sector_name,
    s.sector_type,
    co.id                                           AS company_id,
    co.ticker,
    co.name                                         AS company_name,
    (corr.top_sectors -> 0 ->> 'corr_60d')::FLOAT  AS corr_60d,
    (corr.top_sectors -> 0 ->> 'corr_100d')::FLOAT AS corr_100d,
    corr.date                                       AS corr_date
FROM correlation corr
JOIN companies co ON co.id = corr.company_id
CROSS JOIN LATERAL (
    SELECT elem
    FROM jsonb_array_elements(corr.top_sectors) AS elem
    WHERE elem ->> 'sector' = s.name
    LIMIT 1
) matched
JOIN sectors s ON s.name = matched.elem ->> 'sector'
WHERE corr.date = (
    SELECT MAX(c2.date) FROM correlation c2 WHERE c2.company_id = corr.company_id
)
ORDER BY s.name, (matched.elem ->> 'corr_60d')::FLOAT DESC NULLS LAST;

-- ---------------------------------------------------------------------------
-- STEP 6: Add balance sheet insights view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_balance_sheet_insights AS
SELECT
    co.ticker,
    co.name,
    bsr.period,
    rd.name        AS ratio,
    rd.category,
    rd.higher_is_better,
    bsr.value,
    bsr.yoy_pct,
    bsr.hist_pct_rank,
    bsr.status,
    bsr.adjusted_status,
    bsr.trend,
    bsr.sector_direction,
    bsr.sector_pressure,
    bsr.insight,
    bsr.insight_severity
FROM balance_sheet_ratios bsr
JOIN companies co ON co.id = bsr.company_id
JOIN ratio_definitions rd ON rd.id = bsr.ratio_id
WHERE bsr.value IS NOT NULL   -- no nulls
  AND bsr.period = (
    SELECT MAX(b2.period)
    FROM balance_sheet_ratios b2
    WHERE b2.company_id = bsr.company_id
  )
ORDER BY co.ticker, rd.category, rd.name;

-- ---------------------------------------------------------------------------
-- STEP 7: Add holding insights view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_holding_insights AS
SELECT
    co.ticker,
    co.name,
    sh.period,
    hmd.name       AS metric,
    hmd.category,
    sh.value,
    sh.status,
    sh.adjusted_status,
    sh.trend,
    sh.holding_signal,
    sh.sector_signal,
    sh.sector_pressure,
    sh.insight,
    sh.insight_severity,
    sh.raw_breakdown
FROM stock_holding sh
JOIN companies co ON co.id = sh.company_id
JOIN holding_metric_definitions hmd ON hmd.id = sh.metric_id
WHERE sh.value IS NOT NULL   -- no nulls
  AND sh.period = (
    SELECT MAX(s2.period)
    FROM stock_holding s2
    WHERE s2.company_id = sh.company_id
  )
ORDER BY co.ticker, hmd.category, hmd.name;

-- ---------------------------------------------------------------------------
-- STEP 8: RLS for new views (views inherit table RLS)
-- ---------------------------------------------------------------------------
-- Views use the underlying table RLS — no additional policies needed.
-- The anon_read policies on balance_sheet_ratios and stock_holding
-- already cover these views.
