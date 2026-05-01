-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.balance_sheet_scores (
  company_id uuid NOT NULL,
  ratio_id smallint NOT NULL,
  period text NOT NULL,
  value numeric,
  yoy_pct numeric,
  hist_pct_rank numeric,
  sector_pressure numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text,
  adjusted_status text,
  trend text,
  CONSTRAINT balance_sheet_scores_pkey PRIMARY KEY (company_id, ratio_id, period),
  CONSTRAINT balance_sheet_scores_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT balance_sheet_scores_ratio_id_fkey FOREIGN KEY (ratio_id) REFERENCES public.ratio_definitions(id)
);
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ticker text NOT NULL UNIQUE,
  name text NOT NULL,
  exchange text NOT NULL DEFAULT 'NSE'::text,
  sector_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id),
  CONSTRAINT companies_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id)
);
CREATE TABLE public.company_insights (
  company_id uuid NOT NULL,
  date date NOT NULL,
  insight_score numeric,
  final_score numeric,
  class text,
  trend_score numeric,
  fundamental_score numeric,
  sentiment_score numeric,
  sector_alignment_score numeric,
  momentum numeric,
  risk numeric,
  strength numeric,
  summary text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT company_insights_pkey PRIMARY KEY (company_id, date),
  CONSTRAINT company_insights_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.correlation_scores (
  company_id uuid NOT NULL,
  sector_id uuid NOT NULL,
  date date NOT NULL,
  corr_20d numeric,
  corr_60d numeric,
  corr_100d numeric,
  corr_full numeric,
  outperf_20d numeric,
  outperf_60d numeric,
  outperf_100d numeric,
  aligned_up_pct numeric,
  aligned_dn_pct numeric,
  avg_top_health numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT correlation_scores_pkey PRIMARY KEY (company_id, sector_id, date),
  CONSTRAINT correlation_scores_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT correlation_scores_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id)
);
CREATE TABLE public.holding_metric_definitions (
  id smallint NOT NULL DEFAULT nextval('holding_metric_definitions_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  CONSTRAINT holding_metric_definitions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.holding_scores (
  company_id uuid NOT NULL,
  metric_id smallint NOT NULL,
  period text NOT NULL,
  value numeric,
  hist_pct_rank numeric,
  sector_pressure numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text,
  adjusted_status text,
  trend text,
  CONSTRAINT holding_scores_pkey PRIMARY KEY (company_id, metric_id, period),
  CONSTRAINT holding_scores_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT holding_scores_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES public.holding_metric_definitions(id)
);
CREATE TABLE public.ohlcv_health (
  company_id uuid NOT NULL,
  date date NOT NULL,
  daily_return numeric,
  cum_change_1m numeric,
  cum_change_1y numeric,
  cum_change_2y numeric,
  close_z numeric,
  ret_z numeric,
  z_change numeric,
  cum_z_change numeric,
  spike_up boolean,
  spike_down boolean,
  oc_spark numeric,
  volatility numeric,
  composite numeric,
  health_score numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ohlcv_health_pkey PRIMARY KEY (company_id, date),
  CONSTRAINT ohlcv_health_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.ohlcv_raw (
  company_id uuid NOT NULL,
  date date NOT NULL,
  open numeric,
  high numeric,
  low numeric,
  close numeric NOT NULL,
  volume bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ohlcv_raw_pkey PRIMARY KEY (company_id, date),
  CONSTRAINT ohlcv_raw_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.ratio_definitions (
  id smallint NOT NULL DEFAULT nextval('ratio_definitions_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  higher_is_better boolean NOT NULL DEFAULT true,
  CONSTRAINT ratio_definitions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sector_health (
  sector_id uuid NOT NULL,
  date date NOT NULL,
  daily_return numeric,
  cum_change_1m numeric,
  cum_change_1y numeric,
  cum_change_2y numeric,
  close_z numeric,
  ret_z numeric,
  z_change numeric,
  cum_z_change numeric,
  spike_up boolean,
  spike_down boolean,
  oc_spark numeric,
  volatility numeric,
  composite numeric,
  health_score numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sector_health_pkey PRIMARY KEY (sector_id, date),
  CONSTRAINT sector_health_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id)
);
CREATE TABLE public.sector_ohlcv_raw (
  sector_id uuid NOT NULL,
  date date NOT NULL,
  open numeric,
  high numeric,
  low numeric,
  close numeric NOT NULL,
  volume bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sector_ohlcv_raw_pkey PRIMARY KEY (sector_id, date),
  CONSTRAINT sector_ohlcv_raw_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id)
);
CREATE TABLE public.sectors (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  yf_ticker text NOT NULL,
  sector_type text NOT NULL DEFAULT 'sector'::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sectors_pkey PRIMARY KEY (id)
);