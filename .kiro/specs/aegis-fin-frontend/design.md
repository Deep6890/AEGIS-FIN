# Design Document — AEGIS-FIN Frontend

## Overview

AEGIS-FIN is a read-only Post-Disbursement Early Warning System (EWS) and NPA Predictor dashboard, mounted as a self-contained React module under the `/aegis` route prefix of the existing Vite + React application. It surfaces AI-driven risk scores, solvency signals, ownership flight indicators, sector contagion data, and market volatility metrics for Bank Credit Risk Managers, Loan Monitoring Officers, and Credit Committee members.

The module is additive — it does not modify any existing routes, contexts, or components. All data flows through a single centralized context (`AegisDataContext`). All UI is built from the existing design system (`frontend/src/index.css` tokens and `frontend/src/components/` primitives). All charts use Recharts (already installed).

### Key Design Decisions

- **Single data context**: All Supabase calls are isolated in `AegisDataContext.jsx`. Pages are pure presentational consumers. This makes the data layer independently testable and prevents scattered API calls.
- **Additive routing**: `AegisRouter.jsx` is inserted as a single `<Route path="/aegis/*">` inside the existing `<AppDataProvider>` block in `App.jsx`. No existing routes are touched.
- **Design system reuse**: Zero new CSS tokens or Tailwind utilities. All styling uses classes already defined in `index.css` (`.card`, `.badge-*`, `.value-xl`, etc.).
- **Recharts only**: All 4 custom chart components (GaugeChart, CandlestickChart, HeatmapMatrix, WaterfallChart) are built with Recharts primitives already in the bundle.
- **Null safety everywhere**: Every value display uses `?? "—"` fallback. Charts receive empty-array guards. No page can crash from missing data.

---

## Architecture

```
App.jsx
└── BrowserRouter
    └── ThemeProvider
        └── AuthProvider
            └── AppDataProvider          ← existing, unchanged
                ├── [existing routes]    ← unchanged
                └── Route /aegis/*
                    └── AegisRouter.jsx
                        └── AegisDataProvider  ← new, wraps all aegis pages
                            └── AegisLayout.jsx
                                ├── AegisSidebar.jsx  (desktop pill sidebar)
                                └── <Outlet />        (page content)
                                    ├── PortfolioOverview
                                    ├── SectorContagion
                                    ├── CompanyProfile
                                    ├── SolvencyRisk
                                    ├── CashflowEfficiency
                                    ├── OwnershipTracking
                                    ├── CorrelationAnalysis
                                    ├── MarketVolatility
                                    ├── StressTesting
                                    └── NPAReportGenerator
```

### Data Flow

```
Supabase DB
    ↓  (single client from frontend/src/lib/supabase.js)
AegisDataContext.jsx
    ↓  useAegisData() hook
Page Components
    ↓  props / derived values
Chart Components (GaugeChart, CandlestickChart, HeatmapMatrix, WaterfallChart)
    ↓  Recharts primitives
DOM
```

### Module Boundaries

| Layer | Files | Responsibility |
|---|---|---|
| Data | `context/AegisDataContext.jsx` | All Supabase queries, loading/error state |
| Layout | `layout/AegisLayout.jsx`, `layout/AegisSidebar.jsx` | Shell, nav, breadcrumb |
| Pages | `pages/*.jsx` (10 files) | Data consumption, layout composition |
| Charts | `charts/*.jsx` (4 files) | Recharts wrappers, chart-specific logic |
| Router | `AegisRouter.jsx` | Route definitions, redirect |

---

## Components and Interfaces

### AegisDataContext

```jsx
// Context shape
{
  // Portfolio-level
  companies: Company[],          // companies where is_active = true
  sectors: Sector[],             // all active sectors
  portfolioInsights: Insight[],  // latest company_insights per company
  sectorHealth: SectorHealth[],  // latest sector_health per sector
  sectorHealthHistory: SectorHealth[], // rolling 3yr sector_health

  // Company-scoped (re-fetched when companyId changes)
  companyId: string | null,
  company: Company | null,
  insight: Insight | null,
  balanceSheet: BalanceSheetScore[],
  holdingScores: HoldingScore[],
  correlationScores: CorrelationScore[],
  ohlcvRaw: OHLCVRaw[],
  ohlcvHealth: OHLCVHealth[],

  // Sector-scoped (re-fetched when sectorId changes)
  sectorId: string | null,
  sectorOhlcv: SectorOHLCV[],

  // Setters
  setCompanyId: (id: string) => void,
  setSectorId: (id: string) => void,

  // Loading flags
  loading: {
    portfolio: boolean,
    company: boolean,
    sector: boolean,
  },

  // Error strings
  errors: {
    portfolio: string | null,
    company: string | null,
    sector: string | null,
  }
}
```

