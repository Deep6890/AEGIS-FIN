# Tasks

## Task List

- [x] 1. Create AegisDataContext
  - [x] 1.1 Create `frontend/src/aegis/context/AegisDataContext.jsx` with all Supabase queries, loading/error state, companyId/sectorId setters, and `useAegisData` hook
- [x] 2. Create chart components
  - [x] 2.1 Create `frontend/src/aegis/charts/GaugeChart.jsx` using Recharts RadialBarChart
  - [x] 2.2 Create `frontend/src/aegis/charts/CandlestickChart.jsx` using Recharts ComposedChart
  - [x] 2.3 Create `frontend/src/aegis/charts/HeatmapMatrix.jsx` using CSS grid with color interpolation
  - [x] 2.4 Create `frontend/src/aegis/charts/WaterfallChart.jsx` using Recharts BarChart
- [x] 3. Create layout components
  - [x] 3.1 Create `frontend/src/aegis/layout/AegisSidebar.jsx` with 10-page nav, icons, active state, mobile bottom dock
  - [x] 3.2 Create `frontend/src/aegis/layout/AegisLayout.jsx` with sidebar, breadcrumb header, and Outlet
- [x] 4. Create page components
  - [x] 4.1 Create `frontend/src/aegis/pages/PortfolioOverview.jsx`
  - [x] 4.2 Create `frontend/src/aegis/pages/SectorContagion.jsx`
  - [x] 4.3 Create `frontend/src/aegis/pages/CompanyProfile.jsx`
  - [x] 4.4 Create `frontend/src/aegis/pages/SolvencyRisk.jsx`
  - [x] 4.5 Create `frontend/src/aegis/pages/CashflowEfficiency.jsx`
  - [x] 4.6 Create `frontend/src/aegis/pages/OwnershipTracking.jsx`
  - [x] 4.7 Create `frontend/src/aegis/pages/CorrelationAnalysis.jsx`
  - [x] 4.8 Create `frontend/src/aegis/pages/MarketVolatility.jsx`
  - [x] 4.9 Create `frontend/src/aegis/pages/StressTesting.jsx`
  - [x] 4.10 Create `frontend/src/aegis/pages/NPAReportGenerator.jsx`
- [x] 5. Create AegisRouter and wire into App.jsx
  - [x] 5.1 Create `frontend/src/aegis/AegisRouter.jsx` with all route definitions and redirect
  - [x] 5.2 Add `<Route path="/aegis/*" element={<AegisRouter />} />` to `frontend/src/App.jsx` inside the AppDataProvider block
- [x] 6. Add print CSS for report page
  - [x] 6.1 Add `@media print { .aegis-no-print { display: none !important; } }` to `frontend/src/index.css`
