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
    .select("company_id, date, health_score, signal, regime, composite, trend")
    .order("date", { ascending: false })
    .limit(500);

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

// ── Company Insights (new — classifier + insights output) ───────────────────
export const fetchCompanyInsights = (companyId) =>
  supabase
    .from("company_insights")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(30);

export const fetchAllCompanyInsights = () =>
  supabase
    .from("company_insights")
    .select("company_id,date,final_score,insight_score,class,momentum,risk,strength,summary")
    .order("date", { ascending: false })
    .limit(600);

// ── Balance Sheet (new normalized: balance_sheet_scores) ─────────────────────
export const fetchBalanceSheet = (companyId) =>
  supabase
    .from("balance_sheet_scores")
    .select("*, ratio_definitions(name, category, higher_is_better)")
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

// ── Stock Holding (new normalized: holding_scores) ────────────────────────────
export const fetchHoldingMetrics = (companyId) =>
  supabase
    .from("holding_scores")
    .select("*, holding_metric_definitions(name, category)")
    .eq("company_id", companyId)
    .order("period", { ascending: false })
    .limit(50);

// ── Classifier → now company_insights ────────────────────────────────────────
export const fetchMlPredictions = (companyId) =>
  supabase
    .from("company_insights")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(30);

export const fetchAllMlPredictions = () =>
  supabase
    .from("company_insights")
    .select("company_id,date,final_score,insight_score,class,momentum,risk,strength,summary,companies(name,ticker)")
    .order("date", { ascending: false })
    .limit(600);

// ── Top Sectors (from correlation_scores) ─────────────────────────────────────
export const fetchTopSectors = (companyId) =>
  supabase
    .from("correlation_scores")
    .select("sector_id,date,corr_20d,corr_60d,corr_100d,corr_full,outperf_60d,avg_top_health,sectors(name)")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .order("corr_60d", { ascending: false })
    .limit(50);

// ── Feature Store (from company_insights dimensions) ─────────────────────────
export const fetchFeatureStore = (companyId) =>
  supabase
    .from("company_insights")
    .select("date,final_score,trend_score,fundamental_score,sentiment_score,sector_alignment_score,class")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(30);

// ── Portfolio Summary ─────────────────────────────────────────────────────────
export const fetchPortfolioSummary = () =>
  supabase
    .from("company_insights")
    .select("company_id,final_score,class,companies(name,ticker)")
    .order("date", { ascending: false })
    .limit(600);

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
