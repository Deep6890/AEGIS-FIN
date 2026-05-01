# Requirements Document

## Introduction

AEGIS-FIN is a Post-Disbursement Early Warning System (EWS) for SME Loans and an NPA (Non-Performing Asset) Predictor. It is a secure internal dashboard built as a new frontend module within the existing React + Vite application. The system serves Bank Credit Risk Managers, Loan Monitoring Officers, and Credit Committee members by surfacing AI-driven risk scores, solvency signals, ownership flight indicators, sector contagion data, and market volatility metrics — all bound directly to the existing Supabase PostgreSQL backend.

AEGIS-FIN is a read-only analytical module. It does not include login screens, onboarding flows, or loan application forms. All data is fetched exclusively through a single centralized context (`AegisDataContext`). All UI components are imported from the existing `frontend/src/components/` library; no new design tokens or Tailwind utility classes are invented.

---

## Glossary

- **AEGIS-FIN**: The Post-Disbursement Early Warning System frontend module, mounted under the `/aegis` route prefix.
- **AegisDataContext**: The single React context that owns all Supabase API calls for the AEGIS-FIN module.
- **AegisLayout**: The layout wrapper component for all AEGIS-FIN pages, providing the sidebar navigation and page shell.
- **NPA**: Non-Performing Asset — a loan where the borrower has stopped making interest or principal repayments.
- **EWS**: Early Warning System — a set of indicators that signal deteriorating credit quality before formal default.
- **final_score**: The composite NPA risk score stored in `company_insights.final_score`. Higher values indicate lower risk.
- **class**: The NPA risk classification stored in `company_insights.class`. Valid values are `Safe`, `Watchlist`, and `High Risk`.
- **Risk_Class**: The enumeration of NPA risk classes: `Safe` (high final_score), `Watchlist` (medium final_score), `High Risk` (low final_score).
- **Portfolio**: The full set of companies where `companies.is_active = TRUE`.
- **Solvency_Alert**: A condition where a company's Interest Coverage ratio falls below 1.5, indicating imminent default risk.
- **Smart_Money_Flight**: A condition where Promoter Holding % is declining or Insider Net Buy % is negative, indicating insider selling.
- **Sector_Contagion**: The macro drag on an individual company measured by the `sector_pressure` column in `balance_sheet_scores` and `holding_scores`.
- **hist_pct_rank**: Historical percentile rank of a metric value relative to the company's own history (0–100). Values below 10 are considered critically low.
- **yoy_pct**: Year-over-year percentage change of a metric. Values below −20% are considered deeply negative.
- **sector_pressure**: A numeric score indicating how much macro/sector headwinds are dragging a specific metric.
- **Waterfall_Chart**: A chart type showing how component scores (fundamental, sentiment, trend) add to or subtract from a base score to produce the final_score.
- **HHI**: Herfindahl-Hirschman Index — a measure of holder concentration in ownership data.
- **OHLCV**: Open, High, Low, Close, Volume — standard market price data.
- **Candlestick_Chart**: A financial chart showing OHLCV data with spike markers for anomalous price movements.
- **Radar_Chart**: A spider/radar chart used to visualize multi-dimensional scores (risk, strength, sector_alignment_score).
- **Gauge_Chart**: A radial/dial chart used to display a single score on a 0–100 scale.
- **Heatmap_Matrix**: A grid visualization where cell color intensity encodes a numeric value (e.g., sector_pressure).
- **Rolling_Window**: A time-series window of up to 3 years of historical data used for trend charts.
- **PDF_Export**: The capability to render the current page as a printable PDF via the browser's print dialog.

---

## Requirements

### Requirement 1: Module Routing and Layout

**User Story:** As a Credit Risk Manager, I want a dedicated AEGIS-FIN section within the application, so that I can navigate between all 10 risk analysis pages without leaving the module.

#### Acceptance Criteria

1. THE AEGIS-FIN Module SHALL register routes under the `/aegis` path prefix within the existing React Router DOM configuration, without modifying any existing routes.
2. THE AegisLayout SHALL render a persistent left-side navigation panel listing all 10 AEGIS-FIN pages with their route paths and Lucide React icons.
3. WHEN a user navigates to `/aegis` or `/aegis/portfolio`, THE AEGIS-FIN Module SHALL render the Global Bank Portfolio Overview page.
4. WHEN a user navigates to a company-specific sub-route (e.g., `/aegis/company/:id/solvency`), THE AegisLayout SHALL display the company name and ticker as a breadcrumb in the page header.
5. IF a user navigates to an unrecognised `/aegis/*` path, THEN THE AEGIS-FIN Module SHALL redirect the user to `/aegis/portfolio`.
6. THE AegisLayout SHALL reuse the existing `ThemeContext` for dark/light mode toggling and SHALL NOT create a new theme context.
7. THE AegisLayout SHALL be visually consistent with the existing design system, using only CSS classes defined in `frontend/src/index.css` and components from `frontend/src/components/`.

