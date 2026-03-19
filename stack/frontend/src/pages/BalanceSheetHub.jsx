import { useState } from 'react';
import HeaderNav from '../components/Navbar/HeaderNav';
import VerticalNav from '../components/Navbar/VerticalNav';
import { Search, Info, TrendingUp, TrendingDown, BrainCircuit, FileSpreadsheet, Building2, ChevronDown, CheckCircle2 } from 'lucide-react';

const statementData = {
  income: [
    { item: 'Revenue from Operations', val: '₹42,500', prev: '₹38,200', yoy: '+11.2%', trend: 'up', desc: 'Core money generated from business activities before any expenses.', status: 'green', peerPercentile: 75 },
    { item: 'Cost of Goods Sold (COGS)', val: '₹14,200', prev: '₹12,100', yoy: '+17.3%', trend: 'up', desc: 'Direct costs attributable to the production of goods sold. Rising faster than revenue.', status: 'amber', peerPercentile: 60 },
    { item: 'Gross Profit', val: '₹28,300', prev: '₹26,100', yoy: '+8.4%', trend: 'up', desc: 'Revenue minus COGS. Indicates core production efficiency.', status: 'green', peerPercentile: 82 },
    { item: 'Operating Expenses (SG&A)', val: '₹12,400', prev: '₹11,500', yoy: '+7.8%', trend: 'up', desc: 'Overhead costs not directly tied to production (salaries, marketing).', status: 'green', peerPercentile: 40 },
    { item: 'EBITDA', val: '₹15,900', prev: '₹14,600', yoy: '+8.9%', trend: 'up', desc: 'Earnings before interest, taxes, depreciation, and amortization. Proxies cash profit.', status: 'green', peerPercentile: 88 },
    { item: 'Interest Expense', val: '₹1,200', prev: '₹800', yoy: '+50.0%', trend: 'up', desc: 'Cost of borrowing. Sharp increase indicates higher debt load or rising rates.', status: 'red', peerPercentile: 90 },
    { item: 'Net Profit (PAT)', val: '₹9,800', prev: '₹9,450', yoy: '+3.7%', trend: 'up', desc: 'The bottom line. Subdued growth due to interest margin compression.', status: 'amber', peerPercentile: 55 },
  ],
};

const getStatusColor = (status) => {
  if (status === 'green') return 'text-emerald-500 bg-emerald-50 border-emerald-200';
  if (status === 'amber') return 'text-amber-500 bg-amber-50 border-amber-200';
  if (status === 'red') return 'text-rose-500 bg-rose-50 border-rose-200';
  return 'text-gray-500 bg-gray-50';
};

