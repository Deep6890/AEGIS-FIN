import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../components/Layout/PageLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { BrainCircuit, AlertTriangle, TrendingUp, TrendingDown, Target, Building2, ChevronLeft } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { companyDetail, companies } = useAppData();
  
  const companyKey = id?.toUpperCase() || 'HDFCBANK';
  const companyData = companies.find(c => c.ticker === companyKey) || companies[0];
  
  const mockPriceData = companyDetail.priceData;
  const mockPeers = companyDetail.peers;
  const rings = companyDetail.rings;

  return (
    <PageLayout>
      {/* HEADER SECTION */}
      <div className="bg-white border-b border-emerald-100 px-8 py-6 -mx-8 -mt-6 mb-6">
        <button onClick={() => navigate('/companies')} className="flex items-center gap-1 text-sm text-[#8fa88f] hover:text-[#2d6a4f] transition mb-4 font-medium">
          <ChevronLeft size={16} /> Back to Universe
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex gap-4 md:gap-5 items-end">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center text-emerald-800 font-black text-xl shadow-sm border border-emerald-300">
              {companyData.name.substring(0,2)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-[#0f1f0f] tracking-tight">{companyData.name}</h1>
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded tracking-wide uppercase">{companyData.sector}</span>
              </div>
              <div className="flex items-end gap-3 mt-1">
                <span className="text-3xl font-black text-gray-800 tracking-tight">{companyData.price}</span>
                <span className="text-emerald-600 font-bold mb-1">{companyData.trend}</span>
                <span className="text-gray-400 text-xs mb-1.5 ml-2">Market Cap: {companyData.marketCap}</span>
              </div>
            </div>
          </div>

          {/* Rings */}
          <div className="flex gap-4 md:gap-6 items-center flex-wrap md:flex-nowrap w-full md:w-auto">
            <div className="flex flex-col items-end mr-0 md:mr-4">
              <span className="text-xs text-gray-500">Composite Risk</span>
              <span className="text-3xl font-black text-amber-500 delay-100 transition-all">{100 - companyData.compositeScore}</span>
            </div>
            <div className="h-12 w-px bg-gray-200"></div>
            {rings.map((r, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-12 h-12 transform -rotate-90">
                    <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="4" fill="none" />
                    <circle cx="24" cy="24" r="20" stroke={r.color} strokeWidth="4" fill="none" strokeDasharray={`${(r.val/100)*125} 125`} className="transition-all duration-1000 ease-out" strokeLinecap="round" />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-gray-700">{r.val}</span>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 uppercase font-semibold">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* L COLUMN */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* PRICE CHART */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-[#0f1f0f] text-lg">Price & Volume Structure</h3>
              <div className="flex gap-2">
                {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map(t => (
                  <button key={t} className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${t === '3M' ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={mockPriceData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" hide />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                </AreaChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height="20%">
                <BarChart data={mockPriceData}>
                  <Bar dataKey="volume" fill="#cbd5e1" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SENTIMENT TIMELINE */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <h3 className="font-bold text-[#0f1f0f] text-lg mb-6">News Sentiment & Divergence (90D)</h3>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockPriceData}>
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="sentiment">
                    {mockPriceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.sentiment > 0.5 ? '#10b981' : entry.sentiment < -0.5 ? '#f43f5e' : '#fbbf24'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
  {/* BALANCE SHEET TILE - Mini */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-[#0f1f0f] text-lg">Balance Sheet Core (3-Yr Trend)</h3>
              <button onClick={() => navigate('/balance-sheet')} className="text-[#2d6a4f] text-sm font-bold hover:underline">Full Statement &rarr;</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Revenue',    val: companyData.stats?.revenue,   trend: '+14%'  },
                { label: 'Net Profit', val: companyData.stats?.netIncome, trend: '+22%'  },
                { label: 'EPS',        val: companyData.stats?.eps,       trend: '+18%'  },
                { label: 'P/E Ratio',  val: companyData.peRatio,          trend: 'Stable'},
              ].map((m, i) => (
                <div key={i} className="flex flex-col gap-1 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{m.label}</span>
                  <span className="text-lg font-black text-gray-800">{m.val}</span>
                  <span className={`text-xs font-bold ${m.trend.includes('-') && !m.label.includes('NPA') && !m.label.includes('D/E') ? 'text-rose-500' : 'text-emerald-500'}`}>{m.trend} YoY</span>
                </div>
              ))}
            </div>
          </div>

          {/* NEWS FLOW */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#0f1f0f] text-lg">Recent News & Catalysts</h3>
            </div>
            <div className="space-y-4">
              {companyData.news?.map((n, i) => (
                <div key={i} className="flex gap-4 items-start p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl border border-gray-100 transition cursor-pointer">
                  <div className={`w-2 h-2 mt-1.5 shrink-0 rounded-full ${n.sentiment === 'pos' ? 'bg-emerald-500' : n.sentiment === 'neg' ? 'bg-rose-500' : 'bg-amber-400'}`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800 mb-1 leading-snug">{n.headline}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">{n.date}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${n.sentiment === 'pos' ? 'bg-emerald-100 text-emerald-700' : n.sentiment === 'neg' ? 'bg-rose-100 text-rose-700' : 'bg-gray-200 text-gray-600'}`}>
                        {n.sentiment === 'pos' ? 'Positive' : n.sentiment === 'neg' ? 'Negative' : 'Neutral'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {(!companyData.news || companyData.news.length === 0) && (
                <div className="text-sm text-gray-500 italic p-4 text-center">No recent major catalysts recorded.</div>
              )}
            </div>
          </div>

        </div>

        {/* R COLUMN */}
        <div className="flex flex-col gap-6">
          
          {/* AI RISK PANEL */}
          <div className="bg-gradient-to-br from-[#0f1f0f] to-[#1a3322] rounded-2xl p-6 shadow-lg border border-[#2d6a4f] text-white relative overflow-hidden">
            <BrainCircuit className="absolute top-4 right-4 text-emerald-500/20 w-32 h-32" />
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <BrainCircuit className="text-emerald-400" size={20} />
              <h3 className="font-bold text-lg text-emerald-50">AI Risk Thesis</h3>
            </div>
            <div className="space-y-4 relative z-10 text-emerald-100 text-sm leading-relaxed">
              <p>
                <span className="text-emerald-400 font-bold">Stable Outlook:</span> The system detects <strong>low probability of systemic failure</strong> in the next quarter. 
              </p>
              <p>
                <AlertTriangle size={14} className="inline text-amber-400 mr-1 pb-1" />
                <strong>Elevated Drawdown Risk:</strong> Relative to banking peers over the last 45 days, coinciding with a <em>neutral-to-negative</em> earnings sentiment cluster detected last week.
              </p>
              <p>
                Management guidance on margin compression was penalized 12% more severely by the sentiment model than historical equivalents (2018 cycle).
              </p>
            </div>
            <button className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold transition shadow-md flex items-center justify-center gap-2">
              <Target size={16} /> Generate deep-dive report
            </button>
          </div>

          {/* RISK FACTORS */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <h3 className="font-bold text-[#0f1f0f] text-lg mb-4">Risk Pulse</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition">
                <div>
                  <div className="text-sm font-bold text-gray-800 flex items-center gap-1">Rel. Drawdown <InfoIcon /></div>
                  <div className="text-xs text-gray-400">-12.4% vs Nifty Bank</div>
                </div>
                <div className="h-6 w-16 bg-rose-100 rounded text-rose-600 font-bold text-xs flex items-center justify-center border border-rose-200">Alert</div>
              </div>
              <div className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition">
                <div>
                  <div className="text-sm font-bold text-gray-800 flex items-center gap-1">Volatility <InfoIcon /></div>
                  <div className="text-xs text-gray-400">22.1% Ann.</div>
                </div>
                <div className="h-6 w-16 bg-emerald-100 rounded text-emerald-600 font-bold text-xs flex items-center justify-center border border-emerald-200">Stable</div>
              </div>
              <div className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition">
                <div>
                  <div className="text-sm font-bold text-gray-800 flex items-center gap-1">Sector Correlation <InfoIcon /></div>
                  <div className="text-xs text-gray-400">R2: 0.89</div>
                </div>
                <div className="h-6 w-16 bg-gray-100 rounded text-gray-600 font-bold text-xs flex items-center justify-center border border-gray-200">0.89</div>
              </div>
            </div>
          </div>

          {/* PEERS */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <h3 className="font-bold text-[#0f1f0f] text-lg mb-4 flex justify-between items-end">
              Peer Comparison
              <span onClick={() => navigate('/sectors')} className="text-xs font-normal text-emerald-600 flex items-center gap-1 cursor-pointer hover:underline"><Building2 size={12}/> Sector Hub</span>
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-4 text-xs font-bold text-gray-400 border-b border-gray-100 pb-2">
                <div className="col-span-2">Company</div>
                <div className="text-right">P/E</div>
                <div className="text-right">Risk</div>
              </div>
              {mockPeers.map((p, i) => (
                <div key={i} className="grid grid-cols-4 text-sm items-center py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded cursor-pointer transition">
                  <div className="col-span-2 font-bold text-gray-800 truncate">{p.name}</div>
                  <div className="text-right font-medium text-gray-600">{p.pe}</div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.risk < 40 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.risk}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </PageLayout>
  );
}

function InfoIcon() {
  return <div className="w-3 h-3 rounded-full border border-gray-300 flex items-center justify-center text-[8px] text-gray-400 font-bold ml-1">i</div>;
}
