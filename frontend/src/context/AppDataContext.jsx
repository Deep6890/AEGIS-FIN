import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import {
  adaptInsightRow,
  adaptSectorHealthRow,
  adaptBalanceSheetRow,
  adaptHoldingRow,
  adaptCorrelationToTopSectors,
  safeNumber,
} from "../lib/adapter";

const AppDataContext = createContext(null);

// ── Rule-based helpers (derived from real DB columns) ─────────────────────────

function deriveStatus(hist_pct_rank, higher_is_better = true) {
  if (hist_pct_rank == null) return "gray";
  const rank = safeNumber(hist_pct_rank, 50);
  if (higher_is_better) {
    return rank >= 75 ? "green" : rank >= 25 ? "amber" : "red";
  }
  // lower is better (e.g. Debt/Equity)
  return rank <= 25 ? "green" : rank <= 75 ? "amber" : "red";
}

function deriveTrendLabel(yoy_pct) {
  if (yoy_pct == null) return "";
  return safeNumber(yoy_pct, 0) >= 0 ? "up" : "down";
}

function deriveMacroFromSectorHealth(sectorHealthRows) {
  if (!sectorHealthRows?.length) return null;
  const byName = {};
  sectorHealthRows.forEach(r => {
    const name = r.sectors?.name;
    if (name && !byName[name]) byName[name] = r;
  });
  const vix   = byName["India VIX"];
  const usd   = byName["USD-INR"];
  const gold  = byName["Gold"];
  const crude = byName["Crude Oil"];
  const nifty = byName["Nifty"];

  // Macro score = avg composite of macro assets
  const macroAssets = [vix, usd, gold, crude].filter(Boolean);
  const macroScore  = macroAssets.length
    ? macroAssets.reduce((s, r) => s + safeNumber(r.composite), 0) / macroAssets.length
    : 0;

  const regime = macroScore > 0.5 ? "RISK_ON" : macroScore < -0.5 ? "RISK_OFF" : "NEUTRAL";

  return {
    macro_regime:  regime,
    macro_score:   macroScore,
    // z-scores from ret_z (return z-score = best proxy for each asset's stress)
    vix_z:   vix?.ret_z   ?? null,
    usd_z:   usd?.ret_z   ?? null,
    gold_z:  gold?.ret_z  ?? null,
    crude_z: crude?.ret_z ?? null,
    nifty_health: nifty?.health_score ?? null,
    date:    sectorHealthRows[0]?.date ?? null,
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }) {
  const { user } = useAuth();

  // ── Raw state (direct from DB) ────────────────────────────────────────────
  const [companies,    setCompanies]    = useState([]);
  const [sectors,      setSectors]      = useState([]);
  const [sectorHealth, setSectorHealth] = useState([]);  // latest rows per sector
  const [ohlcvHealth,  setOhlcvHealth]  = useState([]);  // latest row per company
  const [insights,     setInsights]     = useState([]);  // latest company_insights per company
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  // CSV filter
  const [csvTickers,    setCsvTickersState] = useState(null);
  const [csvSessionId,  setCsvSessionId]    = useState(null);
  const isCsvMode = csvTickers !== null;

  // ── Load all global data ──────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [
          companiesRes,
          sectorsRes,
          sectorHealthRes,
          ohlcvHealthRes,
          insightsRes,
        ] = await Promise.all([
          // companies — all active
          supabase
            .from("companies")
            .select("id, ticker, name, exchange, sector_id, is_active")
            .eq("is_active", true)
            .order("name"),

          // sectors — all (sector + macro)
          supabase
            .from("sectors")
            .select("id, name, yf_ticker, sector_type, is_active")
            .order("name"),

          // sector_health — latest 2 rows per sector (100 sectors × 2 = 200 max)
          // Real columns only — no signal/regime/trend in DB
          supabase
            .from("sector_health")
            .select("sector_id, date, daily_return, cum_change_1m, cum_change_1y, cum_change_2y, close_z, ret_z, z_change, cum_z_change, spike_up, spike_down, oc_spark, volatility, composite, health_score, sectors(name, yf_ticker, sector_type)")
            .order("date", { ascending: false })
            .limit(200),

          // ohlcv_health — latest row per company (for portfolio stats + companies list)
          // Limit 1500 = ~500 companies × 3 rows, deduplicate to latest per company
          supabase
            .from("ohlcv_health")
            .select("company_id, date, daily_return, cum_change_1m, cum_change_1y, ret_z, z_change, cum_z_change, spike_up, spike_down, volatility, composite, health_score")
            .order("date", { ascending: false })
            .limit(1500),

          // company_insights — latest row per company (classifier output)
          // Real columns: company_id, date, insight_score, final_score, class,
          //   trend_score, fundamental_score, sentiment_score, sector_alignment_score,
          //   momentum, risk, strength, summary
          supabase
            .from("company_insights")
            .select("company_id, date, insight_score, final_score, class, trend_score, fundamental_score, sentiment_score, sector_alignment_score, momentum, risk, strength, summary")
            .order("date", { ascending: false })
            .limit(1500),
        ]);

        if (companiesRes.error)    console.error("companies:",     companiesRes.error);
        if (sectorsRes.error)      console.error("sectors:",       sectorsRes.error);
        if (sectorHealthRes.error) console.error("sector_health:", sectorHealthRes.error);
        if (ohlcvHealthRes.error)  console.error("ohlcv_health:",  ohlcvHealthRes.error);
        if (insightsRes.error)     console.error("company_insights:", insightsRes.error);

        setCompanies(companiesRes.data   || []);
        setSectors(sectorsRes.data       || []);
        setSectorHealth(sectorHealthRes.data || []);
        setOhlcvHealth(ohlcvHealthRes.data   || []);
        setInsights(insightsRes.data         || []);

      } catch (err) {
        console.error("AppDataContext load error:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // ── CSV session management ────────────────────────────────────────────────
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

  // ── Derived: latest sector health per sector (deduplicated) ──────────────
  const latestSectorHealth = useMemo(() => {
    const seen = new Map();
    for (const row of sectorHealth) {
      if (!seen.has(row.sector_id)) {
        seen.set(row.sector_id, adaptSectorHealthRow(row));
      }
    }
    return Array.from(seen.values());
  }, [sectorHealth]);

  // ── Derived: sector health map by sector_id ───────────────────────────────
  const sectorHealthMap = useMemo(() => {
    const m = {};
    latestSectorHealth.forEach(r => { m[r.sector_id] = r; });
    return m;
  }, [latestSectorHealth]);

  // ── Derived: macro overlay from sector_health macro assets ────────────────
  const macro = useMemo(() => {
    const macroRows = sectorHealth.filter(r => r.sectors?.sector_type === "macro");
    return deriveMacroFromSectorHealth(macroRows);
  }, [sectorHealth]);

  // ── Derived: latest ohlcv_health per company ─────────────────────────────
  const latestOhlcvHealth = useMemo(() => {
    const seen = new Map();
    for (const row of ohlcvHealth) {
      if (!seen.has(row.company_id)) seen.set(row.company_id, row);
    }
    return seen; // Map<company_id, row>
  }, [ohlcvHealth]);

  // ── Derived: latest company_insights per company ──────────────────────────
  const latestInsightsMap = useMemo(() => {
    const seen = new Map();
    for (const row of insights) {
      if (!seen.has(row.company_id)) seen.set(row.company_id, row);
    }
    return seen; // Map<company_id, row>
  }, [insights]);

  // ── Derived: latestMl — unified score per company ─────────────────────────
  // Priority: company_insights.final_score → ohlcv_health.health_score
  // All UI fields (composite_score, survival_score, distress_probability,
  // composite_tier, composite_grade) are always present.
  const latestMl = useMemo(() => {
    const result = [];
    const allCompanyIds = new Set([
      ...latestOhlcvHealth.keys(),
      ...latestInsightsMap.keys(),
    ]);

    for (const cid of allCompanyIds) {
      const ins = latestInsightsMap.get(cid);
      const oh  = latestOhlcvHealth.get(cid);

      // Use company_insights if available, else fall back to ohlcv_health
      if (ins) {
        const score = safeNumber(ins.final_score ?? ins.insight_score, null);
        const hs    = score ?? 0;
        result.push({
          company_id:   cid,
          date:         ins.date,
          // Canonical score fields
          composite_score:      score,
          survival_score:       score,
          distress_probability: score != null ? Math.max(0, 100 - score) : null,
          // Tier / grade from class
          composite_tier:  { STRONG: "TIER_1", POSITIVE: "TIER_2", NEUTRAL: "TIER_3", WEAK: "TIER_4", DISTRESSED: "TIER_4" }[ins.class] ?? "TIER_3",
          composite_grade: { STRONG: "A", POSITIVE: "B", NEUTRAL: "C", WEAK: "D", DISTRESSED: "F" }[ins.class] ?? "C",
          // Classifier dimension scores (real DB columns)
          trend_score:            safeNumber(ins.trend_score),
          fundamental_score:      safeNumber(ins.fundamental_score),
          sentiment_score:        safeNumber(ins.sentiment_score),
          sector_alignment_score: safeNumber(ins.sector_alignment_score),
          // Insight signals (real DB columns)
          momentum: safeNumber(ins.momentum),
          risk:     safeNumber(ins.risk),
          strength: safeNumber(ins.strength),
          summary:  ins.summary ?? "",
          class:    ins.class   ?? "NEUTRAL",
          // OHLCV health fields (from ohlcv_health if available)
          health_score: oh ? safeNumber(oh.health_score) : null,
          composite:    oh ? safeNumber(oh.composite)    : null,
          ret_z:        oh ? safeNumber(oh.ret_z)        : null,
          volatility:   oh ? safeNumber(oh.volatility)   : null,
          spike_up:     oh?.spike_up  ?? false,
          spike_down:   oh?.spike_down ?? false,
          // Rule-based derived fields
          signal: hs >= 75 ? "STRONG" : hs >= 50 ? "NEUTRAL" : hs >= 25 ? "WATCH" : "WEAK",
          regime: safeNumber(oh?.composite, 0) > 0.5 ? "BULL" : safeNumber(oh?.composite, 0) < -0.5 ? "BEAR" : "NEUTRAL",
        });
      } else if (oh) {
        // No classifier data — derive everything from ohlcv_health
        result.push(adaptInsightRow({ ...oh, company_id: cid }));
      }
    }
    return result;
  }, [latestOhlcvHealth, latestInsightsMap]);

  // ── Derived: companies filtered by CSV ───────────────────────────────────
  const filteredCompanies = useMemo(() => {
    if (!isCsvMode || !csvTickers?.length) return companies;
    const tickerSet = new Set(csvTickers.map(t => t.toUpperCase()));
    return companies.filter(c => tickerSet.has((c.ticker || "").toUpperCase()));
  }, [companies, csvTickers, isCsvMode]);

  // ── Derived: portfolio stats ──────────────────────────────────────────────
  const portfolioStats = useMemo(() => {
    const base  = isCsvMode ? filteredCompanies : companies;
    const mlMap = new Map(latestMl.map(r => [r.company_id, r]));
    const scored = base.map(c => mlMap.get(c.id)).filter(Boolean);

    if (!scored.length) return { total: base.length, healthy: 0, watch: 0, distress: 0, avgSurvival: "0.0", scored: 0 };

    const healthy  = scored.filter(r => safeNumber(r.composite_score) >= 70).length;
    const watch    = scored.filter(r => { const s = safeNumber(r.composite_score); return s >= 40 && s < 70; }).length;
    const distress = scored.filter(r => safeNumber(r.composite_score) < 40).length;
    const avg      = scored.reduce((s, r) => s + safeNumber(r.composite_score), 0) / scored.length;

    return { total: base.length, healthy, watch, distress, avgSurvival: avg.toFixed(1), scored: scored.length };
  }, [latestMl, companies, filteredCompanies, isCsvMode]);

  // ── Derived: sector classification map ───────────────────────────────────
  // Maps sector_id → { signal, regime, health_score, composite, trend }
  const sectorClassification = useMemo(() => {
    const m = {};
    latestSectorHealth.forEach(r => {
      m[r.sector_id] = {
        signal:       r.signal,
        regime:       r.regime,
        trend:        r.trend,
        health_score: r.health_score,
        composite:    r.composite,
        name:         r.sectors?.name ?? "",
      };
    });
    return m;
  }, [latestSectorHealth]);

  // ── Context value ─────────────────────────────────────────────────────────
  return (
    <AppDataContext.Provider value={{
      // Raw lists
      companies:    isCsvMode ? filteredCompanies : companies,
      allCompanies: companies,
      sectors,

      // Sector health — adapted rows with derived signal/regime/trend
      latestSectorHealth,
      sectorHealthMap,
      sectorClassification,

      // Macro — derived from sector_health macro assets
      macro,

      // Company scores — unified from company_insights + ohlcv_health
      latestMl,

      // Portfolio stats
      portfolioStats,

      // CSV filter
      csvTickers,
      isCsvMode,
      setCsvTickers,
      clearCsvFilter,

      // Loading / error
      loading,
      error,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData = () => useContext(AppDataContext);
