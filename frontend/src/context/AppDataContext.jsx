import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { fetchCompanies, fetchSectors, fetchLatestSectorHealth, fetchAllMlPredictions } from "../lib/api";
import { adaptInsightRow, adaptSectorHealthRow } from "../lib/adapter";
import { useAuth } from "./AuthContext";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const { user } = useAuth();

  const [companies, setCompanies]       = useState([]);
  const [sectors, setSectors]           = useState([]);
  const [sectorHealth, setSectorHealth] = useState([]);
  const [macro, setMacro]               = useState(null);
  const [mlSummary, setMlSummary]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // CSV filter state — persisted to Supabase csv_sessions
  const [csvTickers, setCsvTickersState]   = useState(null);
  const [csvSessionId, setCsvSessionId]    = useState(null);
  const isCsvMode = csvTickers !== null;

  // ── Load global data — re-runs when user auth state changes ──────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [c, s, sh, ml] = await Promise.all([
          fetchCompanies(),
          fetchSectors(),
          fetchLatestSectorHealth(),
          fetchAllMlPredictions(),
        ]);

        if (c.error)  console.error("companies error:",     c.error);
        if (s.error)  console.error("sectors error:",       s.error);
        if (sh.error) console.error("sector_health error:", sh.error);
        if (ml.error) console.error("classifier error:",    ml.error);

        setCompanies(c.data || []);
        setSectors(s.data || []);
        setSectorHealth((sh.data || []).map(adaptSectorHealthRow));
        setMlSummary(ml.data || []);

        // Build macro from latest sector_health where sector_type = macro
        const macroRows = (sh.data || []).filter(r => r.sectors?.sector_type === "macro");
        if (macroRows.length > 0) {
          // Deduplicate — keep only the latest row per macro asset
          const byName = {};
          macroRows.forEach(r => {
            const name = r.sectors?.name;
            if (name && !byName[name]) byName[name] = r;
          });
          const vix   = byName["India VIX"];
          const usd   = byName["USD-INR"];
          const gold  = byName["Gold"];
          const crude = byName["Crude Oil"];
          const scores = [vix, usd, gold, crude].filter(Boolean).map(r => r.composite || 0);
          const macroScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
          const regime = macroScore > 0.5 ? "RISK_ON" : macroScore < -0.5 ? "RISK_OFF" : "NEUTRAL";
          setMacro({
            macro_regime: regime,
            macro_score:  macroScore,
            vix_z:   vix?.ret_z   ?? null,
            usd_z:   usd?.ret_z   ?? null,
            gold_z:  gold?.ret_z  ?? null,
            crude_z: crude?.ret_z ?? null,
            date:    macroRows[0]?.date,
          });
        }
      } catch (err) {
        console.error("AppDataContext load error:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]); // re-fetch when auth state changes

  // ── Restore last CSV session for this user ─────────────────────────────────
  useEffect(() => {
    if (!user) return;
    async function restoreSession() {
      try {
        const { data } = await supabase
          .from("csv_sessions")
          .select("id, tickers")
          .eq("user_id", user.id)
          .eq("status", "done")
          .order("created_at", { ascending: false })
          .limit(1);
        if (data?.[0]) {
          const tickers = data[0].tickers;
          if (Array.isArray(tickers) && tickers.length > 0) {
            setCsvTickersState(tickers);
            setCsvSessionId(data[0].id);
          }
        }
      } catch (e) {
        // Non-critical — silently ignore
      }
    }
    restoreSession();
  }, [user]);

  // ── CSV session management ─────────────────────────────────────────────────
  const setCsvTickers = useCallback(async (tickers, fileName = "upload.csv") => {
    setCsvTickersState(tickers);
    if (!user || !tickers?.length) return;
    try {
      const { data } = await supabase
        .from("csv_sessions")
        .upsert({
          user_id:   user.id,
          file_name: fileName,
          tickers:   tickers,
          row_count: tickers.length,
          status:    "done",
        }, { onConflict: "user_id,file_name" })
        .select("id")
        .single();
      if (data?.id) setCsvSessionId(data.id);
    } catch (e) {
      // Non-critical — filter still works in-memory
    }
  }, [user]);

  const clearCsvFilter = useCallback(async () => {
    setCsvTickersState(null);
    if (!user || !csvSessionId) return;
    try {
      await supabase
        .from("csv_sessions")
        .update({ status: "cleared" })
        .eq("id", csvSessionId);
      setCsvSessionId(null);
    } catch (e) {
      // Non-critical
    }
  }, [user, csvSessionId]);

  // ── Derived: companies filtered by CSV tickers ────────────────────────────
  const filteredCompanies = React.useMemo(() => {
    if (!isCsvMode || !csvTickers?.length) return companies;
    const tickerSet = new Set(csvTickers.map(t => t.toUpperCase()));
    return companies.filter(c => tickerSet.has((c.ticker || "").toUpperCase()));
  }, [companies, csvTickers, isCsvMode]);

  // ── Latest health per sector (deduplicated) ────────────────────────────────
  const latestSectorHealth = React.useMemo(() => {
    const seen = new Map();
    for (const row of sectorHealth) {
      if (!seen.has(row.sector_id)) seen.set(row.sector_id, row);
    }
    return Array.from(seen.values());
  }, [sectorHealth]);

  // ── Latest classifier per company (adapted to UI shape) ─────────────────────
  const latestMl = React.useMemo(() => {
    const seen = new Map();
    for (const row of mlSummary) {
      if (!seen.has(row.company_id)) {
        seen.set(row.company_id, adaptInsightRow(row));
      }
    }
    return Array.from(seen.values());
  }, [mlSummary]);

  // ── Portfolio stats (based on filtered companies when in CSV mode) ─────────
  const portfolioStats = React.useMemo(() => {
    const base = isCsvMode ? filteredCompanies : companies;
    const mlMap = new Map(latestMl.map(r => [r.company_id, r]));
    const relevant = base.map(c => mlMap.get(c.id)).filter(Boolean);
    if (!relevant.length) return { total: base.length, healthy: 0, watch: 0, distress: 0, avgSurvival: "0.0" };
    const healthy  = relevant.filter(r => (r.composite_score ?? 0) >= 70).length;
    const watch    = relevant.filter(r => (r.composite_score ?? 0) >= 40 && (r.composite_score ?? 0) < 70).length;
    const distress = relevant.filter(r => (r.composite_score ?? 0) < 40).length;
    const avg      = relevant.reduce((s, r) => s + (r.composite_score || 0), 0) / relevant.length;
    return { total: base.length, healthy, watch, distress, avgSurvival: avg.toFixed(1) };
  }, [latestMl, companies, filteredCompanies, isCsvMode]);

  return (
    <AppDataContext.Provider value={{
      companies: isCsvMode ? filteredCompanies : companies,
      allCompanies: companies,
      sectors,
      latestSectorHealth,
      macro,
      latestMl,
      portfolioStats,
      loading,
      error,
      csvTickers,
      isCsvMode,
      setCsvTickers,
      clearCsvFilter,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData = () => useContext(AppDataContext);
