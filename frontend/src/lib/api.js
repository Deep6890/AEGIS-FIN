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
// Real columns: date, health_score, ret_z, composite, z_change, volatility
export const fetchSectorOHLCVHistory = (sectorName, days = 90) =>
  supabase
    .from("sector_health")
    .select("date, health_score, ret_z, composite, z_change, volatility, sectors!inner(name)")
    .eq("sectors.name", sectorName)
    .order("date", { ascending: true })
    .limit(days);

// ── Company OHLCV for overlay with sector ─────────────────────────────────────
// Real columns: date, health_score, ret_z, composite, z_change, volatility
export const fetchCompanyOHLCVHistory = (companyId, days = 90) =>
  supabase
    .from("ohlcv_health")
    .select("date, health_score, ret_z, composite, z_change, volatility, spike_up, spike_down")
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

// ── Sector Metrics ────────────────────────────────────────────────────────────
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
    .select("date, open, high, low, close, volume")
    .eq("company_id", companyId)
    .order("date", { ascending: true })
    .limit(days);

// ── Company Health (ohlcv_health) ─────────────────────────────────────────────
// Real columns: company_id, date, daily_return, cum_change_1m/1y/2y,
//   close_z, ret_z, z_change, cum_z_change, spike_up, spike_down,
//   oc_spark, volatility, composite, health_score
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
    .select("company_id, date, health_score, composite, ret_z, z_change, volatility, spike_up, spike_down")
    .order("date", { ascending: false })
    .limit(500);

// ── Correlation (real table: correlation_scores — flat rows per sector) ───────
// Real columns: company_id, sector_id, date, corr_20d, corr_60d, corr_100d,
//   corr_full, outperf_20d, outperf_60d, outperf_100d,
//   aligned_up_pct, aligned_dn_pct, avg_top_health
export const fetchStaticCorr = (companyId) =>
  supabase
    .from("correlation_scores")
    .select("sector_id, date, corr_20d, corr_60d, corr_100d, corr_full, outperf_60d, avg_top_health, sectors(name)")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(50);

export const fetchRollingCorr = (companyId, windowDays = 60) =>
  supabase
    .from("correlation_scores")
    .select("sector_id, date, corr_20d, corr_60d, corr_100d, sectors(name)")
    .eq("company_id", companyId)
    .order("date", { ascending: true })
    .limit(120);

export const fetchTopSectors = (companyId) =>
  supabase
    .from("correlation_scores")
    .select("sector_id, date, corr_20d, corr_60d, corr_100d, corr_full, outperf_60d, avg_top_health, aligned_up_pct, aligned_dn_pct, sectors(name)")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .order("corr_60d", { ascending: false })
    .limit(50);

// ── Balance Sheet (real table: balance_sheet_scores) ─────────────────────────
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

export const fetchBalanceSheetInsights = (companyId) =>
  supabase
    .from("balance_sheet_insights")
    .select("*")
    .eq("company_id", companyId)
    .order("period", { ascending: false })
    .limit(1);

// ── Stock Holding (real table: holding_scores) ────────────────────────────────
export const fetchHoldingMetrics = (companyId) =>
  supabase
    .from("holding_scores")
    .select("*, holding_metric_definitions(name, category)")
    .eq("company_id", companyId)
    .order("period", { ascending: false })
    .limit(50);

export const fetchHoldingInsights = (companyId) =>
  supabase
    .from("stock_holding_insights")
    .select("*")
    .eq("company_id", companyId)
    .order("period", { ascending: false })
    .limit(1);

// ── ML / Classifier — no classifier table exists yet, use ohlcv_health scores ─
// Derive survival score from health_score until classifier table is populated
export const fetchMlPredictions = (companyId) =>
  supabase
    .from("ohlcv_health")
    .select("company_id, date, health_score, composite, ret_z, z_change, volatility")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(30);

export const fetchAllMlPredictions = () =>
  supabase
    .from("ohlcv_health")
    .select("company_id, date, health_score, composite, ret_z, z_change, volatility")
    .order("date", { ascending: false })
    .limit(1500);

export const fetchCompanyInsights = (companyId) =>
  supabase
    .from("ohlcv_health")
    .select("company_id, date, health_score, composite, ret_z, z_change, volatility")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(30);

export const fetchAllCompanyInsights = () =>
  supabase
    .from("ohlcv_health")
    .select("company_id, date, health_score, composite")
    .order("date", { ascending: false })
    .limit(1500);

export const fetchFeatureStore = (companyId) =>
  supabase
    .from("ohlcv_health")
    .select("company_id, date, health_score, composite, ret_z, z_change, cum_z_change, volatility, spike_up, spike_down")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(30);

export const fetchPortfolioSummary = () =>
  supabase
    .from("ohlcv_health")
    .select("company_id, date, health_score, composite")
    .order("date", { ascending: false })
    .limit(1500);

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
    const { data: compData, error: compErr } = await supabase
      .from("companies")
      .select("id, ticker, name")
      .in("ticker", tickers);
    if (compErr) return { existing: [], missing: tickers, error: compErr };

    const existingMap = new Map((compData || []).map(c => [c.ticker, c]));
    const existingTickers = new Set(existingMap.keys());
    const missing = tickers.filter(t => !existingTickers.has(t));

    // Fetch latest health_score as proxy for survival score
    const companyIds = (compData || []).map(c => c.id);
    let scoreMap = new Map();
    if (companyIds.length > 0) {
      const { data: hsData } = await supabase
        .from("ohlcv_health")
        .select("company_id, health_score, date")
        .in("company_id", companyIds)
        .order("date", { ascending: false })
        .limit(companyIds.length * 2);
      for (const row of (hsData || [])) {
        if (!scoreMap.has(row.company_id)) {
          scoreMap.set(row.company_id, row.health_score);
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
  supabase.from("user_profiles").select("*").eq("id", userId).single();

export const updateUserProfile = (userId, updates) =>
  supabase.from("user_profiles").update(updates).eq("id", userId);

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