---

### Requirement 2: Centralized Data Access via AegisDataContext

**User Story:** As a developer, I want all Supabase queries for AEGIS-FIN to be in one place, so that data fetching logic is maintainable and testable without scattering API calls across pages.

#### Acceptance Criteria

1. THE AegisDataContext SHALL be the only file in the AEGIS-FIN module that imports and calls the Supabase client from `frontend/src/lib/supabase.js`.
2. THE AegisDataContext SHALL expose data, loading state, and error state for each of the following datasets: portfolio summary, sector health, company insights, balance sheet scores, holding scores, correlation scores, OHLCV raw, OHLCV health, and sector OHLCV raw.
3. WHEN a Supabase query fails, THE AegisDataContext SHALL set the corresponding error state to a descriptive string and SHALL NOT throw an unhandled exception.
4. THE AegisDataContext SHALL accept a `companyId` parameter to scope company-specific queries, and SHALL re-fetch company data WHEN `companyId` changes.
5. THE AegisDataContext SHALL accept a `sectorId` parameter to scope sector-specific queries, and SHALL re-fetch sector data WHEN `sectorId` changes.
6. WHILE a Supabase query is in-flight, THE AegisDataContext SHALL set the corresponding loading state to `true`.
7. THE AegisDataContext SHALL NOT import any page components, hooks, or contexts from the existing non-AEGIS-FIN frontend codebase, except for `frontend/src/lib/supabase.js` and `frontend/src/context/ThemeContext.jsx`.

---

### Requirement 3: Global Bank Portfolio Overview Page

**User Story:** As a Credit Committee member, I want a single-screen portfolio overview, so that I can immediately see the total number of monitored companies, average portfolio health, risk distribution, and the top default risks.

#### Acceptance Criteria

1. WHEN the Portfolio Overview page loads, THE Portfolio_Overview_Page SHALL display a KPI card showing the count of companies where `companies.is_active = TRUE`.
2. WHEN the Portfolio Overview page loads, THE Portfolio_Overview_Page SHALL display a KPI card showing the average `final_score` across the latest `company_insights` record for each active company, rounded to two decimal places.
3. THE Portfolio_Overview_Page SHALL render a Donut Chart showing the count of active companies grouped by `company_insights.class` (`Safe`, `Watchlist`, `High Risk`), with green, amber, and red segment colors respectively.
4. THE Portfolio_Overview_Page SHALL render a Data Table showing the 5 companies with the lowest `final_score` (sorted ascending), displaying columns: Ticker, Company Name, Risk Score, and Class.
5. THE Portfolio_Overview_Page SHALL render an AI Portfolio Summary text block displaying the `summary` field from the most recent `company_insights` record of the highest-risk company (lowest `final_score`).
6. WHILE portfolio data is loading, THE Portfolio_Overview_Page SHALL display skeleton placeholders using the existing `Skeleton` component from `frontend/src/components/ui/LoadingSpinner.jsx`.
7. IF no active companies exist in the database, THEN THE Portfolio_Overview_Page SHALL display an empty state using the existing `EmptyState` component from `frontend/src/components/ui/EmptyState.jsx`.

---

### Requirement 4: Macro & Sector Contagion Watch Page

**User Story:** As a Loan Monitoring Officer, I want to see which sectors are performing best and worst, so that I can identify macro-level contagion risks that may affect SME borrowers in those sectors.

#### Acceptance Criteria

1. THE Sector_Contagion_Page SHALL display the top 3 and bottom 3 sectors ranked by `sector_health.cum_change_1y` for the most recent available date.
2. THE Sector_Contagion_Page SHALL render a Sector Heatmap grid where each cell represents one sector, colored on a green-to-red gradient based on the sector's latest `sector_health.health_score`.
3. THE Sector_Contagion_Page SHALL render a Multi-Line Chart showing `sector_health.composite` scores over a Rolling_Window of up to 3 years, with one line per active sector.
4. WHEN a user hovers over a sector cell in the Heatmap, THE Sector_Contagion_Page SHALL display a tooltip showing the sector name, latest `health_score`, and `cum_change_1y`.
5. IF sector health data is unavailable for a sector, THEN THE Sector_Contagion_Page SHALL render that sector's heatmap cell in a neutral gray color and display "No Data" in the tooltip.
6. WHILE sector data is loading, THE Sector_Contagion_Page SHALL display skeleton placeholders for the heatmap and chart areas.

