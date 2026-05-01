import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AegisDataProvider } from "./context/AegisDataContext";
import AegisLayout from "./layout/AegisLayout";
import PortfolioOverview from "./pages/PortfolioOverview";
import SectorContagion from "./pages/SectorContagion";
import CompanySelect from "./pages/CompanySelect";
import CompanyProfile from "./pages/CompanyProfile";
import SolvencyRisk from "./pages/SolvencyRisk";
import CashflowEfficiency from "./pages/CashflowEfficiency";
import OwnershipTracking from "./pages/OwnershipTracking";
import CorrelationAnalysis from "./pages/CorrelationAnalysis";
import MarketVolatility from "./pages/MarketVolatility";
import StressTesting from "./pages/StressTesting";
import NPAReportGenerator from "./pages/NPAReportGenerator";

/**
 * AegisRouter — mounts all AEGIS-FIN routes under /aegis/*.
 *
 * Wraps every page in AegisDataProvider (single Supabase data layer)
 * and AegisLayout (sidebar + breadcrumb shell).
 *
 * Route structure:
 *   /aegis                          → redirect to /aegis/portfolio
 *   /aegis/portfolio                → PortfolioOverview
 *   /aegis/sectors                  → SectorContagion
 *   /aegis/companies                → CompanySelect
 *   /aegis/company/:id              → CompanyProfile
 *   /aegis/company/:id/solvency     → SolvencyRisk
 *   /aegis/company/:id/cashflow     → CashflowEfficiency
 *   /aegis/company/:id/ownership    → OwnershipTracking
 *   /aegis/company/:id/correlation  → CorrelationAnalysis
 *   /aegis/company/:id/market       → MarketVolatility
 *   /aegis/company/:id/stress       → StressTesting
 *   /aegis/company/:id/report       → NPAReportGenerator
 *   /aegis/*                        → redirect to /aegis/portfolio
 */
export default function AegisRouter() {
  return (
    <AegisDataProvider>
      <Routes>
        <Route element={<AegisLayout />}>
          {/* Default: /aegis → /aegis/portfolio */}
          <Route index element={<Navigate to="portfolio" replace />} />

          {/* Portfolio-level pages */}
          <Route path="portfolio" element={<PortfolioOverview />} />
          <Route path="sectors" element={<SectorContagion />} />
          <Route path="companies" element={<CompanySelect />} />

          {/* Company-scoped pages */}
          <Route path="company/:id" element={<CompanyProfile />} />
          <Route path="company/:id/solvency" element={<SolvencyRisk />} />
          <Route path="company/:id/cashflow" element={<CashflowEfficiency />} />
          <Route path="company/:id/ownership" element={<OwnershipTracking />} />
          <Route path="company/:id/correlation" element={<CorrelationAnalysis />} />
          <Route path="company/:id/market" element={<MarketVolatility />} />
          <Route path="company/:id/stress" element={<StressTesting />} />
          <Route path="company/:id/report" element={<NPAReportGenerator />} />

          {/* Catch-all: any unrecognised /aegis/* → /aegis/portfolio */}
          <Route path="*" element={<Navigate to="portfolio" replace />} />
        </Route>
      </Routes>
    </AegisDataProvider>
  );
}
