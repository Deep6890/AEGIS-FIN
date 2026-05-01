import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase.js";

const AegisDataContext = createContext(null);
export const useAegisData = () => useContext(AegisDataContext);

function threeYearsAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d.toISOString().split("T")[0];
}
function ninetyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().split("T")[0];
}

// Fetch all rows using pagination — queryFn(from, to) must return a NEW query each call
async function fetchAllPages(queryFn) {
  const PAGE = 1000;
  let from = 0;
  let all = [];
  // Safety cap: max 20 pages = 20,000 rows
  for (let page = 0; page < 20; page++) {
    const to = from + PAGE - 1;
    let result;
    try {
      result = await queryFn(from, to);
    } catch (e) {
      console.error("fetchAllPages exception:", e);
      break;
    }
    const { data, error } = result;
    if (error) {
      console.error("fetchAllPages error:", error.message, error);
      // Return what we have so far rather than empty
      break;
    }
    const rows = data || [];
    all = all.concat(rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return { data: all, error: null };
}

export function AegisDataProvider({ children }) {
  const [companies, setCompanies] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [portfolioInsights, setPortfolioInsights] = useState([]);
  const [sectorHealth, setSectorHealth] = useState([]);
  const [sectorHealthHistory, setSectorHealthHistory] = useState([]);

  const [companyId, setCompanyId] = useState(null);
  const [company, setCompany] = useState(null);
  const [insight, setInsight] = useState(null);
  const [insightHistory, setInsightHistory] = useState([]);
  const [balanceSheet, setBalanceSheet] = useState([]);
  const [holdingScores, setHoldingScores] = useState([]);
  const [correlationScores, setCorrelationScores] = useState([]);
  const [ohlcvRaw, setOhlcvRaw] = useState([]);
  const [ohlcvHealth, setOhlcvHealth] = useState([]);
  const [sectorHealthDetail, setSectorHealthDetail] = useState([]);

  const [sectorId, setSectorId] = useState(null);
  const [sectorOhlcv, setSectorOhlcv] = useState([]);
  const [sectorOhlcvAll, setSectorOhlcvAll] = useState([]);

  const [loading, setLoading] = useState({ portfolio: false, company: false, sector: false });
  const [errors, setErrors] = useState({ portfolio: null, company: null, sector: null });

  // ── Portfolio fetch ───────────────────────────────────────────────────────
  const fetchPortfolio = useCallback(async () => {
    setLoading(prev => ({ ...prev, portfolio: true }));
    setErrors(prev => ({ ...prev, portfolio: null }));
    try {
      // 1. Companies + Sectors (small tables, no pagination needed)
      const [companiesRes, sectorsRes] = await Promise.all([
        supabase.from("companies").select("*").eq("is_active", true),
        supabase.from("sectors").select("*").eq("is_active", true),
      ]);
      if (companiesRes.error) throw new Error(`companies: ${companiesRes.error.message}`);
      if (sectorsRes.error) throw new Error(`sectors: ${sectorsRes.error.message}`);

      const companiesData = companiesRes.data || [];
      const sectorsData = sectorsRes.data || [];
      setCompanies(companiesData);
      setSectors(sectorsData);
      console.log("[AEGIS] companies:", companiesData.length, "sectors:", sectorsData.length);

      // Build sector name map from sectors table
      const sectorNameMap = new Map(sectorsData.map(s => [s.id, s.name]));

      // 2. Company insights — paginate all records
      const insightsRes = await fetchAllPages((from, to) =>
        supabase
          .from("company_insights")
          .select("company_id, date, final_score, class, trend_score, fundamental_score, sentiment_score, sector_alignment_score, momentum, risk, strength, summary, insight_score")
          .order("date", { ascending: false })
          .range(from, to)
      );
      // Deduplicate: keep only latest per company
      const insightMap = new Map();
      for (const row of insightsRes.data || []) {
        if (!insightMap.has(row.company_id)) insightMap.set(row.company_id, row);
      }
      const insightsDeduped = Array.from(insightMap.values());
      console.log("[AEGIS] insights raw:", insightsRes.data?.length, "deduped:", insightsDeduped.length);
      setPortfolioInsights(insightsDeduped);

      // 3. Sector health — paginate, no join (attach name from map)
      const sectorHealthRes = await fetchAllPages((from, to) =>
        supabase
          .from("sector_health")
          .select("sector_id, date, health_score, composite, volatility, cum_change_1y, cum_change_2y, daily_return, ret_z, spike_up, spike_down, z_change, cum_z_change, close_z")
          .order("date", { ascending: false })
          .range(from, to)
      );
      // Deduplicate: keep only latest per sector
      const shMap = new Map();
      for (const row of sectorHealthRes.data || []) {
        if (!shMap.has(row.sector_id)) {
          shMap.set(row.sector_id, {
            ...row,
            sectors: { name: sectorNameMap.get(row.sector_id) ?? "Unknown" },
          });
        }
      }
      setSectorHealth(Array.from(shMap.values()));
      console.log("[AEGIS] sectorHealth raw:", sectorHealthRes.data?.length, "deduped:", shMap.size);

      // 4. Sector health history (3yr trend)
      const sectorHistRes = await fetchAllPages((from, to) =>
        supabase
          .from("sector_health")
          .select("sector_id, date, composite, health_score, cum_change_1y")
          .gte("date", threeYearsAgo())
          .order("date", { ascending: true })
          .range(from, to)
      );
      setSectorHealthHistory(sectorHistRes.data || []);

      // 5. Sector OHLCV last 90 days
      const sectorOhlcvAllRes = await supabase
        .from("sector_ohlcv_raw")
        .select("sector_id, date, close, volume")
        .gte("date", ninetyDaysAgo())
        .order("date", { ascending: true });
      setSectorOhlcvAll(sectorOhlcvAllRes.error ? [] : sectorOhlcvAllRes.data || []);

    } catch (err) {
      console.error("Portfolio fetch error:", err);
      setErrors(prev => ({ ...prev, portfolio: err.message || "Failed to load portfolio data" }));
    } finally {
      setLoading(prev => ({ ...prev, portfolio: false }));
    }
  }, []);

  // ── Company fetch ─────────────────────────────────────────────────────────
  const fetchCompany = useCallback(async (id) => {
    if (!id) return;
    setLoading(prev => ({ ...prev, company: true }));
    setErrors(prev => ({ ...prev, company: null }));
    setCompany(null); setInsight(null); setInsightHistory([]);
    setSectorHealthDetail([]); setBalanceSheet([]); setHoldingScores([]);
    setCorrelationScores([]); setOhlcvRaw([]); setOhlcvHealth([]); setSectorOhlcv([]);

    try {
      // Fetch company record first
      const companyRes = await supabase.from("companies").select("*").eq("id", id).single();
      if (companyRes.error) throw new Error(`company: ${companyRes.error.message}`);
      const companyData = companyRes.data;
      setCompany(companyData);

      // Fetch all company data in parallel
      const [insightRes, corrRes, ohlcvRes, healthRes] = await Promise.all([
        // Insights — last 90 records
        supabase
          .from("company_insights")
          .select("*")
          .eq("company_id", id)
          .order("date", { ascending: false })
          .limit(90),

        // Correlation scores — no join (FK may not be in schema cache)
        supabase
          .from("correlation_scores")
          .select("sector_id, date, corr_20d, corr_60d, corr_100d, corr_full, outperf_20d, outperf_60d, outperf_100d, aligned_up_pct, aligned_dn_pct, avg_top_health")
          .eq("company_id", id)
          .order("date", { ascending: false })
          .limit(200),

        // OHLCV raw — 3yr
        supabase
          .from("ohlcv_raw")
          .select("date, open, high, low, close, volume")
          .eq("company_id", id)
          .gte("date", threeYearsAgo())
          .order("date", { ascending: true }),

        // OHLCV health — 3yr
        supabase
          .from("ohlcv_health")
          .select("date, daily_return, cum_change_1m, cum_change_1y, cum_change_2y, close_z, ret_z, z_change, cum_z_change, spike_up, spike_down, oc_spark, volatility, composite, health_score")
          .eq("company_id", id)
          .gte("date", threeYearsAgo())
          .order("date", { ascending: true }),
      ]);

      // Set insights
      const insightData = insightRes.error ? [] : (insightRes.data || []);
      setInsight(insightData.length > 0 ? insightData[0] : null);
      setInsightHistory(insightData);

      // Enrich correlation scores with sector names from sectors state
      // We'll do this after sectors are loaded — use a ref or pass sectors in
      setCorrelationScores(corrRes.error ? [] : (corrRes.data || []));
      setOhlcvRaw(ohlcvRes.error ? [] : (ohlcvRes.data || []));
      setOhlcvHealth(healthRes.error ? [] : (healthRes.data || []));

      // Balance sheet — paginate with join, fallback to no-join if FK fails
      let bsData = [];
      try {
        const bsRes = await fetchAllPages((from, to) =>
          supabase
            .from("balance_sheet_scores")
            .select("ratio_id, period, value, yoy_pct, hist_pct_rank, sector_pressure, status, adjusted_status, trend, ratio_definitions(name, category, higher_is_better)")
            .eq("company_id", id)
            .order("period", { ascending: false })
            .range(from, to)
        );
        bsData = bsRes.data || [];
        // If join failed (ratio_definitions is null on all rows), try without join
        if (bsData.length > 0 && bsData[0].ratio_definitions === null) {
          console.warn("[AEGIS] balance_sheet join returned null, fetching ratio_definitions separately");
          const [bsRaw, rdRes] = await Promise.all([
            fetchAllPages((from, to) =>
              supabase.from("balance_sheet_scores")
                .select("ratio_id, period, value, yoy_pct, hist_pct_rank, sector_pressure, status, adjusted_status, trend")
                .eq("company_id", id).order("period", { ascending: false }).range(from, to)
            ),
            supabase.from("ratio_definitions").select("id, name, category, higher_is_better"),
          ]);
          const rdMap = new Map((rdRes.data || []).map(r => [r.id, r]));
          bsData = (bsRaw.data || []).map(r => ({ ...r, ratio_definitions: rdMap.get(r.ratio_id) ?? null }));
        }
      } catch (e) {
        console.error("[AEGIS] balance_sheet fetch error:", e);
      }
      console.log("[AEGIS] balanceSheet rows:", bsData.length);
      setBalanceSheet(bsData);

      // Holding scores — paginate with join, fallback if FK fails
      let holdData = [];
      try {
        const holdRes = await fetchAllPages((from, to) =>
          supabase
            .from("holding_scores")
            .select("metric_id, period, value, hist_pct_rank, sector_pressure, status, adjusted_status, trend, holding_metric_definitions(name, category)")
            .eq("company_id", id)
            .order("period", { ascending: false })
            .range(from, to)
        );
        holdData = holdRes.data || [];
        if (holdData.length > 0 && holdData[0].holding_metric_definitions === null) {
          console.warn("[AEGIS] holding_scores join returned null, fetching metric_definitions separately");
          const [holdRaw, mdRes] = await Promise.all([
            fetchAllPages((from, to) =>
              supabase.from("holding_scores")
                .select("metric_id, period, value, hist_pct_rank, sector_pressure, status, adjusted_status, trend")
                .eq("company_id", id).order("period", { ascending: false }).range(from, to)
            ),
            supabase.from("holding_metric_definitions").select("id, name, category"),
          ]);
          const mdMap = new Map((mdRes.data || []).map(r => [r.id, r]));
          holdData = (holdRaw.data || []).map(r => ({ ...r, holding_metric_definitions: mdMap.get(r.metric_id) ?? null }));
        }
      } catch (e) {
        console.error("[AEGIS] holding_scores fetch error:", e);
      }
      console.log("[AEGIS] holdingScores rows:", holdData.length);
      setHoldingScores(holdData);

      // Sector health + OHLCV for company's sector
      const companySectorId = companyData?.sector_id;
      if (companySectorId) {
        const [sectorHealthDetailRes, sectorOhlcvDetailRes] = await Promise.all([
          fetchAllPages((from, to) =>
            supabase
              .from("sector_health")
              .select("date, health_score, composite, volatility, cum_change_1y, cum_change_2y, daily_return, ret_z, spike_up, spike_down, z_change, cum_z_change")
              .eq("sector_id", companySectorId)
              .gte("date", threeYearsAgo())
              .order("date", { ascending: true })
              .range(from, to)
          ),
          supabase
            .from("sector_ohlcv_raw")
            .select("date, open, high, low, close, volume")
            .eq("sector_id", companySectorId)
            .gte("date", threeYearsAgo())
            .order("date", { ascending: true }),
        ]);
        setSectorHealthDetail(sectorHealthDetailRes.data || []);
        setSectorOhlcv(sectorOhlcvDetailRes.error ? [] : (sectorOhlcvDetailRes.data || []));
      }

    } catch (err) {
      console.error("Company fetch error:", err);
      setErrors(prev => ({ ...prev, company: err.message || "Failed to load company data" }));
    } finally {
      setLoading(prev => ({ ...prev, company: false }));
    }
  }, []);

  // ── Sector OHLCV fetch (manual) ───────────────────────────────────────────
  const fetchSectorOhlcv = useCallback(async (id) => {
    if (!id) return;
    setLoading(prev => ({ ...prev, sector: true }));
    setErrors(prev => ({ ...prev, sector: null }));
    setSectorOhlcv([]);
    try {
      const { data, error } = await supabase
        .from("sector_ohlcv_raw")
        .select("*")
        .eq("sector_id", id)
        .gte("date", threeYearsAgo())
        .order("date", { ascending: true });
      if (error) throw new Error(error.message);
      setSectorOhlcv(data || []);
    } catch (err) {
      setErrors(prev => ({ ...prev, sector: err.message || "Failed to load sector OHLCV data" }));
    } finally {
      setLoading(prev => ({ ...prev, sector: false }));
    }
  }, []);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);
  useEffect(() => { if (companyId) fetchCompany(companyId); }, [companyId, fetchCompany]);
  useEffect(() => { if (sectorId) fetchSectorOhlcv(sectorId); }, [sectorId, fetchSectorOhlcv]);

  const value = {
    companies, sectors, portfolioInsights, sectorHealth, sectorHealthHistory,
    companyId, setCompanyId, company, insight, insightHistory,
    balanceSheet, holdingScores, correlationScores, ohlcvRaw, ohlcvHealth,
    sectorId, setSectorId, sectorOhlcv, sectorOhlcvAll, sectorHealthDetail,
    loading, errors,
    refetchPortfolio: fetchPortfolio,
    refetchCompany: () => fetchCompany(companyId),
  };

  return (
    <AegisDataContext.Provider value={value}>
      {children}
    </AegisDataContext.Provider>
  );
}
