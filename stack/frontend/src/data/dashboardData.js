// ─── Bank Risk Assessment Dashboard — Mock Data ────────────────────────────

export const kpiStats = {
  totalCompanies: { value: 248, delta: '+14', sub: 'vs last month' },
  totalSectors:   { value: 11,  delta: '0',   sub: 'all active' },
  highRiskAlerts: { value: 37,  delta: '+8',  sub: 'flagged this week' },
};

export const allSectors = [
  'Banking', 'IT', 'Pharma', 'Auto', 'FMCG',
  'Energy', 'Infra', 'Realty', 'Metal', 'Telecom', 'Consumer',
];

// Intraday chart data — time + index value
export const intradayNSE = [
  { t: '09:15', v: 22080 }, { t: '09:30', v: 22105 }, { t: '09:45', v: 22143 },
  { t: '10:00', v: 22190 }, { t: '10:15', v: 22162 }, { t: '10:30', v: 22210 },
  { t: '10:45', v: 22198 }, { t: '11:00', v: 22245 }, { t: '11:15', v: 22230 },
  { t: '11:30', v: 22278 }, { t: '11:45', v: 22260 }, { t: '12:00', v: 22295 },
  { t: '12:15', v: 22310 }, { t: '12:30', v: 22288 }, { t: '12:45', v: 22320 },
  { t: '13:00', v: 22305 }, { t: '13:15', v: 22340 }, { t: '13:30', v: 22358 },
  { t: '13:45', v: 22342 }, { t: '14:00', v: 22375 }, { t: '14:15', v: 22390 },
  { t: '14:30', v: 22368 }, { t: '14:45', v: 22410 }, { t: '15:00', v: 22148 },
  { t: '15:15', v: 22147 },
];

export const intradayBSE = [
  { t: '09:15', v: 72820 }, { t: '09:30', v: 72910 }, { t: '09:45', v: 72980 },
  { t: '10:00', v: 73050 }, { t: '10:15', v: 73010 }, { t: '10:30', v: 73120 },
  { t: '10:45', v: 73090 }, { t: '11:00', v: 73180 }, { t: '11:15', v: 73150 },
  { t: '11:30', v: 73240 }, { t: '11:45', v: 73200 }, { t: '12:00', v: 73280 },
  { t: '12:15', v: 73310 }, { t: '12:30', v: 73270 }, { t: '12:45', v: 73340 },
  { t: '13:00', v: 73300 }, { t: '13:15', v: 73380 }, { t: '13:30', v: 73420 },
  { t: '13:45', v: 73390 }, { t: '14:00', v: 73450 }, { t: '14:15', v: 73480 },
  { t: '14:30', v: 73440 }, { t: '14:45', v: 73510 }, { t: '15:00', v: 73088 },
  { t: '15:15', v: 73088 },
];

export const marketInfo = {
  NSE: { label: 'Nifty 50',  open: 22080, prev: 22053, change: '+0.43%', changeAbs: '+94.90' },
  BSE: { label: 'Sensex',    open: 72820, prev: 72810, change: '+0.38%', changeAbs: '+278.33' },
};

// Sector donut — high-risk company count per sector
export const sectorRiskDonut = [
  { sector: 'Banking',  count: 8,  color: '#3b82f6' },
  { sector: 'Auto',     count: 6,  color: '#f59e0b' },
  { sector: 'Realty',   count: 5,  color: '#ef4444' },
  { sector: 'Metal',    count: 5,  color: '#8b5cf6' },
  { sector: 'IT',       count: 3,  color: '#06b6d4' },
  { sector: 'Energy',   count: 4,  color: '#f97316' },
  { sector: 'Pharma',   count: 3,  color: '#10b981' },
  { sector: 'Infra',    count: 3,  color: '#64748b' },
];

