import { supabase } from "./supabase";

// ── Companies ─────────────────────────────────────────────────────────────────
export const fetchCompanies = () =>
  supabase.from("companies").select("*").order("name");

export const fetchCompanyById = (id) =>
  supabase.from("companies").select("*").eq("id", id).single();

// ── Sectors ───────────────────────────────────────────────────────────────────
export const fetchSectors = () =>
  supabase.from("sectors").select("*").order("name");

// ── Sector OHLCV history for overlay charts ───────────────────────────────────
export const fetchSectorOHLCVHistory = (sectorName, days = 90) =>
  supabase
    .from("sector_health")
    .select("date, close, health_score, signal, ret_z, composite, sectors!inner(name)")
    .eq("sectors.name", sectorName)
    .order("date", { ascending: true })
    .limit(days);

// ── Company OHLCV for overlay with sector ─────────────────────────────────────
export const fetchCompanyOHLCVHistory = (companyId, days = 90) =>
  supabase
    .from("ohlcv_health")
    .select("date, close, health_score, signal, ret_z, composite")
    .eq("company_id", companyId)
    .order("date", { ascending: true })
    .limit(days);

// ── Sector ranking (latest health for all sectors) ────────────────────────────
export const fetchAllSectorHealth = () =>
  supabase
    .from("sector_health")
    .select("*, sectors(name, yf_ticker, sector_type)")
    .order("date", { ascending: false })
    .limit(200);

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

// ── Company OHLCV raw (price candles) ────────────────────────────────────────
export const fetchCompanyOHLCV = (companyId, days = 180) =>
  supabase
    .from("ohlcv_raw")
    .select("date, open, high, low, close, volume, adj_close")
    .eq("company_id", companyId)
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

// ── All companies latest health snapshot ─────────────────────────────────────
export const fetchAllCompanyHealth = () =>
  supabase
    .from("ohlcv_health")
    .select("company_id, date, health_score, signal, composite, ret_z, z_change, volatility, spike_up, spike_down")
    .order("date", { ascending: false })
    .limit(500);

// ── Correlation (actual schema: correlation JSONB table) ─────────────────────
export const fetchStaticCorr = (companyId) =>
  supabase
    .from("correlation")
    .select("date,company_vs_sectors,top_sectors,health_by_top,relative_growth,relative_spikes,sift_latest,insights")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(1);

export const fetchRollingCorr = (companyId, windowDays = 60) =>
  supabase
    .from("correlation")
    .select("date,company_vs_sectors,top_sectors")
    .eq("company_id", companyId)
    .order("date", { ascending: true })
    .limit(120);

export const fetchTopSectors = (companyId) =>
  supabase
    .from("correlation")
    .select("date,top_sectors,health_by_top,relative_growth,relative_spikes,insights")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(1);

// ── Classifier (actual schema: classifier table) ──────────────────────────────
export const fetchCompanyInsights = (companyId) =>
  supabase
    .from("classifier")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(30);

export const fetchAllCompanyInsights = () =>
  supabase
    .from("classifier")
    .select("company_id,date,composite_score,composite_tier,composite_grade,price_score,fundamental_score,ownership_score,sector_fit_score,summary")
    .order("date", { ascending: false })
    .limit(600);

// ── Classifier as ML predictions ──────────────────────────────────────────────
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
    .select("company_id,date,composite_score,composite_tier,composite_grade,price_score,fundamental_score,ownership_score,sector_fit_score,filter,summary,companies(name,ticker)")
    .order("date", { ascending: false })
    .limit(600);

// ── Feature Store (from classifier dimensions) ────────────────────────────────
export const fetchFeatureStore = (companyId) =>
  supabase
    .from("classifier")
    .select("date,composite_score,composite_tier,composite_grade,price_score,fundamental_score,ownership_score,sector_fit_score,dimensions,composite,filter")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(30);

// ── Portfolio Summary ─────────────────────────────────────────────────────────
export const fetchPortfolioSummary = () =>
  supabase
    .from("classifier")
    .select("company_id,composite_score,composite_tier,composite_grade,companies(name,ticker)")
    .order("date", { ascending: false })
    .limit(600);

// ── Balance Sheet (actual schema: balance_sheet_ratios) ──────────────────────
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

// ── Balance Sheet Insights (actual schema: balance_sheet_insights) ────────────
export const fetchBalanceSheetInsights = (companyId) =>
  supabase
    .from("balance_sheet_insights")
    .select("*")
    .eq("company_id", companyId)
    .order("period", { ascending: false })
    .limit(1);

// ── Stock Holding (actual schema: stock_holding) ──────────────────────────────
export const fetchHoldingMetrics = (companyId) =>
  supabase
    .from("stock_holding")
    .select("*, holding_metric_definitions(name, category, description)")
    .eq("company_id", companyId)
    .order("period", { ascending: false })
    .limit(50);

// ── Stock Holding Insights (actual schema: stock_holding_insights) ────────────
export const fetchHoldingInsights = (companyId) =>
  supabase
    .from("stock_holding_insights")
    .select("*")
    .eq("company_id", companyId)
    .order("period", { ascending: false })
    .limit(1);

// ── Macro Overlay (from sector_health where sector_type = macro) ──────────────
export const fetchMacroOverlay = (days = 90) =>
  supabase
    .from("sector_health")
    .select("*, sectors!inner(name, yf_ticker, sector_type)")
    .order("date", { ascending: true })
    .limit(days * 14);

export const fetchLatestMacro = () =>
  supabase
    .from("sector_health")
    .select("*, sectors!inner(name, yf_ticker, sector_type)")
    .order("date", { ascending: false })
    .limit(28);

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
    // Step 1: find which tickers exist in companies table
    const { data: compData, error: compErr } = await supabase
      .from("companies")
      .select("id, ticker, name")
      .in("ticker", tickers);
    if (compErr) return { existing: [], missing: tickers, error: compErr };

    const existingMap = new Map((compData || []).map(c => [c.ticker, c]));
    const existingTickers = new Set(existingMap.keys());
    const missing = tickers.filter(t => !existingTickers.has(t));

    // Step 2: fetch latest classifier score for each found company
    const companyIds = (compData || []).map(c => c.id);
    let scoreMap = new Map();
    if (companyIds.length > 0) {
      const { data: clsData } = await supabase
        .from("company_insights")
        .select("company_id,final_score,date")
        .in("company_id", companyIds)
        .order("date", { ascending: false })
        .limit(companyIds.length * 2);
      for (const row of (clsData || [])) {
        if (!scoreMap.has(row.company_id)) {
          scoreMap.set(row.company_id, row.final_score);
        }
      }
    }

    const existing = (compData || []).map(c => ({
      ...c,
      survival_score: scoreMap.get(c.id) ?? null,
    }));

    return { existing, missing, error: null };
  } catch (e) {
    return { existing: [], missing: tickers, error: e };
  }
};

// ── User Profile ──────────────────────────────────────────────────────────────
export const fetchUserProfile = (userId) =>
  supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

export const updateUserProfile = (userId, updates) =>
  supabase
    .from("user_profiles")
    .update(updates)
    .eq("id", userId);

// ── CSV Sessions ──────────────────────────────────────────────────────────────
export const fetchCsvSessions = (userId) =>
  supabase
    .from("csv_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

export const saveCsvSession = (userId, fileName, tickers) =>
  supabase
    .from("csv_sessions")
    .upsert({
      user_id:   userId,
      file_name: fileName,
      tickers:   tickers,
      row_count: tickers.length,
      status:    "done",
    }, { onConflict: "user_id,file_name" })
    .select("id")
    .single();