---

### Requirement 5: Company Master Profile & NPA Verdict Page

**User Story:** As a Credit Risk Manager, I want a single-company profile page showing the AI-generated NPA verdict and all component scores, so that I can quickly assess the overall risk posture of a specific borrower.

#### Acceptance Criteria

1. WHEN the Company Profile page loads for a given `:id`, THE Company_Profile_Page SHALL display the company's `final_score` and `class` prominently at the top of the page using a large typographic treatment.
2. THE Company_Profile_Page SHALL render four Gauge_Charts displaying `trend_score`, `fundamental_score`, `sentiment_score`, and `momentum` from the latest `company_insights` record, each on a 0–100 scale.
3. THE Company_Profile_Page SHALL render a Radar_Chart with axes for `risk`, `strength`, and `sector_alignment_score` from the latest `company_insights` record.
4. THE Company_Profile_Page SHALL render an AI Verdict card displaying the `summary` text from the latest `company_insights` record.
5. WHEN `company_insights.class` is `High Risk`, THE Company_Profile_Page SHALL apply a red visual treatment (using `.badge-red`) to the class badge.
6. WHEN `company_insights.class` is `Watchlist`, THE Company_Profile_Page SHALL apply an amber visual treatment (using `.badge-amber`) to the class badge.
7. WHEN `company_insights.class` is `Safe`, THE Company_Profile_Page SHALL apply a green visual treatment (using `.badge-green`) to the class badge.
8. IF no `company_insights` record exists for the given company ID, THEN THE Company_Profile_Page SHALL display an empty state message indicating no insight data is available.

---

### Requirement 6: Solvency & Leverage Risk Page

**User Story:** As a Credit Risk Manager, I want to see a company's solvency and leverage metrics over time, so that I can detect deteriorating debt levels and imminent default signals before they become NPAs.

#### Acceptance Criteria

1. THE Solvency_Page SHALL query `balance_sheet_scores` joined with `ratio_definitions` WHERE `ratio_definitions.category IN ('Leverage', 'Liquidity')` for the given company.
2. THE Solvency_Page SHALL display KPI cards for Debt/Equity, Debt/Assets, Interest Coverage, and Current Ratio using the most recent period's values.
3. THE Solvency_Page SHALL render an Area Chart showing the rolling 3-year trend of the Debt/Equity ratio by period.
4. THE Solvency_Page SHALL render a Line Chart showing Interest Coverage over time with a horizontal reference line at 1.5.
5. WHEN a company's Interest Coverage value is below 1.5 for the most recent period, THE Solvency_Page SHALL display a "Default Warning" alert banner using `.badge-red` styling.
6. THE Solvency_Page SHALL render a YoY Drop Table listing all metrics where `yoy_pct` is below −20%, showing columns: Metric Name, Current Value, YoY Change %, and Status.
7. IF no `balance_sheet_scores` records exist for the Leverage or Liquidity categories for the given company, THEN THE Solvency_Page SHALL display an empty state for each affected section.

---

### Requirement 7: Cashflow & Operational Efficiency Page

**User Story:** As a Credit Risk Manager, I want to analyse a company's cashflow quality and operational efficiency, so that I can identify margin erosion and profitability deterioration that precede loan defaults.

#### Acceptance Criteria

1. THE Cashflow_Page SHALL query `balance_sheet_scores` joined with `ratio_definitions` WHERE `ratio_definitions.category IN ('CashFlow', 'Profitability', 'Efficiency')` for the given company.
2. THE Cashflow_Page SHALL display KPI cards for CFO/Net Income, FCF Margin %, and Asset Turnover using the most recent period's values.
3. THE Cashflow_Page SHALL render a Grouped Bar Chart showing Gross Margin %, EBITDA Margin %, and Net Profit Margin % side-by-side for the last 4 to 12 available quarters.
4. THE Cashflow_Page SHALL render a Line Chart showing the `hist_pct_rank` of the ROE % metric over time, labelled "Historical Rank Tracker".
5. IF fewer than 4 quarters of margin data are available, THEN THE Cashflow_Page SHALL render the Grouped Bar Chart with the available quarters and SHALL display a notice indicating limited historical data.

