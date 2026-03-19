// ─── AI Chat Page — Mock Data & RAG Responses ──────────────────────────────

export const suggestedPrompts = [
  { id: 1, label: 'Which IT sector companies have declining capital flow?',  icon: 'trending-down' },
  { id: 2, label: 'Compare TCS and Infosys balance sheet trends',            icon: 'bar-chart' },
  { id: 3, label: 'Top 3 high-risk sectors right now',                       icon: 'alert' },
  { id: 4, label: 'What does VIX at 18.9 mean for portfolio risk?',          icon: 'activity' },
  { id: 5, label: 'Summarise NPA situation in banking sector',               icon: 'shield' },
  { id: 6, label: 'Which companies have best debt-to-equity ratio?',         icon: 'layers' },
];

export const dailyHighlights = [
  {
    id: 'h1',
    tag: 'Critical',
    tagCls: 'bg-red-50 text-red-600 border-red-200',
    title: '3 companies flagged for high rel_drawdown today',
    body: 'Yes Bank (−18.4%), Tata Steel (−12.1%), and M&M (−9.7%) show relative drawdown exceeding threshold.',
    time: '08:30 AM',
  },
  {
    id: 'h2',
    tag: 'Alert',
    tagCls: 'bg-amber-50 text-amber-700 border-amber-200',
    title: 'Banking NPA ratio crossed 6.8% average',
    body: 'Mid-size banks show elevated stress. IDBI and Yes Bank D/E ratios above 4.2x.',
    time: '09:00 AM',
  },
  {
    id: 'h3',
    tag: 'Positive',
    tagCls: 'bg-[#eaf5ee] text-[#1a3c2e] border-[#b5d8c5]',
    title: 'IT sector deal pipeline at 3-quarter high',
    body: 'TCS and Infosys combined TCV at $4.2B. Net headcount additions resuming in Q4.',
    time: '09:15 AM',
  },
  {
    id: 'h4',
    tag: 'Volatility',
    tagCls: 'bg-amber-50 text-amber-700 border-amber-200',
    title: 'India VIX up 32% over 7 sessions',
    body: 'Options market pricing ±1.4% daily swings on Nifty. FII outflows ₹4,200 Cr in 5 sessions.',
    time: '09:45 AM',
  },
];

