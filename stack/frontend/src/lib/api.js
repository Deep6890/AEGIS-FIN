import { supabase } from "./supabase";

// ── Companies ─────────────────────────────────────────────────────────────────
export const fetchCompanies = () =>
  supabase.from("companies").select("*").eq("is_active", true).order("name");

export const fetchCompanyById = (id) =>
  supabase.from("companies").select("*").eq("id", id).single();

// ── Sectors ───────────────────────────────────────────────────────────────────
export const fetchSectors = () =>
  supabase.from("sectors").select("*").eq("is_active", true).order("name");

// ── Sector Health ─────────────────────────────────────────────────────────────
export const fetchLatestSectorHealth = () =>
  supabase
    .from("sector_health")
    .select("*, sectors(name, yf_ticker, sector_type)")
    .order("date", { ascending: false })
    .limit(100);

export const fetchSectorHealthHistory = (sectorId, days = 90) =>
  supabase
    .from("sector_health")
    .select("*")
    .eq("sector_id", sectorId)
    .order("date", { ascending: true })
    .limit(days);

// ── Sector Metrics (sector_health has all metrics now) ────────────────────────
export const fetchLatestSectorMetrics = () =>
  supabase
    .from("sector_health")
    .select("*, sectors(name, yf_ticker)")
    .order("date", { ascending: false })
    .limit(100);

export const fetchSectorMetricsHistory = (sectorId, days = 90) =>
  supabase
    .from("sector_health")
    .select("*")
    .eq("sector_id", sectorId)
    .order("date", { ascending: true })
    .limit(days);

// ── Company Health (ohlcv_health) ─────────────────────────────────────────────
export const fetchLatestCompanyMetrics = (companyId) =>
  supabase
    .from("ohlcv_health")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(90);

// ── Correlation (new JSONB table) ─────────────────────────────────────────────
export const fetchStaticCorr = (companyId) =>
  supabase
    .from("correlation")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(1);

export const fetchRollingCorr = (companyId, windowDays = 60) =>
  supabase
    .from("correlation")
    .select("date, company_vs_sectors, windows")
    .eq("company_id", companyId)
    .order("date", { ascending: true })
    .limit(120);

export const fetchTopSectors = (companyId) =>
  supabase
    .from("correlation")
    .select("date, top_sectors, health_by_top")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(1);

// ── Balance Sheet (new normalized tables) ─────────────────────────────────────
export const fetchBalanceSheet = (companyId) =>
  supabase
    .from("balance_sheet_ratios")
    .select("*, ratio_definitions(name, category, description, higher_is_better)")
    .eq("company_id", companyId)
    .order("period", { ascending: false })
    .limit(100);

export const fetchBalanceSheetHistory = (companyId, ratioId) =>
  supabase
    .from("balance_sheet_hist")
    .select("*")
    .eq("company_id", companyId)
    .eq("ratio_id", ratioId)
    .order("date", { ascending: true })
    .limit(40);

// ── Stock Holding ─────────────────────────────────────────────────────────────
export const fetchHoldingMetrics = (companyId) =>
  supabase
    .from("stock_holding")
    .select("*, holding_metric_definitions(name, category, description)")
    .eq("company_id", companyId)
    .order("period", { ascending: false })
    .limit(50);

// ── Classifier (replaces ml_predictions) ─────────────────────────────────────
export const fetchMlPredictions = (companyId) =>
  supabase
    .from("classifier")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(30);

export const fetchAllMlPredictions = () =>
  supabase
    .from("classifier")
    .select("*, companies(name, ticker)")
    .order("date", { ascending: false })
    .limit(400);

// ── Feature Store (from classifier dimensions JSONB) ─────────────────────────
export const fetchFeatureStore = (companyId) =>
  supabase
    .from("classifier")
    .select("date, dimensions, composite")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(30);

// ── Macro Overlay (from sector_health where sector_type = macro) ──────────────
export const fetchMacroOverlay = (days = 90) =>
  supabase
    .from("sector_health")
    .select("*, sectors!inner(name, yf_ticker, sector_type)")
    .eq("sectors.sector_type", "macro")
    .order("date", { ascending: true })
    .limit(days * 6); // 6 macro assets × days

export const fetchLatestMacro = () =>
  supabase
    .from("sector_health")
    .select("*, sectors!inner(name, yf_ticker, sector_type)")
    .eq("sectors.sector_type", "macro")
    .order("date", { ascending: false })
    .limit(6)
    .maybeSingle();

// ── Portfolio Summary ─────────────────────────────────────────────────────────
export const fetchPortfolioSummary = () =>
  supabase
    .from("classifier")
    .select("composite_score, composite_tier, companies(name, ticker)")
    .order("date", { ascending: false })
    .limit(400);

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
    .limit(200);

// ── Check tickers in DB (for UploadCSV) ───────────────────────────────────────
export const checkTickersInDB = async (tickers) => {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("id, ticker, name")
      .in("ticker", tickers);
    if (error) return { existing: [], missing: tickers, error };
    const existingTickers = new Set((data || []).map(c => c.ticker));
    const existing = (data || []).map(c => ({ ...c, survival_score: null }));
    const missing = tickers.filter(t => !existingTickers.has(t));
    return { existing, missing, error: null };
  } catch (e) {
    return { existing: [], missing: tickers, error: e };
  }
};
