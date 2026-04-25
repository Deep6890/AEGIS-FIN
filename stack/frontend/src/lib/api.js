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
    .select(`
      ticker, name, id,
      classifier(composite_score)
    `)
    .in("ticker", tickers)
    .order('date', { foreignTable: 'classifier', ascending: false })
    .limit(1, { foreignTable: 'classifier' });

  if (error) return { existing: [], missing: tickers, error };
  
  const formattedData = (data || []).map(c => ({
    ...c,
    survival_score: c.classifier?.[0]?.composite_score || null
  }));

  const existingTickers = new Set(formattedData.map(r => r.ticker));
  return {
    existing: formattedData,
    missing:  tickers.filter(t => !existingTickers.has(t)),
    error:    null,
  };
};

// ── Sectors ───────────────────────────────────────────────────────────────────
export const fetchSectors = () =>
  supabase.from("sectors").select("*").order("name");

// ── Sector Metrics (now part of sector_health) ──────────────────────────────────
export const fetchLatestSectorMetrics = () =>
  supabase
    .from("sector_health")
    .select("*, sectors(name, yf_ticker)")
    .order("date", { ascending: false })
    .limit(60);

export const fetchSectorMetricsHistory = (sectorId, days = 90) =>
  supabase
    .from("sector_health")
    .select("*")
    .eq("sector_id", sectorId)
    .order("date", { ascending: true })
    .limit(60);

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

// ── Company Metrics (now ohlcv_health) ────────────────────────────────────────
export const fetchLatestCompanyMetrics = (companyId) =>
  supabase
    .from("ohlcv_health")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(60);

// ── Correlation ───────────────────────────────────────────────────────────────
export const fetchStaticCorr = (companyId) =>
  supabase
    .from("correlation")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(50);

export const fetchRollingCorr = (companyId, windowDays = 60) =>
  supabase
    .from("correlation")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: true })
    .limit(100);

export const fetchTopSectors = (companyId) =>
  supabase
    .from("correlation")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(20);

// ── Balance Sheet ─────────────────────────────────────────────────────────────
export const fetchBalanceSheet = (companyId) =>
  supabase
    .from("balance_sheet_ratios")
    .select("*, ratio_definitions!ratio_id(name, category, description)")
    .eq("company_id", companyId)
    .order("period", { ascending: false })
    .limit(50);

export const fetchBalanceSheetHistory = (companyId, ratioId) =>
  supabase
    .from("balance_sheet_hist")
    .select("*")
    .eq("company_id", companyId)
    .eq("ratio_id", ratioId)
    .order("date", { ascending: true })
    .limit(40);

// ── Holding Metrics ───────────────────────────────────────────────────────────
export const fetchHoldingMetrics = (companyId) =>
  supabase
    .from("stock_holding")
    .select("*, holding_metric_definitions!metric_id(name, category, description)")
    .eq("company_id", companyId)
    .order("period", { ascending: false })
    .limit(50);

// ── ML Predictions (now classifier) ───────────────────────────────────────────
export const fetchMlPredictions = (companyId) =>
  supabase
    .from("classifier")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(30)
    .then(res => ({
      ...res,
      data: (res.data || []).map(row => ({
        ...row,
        survival_score: row.composite_score ?? row.survival_score,
        distress_probability: row.composite_score != null ? 100 - row.composite_score : row.distress_probability
      }))
    }));

export const fetchAllMlPredictions = () =>
  supabase
    .from("classifier")
    .select("*, companies(name, ticker)")
    .order("date", { ascending: false })
    .limit(300);

// ── Feature Store (removed in new schema, but stubbed for safe fallback) ──────
export const fetchFeatureStore = (companyId) =>
  Promise.resolve({ data: [] });

// ── Macro Overlay ─────────────────────────────────────────────────────────────
export const fetchMacroOverlay = (days = 90) =>
  supabase
    .from("sector_health")
    .select("*, sectors!inner(sector_type)")
    .eq("sectors.sector_type", "macro")
    .order("date", { ascending: false })
    .limit(days);

export const fetchLatestMacro = () =>
  supabase
    .from("sector_health")
    .select("*, sectors!inner(sector_type)")
    .eq("sectors.sector_type", "macro")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

// ── Portfolio Summary (aggregated) ───────────────────────────────────────────
export const fetchPortfolioSummary = () =>
  supabase
    .from("classifier")
    .select("composite_score, price_score, companies(name)")
    .order("date", { ascending: false })
    .limit(300);

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
    .limit(50)
    .then(res => ({
      ...res,
      data: (res.data || []).map(row => ({
        ...row,
        survival_score: row.composite_score ?? row.survival_score,
        distress_probability: row.composite_score != null ? 100 - row.composite_score : row.distress_probability
      }))
    }));

// Latest ohlcv_health for all companies (for health signals)
export const fetchLatestOhlcvHealth = () =>
  supabase
    .from("ohlcv_health")
    .select("*, companies(name, ticker)")
    .order("date", { ascending: false })
    .limit(100);

// Latest balance_sheet summary (for fundamental health)
export const fetchLatestBalanceSheetRatios = () =>
  supabase
    .from("balance_sheet_ratios")
    .select("*, companies(name, ticker), ratio_definitions!ratio_id(name, category)")
    .order("period", { ascending: false })
    .limit(200);

export const fetchLatestHoldings = () =>
  supabase
    .from("stock_holding")
    .select("*, companies(name, ticker), holding_metric_definitions!metric_id(name, category)")
    .order("period", { ascending: false })
    .limit(200);

// Latest stock_holding signals
export const fetchLatestStockHolding = () =>
  supabase
    .from("stock_holding")
    .select("*, companies(name, ticker), holding_metric_definitions(name, category)")
    .order("period", { ascending: false })
    .limit(100);