export default function BalanceSheetHub() {
  const [activeTab, setActiveTab] = useState('income');
  const [expandedInfo, setExpandedInfo] = useState({});

  const toggleInfo = (idx) => {
    setExpandedInfo(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="h-screen flex flex-col bg-[#f4f6f4] overflow-hidden">
      <HeaderNav />
      <div className="flex flex-1 min-h-0">
        <VerticalNav />

        <main className="flex-1 px-8 py-6 flex flex-col min-w-0 overflow-y-auto">
          
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-[#0f1f0f] tracking-tight">Balance Sheet Hub</h1>
              <p className="text-gray-500 mt-2 flex items-center gap-2">
                <FileSpreadsheet size={16} /> Demystified financial statements with AI narratives
              </p>
            </div>
            
            <div className="flex gap-4 items-center">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search company (e.g. RELIANCE)" className="w-64 bg-white border border-emerald-100 rounded-xl py-2 pl-9 pr-4 shadow-sm focus:ring-2 focus:ring-emerald-500/20 font-bold outline-none" defaultValue="HDFCBANK" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            
            {/* MAIN STATEMENTS (L) */}
            <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-emerald-100 p-1 flex flex-col">
              
              {/* Tabs */}
              <div className="flex border-b border-gray-100 p-1">
                {['Income Statement', 'Balance Sheet', 'Cash Flow'].map((t, i) => {
                  const val = t.split(' ')[0].toLowerCase();
                  return (
                    <button 
                      key={val}
                      onClick={() => setActiveTab(val)}
                      className={`flex-1 py-3 text-sm font-bold rounded-xl transition ${activeTab === val ? 'bg-[#2d6a4f] text-white shadow-md' : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              {/* Table Body */}
              <div className="flex-1 p-6">
                <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-4">
                  <div className="w-1/3">Line Item (FY24)</div>
                  <div className="w-1/6 text-right">Value (Cr)</div>
                  <div className="w-1/6 text-right">YoY %</div>
                  <div className="w-1/4 text-center">Sector Benchmark</div>
                  <div className="w-1/12 text-center">Flag</div>
                </div>

                <div className="space-y-3">
                  {statementData.income.map((row, idx) => (
                    <div key={idx} className="bg-gray-50 hover:bg-emerald-50/50 rounded-xl border border-transparent hover:border-emerald-100 transition p-4">
                      <div className="flex items-center justify-between">
                        
                        {/* Name & Info */}
                        <div className="w-1/3 pr-4 flex items-center gap-2">
                          <button onClick={() => toggleInfo(idx)} className="text-gray-400 hover:text-emerald-600 transition p-1">
                            <Info size={16} />
                          </button>
                          <span className="font-bold text-gray-800 text-sm">{row.item}</span>
                        </div>

                        {/* Value */}
                        <div className="w-1/6 text-right font-black text-gray-900 font-mono text-sm">
                          {row.val}
                        </div>

                        {/* YoY */}
                        <div className="w-1/6 flex justify-end items-center gap-1 font-bold text-sm">
                          {row.trend === 'up' ? <TrendingUp size={16} className={`${row.status === 'red' ? 'text-rose-500' : 'text-emerald-500'}`} /> : <TrendingDown size={16} className="text-rose-500" />}
                          <span className={`${row.status === 'red' && row.trend === 'up' ? 'text-rose-500' : row.status === 'green' ? 'text-emerald-600' : 'text-amber-500'}`}>
                            {row.yoy}
                          </span>
                        </div>

                        {/* Benchmark Bar */}
                        <div className="w-1/4 flex flex-col justify-center px-4">
                          <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`absolute top-0 left-0 h-full rounded-full ${row.peerPercentile > 70 ? 'bg-emerald-500' : row.peerPercentile > 40 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{width: `${row.peerPercentile}%`}}></div>
                            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-800 z-10" title="Sector Median"></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-bold">
                            <span>Sector Bottom</span>
                            <span>{row.peerPercentile}th %ile</span>
                          </div>
                        </div>

                        {/* Status Flag */}
                        <div className="w-1/12 flex justify-center">
                          <div className={`w-3 h-3 rounded-full border-2 ${getStatusColor(row.status)} shadow-sm shadow-[${getStatusColor(row.status)}]`} title={`Status: ${row.status.toUpperCase()}`}></div>
                        </div>
                      </div>

                      {/* Collapsible Info */}
                      {expandedInfo[idx] && (
                        <div className="mt-3 ml-8 p-3 bg-white border border-emerald-100 rounded-lg text-sm text-gray-600 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400"></div>
                          <Info size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-semibold text-gray-800 mb-1">Plain-English Translation:</p>
                            <p className="leading-relaxed">{row.desc}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI NARRATIVE PANEL (R) */}
            <div className="flex flex-col gap-6">
              
              <div className="bg-gradient-to-br from-[#0f1f0f] to-[#1a3322] rounded-2xl p-6 shadow-xl border border-emerald-800 text-white relative">
                <BrainCircuit className="absolute top-4 right-4 text-emerald-500/10 w-32 h-32" />
                <div className="flex items-center justify-between mb-4 relative z-10 border-b border-emerald-800/50 pb-4">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="text-emerald-400" size={20} />
                    <h3 className="font-bold text-lg text-emerald-50">AI Diagnostic</h3>
                  </div>
                  <span className="text-xs bg-emerald-900 border border-emerald-700 text-emerald-300 px-2 py-1 rounded font-bold tracking-wide">Q3 FY24 Update</span>
                </div>
                
                <div className="space-y-4 relative z-10 text-emerald-50 text-sm leading-relaxed">
                  <p>
                    <strong>Summary:</strong> Core revenue growth is robust at <span className="text-emerald-400 font-bold">+11.2% YoY</span>, but profitability is being dragged down by a sharp <span className="text-rose-400 font-bold">50% spike in interest expenses</span>.
                  </p>
                  <p>
                    <strong>Sector Context:</strong> While EBITDA margin remains healthy at ~37%, the company is slipping in operational efficiency compared to peers. COGS rose 17.3%, significantly outpacing revenue growth, indicating lack of pricing power or supply chain stress.
                  </p>
                  <div className="bg-emerald-900/50 p-3 flex gap-3 border border-emerald-700/50 rounded-lg">
                    <CheckCircle2 size={16} className="text-emerald-400 mt-1 shrink-0" />
                    <p className="text-xs">No immediate liquidity concern (Current Ratio stable), but rising debt costs warrant close monitoring next quarter.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
                <h3 className="font-bold text-[#0f1f0f] text-lg mb-4 flex items-center gap-2">
                  <Building2 size={18} className="text-emerald-600" /> Key Ratio Highlights
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center text-center">
                    <span className="text-2xl font-black text-emerald-600 mb-1">18.2%</span>
                    <span className="text-xs font-bold text-gray-500 uppercase">ROE</span>
                    <span className="text-[10px] text-emerald-600 mt-1 font-bold">+120 bps YoY</span>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex flex-col items-center text-center">
                    <span className="text-2xl font-black text-rose-600 mb-1">1.8x</span>
                    <span className="text-xs font-bold text-gray-500 uppercase">Debt/Equity</span>
                    <span className="text-[10px] text-rose-600 mt-1 font-bold">Trending Up ↑</span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center text-center">
                    <span className="text-2xl font-black text-emerald-600 mb-1">2.1x</span>
                    <span className="text-xs font-bold text-gray-500 uppercase">Current Rat.</span>
                    <span className="text-[10px] text-emerald-600 mt-1 font-bold">Stable</span>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex flex-col items-center text-center">
                    <span className="text-2xl font-black text-amber-600 mb-1">3.5x</span>
                    <span className="text-xs font-bold text-gray-500 uppercase">Int. Cover</span>
                    <span className="text-[10px] text-amber-600 mt-1 font-bold">Declining ↓</span>
                  </div>
                </div>
                <button className="mt-4 w-full py-2 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl text-sm transition">
                  Download Full Excel Model
                </button>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