// Each response has: text, citations[], evidenceCards[], followUps[]
export const mockRAGResponses = [
  {
    matchKeywords: ['it sector', 'capital flow', 'declining'],
    text: `Based on the latest balance sheet data, here are the IT sector companies showing declining capital flow:\n\n**Wipro** has seen operating cash flow decline 14% QoQ, driven by higher employee costs and delayed deal ramp-ups. Free cash flow margin has compressed from 18.2% to 15.6%.\n\n**HCL Tech** shows a 9% drop in capital allocation efficiency, with increased capex on cloud infrastructure offsetting revenue growth.\n\n**Infosys** remains relatively stable but shows early signs of working capital pressure — DSO has risen from 68 to 74 days.\n\nTCS continues to lead with the strongest cash conversion cycle at 82 days.`,
    citations: [
      { id: 'c1', source: 'Balance Sheet Q3 FY25', row: 'Operating Cash Flow', company: 'Wipro', value: '₹3,240 Cr', change: '−14%' },
      { id: 'c2', source: 'Balance Sheet Q3 FY25', row: 'Free Cash Flow Margin', company: 'Wipro', value: '15.6%', change: '−2.6pp' },
      { id: 'c3', source: 'Balance Sheet Q3 FY25', row: 'DSO (Days)', company: 'Infosys', value: '74 days', change: '+6 days' },
      { id: 'c4', source: 'Capex Report Q3 FY25', row: 'Capital Expenditure', company: 'HCL Tech', value: '₹1,890 Cr', change: '+22%' },
    ],
    evidenceCards: [
      {
        type: 'table',
        title: 'IT Sector — Capital Flow Summary',
        subtitle: 'Q3 FY25 vs Q2 FY25',
        rows: [
          { company: 'TCS',      ocf: '₹14,200 Cr', fcf: '19.2%', dso: '82d', trend: 'stable' },
          { company: 'Infosys',  ocf: '₹8,100 Cr',  fcf: '17.1%', dso: '74d', trend: 'watch' },
          { company: 'Wipro',    ocf: '₹3,240 Cr',  fcf: '15.6%', dso: '68d', trend: 'risk' },
          { company: 'HCL Tech', ocf: '₹5,600 Cr',  fcf: '16.8%', dso: '71d', trend: 'watch' },
        ],
      },
      {
        type: 'metric',
        title: 'Worst Capital Flow Decline',
        company: 'Wipro',
        value: '−14%',
        sub: 'Operating Cash Flow QoQ',
        severity: 'risk',
      },
    ],
    followUps: [
      'Show Wipro cash flow trend over 4 quarters',
      'Compare Wipro vs TCS free cash flow margins',
      'What is driving Infosys DSO increase?',
    ],
  },
  {
    matchKeywords: ['tcs', 'infosys', 'balance sheet', 'compare'],
    text: `Here's a detailed comparison of TCS and Infosys balance sheet trends over the last 4 quarters:\n\n**Revenue Growth**\nTCS: +8.4% YoY (₹61,237 Cr Q3 FY25)\nInfosys: +6.1% YoY (₹40,986 Cr Q3 FY25)\n\n**Profitability**\nTCS maintains a superior EBIT margin of 24.5% vs Infosys at 20.1%. Both have improved sequentially.\n\n**Balance Sheet Strength**\nTCS holds ₹58,000 Cr in cash and equivalents — one of the strongest in the sector. Infosys has ₹28,400 Cr.\n\n**Key Risk Differentiator**\nInfosys has higher client concentration risk — top 10 clients contribute 34% of revenue vs TCS at 26%.`,
    citations: [
      { id: 'c5', source: 'P&L Statement Q3 FY25', row: 'Revenue', company: 'TCS', value: '₹61,237 Cr', change: '+8.4%' },
      { id: 'c6', source: 'P&L Statement Q3 FY25', row: 'Revenue', company: 'Infosys', value: '₹40,986 Cr', change: '+6.1%' },
      { id: 'c7', source: 'Balance Sheet Q3 FY25', row: 'Cash & Equivalents', company: 'TCS', value: '₹58,000 Cr', change: '+4.2%' },
      { id: 'c8', source: 'Risk Report Q3 FY25', row: 'Client Concentration', company: 'Infosys', value: '34%', change: '+2pp' },
    ],
    evidenceCards: [
      {
        type: 'comparison',
        title: 'TCS vs Infosys — Key Metrics',
        left: { name: 'TCS',     revenue: '₹61,237 Cr', margin: '24.5%', cash: '₹58,000 Cr', score: 88 },
        right: { name: 'Infosys', revenue: '₹40,986 Cr', margin: '20.1%', cash: '₹28,400 Cr', score: 84 },
      },
    ],
    followUps: [
      'Which has better dividend yield — TCS or Infosys?',
      'Show TCS revenue breakdown by geography',
      'What is Infosys client concentration risk trend?',
    ],
  },
  {
    matchKeywords: ['high-risk', 'high risk', 'top 3', 'sectors'],
    text: `Based on current risk scoring across all 11 sectors, here are the **top 3 highest-risk sectors**:\n\n🔴 **1. Metal Sector** — Risk Score: 22/100\nWeak China demand, steel prices down 12%, EBITDA at 3-year lows. Tata Steel and JSW Steel are the most exposed.\n\n🔴 **2. Banking Sector** — Risk Score: 31/100\nNPA ratios at 6.8% average. Mid-size banks under RBI scrutiny. Yes Bank and IDBI Bank show D/E above 4.2x.\n\n🟡 **3. Auto Sector** — Risk Score: 38/100\nEV transition capex compressing FCF. Demand slump in entry-level segment. M&M and Tata Motors most affected.`,
    citations: [
      { id: 'c9',  source: 'Risk Score Engine v2.1', row: 'Sector Risk Score', company: 'Metal',   value: '22/100', change: '−8 pts' },
      { id: 'c10', source: 'Risk Score Engine v2.1', row: 'Sector Risk Score', company: 'Banking', value: '31/100', change: '−5 pts' },
      { id: 'c11', source: 'Risk Score Engine v2.1', row: 'Sector Risk Score', company: 'Auto',    value: '38/100', change: '−3 pts' },
    ],
    evidenceCards: [
      {
        type: 'metric', title: 'Highest Risk Sector', company: 'Metal', value: '22/100', sub: 'Risk Score · 3-year low', severity: 'risk',
      },
      {
        type: 'metric', title: 'Banking Sector NPA', company: 'Banking', value: '6.8%', sub: 'Avg NPA Ratio · QoQ +18%', severity: 'risk',
      },
    ],
    followUps: [
      'Which metal companies are most exposed?',
      'Show banking sector NPA trend over 4 quarters',
      'What is the recovery outlook for Auto sector?',
    ],
  },
  {
    matchKeywords: [],
    text: `I've analysed your query against the current dataset. Here's what I found:\n\nThe **overall market risk level** is **Moderate-High** based on:\n- India VIX at 18.9 (elevated)\n- 37 companies currently flagged high-risk\n- 3 sectors in critical zone (Metal, Banking, Auto)\n\nThe **strongest performing sectors** today are IT (score: 92) and Pharma (score: 75), both showing positive momentum.\n\nWould you like me to drill deeper into any specific sector, company, or financial metric?`,
    citations: [
      { id: 'c12', source: 'Risk Dashboard · Live', row: 'Overall Market Risk', company: 'Market', value: 'Moderate-High', change: '↑' },
      { id: 'c13', source: 'VIX Feed · NSE', row: 'India VIX', company: 'NSE', value: '18.9', change: '+32% (7d)' },
    ],
    evidenceCards: [
      {
        type: 'metric', title: 'Market Risk Level', company: 'Overall', value: 'Mod-High', sub: 'Based on 248 companies', severity: 'watch',
      },
    ],
    followUps: [
      'Which sectors are safest to invest in now?',
      'Show me companies with improving risk scores',
      'What triggered the VIX spike this week?',
    ],
  },
];

export function getRAGResponse(query) {
  const q = query.toLowerCase();
  const match = mockRAGResponses.find(r =>
    r.matchKeywords.length > 0 && r.matchKeywords.every(k => q.includes(k))
  ) ?? mockRAGResponses[mockRAGResponses.length - 1];
  return match;
}
