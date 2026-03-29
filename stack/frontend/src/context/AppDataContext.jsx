import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchCompanies, fetchSectors, fetchLatestSectorHealth, fetchLatestMacro, fetchAllMlPredictions } from "../lib/api";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [companies, setCompanies]       = useState([]);
  const [sectors, setSectors]           = useState([]);
  const [sectorHealth, setSectorHealth] = useState([]);
  const [macro, setMacro]               = useState(null);
  const [mlSummary, setMlSummary]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [c, s, sh, m, ml] = await Promise.all([
          fetchCompanies(),
          fetchSectors(),
          fetchLatestSectorHealth(),
          fetchLatestMacro(),
          fetchAllMlPredictions(),
        ]);

        // Log errors to console so we can debug
        if (c.error)  console.error("companies error:",     c.error);
        if (s.error)  console.error("sectors error:",       s.error);
        if (sh.error) console.error("sector_health error:", sh.error);
        if (m.error)  console.error("macro_overlay error:", m.error);
        if (ml.error) console.error("ml_predictions error:",ml.error);

        setCompanies(c.data || []);
        setSectors(s.data || []);
        setSectorHealth(sh.data || []);
        setMacro(m.data || null);
        setMlSummary(ml.data || []);
      } catch (err) {
        console.error("AppDataContext load error:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Derived: latest health per sector (deduplicated by sector_id)
  const latestSectorHealth = React.useMemo(() => {
    const seen = new Map();
    for (const row of sectorHealth) {
      if (!seen.has(row.sector_id)) seen.set(row.sector_id, row);
    }
    return Array.from(seen.values());
  }, [sectorHealth]);

  // Derived: latest ML prediction per company
  const latestMl = React.useMemo(() => {
    const seen = new Map();
    for (const row of mlSummary) {
      if (!seen.has(row.company_id)) seen.set(row.company_id, row);
    }
    return Array.from(seen.values());
  }, [mlSummary]);

  // Portfolio stats
  const portfolioStats = React.useMemo(() => {
    if (!latestMl.length) return { total: companies.length, healthy: 0, watch: 0, distress: 0, avgSurvival: 0 };
    const healthy  = latestMl.filter(r => r.survival_score >= 70).length;
    const watch    = latestMl.filter(r => r.survival_score >= 40 && r.survival_score < 70).length;
    const distress = latestMl.filter(r => r.survival_score < 40).length;
    const avgSurvival = latestMl.reduce((s, r) => s + (r.survival_score || 0), 0) / latestMl.length;
    return { total: companies.length, healthy, watch, distress, avgSurvival: avgSurvival.toFixed(1) };
  }, [latestMl, companies]);

  return (
    <AppDataContext.Provider value={{
      companies, sectors, latestSectorHealth, macro, latestMl, portfolioStats, loading, error
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData = () => useContext(AppDataContext);