---

### Requirement 8: Smart Money Flight & Ownership Page

**User Story:** As a Loan Monitoring Officer, I want to track changes in promoter and institutional ownership, so that I can detect Smart_Money_Flight signals that indicate insider loss of confidence in the borrower.

#### Acceptance Criteria

1. THE Ownership_Page SHALL query `holding_scores` joined with `holding_metric_definitions` for the given company.
2. THE Ownership_Page SHALL display KPI cards for Promoter Holding %, Institutional Ownership %, and Insider Net Buy % using the most recent period's values.
3. THE Ownership_Page SHALL render a Stacked Area Chart showing the distribution of Promoters, FII, DII, and Public ownership percentages over a Rolling_Window of up to 3 years.
4. THE Ownership_Page SHALL render a Bar Chart showing Insider Net Buy % per period, with bars colored green for positive values and red for negative values.
5. THE Ownership_Page SHALL render a Gauge_Chart displaying the Holder Concentration (HHI) score.
6. WHEN Promoter Holding % has declined by more than 5 percentage points compared to the value 4 periods prior, THE Ownership_Page SHALL display a Smart_Money_Flight warning badge using `.badge-red`.
7. WHEN Insider Net Buy % is negative for the most recent period, THE Ownership_Page SHALL display a negative insider activity indicator using `.badge-amber`.

---

### Requirement 9: Company vs. Sector Correlation Page

**User Story:** As a Credit Risk Manager, I want to compare a company's price performance against its sector, so that I can determine whether the company is diverging from or tracking sector trends.

#### Acceptance Criteria

1. THE Correlation_Page SHALL query `correlation_scores`, `ohlcv_raw`, and `sector_ohlcv_raw` for the given company and its associated sector.
2. THE Correlation_Page SHALL display KPI cards for `corr_100d`, `outperf_100d`, and `aligned_dn_pct` from the most recent `correlation_scores` record.
3. THE Correlation_Page SHALL render a Dual-Axis Line Chart showing the company's `ohlcv_raw.close` price and the sector's `sector_ohlcv_raw.close` price on separate Y-axes over a Rolling_Window of up to 3 years.
4. THE Correlation_Page SHALL render a Bar Chart showing `outperf_20d`, `outperf_60d`, and `outperf_100d` from the most recent `correlation_scores` record.
5. THE Correlation_Page SHALL render a Donut Chart showing `aligned_dn_pct` vs. its complement (100 − `aligned_dn_pct`), labelled "Downside Alignment".
6. IF no `correlation_scores` record exists for the given company, THEN THE Correlation_Page SHALL display an empty state for all chart and KPI sections.

---

### Requirement 10: Market Sentiment & Price Volatility Page

**User Story:** As a Loan Monitoring Officer, I want to see a company's historical price action and volatility profile, so that I can identify abnormal market behaviour that may signal credit stress.

#### Acceptance Criteria

1. THE Market_Page SHALL query `ohlcv_raw` and `ohlcv_health` for the given company over a Rolling_Window of up to 3 years.
2. THE Market_Page SHALL render a Candlestick_Chart using `ohlcv_raw` (open, high, low, close) with visual markers on dates where `ohlcv_health.spike_down = TRUE`.
3. THE Market_Page SHALL render a Line Chart showing `ohlcv_health.volatility` over time.
4. THE Market_Page SHALL render a Bar Chart showing the distribution of `ohlcv_health.ret_z` values, grouped into bins, labelled "Return Z-Score Distribution".
5. IF fewer than 30 trading days of OHLCV data are available, THEN THE Market_Page SHALL display a notice indicating insufficient data for reliable chart rendering, and SHALL render charts with the available data.

---

### Requirement 11: Stress Testing & Sector Pressure Page

**User Story:** As a Credit Committee member, I want to see which of a company's financial ratios are under the most sector pressure, so that I can stress-test the loan portfolio against macro headwinds.

#### Acceptance Criteria

1. THE Stress_Page SHALL query `balance_sheet_scores` and `holding_scores` for the given company, using the `sector_pressure` column from both tables.
2. THE Stress_Page SHALL render a Heatmap_Matrix where the Y-axis represents individual ratio/metric names, the X-axis represents reporting periods (quarters), and cell color intensity encodes the `sector_pressure` value.
3. THE Stress_Page SHALL display 3 metric cards identifying the top 3 metrics with the highest `sector_pressure` values across all periods, showing the metric name, latest `sector_pressure` value, and category.
4. WHEN a cell's `sector_pressure` value exceeds 0.7, THE Stress_Page SHALL render that cell with a red color intensity to indicate high macro drag.
5. IF no `sector_pressure` data is available for the given company, THEN THE Stress_Page SHALL display an empty state for the heatmap and metric cards.

