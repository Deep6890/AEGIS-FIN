import { useState, useMemo } from 'react';
import PageLayout from '../components/Layout/PageLayout';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, TrendingUp, TrendingDown, BookOpen, AlertTriangle, ShieldCheck, PieChart, Activity } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

export default function SectorIntelligence() {
  const { sectorIntelligence, sectors } = useAppData();
  const [selectedSectorId, setSelectedSectorId] = useState('sec-bnk');
  
  const selectedSector = useMemo(() => {
    return sectors.find(s => s.id === selectedSectorId) || sectors[0];
  }, [sectors, selectedSectorId]);

  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0f1f0f] tracking-tight">Sector Intelligence</h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2">
            <PieChart size={16} /> Macro & micro analytics across key industries
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap md:flex-nowrap overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {sectors.map(s => (
            <button 
              key={s.id} 
              onClick={() => setSelectedSectorId(s.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition ${selectedSectorId === s.id ? 'bg-[#2d6a4f] text-white' : 'bg-white text-gray-600 hover:bg-emerald-50'}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* L COL */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Overview & Cycle */}
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-emerald-100 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h3 className="font-bold text-xl mb-2">{selectedSector.name} Sector Overview</h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                {selectedSector.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="bg-emerald-50 px-3 py-2 border border-emerald-100 rounded-lg flex items-center gap-2 text-sm text-emerald-800 font-bold">
                  {selectedSector.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />} Performance: {selectedSector.performance}
                </div>
                <div className="bg-blue-50 px-3 py-2 border border-blue-100 rounded-lg flex items-center gap-2 text-sm text-blue-800 font-bold">
                  <Activity size={16} /> Base Score: {selectedSector.score}
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/3 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 pl-0 md:pl-6 relative">
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
            <h3 className="font-bold text-lg mb-4">{selectedSector.name} vs Nifty 50 (YTD)</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sectorIntelligence.performance}>
                  <Tooltip contentStyle={{ borderRadius: '12px' }}/>
                  <Area type="monotone" dataKey="sector" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={3} name={selectedSector.name} />
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
              {selectedSector.topConstituents.map((c, i) => (
                <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 border border-gray-50 hover:border-emerald-100 rounded-xl transition cursor-pointer">
                  <div className="w-1/3">
                    <div className="font-bold text-gray-800">{c.ticker}</div>
                    <div className="text-xs text-gray-400">Weight: {c.weight}</div>
                  </div>
                  <div className="w-1/3 text-center text-sm font-bold text-emerald-600"></div>
                  <div className="w-1/3 flex justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Score</span>
                      <span className="w-8 h-8 rounded bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center">{c.score}</span>
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
                <div className="font-bold text-amber-400 mb-1 flex items-center gap-2"><AlertTriangle size={14}/> Risk Weights</div>
                <p className="text-emerald-100/80 leading-relaxed text-xs">Recent regulatory mandates increasing risk weights on consumer credit impacting broad sector metrics.</p>
              </div>
              <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-800 text-sm hover:border-emerald-400 transition cursor-pointer">
                <div className="font-bold text-emerald-400 mb-1 flex items-center gap-2"><ShieldCheck size={14}/> Policy Update</div>
                <p className="text-emerald-100/80 leading-relaxed text-xs">Proposed draft guidelines tightening conditions across the board, providing insulation for compliant players.</p>
              </div>
              <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-800 text-sm hover:border-emerald-400 transition cursor-pointer">
                <div className="font-bold text-blue-400 mb-1 flex items-center gap-2"><BookOpen size={14}/> External Impacts</div>
                <p className="text-emerald-100/80 leading-relaxed text-xs">Changing Federal Reserve expectations impact foreign institutional inflows and cross-border valuations.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <h3 className="font-bold text-lg mb-4">Sentiment & News Flow</h3>
            <div className="space-y-4">
              {selectedSector.news.map((n, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-1 shrink-0 rounded-full mt-1 mb-1 ${n.sentiment === 'pos' ? 'bg-emerald-500' : n.sentiment === 'neg' ? 'bg-rose-500' : 'bg-gray-400'}`}></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 hover:text-emerald-600 hover:underline cursor-pointer">{n.headline}</p>
                    <span className={`text-xs font-bold ${n.sentiment === 'pos' ? 'text-emerald-500' : n.sentiment === 'neg' ? 'text-rose-500' : 'text-gray-500'}`}>
                      {n.sentiment.toUpperCase()}
                    </span>
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
    </PageLayout>
  );
}