**Hook**: `export const useAegisData = () => useContext(AegisDataContext)`

### AegisLayout

Props: none (reads route params internally via `useParams`)

Renders:
- `AegisSidebar` (fixed left, desktop) / bottom dock (mobile)
- Breadcrumb header with company name + ticker when on company sub-routes
- `<Outlet />` for page content
- Padding: `pl-[72px]` on desktop to clear sidebar

### AegisSidebar

10 nav items with Lucide icons:

| # | Label | Route | Icon |
|---|---|---|---|
| 1 | Portfolio | /aegis/portfolio | `LayoutDashboard` |
| 2 | Sectors | /aegis/sectors | `Globe` |
| 3 | Company Profile | /aegis/company/:id | `Building2` |
| 4 | Solvency | /aegis/company/:id/solvency | `ShieldAlert` |
| 5 | Cashflow | /aegis/company/:id/cashflow | `TrendingUp` |
| 6 | Ownership | /aegis/company/:id/ownership | `Users` |
| 7 | Correlation | /aegis/company/:id/correlation | `GitBranch` |
| 8 | Market | /aegis/company/:id/market | `Activity` |
| 9 | Stress Test | /aegis/company/:id/stress | `Zap` |
| 10 | NPA Report | /aegis/company/:id/report | `FileText` |

### Chart Components

#### GaugeChart (`charts/GaugeChart.jsx`)

```jsx
// Props
{ value: number,   // 0-100
  label: string,
  color?: string,  // defaults to score-based color
  size?: number    // defaults to 160
}
```

Implementation: `RadialBarChart` with `startAngle={180}` `endAngle={0}`, single `RadialBar`, background track via second RadialBar at value=100 with low opacity.

Score color logic:
- `value >= 70` → `#52B788` (green)
- `value >= 40` → `#F59E0B` (amber)
- `value < 40` → `#EF4444` (red)

#### CandlestickChart (`charts/CandlestickChart.jsx`)

```jsx
// Props
{ data: Array<{ date, open, high, low, close, spike_down }>,
  height?: number
}
```

Implementation: `ComposedChart` with:
- `Bar` for high-low range (transparent fill, stroke only)
- `Bar` for open-close body (green if close>open, red otherwise)
- `Scatter` for spike_down markers (red dots below low)

#### HeatmapMatrix (`charts/HeatmapMatrix.jsx`)

```jsx
// Props
{ data: Array<{ metric: string, period: string, value: number }>,
  // value is sector_pressure 0-1
}
```

Implementation: CSS grid of `div` cells. Color interpolated:
- `value < 0.3` → `#52B788` (green)
- `value 0.3-0.7` → `#F59E0B` (amber, interpolated)
- `value > 0.7` → `#EF4444` (red)

Tooltip on hover via `title` attribute or inline state.

#### WaterfallChart (`charts/WaterfallChart.jsx`)

```jsx
// Props
{ base: number,
  adjustments: Array<{ label: string, value: number }>,
  final: number
}
```

Implementation: `BarChart` with stacked bars. Each bar = invisible base + colored delta. Positive deltas green, negative red, final bar orange.

---

## Data Models

TypeScript-style interfaces (used as JSDoc in JSX):

```ts
interface Company {
  id: string;
  ticker: string;
  name: string;
  exchange: string;
  sector_id: string;
  is_active: boolean;
}

interface Sector {
  id: string;
  name: string;
  yf_ticker: string;
  sector_type: string;
  is_active: boolean;
}

interface Insight {
  company_id: string;
  date: string;
  insight_score: number | null;
  final_score: number | null;
  class: "Safe" | "Watchlist" | "High Risk" | null;
  trend_score: number | null;
  fundamental_score: number | null;
  sentiment_score: number | null;
  sector_alignment_score: number | null;
  momentum: number | null;
  risk: number | null;
  strength: number | null;
  summary: string | null;
}

interface BalanceSheetScore {
  company_id: string;
  ratio_id: number;
  period: string;
  value: number | null;
  yoy_pct: number | null;
  hist_pct_rank: number | null;
  sector_pressure: number | null;
  status: string | null;
  adjusted_status: string | null;
  trend: string | null;
  ratio_definitions: { name: string; category: string; higher_is_better: boolean };
}

interface HoldingScore {
  company_id: string;
  metric_id: number;
  period: string;
  value: number | null;
  hist_pct_rank: number | null;
  sector_pressure: number | null;
  status: string | null;
  adjusted_status: string | null;
  trend: string | null;
  holding_metric_definitions: { name: string; category: string };
}

interface CorrelationScore {
  company_id: string;
  sector_id: string;
  date: string;
  corr_20d: number | null;
  corr_60d: number | null;
  corr_100d: number | null;
  corr_full: number | null;
  outperf_20d: number | null;
  outperf_60d: number | null;
  outperf_100d: number | null;
  aligned_up_pct: number | null;
  aligned_dn_pct: number | null;
  avg_top_health: number | null;
}

interface OHLCVRaw {
  company_id: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OHLCVHealth {
  company_id: string;
  date: string;
  daily_return: number | null;
  cum_change_1m: number | null;
  cum_change_1y: number | null;
  cum_change_2y: number | null;
  close_z: number | null;
  ret_z: number | null;
  z_change: number | null;
  cum_z_change: number | null;
  spike_up: boolean | null;
  spike_down: boolean | null;
  oc_spark: number | null;
  volatility: number | null;
  composite: number | null;
  health_score: number | null;
}

interface SectorHealth {
  sector_id: string;
  date: string;
  health_score: number | null;
  cum_change_1y: number | null;
  composite: number | null;
  volatility: number | null;
  // ... other fields
}

interface SectorOHLCV {
  sector_id: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

### Supabase Query Patterns

**Portfolio queries** (run once on mount):
```js
// Active companies
supabase.from('companies').select('*').eq('is_active', true)

