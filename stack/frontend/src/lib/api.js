import { supabase } from "./supabase";

// ── Companies ─────────────────────────────────────────────────────────────────
export const fetchCompanies = () =>
  supabase.from("companies").select("*").order("name");

export const fetchCompanyById = (id) =>
  supabase.from("companies").select("*").eq("id", id).single();

// Fetch companies filtered by a list of tickers (for CSV mode)
export const fetchCompaniesByTickers = (tickers) =>
  supabase.from("companies").select("*").in("ticker", tickers).order("name");

// Check which tickers already exist in DB — returns {existing: [], missing: []}
export const checkTickersInDB = async (tickers) => {
  const { data, error } = await supabase
    .from("companies")
    .select("ticker, name, id")
    .in("ticker", tickers);
  if (error) return { existing: [], missing: tickers, error };
  const existingTickers = new Set((data || []).map(r => r.ticker));
  return {
    existing: data || [],
    missing:  tickers.filter(t => !existingTickers.has(t)),
    error:    null,
  };
};

// ── Sectors ───────────────────────────────────────────────────────────────────
export const fetchSectors = () =>
  supabase.from("sectors").select("*").order("name");

// ── Sector Metrics ────────────────────────────────────────────────────────────
export const fetchLatestSectorMetrics = () =>
  supabase
    .from("sector_metrics")
    .select("*, sectors(name, ticker)")
    .order("date", { ascending: false })
    .limit(60); // ~10 sectors × last 6 days

export const fetchSectorMetricsHistory = (sectorId, days = 90) =>
  supabase
    .from("sector_metrics")
    .select("*")
    .eq("sector_id", sectorId)
    .order("date", { ascending: true })
    .limit(60); // Reduced from 90 to 60 days

// ── Sector Health ─────────────────────────────────────────────────────────────
export const fetchLatestSectorHealth = () =>
  supabase
    .from("sector_health")
    .select("*, sectors(name)")
    .order("date", { ascending: false })
    .limit(60); // Reduced from 120

export const fetchSectorHealthHistory = (sectorId, days = 90) =>
  supabase
    .from("sector_health")
    .select("*")
    .eq("sector_id", sectorId)
    .order("date", { ascending: true })
    .limit(60); // Reduced from 90 to 60 days

// ── Company Metrics ───────────────────────────────────────────────────────────
export const fetchLatestCompanyMetrics = (companyId) =>
  supabase
    .from("company_metrics")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(60); // Reduced from 90 to 60 days

// ── Correlation ───────────────────────────────────────────────────────────────
export const fetchStaticCorr = (companyId) =>
  supabase
    .from("static_corr")
    .select("*, sectors(name)")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(50);

export const fetchRollingCorr = (companyId, windowDays = 60) =>
  supabase
    .from("rolling_corr")
    .select("*, sectors(name)")
    .eq("company_id", companyId)
    .eq("window_days", windowDays)
    .order("date", { ascending: true })
    .limit(100); // Reduced from 200 to 100

export const fetchTopSectors = (companyId) =>
  supabase
    .from("top_sectors")
    .select("*, sectors(name)")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .order("rank", { ascending: true })
    .limit(20);

// ── Balance Sheet ─────────────────────────────────────────────────────────────
export const fetchBalanceSheet = (companyId) =>
  supabase
    .from("balance_sheet")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(50); // Reduced from 100 to 50

export const fetchBalanceSheetHistory = (companyId, ratio) =>
  supabase
    .from("balance_sheet_history")
    .select("*")
    .eq("company_id", companyId)
    .eq("ratio", ratio)
    .order("date", { ascending: true })
    .limit(40);

// ── Holding Metrics ───────────────────────────────────────────────────────────
export const fetchHoldingMetrics = (companyId) =>
  supabase
    .from("holding_metrics")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(50);

// ── ML Predictions ────────────────────────────────────────────────────────────
export const fetchMlPredictions = (companyId) =>
  supabase
    .from("ml_predictions")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(30);

export const fetchAllMlPredictions = () =>
  supabase
    .from("ml_predictions")
    .select("*, companies(name, ticker)")
    .order("date", { ascending: false })
    .limit(300); // Reduced from 600 to 300

// ── Feature Store ─────────────────────────────────────────────────────────────
export const fetchFeatureStore = (companyId) =>
  supabase
    .from("feature_store")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(30);

// ── Macro Overlay ─────────────────────────────────────────────────────────────
export const fetchMacroOverlay = (days = 90) =>
  supabase
    .from("macro_overlay")
    .select("*")
    .order("date", { ascending: true })
    .limit(days);

export const fetchLatestMacro = () =>
  supabase
    .from("macro_overlay")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

// ── Portfolio Summary (aggregated) ───────────────────────────────────────────
export const fetchPortfolioSummary = () =>
  supabase
    .from("ml_predictions")
    .select("survival_score, distress_probability, companies(name)")
    .order("date", { ascending: false })
    .limit(300); // Reduced from 600 to 300

// ── Pipeline Log ──────────────────────────────────────────────────────────────
export const fetchPipelineLog = (limit = 100) =>
  supabase
    .from("pipeline_log")
    .select("*")
    .order("run_at", { ascending: false })
    .limit(limit);

export const fetchPipelineStats = () =>
  supabase
    .from("pipeline_log")
    .select("status, company, run_at")
    .order("run_at", { ascending: false })
    .limit(200); // Reduced from 500 to 200

// ── Dashboard extras ──────────────────────────────────────────────────────────

// Latest classifier scores for all companies (for top picks)
export const fetchLatestClassifier = () =>
  supabase
    .from("classifier")
    .select("*, companies(name, ticker)")
    .order("date", { ascending: false })
    .order("composite_score", { ascending: false })
    .limit(50);

// Latest ohlcv_health for all companies (for health signals)
export const fetchLatestOhlcvHealth = () =>
  supabase
    .from("ohlcv_health")
    .select("*, companies(name, ticker)")
    .order("date", { ascending: false })
    .limit(100);

// Latest balance_sheet_ratios summary (for fundamental health)
export const fetchLatestBalanceSheetRatios = () =>
  supabase
    .from("balance_sheet_ratios")
    .select("*, companies(name, ticker), ratio_definitions(name, category)")
    .order("period", { ascending: false })
    .limit(200);

// Latest stock_holding signals
export const fetchLatestStockHolding = () =>
  supabase
    .from("stock_holding")
    .select("*, companies(name, ticker), holding_metric_definitions(name, category)")
    .order("period", { ascending: false })
    .limit(100);
