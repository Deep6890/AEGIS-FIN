import { createContext, useContext, useState } from 'react';
import appData from '../data/appData.json';
import companiesData from '../data/companies.json';
import sectorsData from '../data/sectors.json';
import usersData from '../data/users.json';
import {
  kpiStats, allSectors, intradayNSE, intradayBSE, marketInfo, marketBreadth,
  sectorRiskDonut, vixCurrent, vixSparkline, newsFeed,
  sectorCompanyList, sectorSentimentData, totalAssetsData,
  pnlData, cashFlowData, ratiosData
} from '../data/dashboardData';
import { suggestedPrompts, dailyHighlights, getRAGResponse } from '../data/chatData';

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(usersData[0]);

  const value = {
    // ── auth ──────────────────────────────────────────────────────
    currentUser,
    setCurrentUser,
    users: usersData,

    // ── reference data ────────────────────────────────────────────
    companies: companiesData,
    sectors: sectorsData,

    // ── dashboard (also kept nested for legacy consumers) ─────────
    dashboardData: {
      kpiStats, allSectors, intradayNSE, intradayBSE, marketInfo, marketBreadth,
      sectorRiskDonut, vixCurrent, vixSparkline, newsFeed,
      sectorCompanyList, sectorSentimentData, totalAssetsData,
      pnlData, cashFlowData, ratiosData,
    },

    // ── flat shortcuts (pages use these directly) ─────────────────
    kpiStats,
    allSectors,
    intradayNSE,
    intradayBSE,
    marketInfo,
    marketBreadth,
    sectorRiskDonut,
    vixCurrent,
    vixSparkline,
    newsFeed,
    sectorCompanyList,
    sectorSentimentData,
    totalAssetsData,
    pnlData,
    cashFlowData,
    ratiosData,

    // ── chat ──────────────────────────────────────────────────────
    suggestedPrompts,
    dailyHighlights,
    getRAGResponse,

    // ── page-specific data from appData.json ──────────────────────
    companyDetail:      appData.companyDetail,
    balanceSheetHub:    appData.balanceSheetHub,
    sectorIntelligence: appData.sectorIntelligence,
    profile:            appData.profile,
    newsMonitor:        appData.newsMonitor,
    dataManager:        appData.dataManager,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
