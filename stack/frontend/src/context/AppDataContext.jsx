import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  fetchCompanies, fetchSectors, fetchLatestSectorHealth,
  fetchLatestMacro, fetchAllMlPredictions, fetchCompaniesByTickers,
  fetchLatestClassifier
} from "../lib/api";

const AppDataContext = createContext(null);
export const useAppData = () => useContext(AppDataContext);

const CSV_STORAGE_KEY = "aegis_csv_tickers";

export function AppDataProvider({ children }) {
  const [companies, setCompanies]       = useState([]);
  const [sectors, setSectors]           = useState([]);
  const [sectorHealth, setSectorHealth] = useState([]);
  const [macro, setMacro]               = useState(null);
  const [mlSummary, setMlSummary]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const [csvTickers, setCsvTickersState] = useState(() => {
    try {
      const stored = sessionStorage.getItem(CSV_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const setCsvTickers = useCallback((tickers) => {
    setCsvTickersState(tickers);
    if (tickers) sessionStorage.setItem(CSV_STORAGE_KEY, JSON.stringify(tickers));
    else sessionStorage.removeItem(CSV_STORAGE_KEY);
  }, []);

  const clearCsvFilter = useCallback(() => setCsvTickers(null), [setCsvTickers]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const companiesPromise = csvTickers && csvTickers.length > 0
          ? fetchCompaniesByTickers(csvTickers)
          : fetchCompanies();

        // Use v_classifier_latest or fallback to ml_predictions map
        const [c, s, sh, m, classifierRes] = await Promise.all([
          companiesPromise,
          fetchSectors(),
          fetchLatestSectorHealth(),
          fetchLatestMacro(),
          fetchLatestClassifier(), // Fetching from classifier view
        ]);

        setCompanies(c.data || []);
        setSectors(s.data || []);
        setSectorHealth(sh.data || []);

        // Map new macro schema to existing UI variables
        const mData = m.data;
        if (mData) {
          mData.macro_score = mData.health_score;
          mData.macro_regime = mData.regime;
          mData.vix_z = mData.vol_z;
          mData.usd_z = mData.ret_z;
        }
        setMacro(mData || null);
        
        // Map new classifier schema to existing UI variables for backwards compatibility
        const classifierData = (classifierRes.data || []).map(row => ({
          ...row,
          survival_score: row.composite_score || row.survival_score,
          distress_probability: row.composite_score ? 100 - row.composite_score : row.distress_probability
        }));
        setMlSummary(classifierData);
      } catch (err) {
        console.error("AppDataContext load error:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [csvTickers]);

  const latestSectorHealth = React.useMemo(() => {
    const seen = new Map();
    for (const row of sectorHealth) {
      if (!seen.has(row.sector_id)) seen.set(row.sector_id, row);
    }
    return Array.from(seen.values());
  }, [sectorHealth]);

  const latestMl = React.useMemo(() => {
    const seen = new Map();
    for (const row of mlSummary) {
      if (!seen.has(row.company_id)) seen.set(row.company_id, row);
    }
    return Array.from(seen.values());
  }, [mlSummary]);

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
      companies, sectors, latestSectorHealth, macro, latestMl, portfolioStats,
      loading, error,
      csvTickers, setCsvTickers, clearCsvFilter,
      isCsvMode: !!(csvTickers && csvTickers.length > 0),
    }}>
      {children}
    </AppDataContext.Provider>
  );
}


