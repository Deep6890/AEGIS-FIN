// ─── Central Temporary Data Provider ───────────────────────────────────────

export const kpiData = [
  {
    id: 'companies',
    name: 'Total Companies Tracked',
    tagline: 'Across 11 live sectors',
    points: 72,
    delta: '+12%',
    sub: 'vs last quarter',
    tagScore: 'Monitored',
  },
  {
    id: 'alerts',
    name: 'High Risk Alerts',
    tagline: 'Requires immediate attention',
    points: 58,
    delta: '+45%',
    sub: 'spike this week',
    tagScore: 'Critical',
  },
  {
    id: 'watch',
    name: 'Sectors Under Watch',
    tagline: 'Macro pressure detected',
    points: 45,
    delta: '-5%',
    sub: 'improving slowly',
    tagScore: 'Caution',
  },
];

export const marketMeta = {
  NSE: {
    index: 'Nifty 50',
    value: '22,147.90',
    change: '+0.43%',
    status: 'Moderately Stable',
  },
  BSE: {
    index: 'Sensex',
    value: '73,088.33',
    change: '+0.38%',
    status: 'Stable',
  },
};

export const vixData = [
  { x: 'Jan', v: 14.2 },
  { x: 'Feb', v: 18.7 },
  { x: 'Mar', v: 12.4 },
  { x: 'Apr', v: 21.3 },
  { x: 'May', v: 16.8 },
  { x: 'Jun', v: 19.5 },
  { x: 'Jul', v: 13.1 },
  { x: 'Aug', v: 24.6 },
  { x: 'Sep', v: 17.9 },
  { x: 'Oct', v: 15.3 },
  { x: 'Nov', v: 20.1 },
  { x: 'Dec', v: 16.4 },
];

export const riskDistribution = [
  { name: 'Sector Risk',     value: 35, color: '#6366f1' },
  { name: 'Company Risk',    value: 40, color: '#0ea5e9' },
  { name: 'Macro Risk',      value: 25, color: '#64748b' },
];

export const sectorTrendCalendar = [
  { sector: 'Auto',    from: 'Jan 2025', to: 'Mar 2025', type: 'negative', reason: 'Demand slump + high debt' },
  { sector: 'Metal',   from: 'Feb 2025', to: 'Apr 2025', type: 'negative', reason: 'Global slowdown, input cost surge' },
  { sector: 'Realty',  from: 'Mar 2025', to: 'May 2025', type: 'negative', reason: 'Rate hike pressure, low demand' },
  { sector: 'IT',      from: 'Apr 2025', to: 'Jun 2025', type: 'positive', reason: 'Export growth, strong margins' },
  { sector: 'Pharma',  from: 'May 2025', to: 'Jul 2025', type: 'positive', reason: 'R&D spend, export recovery' },
  { sector: 'Banking', from: 'Jun 2025', to: 'Aug 2025', type: 'negative', reason: 'NPA concerns, rate sensitivity' },
];

// months index: Jan=0 … Dec=11
// each bar: { label, startMonth, endMonth (inclusive), type: 'risk'|'stable'|'watch', note }
export const sectorTimeline = [
  {
    name: 'IT',
    sector: 'Technology',
    score: 82,
    bars: [
      { label: 'Strong Rally',      startMonth: 0, endMonth: 2,  type: 'stable', note: 'Export growth, strong margins' },
      { label: 'Consolidation',     startMonth: 3, endMonth: 5,  type: 'watch',  note: 'Valuation concerns' },
      { label: 'Recovery Phase',    startMonth: 6, endMonth: 11, type: 'stable', note: 'Deal wins, hiring uptick' },
    ],
  },
  {
    name: 'Auto',
    sector: 'Automobile',
    score: 41,
    bars: [
      { label: 'Demand Slump',      startMonth: 0, endMonth: 4,  type: 'risk',   note: 'High debt, demand slump' },
      { label: 'EV Transition',     startMonth: 5, endMonth: 8,  type: 'watch',  note: 'EV push underway' },
      { label: 'Partial Recovery',  startMonth: 9, endMonth: 11, type: 'stable', note: 'Festive season boost' },
    ],
  },
  {
    name: 'FMCG',
    sector: 'Consumer',
    score: 67,
    bars: [
      { label: 'Stable Margins',    startMonth: 0, endMonth: 5,  type: 'stable', note: 'Stable margins, low churn' },
      { label: 'Input Cost Rise',   startMonth: 6, endMonth: 8,  type: 'watch',  note: 'Commodity pressure' },
      { label: 'Margin Recovery',   startMonth: 9, endMonth: 11, type: 'stable', note: 'Price hikes absorbed' },
    ],
  },
  {
    name: 'Pharma',
    sector: 'Healthcare',
    score: 74,
    bars: [
      { label: 'Export Growth',     startMonth: 0, endMonth: 3,  type: 'stable', note: 'R&D spend, export recovery' },
      { label: 'USFDA Watch',       startMonth: 4, endMonth: 6,  type: 'watch',  note: 'Regulatory scrutiny' },
      { label: 'Outperformance',    startMonth: 7, endMonth: 11, type: 'stable', note: 'Generic launches' },
    ],
  },
  {
    name: 'Metal',
    sector: 'Commodities',
    score: 38,
    bars: [
      { label: 'Global Slowdown',   startMonth: 0, endMonth: 6,  type: 'risk',   note: 'Global slowdown, input cost surge' },
      { label: 'Mild Rebound',      startMonth: 7, endMonth: 9,  type: 'watch',  note: 'China demand signals' },
      { label: 'Pressure Returns',  startMonth: 10, endMonth: 11, type: 'risk',  note: 'Oversupply concerns' },
    ],
  },
  {
    name: 'Banking',
    sector: 'Finance',
    score: 71,
    bars: [
      { label: 'Low NPA Phase',     startMonth: 0, endMonth: 3,  type: 'stable', note: 'Strong CASA, low NPA' },
      { label: 'Rate Sensitivity',  startMonth: 4, endMonth: 7,  type: 'watch',  note: 'NPA concerns, rate sensitivity' },
      { label: 'Credit Growth',     startMonth: 8, endMonth: 11, type: 'stable', note: 'Retail credit expansion' },
    ],
  },
];