// Latest insight per company (subquery via order + limit per group)
supabase.from('company_insights')
  .select('*')
  .order('date', { ascending: false })

// Sector health latest
supabase.from('sector_health')
  .select('*, sectors(name)')
  .order('date', { ascending: false })
  .limit(500)
```

**Company queries** (re-run when companyId changes):
```js
// Balance sheet with ratio definitions
supabase.from('balance_sheet_scores')
  .select('*, ratio_definitions(name, category, higher_is_better)')
  .eq('company_id', companyId)
  .order('period', { ascending: false })

// Holding scores with metric definitions
supabase.from('holding_scores')
  .select('*, holding_metric_definitions(name, category)')
  .eq('company_id', companyId)
  .order('period', { ascending: false })

// OHLCV (3yr rolling window)
const threeYearsAgo = new Date()
threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)
supabase.from('ohlcv_raw')
  .select('*')
  .eq('company_id', companyId)
  .gte('date', threeYearsAgo.toISOString().split('T')[0])
  .order('date', { ascending: true })
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Breadcrumb reflects company identity

*For any* company ID navigated to in a company sub-route, the AegisLayout breadcrumb SHALL display that company's name and ticker symbol from the companies dataset.

**Validates: Requirements 1.4**

### Property 2: Error state is always a string, never an exception

*For any* Supabase query that returns an error object, the AegisDataContext SHALL set the corresponding error state to a non-null, non-empty string — and SHALL NOT propagate an unhandled exception to the React error boundary.

**Validates: Requirements 2.3, 14.1, 14.4**

### Property 3: Company data re-fetches on ID change

*For any* two distinct company IDs A and B, switching `companyId` from A to B SHALL trigger a new Supabase fetch for company-specific datasets (balance_sheet_scores, holding_scores, ohlcv_raw, ohlcv_health, correlation_scores) scoped to B.

**Validates: Requirements 2.4**

### Property 4: Bottom-5 table is always sorted ascending by final_score

*For any* list of active companies with associated final_scores, the Portfolio Overview bottom-5 table SHALL contain exactly the 5 companies with the lowest final_score values, ordered from lowest to highest.

**Validates: Requirements 3.4**

### Property 5: NPA class badge color is deterministic

*For any* company_insights record, the class badge color SHALL be: `.badge-red` when class = "High Risk", `.badge-amber` when class = "Watchlist", `.badge-green` when class = "Safe" — with no other possible badge class applied.

**Validates: Requirements 5.5, 5.6, 5.7**

### Property 6: Default Warning banner threshold is strict

*For any* Interest Coverage ratio value, the Default Warning banner SHALL be visible if and only if the value is strictly less than 1.5.

**Validates: Requirements 6.5**

### Property 7: Smart Money Flight warning threshold is strict

*For any* sequence of Promoter Holding % values, the Smart_Money_Flight warning badge SHALL appear if and only if the most recent value is more than 5 percentage points below the value 4 periods prior.

**Validates: Requirements 8.6**

### Property 8: Red Flags filter is exhaustive and exclusive

*For any* set of balance_sheet_scores and holding_scores records, the Key Red Flags section SHALL contain exactly those metrics where `hist_pct_rank < 10` OR `yoy_pct < -20%` — no more, no fewer.

**Validates: Requirements 12.3**

### Property 9: Null/undefined numeric values always render as em dash

*For any* KPI card, gauge chart label, or data table cell that receives a `null` or `undefined` numeric value, the rendered output SHALL display "—" (em dash) and SHALL NOT display "null", "undefined", "NaN", or an empty string.

**Validates: Requirements 14.3**

---

## Error Handling

### Strategy

Every data-consuming section follows this pattern:

