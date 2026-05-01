import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import {
  adaptInsightRow,
  adaptSectorHealthRow,
  adaptOhlcvHealthRow,
  adaptBalanceSheetRow,
  adaptHoldingRow,
  adaptCorrelationToTopSectors,
  adaptCorrelationForTopSecState,
  adaptCorrelationMatrix,
  safeNumber,
  safeString,
} from "../lib/adapter";

const AppDataContext = createContext(null);

// ── Rule-based helpers ────────────────────────────────────────────────────────

function deriveSignal(hs)   { const h = safeNumber(hs, 50); return h >= 75 ? "STRONG" : h >= 50 ? "NEUTRAL" : h >= 25 ? "WATCH" : "WEAK"; }
function deriveRegime(comp) { const c = safeNumber(comp, 0); return c > 0.5 ? "BULL" : c < -0.5 ? "BEAR" : "NEUTRAL"; }
function deriveTrend(zc)    { const z = safeNumber(zc, 0); return z > 0.1 ? "Upward" : z < -0.1 ? "Downward" : "Sideways"; }
function deriveStatus(rank, higher = true) {
  if (rank == null) return "gray";
  const r = safeNumber(rank, 50);
  return higher ? (r >= 75 ? "green" : r >= 25 ? "amber" : "red")
                : (r <= 25 ? "green" : r <= 75 ? "amber" : "red");
}

const CLASS_TIER  = { STRONG: "TIER_1", POSITIVE: "TIER_2", NEUTRAL: "TIER_3", WEAK: "TIER_4", DISTRESSED: "TIER_4" };
const CLASS_GRADE = { STRONG: "A", POSITIVE: "B", NEUTRAL: "C", WEAK: "D", DISTRESSED: "F" };