export const companyTimeline = [
  {
    name: 'Tata Motors',
    sector: 'Auto',
    score: 61,
    bars: [
      { label: 'JLR Recovery',      startMonth: 0, endMonth: 3,  type: 'stable', note: 'JLR turnaround, EV push' },
      { label: 'Supply Chain Risk', startMonth: 4, endMonth: 6,  type: 'watch',  note: 'Chip shortage impact' },
      { label: 'EV Momentum',       startMonth: 7, endMonth: 11, type: 'stable', note: 'Nexon EV sales surge' },
    ],
  },
  {
    name: 'Reliance',
    sector: 'Conglomerate',
    score: 78,
    bars: [
      { label: 'Retail Expansion',  startMonth: 0, endMonth: 5,  type: 'stable', note: 'Retail growth, Jio expansion' },
      { label: 'Capex Cycle',       startMonth: 6, endMonth: 8,  type: 'watch',  note: 'Heavy capex deployment' },
      { label: 'Monetisation',      startMonth: 9, endMonth: 11, type: 'stable', note: 'New energy bets' },
    ],
  },
  {
    name: 'HDFC Bank',
    sector: 'Banking',
    score: 85,
    bars: [
      { label: 'Merger Integration',startMonth: 0, endMonth: 4,  type: 'watch',  note: 'HDFC merger integration' },
      { label: 'Stable Growth',     startMonth: 5, endMonth: 11, type: 'stable', note: 'Low NPA, strong CASA' },
    ],
  },
  {
    name: 'Zomato',
    sector: 'Fintech',
    score: 43,
    bars: [
      { label: 'Cash Burn',         startMonth: 0, endMonth: 5,  type: 'risk',   note: 'Cash burn, thin margins' },
      { label: 'Blinkit Drag',      startMonth: 6, endMonth: 8,  type: 'risk',   note: 'Quick commerce losses' },
      { label: 'Path to Profit',    startMonth: 9, endMonth: 11, type: 'watch',  note: 'Unit economics improving' },
    ],
  },
  {
    name: 'Adani Ports',
    sector: 'Infrastructure',
    score: 55,
    bars: [
      { label: 'Regulatory Risk',   startMonth: 0, endMonth: 3,  type: 'risk',   note: 'Debt concerns, regulatory risk' },
      { label: 'Stabilisation',     startMonth: 4, endMonth: 7,  type: 'watch',  note: 'Debt reduction plan' },
      { label: 'Volume Growth',     startMonth: 8, endMonth: 11, type: 'stable', note: 'Port volume recovery' },
    ],
  },
];

export const marketExplainerData = {
  state: 'Moderately Stable',
  volatility: 'Slightly above normal',
  signals: [
    'Capital rotating into IT and Pharma',
    'Banking sector volatility increasing',
    'Auto sector losing relative momentum',
  ],
  leaders: ['IT', 'Pharma', 'FMCG'],
  laggards: ['Realty', 'Metal', 'Auto'],
};
