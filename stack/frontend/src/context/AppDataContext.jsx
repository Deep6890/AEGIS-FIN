import { createContext, useContext, useState, useEffect } from 'react';
import appData from '../data/appData.json';
import companiesData from '../data/companies.json';
import sectorsData from '../data/sectors.json';
import usersData from '../data/users.json';
import { 
  kpiStats, allSectors, intradayNSE, intradayBSE, marketInfo, 
  sectorRiskDonut, vixCurrent, vixSparkline, newsFeed, 
  sectorCompanyList, sectorSentimentData, totalAssetsData, 
  pnlData, cashFlowData, ratiosData 
} from '../data/dashboardData';

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  // Can add logic here later if some data needs to be fetched from an API
  // or user needs to be selected dynamically
  const [currentUser, setCurrentUser] = useState(usersData[0]);

  const mergedData = {
    ...appData,
    companies: companiesData,
    sectors: sectorsData,
    users: usersData,
    currentUser: currentUser,
    setCurrentUser: setCurrentUser,
    dashboardData: {
      kpiStats, allSectors, intradayNSE, intradayBSE, marketInfo, 
      sectorRiskDonut, vixCurrent, vixSparkline, newsFeed, 
      sectorCompanyList, sectorSentimentData, totalAssetsData, 
      pnlData, cashFlowData, ratiosData
    }
  };

  return (
    <AppDataContext.Provider value={mergedData}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