```jsx
{errors.company && (
  <div className="badge badge-red mb-4">
    Data unavailable: {errors.company}
  </div>
)}
{loading.company ? (
  <Skeleton className="h-32 w-full" />
) : data.length === 0 ? (
  <EmptyState title="No data" sub="No records found for this company." />
) : (
  <ActualContent data={data} />
)}
```

### Error Boundaries

- No custom error boundary is added. React's default error boundary behavior is preserved.
- All Supabase errors are caught in `AegisDataContext` try/catch blocks and stored as strings.
- Pages never call Supabase directly, so no unhandled promise rejections can originate from pages.

### Null Safety Rules

1. All numeric displays: `value ?? "—"`
2. All string displays: `value || "—"`
3. All array maps: guard with `(array || []).map(...)`
4. All chart data: pass `data || []` to Recharts components
5. All `.toFixed()` calls: `(value ?? 0).toFixed(2)`

### Loading States

- Portfolio-level loading: `loading.portfolio` — shown on PortfolioOverview and SectorContagion
- Company-level loading: `loading.company` — shown on all company sub-pages
- Sector-level loading: `loading.sector` — shown on SectorContagion sector OHLCV sections

---

## Testing Strategy

### Assessment: PBT Applicability

This feature is a React frontend module. The core logic consists of:
1. **Data filtering/sorting** (bottom-5 table, red flags filter, threshold comparisons) — suitable for PBT
2. **UI rendering** (charts, badges, layout) — suitable for example-based tests
3. **Supabase integration** (data fetching) — suitable for integration tests with mocks

PBT IS applicable for the pure logic functions (filtering, sorting, threshold checks, null-safety rendering).

### Property-Based Testing Library

Use **fast-check** (JavaScript PBT library) for property tests.

```bash
npm install --save-dev fast-check
```

Each property test runs minimum **100 iterations**.

### Unit Tests (Example-Based)

Focus on:
- Route rendering: verify each `/aegis/*` route renders the correct page component
- Badge color mapping: verify Safe→green, Watchlist→amber, High Risk→red
- Empty state rendering: verify EmptyState appears when data arrays are empty
- Loading state rendering: verify Skeleton appears when loading flags are true
- Chart rendering: verify charts render without crashing with minimal valid data

### Property Tests (fast-check)

**Property 4 — Bottom-5 sort:**
```js
fc.assert(fc.property(
  fc.array(fc.record({ ticker: fc.string(), name: fc.string(), final_score: fc.float() }), { minLength: 6, maxLength: 50 }),
  (companies) => {
    const result = getBottom5(companies);
    return result.length === 5 &&
      result.every((c, i) => i === 0 || result[i-1].final_score <= c.final_score);
  }
), { numRuns: 100 });
```

**Property 6 — Default Warning threshold:**
```js
fc.assert(fc.property(
  fc.float({ min: 0, max: 10 }),
  (icr) => {
    const shouldWarn = icr < 1.5;
    const result = shouldShowDefaultWarning(icr);
    return result === shouldWarn;
  }
), { numRuns: 100 });
```

**Property 8 — Red Flags filter:**
```js
fc.assert(fc.property(
  fc.array(fc.record({
    name: fc.string(),
    hist_pct_rank: fc.option(fc.float({ min: 0, max: 100 })),
    yoy_pct: fc.option(fc.float({ min: -100, max: 100 }))
  })),
  (metrics) => {
    const flags = getRedFlags(metrics);
    const expected = metrics.filter(m => (m.hist_pct_rank ?? 100) < 10 || (m.yoy_pct ?? 0) < -20);
    return flags.length === expected.length &&
      flags.every(f => (f.hist_pct_rank ?? 100) < 10 || (f.yoy_pct ?? 0) < -20);
  }
), { numRuns: 100 });
```

**Property 9 — Null safety:**
```js
fc.assert(fc.property(
  fc.option(fc.float(), { nil: null }),
  (value) => {
    const rendered = renderKpiValue(value);
    if (value === null || value === undefined) {
      return rendered === "—";
    }
    return rendered !== "null" && rendered !== "undefined";
  }
), { numRuns: 100 });
```

### Integration Tests

- Mock Supabase client to return error → verify AegisDataContext sets error string
- Mock Supabase client to return empty array → verify EmptyState renders
- Mock Supabase client to return valid data → verify data renders in page

### Tag Format

Each property test is tagged:
```js
// Feature: aegis-fin-frontend, Property 4: Bottom-5 table sorted ascending by final_score
// Feature: aegis-fin-frontend, Property 6: Default Warning banner threshold is strict
// Feature: aegis-fin-frontend, Property 8: Red Flags filter is exhaustive and exclusive
// Feature: aegis-fin-frontend, Property 9: Null/undefined numeric values render as em dash
```