function deriveMacro(sectorHealthRows) {
  if (!sectorHealthRows?.length) return null;
  const byName = {};
  sectorHealthRows.forEach(r => { const n = r.sectors?.name; if (n && !byName[n]) byName[n] = r; });
  const vix = byName["India VIX"], usd = byName["USD-INR"],
        gold = byName["Gold"],     crude = byName["Crude Oil"],
        nifty = byName["Nifty"],   sensex = byName["Sensex"];
  const assets = [vix, usd, gold, crude].filter(Boolean);
  const macroScore = assets.length ? assets.reduce((s, r) => s + safeNumber(r.composite), 0) / assets.length : 0;
  return {
    macro_regime:   macroScore > 0.5 ? "RISK_ON" : macroScore < -0.5 ? "RISK_OFF" : "NEUTRAL",
    macro_score:    macroScore,
    vix_z:          vix?.ret_z    ?? null,
    usd_z:          usd?.ret_z    ?? null,
    gold_z:         gold?.ret_z   ?? null,
    crude_z:        crude?.ret_z  ?? null,
    nifty_health:   nifty?.health_score  ?? null,
    sensex_health:  sensex?.health_score ?? null,
    vix_health:     vix?.health_score    ?? null,
    vix_composite:  vix?.composite       ?? null,
    usd_composite:  usd?.composite       ?? null,
    date:           sectorHealthRows[0]?.date ?? null,
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }) {
  const { user } = useAuth();

  // ── Raw DB state ──────────────────────────────────────────────────────────
  const [companies,       setCompanies]       = useState([]);
  const [sectors,         setSectors]         = useState([]);
  const [ratioDefs,       setRatioDefs]       = useState([]);   // ratio_definitions
  const [holdingDefs,     setHoldingDefs]     = useState([]);   // holding_metric_definitions
  const [sectorHealthRaw, setSectorHealthRaw] = useState([]);   // sector_health latest
  const [ohlcvHealthRaw,  setOhlcvHealthRaw]  = useState([]);   // ohlcv_health latest per company
  const [insightsRaw,     setInsightsRaw]     = useState([]);   // company_insights latest per company
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  // CSV filter
  const [csvTickers,   setCsvTickersState] = useState(null);
  const [csvSessionId, setCsvSessionId]    = useState(null);
  const isCsvMode = csvTickers !== null;

  // ── Load all global data ──────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [
          companiesRes, sectorsRes, ratioDefsRes, holdingDefsRes,
          sectorHealthRes, ohlcvHealthRes, insightsRes,
        ] = await Promise.all([

          // ── companies — ALL columns ──────────────────────────────────────
          supabase
            .from("companies")
            .select("id, ticker, name, exchange, sector_id, is_active, created_at")
            .eq("is_active", true)
            .order("name"),

          // ── sectors — ALL columns ────────────────────────────────────────
          supabase
            .from("sectors")
            .select("id, name, yf_ticker, sector_type, is_active, created_at")
            .order("name"),

          // ── ratio_definitions — ALL columns (small lookup) ───────────────
          supabase
            .from("ratio_definitions")
            .select("id, name, category, higher_is_better"),

          // ── holding_metric_definitions — ALL columns (small lookup) ──────
          supabase
            .from("holding_metric_definitions")
            .select("id, name, category"),

          // ── sector_health — ALL columns, latest per sector ───────────────
          // 14 sectors × ~2 rows = 200 max, dedup to latest per sector
          supabase
            .from("sector_health")
            .select(`
              sector_id, date,
              daily_return, cum_change_1m, cum_change_1y, cum_change_2y,
              close_z, ret_z, z_change, cum_z_change,
              spike_up, spike_down, oc_spark,
              volatility, composite, health_score,
              sectors(id, name, yf_ticker, sector_type)
            `)
            .order("date", { ascending: false })
            .limit(200),

          // ── ohlcv_health — ALL columns, latest per company ───────────────
          // ~500 companies × 3 rows = 1500, dedup to latest per company
          supabase
            .from("ohlcv_health")
            .select(`
              company_id, date,
              daily_return, cum_change_1m, cum_change_1y, cum_change_2y,
              close_z, ret_z, z_change, cum_z_change,
              spike_up, spike_down, oc_spark,
              volatility, composite, health_score
            `)
            .order("date", { ascending: false })
            .limit(1500),

          // ── company_insights — ALL columns, latest per company ───────────
          supabase
            .from("company_insights")
            .select(`
              company_id, date,
              insight_score, final_score, class,
              trend_score, fundamental_score, sentiment_score, sector_alignment_score,
              momentum, risk, strength, summary,
              created_at
            `)
            .order("date", { ascending: false })
            .limit(1500),
        ]);

        if (companiesRes.error)    console.error("companies:",              companiesRes.error);
        if (sectorsRes.error)      console.error("sectors:",                sectorsRes.error);
        if (ratioDefsRes.error)    console.error("ratio_definitions:",      ratioDefsRes.error);
        if (holdingDefsRes.error)  console.error("holding_metric_defs:",    holdingDefsRes.error);
        if (sectorHealthRes.error) console.error("sector_health:",          sectorHealthRes.error);
        if (ohlcvHealthRes.error)  console.error("ohlcv_health:",           ohlcvHealthRes.error);
        if (insightsRes.error)     console.error("company_insights:",       insightsRes.error);

        setCompanies(companiesRes.data    || []);
        setSectors(sectorsRes.data        || []);
        setRatioDefs(ratioDefsRes.data    || []);
        setHoldingDefs(holdingDefsRes.data || []);
        setSectorHealthRaw(sectorHealthRes.data || []);
        setOhlcvHealthRaw(ohlcvHealthRes.data   || []);
        setInsightsRaw(insightsRes.data         || []);

      } catch (err) {
        console.error("AppDataContext load error:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // ── CSV management ────────────────────────────────────────────────────────
  const setCsvTickers = useCallback(async (tickers, fileName = "upload.csv") => {
    setCsvTickersState(tickers);
    if (!user || !tickers?.length) return;
    try {
      const { data } = await supabase
        .from("csv_sessions")
        .upsert({ user_id: user.id, file_name: fileName, tickers, row_count: tickers.length, status: "done" }, { onConflict: "user_id,file_name" })
        .select("id").single();
      if (data?.id) setCsvSessionId(data.id);
    } catch (_) {}
  }, [user]);

  const clearCsvFilter = useCallback(async () => {
    setCsvTickersState(null);
    if (!user || !csvSessionId) return;
    try {
      await supabase.from("csv_sessions").update({ status: "cleared" }).eq("id", csvSessionId);
      setCsvSessionId(null);
    } catch (_) {}
  }, [user, csvSessionId]);

  // ── Lookup maps (ratio_definitions, holding_metric_definitions) ───────────
  const ratioDefsMap = useMemo(() => {
    const m = {};
    ratioDefs.forEach(r => { m[r.id] = r; });
    return m; // Map by id
  }, [ratioDefs]);

  const holdingDefsMap = useMemo(() => {
    const m = {};
    holdingDefs.forEach(r => { m[r.id] = r; });
    return m;
  }, [holdingDefs]);

  // ── Latest sector_health per sector — ALL columns + derived ──────────────
  const latestSectorHealth = useMemo(() => {
    const seen = new Map();
    for (const row of sectorHealthRaw) {
      if (!seen.has(row.sector_id)) seen.set(row.sector_id, adaptSectorHealthRow(row));
    }
    return Array.from(seen.values());
  }, [sectorHealthRaw]);

  const sectorHealthMap = useMemo(() => {
    const m = {};
    latestSectorHealth.forEach(r => { m[r.sector_id] = r; });
    return m;
  }, [latestSectorHealth]);

  // ── Macro — derived from sector_health macro assets ───────────────────────
  const macro = useMemo(() => {
    const macroRows = sectorHealthRaw.filter(r => r.sectors?.sector_type === "macro");
    return deriveMacro(macroRows);
  }, [sectorHealthRaw]);

  // ── Latest ohlcv_health per company — ALL columns + derived ──────────────
  const latestOhlcvMap = useMemo(() => {
    const m = new Map();
    for (const row of ohlcvHealthRaw) {
      if (!m.has(row.company_id)) m.set(row.company_id, adaptOhlcvHealthRow(row));
    }
    return m;
  }, [ohlcvHealthRaw]);

  // ── Latest company_insights per company — ALL columns ────────────────────
  const latestInsightsMap = useMemo(() => {
    const m = new Map();
    for (const row of insightsRaw) {
      if (!m.has(row.company_id)) m.set(row.company_id, row);
    }
    return m;
  }, [insightsRaw]);

  // ── latestMl — unified per company from ALL available sources ────────────
  // Priority: company_insights → ohlcv_health
  // Every field from both tables is present
  const latestMl = useMemo(() => {
    const result = [];
    const allIds = new Set([...latestOhlcvMap.keys(), ...latestInsightsMap.keys()]);

    for (const cid of allIds) {
      const ins = latestInsightsMap.get(cid);
      const oh  = latestOhlcvMap.get(cid);

      if (ins) {
        const score = ins.final_score ?? ins.insight_score ?? null;
        const hs    = safeNumber(score, 0);
        const ohHs  = safeNumber(oh?.health_score, 0);

        result.push({
          // Identity
          company_id: cid,
          date:       ins.date,

          // ── company_insights columns (ALL) ──────────────────────────────
          insight_score:          ins.insight_score          ?? null,
          final_score:            ins.final_score            ?? null,
          class:                  ins.class                  ?? "NEUTRAL",
          trend_score:            ins.trend_score            ?? null,
          fundamental_score:      ins.fundamental_score      ?? null,
          sentiment_score:        ins.sentiment_score        ?? null,
          sector_alignment_score: ins.sector_alignment_score ?? null,
          momentum:               ins.momentum               ?? null,
          risk:                   ins.risk                   ?? null,
          strength:               ins.strength               ?? null,
          summary:                ins.summary                ?? "",

          // ── ohlcv_health columns (ALL) ──────────────────────────────────
          health_score:    oh?.health_score    ?? null,
          composite:       oh?.composite       ?? null,
          daily_return:    oh?.daily_return     ?? null,
          cum_change_1m:   oh?.cum_change_1m    ?? null,
          cum_change_1y:   oh?.cum_change_1y    ?? null,
          cum_change_2y:   oh?.cum_change_2y    ?? null,
          close_z:         oh?.close_z          ?? null,
          ret_z:           oh?.ret_z            ?? null,
          z_change:        oh?.z_change         ?? null,
          cum_z_change:    oh?.cum_z_change      ?? null,
          spike_up:        oh?.spike_up          ?? false,
          spike_down:      oh?.spike_down        ?? false,
          oc_spark:        oh?.oc_spark          ?? null,
          volatility:      oh?.volatility        ?? null,
          ohlcv_date:      oh?.date              ?? null,

          // ── UI canonical fields (aliases + rule-based) ──────────────────
          composite_score:      score,
          survival_score:       score,
          distress_probability: score != null ? Math.max(0, 100 - hs) : null,
          composite_tier:       CLASS_TIER[ins.class]  ?? "TIER_3",
          composite_grade:      CLASS_GRADE[ins.class] ?? "C",

          // Rule-based derived (from ohlcv_health columns)
          signal:      deriveSignal(oh?.health_score ?? hs),
          regime:      deriveRegime(oh?.composite),
          trend:       deriveTrend(oh?.z_change),
          vol_z:       safeNumber(oh?.volatility),
          momentum_z:  safeNumber(oh?.cum_z_change),
          slope_z:     safeNumber(oh?.z_change),
        });
      } else if (oh) {
        // No insights yet — use ohlcv_health only
        const hs = safeNumber(oh.health_score, 0);
        result.push({
          company_id: cid,
          date:       oh.date,

          // company_insights columns — null (not available)
          insight_score: null, final_score: null, class: "NEUTRAL",
          trend_score: null, fundamental_score: null, sentiment_score: null,
          sector_alignment_score: null, momentum: null, risk: null,
          strength: null, summary: "",

          // ohlcv_health columns — ALL
          health_score:  oh.health_score  ?? null,
          composite:     oh.composite     ?? null,
          daily_return:  oh.daily_return   ?? null,
          cum_change_1m: oh.cum_change_1m  ?? null,
          cum_change_1y: oh.cum_change_1y  ?? null,
          cum_change_2y: oh.cum_change_2y  ?? null,
          close_z:       oh.close_z        ?? null,
          ret_z:         oh.ret_z          ?? null,
          z_change:      oh.z_change       ?? null,
          cum_z_change:  oh.cum_z_change    ?? null,
          spike_up:      oh.spike_up        ?? false,
          spike_down:    oh.spike_down      ?? false,
          oc_spark:      oh.oc_spark        ?? null,
          volatility:    oh.volatility      ?? null,
          ohlcv_date:    oh.date            ?? null,

          // UI canonical
          composite_score:      hs,
          survival_score:       hs,
          distress_probability: Math.max(0, 100 - hs),
          composite_tier:       hs >= 75 ? "TIER_1" : hs >= 55 ? "TIER_2" : hs >= 35 ? "TIER_3" : "TIER_4",
          composite_grade:      hs >= 75 ? "A" : hs >= 55 ? "B" : hs >= 35 ? "C" : hs >= 20 ? "D" : "F",
          signal:      deriveSignal(hs),
          regime:      deriveRegime(oh.composite),
          trend:       deriveTrend(oh.z_change),
          vol_z:       safeNumber(oh.volatility),
          momentum_z:  safeNumber(oh.cum_z_change),
          slope_z:     safeNumber(oh.z_change),
        });
      }
    }
    return result;
  }, [latestOhlcvMap, latestInsightsMap]);

  // ── Filtered companies (CSV mode) ─────────────────────────────────────────
  const filteredCompanies = useMemo(() => {
    if (!isCsvMode || !csvTickers?.length) return companies;
    const s = new Set(csvTickers.map(t => t.toUpperCase()));
    return companies.filter(c => s.has((c.ticker || "").toUpperCase()));
  }, [companies, csvTickers, isCsvMode]);

  // ── Portfolio stats ───────────────────────────────────────────────────────
  const portfolioStats = useMemo(() => {
    const base   = isCsvMode ? filteredCompanies : companies;
    const mlMap  = new Map(latestMl.map(r => [r.company_id, r]));
    const scored = base.map(c => mlMap.get(c.id)).filter(Boolean);
    if (!scored.length) return { total: base.length, healthy: 0, watch: 0, distress: 0, avgSurvival: "0.0", scored: 0 };
    const healthy  = scored.filter(r => safeNumber(r.composite_score) >= 70).length;
    const watch    = scored.filter(r => { const s = safeNumber(r.composite_score); return s >= 40 && s < 70; }).length;
    const distress = scored.filter(r => safeNumber(r.composite_score) < 40).length;
    const avg      = scored.reduce((s, r) => s + safeNumber(r.composite_score), 0) / scored.length;
    return { total: base.length, healthy, watch, distress, avgSurvival: avg.toFixed(1), scored: scored.length };
  }, [latestMl, companies, filteredCompanies, isCsvMode]);

  // ── Sector classification map ─────────────────────────────────────────────
  const sectorClassification = useMemo(() => {
    const m = {};
    latestSectorHealth.forEach(r => {
      m[r.sector_id] = {
        name:        r.sectors?.name ?? "",
        signal:      r.signal,
        regime:      r.regime,
        trend:       r.trend,
        health_score: r.health_score,
        composite:   r.composite,
        ret_z:       r.ret_z,
        volatility:  r.volatility,
        spike_up:    r.spike_up,
        spike_down:  r.spike_down,
        daily_return: r.daily_return,
        cum_change_1m: r.cum_change_1m,
        cum_change_1y: r.cum_change_1y,
      };
    });
    return m;
  }, [latestSectorHealth]);

  // ── Per-company fetchers (on-demand, not global) ──────────────────────────

  const fetchCompanyOhlcvRaw = useCallback(async (companyId, days = 180) => {
    const { data, error } = await supabase
      .from("ohlcv_raw")
      .select("date, open, high, low, close, volume")
      .eq("company_id", companyId)
      .order("date", { ascending: true })
      .limit(days);
    if (error) console.error("ohlcv_raw:", error);
    return data || [];
  }, []);

  const fetchCompanyOhlcvHealth = useCallback(async (companyId, days = 90) => {
    const { data, error } = await supabase
      .from("ohlcv_health")
      .select("date, daily_return, cum_change_1m, cum_change_1y, cum_change_2y, close_z, ret_z, z_change, cum_z_change, spike_up, spike_down, oc_spark, volatility, composite, health_score")
      .eq("company_id", companyId)
      .order("date", { ascending: false })
      .limit(days);
    if (error) console.error("ohlcv_health:", error);
    return (data || []).map(adaptOhlcvHealthRow).reverse();
  }, []);

  const fetchCompanyBalanceSheet = useCallback(async (companyId) => {
    const { data, error } = await supabase
      .from("balance_sheet_scores")
      .select("ratio_id, period, value, yoy_pct, hist_pct_rank, sector_pressure, ratio_definitions(id, name, category, higher_is_better)")
      .eq("company_id", companyId)
      .order("period", { ascending: false })
      .limit(100);
    if (error) console.error("balance_sheet_scores:", error);
    return (data || []).map(r => {
      const rd = r.ratio_definitions || {};
      return {
        ...r,
        ratio_definitions: rd,
        // Rule-based status from hist_pct_rank + higher_is_better
        status:          deriveStatus(r.hist_pct_rank, rd.higher_is_better ?? true),
        adjusted_status: deriveStatus(r.hist_pct_rank, rd.higher_is_better ?? true),
        trend:           r.yoy_pct != null ? (r.yoy_pct >= 0 ? "up" : "down") : "",
      };
    });
  }, []);

  const fetchCompanyHoldings = useCallback(async (companyId) => {
    const { data, error } = await supabase
      .from("holding_scores")
      .select("metric_id, period, value, hist_pct_rank, sector_pressure, holding_metric_definitions(id, name, category)")
      .eq("company_id", companyId)
      .order("period", { ascending: false })
      .limit(50);
    if (error) console.error("holding_scores:", error);
    return (data || []).map(r => {
      const md = r.holding_metric_definitions || {};
      return {
        ...r,
        holding_metric_definitions: md,
        status:          deriveStatus(r.hist_pct_rank, true),
        adjusted_status: deriveStatus(r.hist_pct_rank, true),
        trend:           "",
      };
    });
  }, []);

  const fetchCompanyCorrelation = useCallback(async (companyId) => {
    const { data, error } = await supabase
      .from("correlation_scores")
      .select("sector_id, date, corr_20d, corr_60d, corr_100d, corr_full, outperf_20d, outperf_60d, outperf_100d, aligned_up_pct, aligned_dn_pct, avg_top_health, sectors(id, name, yf_ticker)")
      .eq("company_id", companyId)
      .order("date", { ascending: false })
      .limit(200);
    if (error) console.error("correlation_scores:", error);
    const rows = data || [];
    return {
      rows,
      topSectors:  adaptCorrelationToTopSectors(rows),
      topSecState: adaptCorrelationForTopSecState(rows),
      matrix:      adaptCorrelationMatrix(rows),
    };
  }, []);

  const fetchCompanyInsightsHistory = useCallback(async (companyId, days = 30) => {
    const { data, error } = await supabase
      .from("company_insights")
      .select("date, insight_score, final_score, class, trend_score, fundamental_score, sentiment_score, sector_alignment_score, momentum, risk, strength, summary")
      .eq("company_id", companyId)
      .order("date", { ascending: false })
      .limit(days);
    if (error) console.error("company_insights history:", error);
    return data || [];
  }, []);

  const fetchSectorOhlcvRaw = useCallback(async (sectorId, days = 180) => {
    const { data, error } = await supabase
      .from("sector_ohlcv_raw")
      .select("date, open, high, low, close, volume")
      .eq("sector_id", sectorId)
      .order("date", { ascending: true })
      .limit(days);
    if (error) console.error("sector_ohlcv_raw:", error);
    return data || [];
  }, []);

  const fetchSectorHealthHistory = useCallback(async (sectorId, days = 90) => {
    const { data, error } = await supabase
      .from("sector_health")
      .select("date, daily_return, cum_change_1m, cum_change_1y, cum_change_2y, close_z, ret_z, z_change, cum_z_change, spike_up, spike_down, oc_spark, volatility, composite, health_score")
      .eq("sector_id", sectorId)
      .order("date", { ascending: true })
      .limit(days);
    if (error) console.error("sector_health history:", error);
    return (data || []).map(adaptSectorHealthRow);
  }, []);

  const fetchBalanceSheetHistory = useCallback(async (companyId, ratioId) => {
    let q = supabase
      .from("balance_sheet_hist")
      .select("ratio_id, date, value")
      .eq("company_id", companyId)
      .order("date", { ascending: true })
      .limit(40);
    if (ratioId != null) q = q.eq("ratio_id", ratioId);
    const { data, error } = await q;
    if (error) console.error("balance_sheet_hist:", error);
    return data || [];
  }, []);

  // ── Context value ─────────────────────────────────────────────────────────
  return (
    <AppDataContext.Provider value={{
      // ── Dimension tables (ALL columns) ──────────────────────────────────
      companies:    isCsvMode ? filteredCompanies : companies,
      allCompanies: companies,
      sectors,
      ratioDefs,
      ratioDefsMap,
      holdingDefs,
      holdingDefsMap,

      // ── Sector health — latest per sector (ALL columns + derived) ────────
      latestSectorHealth,
      sectorHealthMap,
      sectorClassification,

      // ── Macro — derived from sector_health macro assets ──────────────────
      macro,

      // ── Company unified scores (company_insights + ohlcv_health) ─────────
      // ALL columns from both tables + rule-based derived fields
      latestMl,

      // ── Portfolio stats ──────────────────────────────────────────────────
      portfolioStats,

      // ── CSV filter ───────────────────────────────────────────────────────
      csvTickers,
      isCsvMode,
      setCsvTickers,
      clearCsvFilter,

      // ── Per-company on-demand fetchers ───────────────────────────────────
      // Call these in pages/components that need detail data
      fetchCompanyOhlcvRaw,       // ohlcv_raw: open/high/low/close/volume
      fetchCompanyOhlcvHealth,    // ohlcv_health: all health scores (90d history)
      fetchCompanyBalanceSheet,   // balance_sheet_scores: all ratios + rule-based status
      fetchCompanyHoldings,       // holding_scores: all metrics + rule-based status
      fetchCompanyCorrelation,    // correlation_scores: rows + topSectors + matrix
      fetchCompanyInsightsHistory,// company_insights: history
      fetchSectorOhlcvRaw,        // sector_ohlcv_raw: price candles
      fetchSectorHealthHistory,   // sector_health: history
      fetchBalanceSheetHistory,   // balance_sheet_hist: ratio_id, date, value

      // ── Loading / error ──────────────────────────────────────────────────
      loading,
      error,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData = () => useContext(AppDataContext);