// VIX — 7-day sparkline
export const vixSparkline = [
  { d: 'Mon', v: 14.2 },
  { d: 'Tue', v: 16.8 },
  { d: 'Wed', v: 15.1 },
  { d: 'Thu', v: 18.4 },
  { d: 'Fri', v: 17.2 },
  { d: 'Mon', v: 19.6 },
  { d: 'Tue', v: 18.9 },
];

export const vixCurrent = 18.9;

// News + sentiment feed
export const newsFeed = [
  {
    id: 1,
    headline: 'RBI raises concern over rising NPA levels in mid-size banks',
    sentiment: 'negative',
    companies: ['IDBI Bank', 'Yes Bank', 'UCO Bank'],
    impact: 9.2,
    time: '2h ago',
  },
  {
    id: 2,
    headline: 'Adani Group secures ₹12,000 Cr infrastructure deal with NHAI',
    sentiment: 'positive',
    companies: ['Adani Ports', 'Adani Enterprises'],
    impact: 7.8,
    time: '3h ago',
  },
  {
    id: 3,
    headline: 'Auto sector faces headwinds as EV transition costs mount',
    sentiment: 'negative',
    companies: ['Tata Motors', 'Maruti Suzuki', 'M&M'],
    impact: 7.1,
    time: '4h ago',
  },
  {
    id: 4,
    headline: 'IT exports remain resilient despite global macro uncertainty',
    sentiment: 'neutral',
    companies: ['Infosys', 'TCS', 'Wipro'],
    impact: 5.4,
    time: '5h ago',
  },
  {
    id: 5,
    headline: 'Pharma sector gets USFDA clearance for 3 major drug filings',
    sentiment: 'positive',
    companies: ['Sun Pharma', 'Dr. Reddy\'s'],
    impact: 6.3,
    time: '6h ago',
  },
  {
    id: 6,
    headline: 'Metal prices slide on weak China demand outlook',
    sentiment: 'negative',
    companies: ['Tata Steel', 'JSW Steel', 'Hindalco'],
    impact: 8.1,
    time: '7h ago',
  },
];

// Sector-wise company list
export const sectorCompanyList = [
  {
    sector: 'Banking',
    companies: [
      { name: 'HDFC Bank',   score: 82, change: +1.2 },
      { name: 'ICICI Bank',  score: 76, change: +0.8 },
      { name: 'Yes Bank',    score: 28, change: -3.4 },
      { name: 'IDBI Bank',   score: 31, change: -2.1 },
      { name: 'Axis Bank',   score: 68, change: +0.5 },
    ],
  },
  {
    sector: 'IT',
    companies: [
      { name: 'TCS',         score: 88, change: +0.4 },
      { name: 'Infosys',     score: 84, change: +0.6 },
      { name: 'Wipro',       score: 71, change: -0.3 },
      { name: 'HCL Tech',    score: 79, change: +1.1 },
    ],
  },
  {
    sector: 'Auto',
    companies: [
      { name: 'Tata Motors', score: 55, change: -1.8 },
      { name: 'Maruti',      score: 63, change: +0.2 },
      { name: 'M&M',         score: 48, change: -2.5 },
      { name: 'Hero Moto',   score: 61, change: +0.7 },
    ],
  },
  {
    sector: 'Pharma',
    companies: [
      { name: 'Sun Pharma',  score: 77, change: +1.4 },
      { name: 'Dr. Reddy\'s',score: 74, change: +0.9 },
      { name: 'Cipla',       score: 70, change: +0.3 },
    ],
  },
  {
    sector: 'Energy',
    companies: [
      { name: 'ONGC',        score: 58, change: -0.6 },
      { name: 'Reliance',    score: 79, change: +1.0 },
      { name: 'NTPC',        score: 65, change: +0.4 },
    ],
  },
  {
    sector: 'Metal',
    companies: [
      { name: 'Tata Steel',  score: 34, change: -4.2 },
      { name: 'JSW Steel',   score: 38, change: -3.1 },
      { name: 'Hindalco',    score: 42, change: -1.9 },
    ],
  },
];