---

### Requirement 12: NPA AI Report Generator Page

**User Story:** As a Credit Committee member, I want to generate a comprehensive NPA risk report for a specific company, so that I can present a structured, data-backed credit decision to the committee.

#### Acceptance Criteria

1. THE Report_Page SHALL query `company_insights` and the worst-performing metrics from `balance_sheet_scores` and `holding_scores` for the given company.
2. THE Report_Page SHALL render a Waterfall_Chart showing: base score → adjustments from `fundamental_score`, `sentiment_score`, and `trend_score` → resulting `final_score`.
3. THE Report_Page SHALL render a Key Red Flags section listing all metrics where `hist_pct_rank < 10` OR `yoy_pct < -20%`, showing the metric name, value, and the triggering condition.
4. WHEN `company_insights.class` is `High Risk`, THE Report_Page SHALL display a Final Recommendation Banner reading "Action Required: High Default Probability" using `.badge-red` styling.
5. WHEN `company_insights.class` is `Safe`, THE Report_Page SHALL display a Final Recommendation Banner reading "Status: Healthy Performing Asset" using `.badge-green` styling.
6. WHEN `company_insights.class` is `Watchlist`, THE Report_Page SHALL display a Final Recommendation Banner reading "Monitor Closely: Elevated Risk Indicators" using `.badge-amber` styling.
7. THE Report_Page SHALL provide a "Print / Export PDF" button that triggers the browser's native print dialog (`window.print()`), allowing the user to save the report as a PDF.
8. WHEN the "Print / Export PDF" button is activated, THE Report_Page SHALL apply print-specific CSS to hide navigation elements and render only the report content.
9. IF the Key Red Flags section contains no qualifying metrics, THEN THE Report_Page SHALL display a message stating "No critical red flags detected for this period."

---

### Requirement 13: Component Reuse and Design System Compliance

**User Story:** As a developer, I want all AEGIS-FIN pages to use only the existing UI component library and design tokens, so that the module is visually consistent with the rest of the application and does not introduce maintenance debt.

#### Acceptance Criteria

1. THE AEGIS-FIN Module SHALL import UI components exclusively from `frontend/src/components/ui/` and `frontend/src/components/dashboard/` — no new UI primitive components shall be created.
2. THE AEGIS-FIN Module SHALL use only CSS classes defined in `frontend/src/index.css` (e.g., `.card`, `.badge`, `.badge-green`, `.badge-red`, `.badge-amber`, `.label-caps`, `.value-xl`, `.value-lg`, `.muted`, `.btn-primary`, `.btn-orange`) for styling.
3. THE AEGIS-FIN Module SHALL use Recharts (already installed) for all chart components — no additional charting libraries shall be installed.
4. THE AEGIS-FIN Module SHALL use Lucide React (already installed) for all icons — no additional icon libraries shall be installed.
5. THE AEGIS-FIN Module SHALL NOT import any page components, context providers (except `ThemeContext`), or custom hooks from the existing non-AEGIS-FIN frontend pages.
6. THE AEGIS-FIN Module SHALL use the existing `supabase` client exported from `frontend/src/lib/supabase.js` — no new Supabase client instances shall be created.

---

### Requirement 14: Error Handling and Resilience

**User Story:** As a Loan Monitoring Officer, I want the dashboard to handle data gaps and API errors gracefully, so that a missing data point for one company does not break the entire module.

#### Acceptance Criteria

1. WHEN a Supabase query returns an error, THE AEGIS-FIN Module SHALL display an inline error message within the affected section using a `.badge-red` styled alert, without crashing the page.
2. WHEN a chart receives an empty dataset, THE AEGIS-FIN Module SHALL render the chart container with an empty state message rather than a blank or broken chart.
3. IF a numeric value required for a KPI card is `null` or `undefined`, THEN THE AEGIS-FIN Module SHALL display "—" (em dash) as the placeholder value.
4. THE AEGIS-FIN Module SHALL NOT display raw Supabase error objects or stack traces to the end user.
5. WHILE any data section is loading, THE AEGIS-FIN Module SHALL display the existing `LoadingSpinner` or `Skeleton` components from `frontend/src/components/ui/LoadingSpinner.jsx`.
