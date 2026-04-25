import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fetchCompanies, fetchSectors, fetchLatestSectorHealth, fetchAllMlPredictions } from "../lib/api";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [companies, setCompanies]       = useState([]);
  const [sectors, setSectors]           = useState([]);
  const [sectorHealth, setSectorHealth] = useState([]);
  const [macro, setMacro]               = useState(null);
  const [mlSummary, setMlSummary]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  // CSV filter state
  const [csvTickers, setCsvTickersState] = useState(null);
  const isCsvMode = csvTickers !== null;
  const setCsvTickers = (tickers) => setCsvTickersState(tickers);
  const clearCsvFilter = () => setCsvTickersState(null);

  useEffect(() => {
    async function load() {
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
        setSectorHealth(sh.data || []);
        setMlSummary(ml.data || []);

        // Build macro from latest sector_health where sector_type = macro
        const macroRows = (sh.data || []).filter(r => r.sectors?.sector_type === "macro");
        if (macroRows.length > 0) {
          // Build a synthetic macro object from the latest macro rows
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
  }, []);

  // Latest health per sector (deduplicated)
  const latestSectorHealth = React.useMemo(() => {
    const seen = new Map();
    for (const row of sectorHealth) {
      if (!seen.has(row.sector_id)) seen.set(row.sector_id, row);
    }
    return Array.from(seen.values());
  }, [sectorHealth]);

  // Latest classifier per company — map composite_score → survival_score for compat
  const latestMl = React.useMemo(() => {
    const seen = new Map();
    for (const row of mlSummary) {
      if (!seen.has(row.company_id)) {
        seen.set(row.company_id, {
          ...row,
          // Map new fields to old field names for backward compat
          survival_score:       row.composite_score,
          distress_probability: row.composite_score != null ? (100 - row.composite_score) : null,
          model_version:        row.composite_tier || "v2",
        });
      }
    }
    return Array.from(seen.values());
  }, [mlSummary]);

  // Portfolio stats
  const portfolioStats = React.useMemo(() => {
    if (!latestMl.length) return { total: companies.length, healthy: 0, watch: 0, distress: 0, avgSurvival: 0 };
    const healthy  = latestMl.filter(r => r.composite_score >= 70).length;
    const watch    = latestMl.filter(r => r.composite_score >= 40 && r.composite_score < 70).length;
    const distress = latestMl.filter(r => r.composite_score < 40).length;
    const avg      = latestMl.reduce((s, r) => s + (r.composite_score || 0), 0) / latestMl.length;
    return { total: companies.length, healthy, watch, distress, avgSurvival: avg.toFixed(1) };
  }, [latestMl, companies]);

  return (
    <AppDataContext.Provider value={{
      companies, sectors, latestSectorHealth, macro, latestMl, portfolioStats, loading, error,
      csvTickers, isCsvMode, setCsvTickers, clearCsvFilter,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData = () => useContext(AppDataContext);
