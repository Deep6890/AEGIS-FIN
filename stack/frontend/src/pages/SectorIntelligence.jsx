import { useState } from 'react';
import HeaderNav from '../components/Navbar/HeaderNav';
import VerticalNav from '../components/Navbar/VerticalNav';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, TrendingUp, TrendingDown, BookOpen, AlertTriangle, ShieldCheck, PieChart, Activity } from 'lucide-react';

const mockPerformance = Array.from({length: 30}, (_, i) => ({
  day: i,
  sector: 100 + i * 2 + Math.random() * 20,
  nifty: 100 + i * 1.5 + Math.random() * 15,
}));

export default function SectorIntelligence() {
  const [selectedSector, setSelectedSector] = useState('Banking');
  const sectors = ['Banking', 'IT', 'Pharma', 'Auto', 'Energy'];

  return (
    <div className="h-screen flex flex-col bg-[#f4f6f4] overflow-hidden">
      <HeaderNav />
      <div className="flex flex-1 min-h-0">
        <VerticalNav />

        <main className="flex-1 px-8 py-6 flex flex-col min-w-0 overflow-y-auto">
          
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-[#0f1f0f] tracking-tight">Sector Intelligence</h1>
              <p className="text-gray-500 mt-2 flex items-center gap-2">
                <PieChart size={16} /> Macro & micro analytics across key industries
              </p>
            </div>
            
            <div className="flex gap-2">
              {sectors.map(s => (
                <button 
                  key={s} 
                  onClick={() => setSelectedSector(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition ${selectedSector === s ? 'bg-[#2d6a4f] text-white' : 'bg-white text-gray-600 hover:bg-emerald-50'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* L COL */}
            <div className="xl:col-span-2 space-y-6">
              
              {/* Overview & Cycle */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 flex gap-6">
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-2">{selectedSector} Sector Overview</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    The Indian banking sector is currently in an expansion phase, driven by robust credited growth across retail and MSME segments. However, rising deposit costs and RBI's tightened risk weights on unsecured lending pose near-term headwinds to Net Interest Margins (NIMs).
                  </p>
                  <div className="flex gap-4">
                    <div className="bg-emerald-50 px-3 py-2 border border-emerald-100 rounded-lg flex items-center gap-2 text-sm text-emerald-800 font-bold">
                      <TrendingUp size={16} /> Analyst Consensus: Overweight
                    </div>
                    <div className="bg-blue-50 px-3 py-2 border border-blue-100 rounded-lg flex items-center gap-2 text-sm text-blue-800 font-bold">
                      <Activity size={16} /> Cycle: Late Expansion
                    </div>
                  </div>
                </div>
                <div className="w-1/3 flex flex-col items-center justify-center border-l border-gray-100 pl-6 relative">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Sector Cycle Clock</h4>
                  <div className="relative w-24 h-24 rounded-full border-4 border-gray-100 flex items-center justify-center">
                    <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-100 rounded-tr-full"></div>
                    <div className="absolute w-20 h-20 bg-white rounded-full z-10 flex items-center justify-center flex-col">
                      <span className="text-xs font-bold text-blue-600 uppercase text-center">Peak<br/>Growth</span>
                    </div>
                    {/* Tick mark */}
                    <div className="absolute top-1 right-3 w-3 h-3 bg-blue-500 rounded-full z-20 shadow-lg shadow-blue-500 border-2 border-white"></div>
                  </div>
                </div>
              </div>

              {/* Chart vs Nifty */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
                <h3 className="font-bold text-lg mb-4">{selectedSector} vs Nifty 50 (YTD)</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockPerformance}>
                      <Tooltip contentStyle={{ borderRadius: '12px' }}/>
                      <Area type="monotone" dataKey="sector" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={3} name={selectedSector} />
                      <Area type="monotone" dataKey="nifty" stroke="#94a3b8" fill="transparent" strokeDasharray="5 5" strokeWidth={2} name="Nifty 50" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Companies */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
                <h3 className="font-bold text-lg mb-4 flex justify-between items-center">
                  Top Constituents by Composite Score
                  <button className="text-sm text-emerald-600 hover:underline">View All &rarr;</button>
                </h3>
                <div className="space-y-3">
                  {[
                    { name: 'HDFC Bank', risk: 82, trend: '+1.2%', mc: '₹12.4L Cr' },
                    { name: 'ICICI Bank', risk: 76, trend: '+0.8%', mc: '₹7.2L Cr' },
                    { name: 'Axis Bank', risk: 68, trend: '+1.5%', mc: '₹3.4L Cr' },
                  ].map((c, i) => (
                    <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 border border-gray-50 hover:border-emerald-100 rounded-xl transition cursor-pointer">
                      <div className="w-1/3">
                        <div className="font-bold text-gray-800">{c.name}</div>
                        <div className="text-xs text-gray-400">{c.mc}</div>
                      </div>
                      <div className="w-1/3 text-center text-sm font-bold text-emerald-600">{c.trend}</div>
                      <div className="w-1/3 flex justify-end">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Score</span>
                          <span className="w-8 h-8 rounded bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center">{c.risk}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* R COL */}
            <div className="space-y-6">
              
              <div className="bg-gradient-to-br from-[#0f1f0f] to-[#1a3322] rounded-2xl p-6 shadow-xl border border-[#2d6a4f] text-white">
                <h3 className="font-bold text-lg text-emerald-50 mb-4 flex items-center gap-2"><Target size={18} className="text-emerald-400" /> Regulatory / Macro Context</h3>
                <div className="space-y-3">
                  <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-800 text-sm hover:border-emerald-400 transition cursor-pointer">
                    <div className="font-bold text-amber-400 mb-1 flex items-center gap-2"><AlertTriangle size={14}/> RBI Risk Weights</div>
                    <p className="text-emerald-100/80 leading-relaxed text-xs">Recent RBI mandate increasing risk weights on unsecured consumer credit by 25% impacts capital adequacy ratios of major private lenders.</p>
                  </div>
                  <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-800 text-sm hover:border-emerald-400 transition cursor-pointer">
                    <div className="font-bold text-emerald-400 mb-1 flex items-center gap-2"><ShieldCheck size={14}/> LCR Norms Update</div>
                    <p className="text-emerald-100/80 leading-relaxed text-xs">Proposed draft guidelines on Liquidity Coverage Ratio (LCR) may tighten deposit assumptions. Banks with higher retail deposit share are insulated.</p>
                  </div>
                  <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-800 text-sm hover:border-emerald-400 transition cursor-pointer">
                    <div className="font-bold text-blue-400 mb-1 flex items-center gap-2"><BookOpen size={14}/> Fed Rate Cut Expectations</div>
                    <p className="text-emerald-100/80 leading-relaxed text-xs">A dovish pivot by the US Fed late-year could attract FII inflows into banking blue-chips.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
                <h3 className="font-bold text-lg mb-4">Sentiment & News Flow</h3>
                <div className="space-y-4">
                  {[
                    { title: "NIMs pressure likely to persist in Q3", score: "-2.4", s: "neg" },
                    { title: "Credit growth remains robust despite rate cycle", score: "+1.8", s: "pos" },
                    { title: "Private banks gain market share in deposits", score: "+3.2", s: "pos" },
                  ].map((n, i) => (
                    <div key={i} className="flex gap-3">
                      <div className={`w-1 shrink-0 rounded-full mt-1 mb-1 ${n.s === 'pos' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 hover:text-emerald-600 hover:underline cursor-pointer">{n.title}</p>
                        <span className={`text-xs font-bold ${n.s === 'pos' ? 'text-emerald-500' : 'text-rose-500'}`}>Sent: {n.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-6 w-full py-2 bg-gray-50 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl text-sm transition border border-gray-100">
                  Full Sentiment Analysis
                </button>
              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
