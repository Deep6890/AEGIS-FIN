import { useState, useMemo } from 'react';
import PageLayout from '../components/Layout/PageLayout';
import { ResponsiveContainer, Treemap, Tooltip, AreaChart, Area } from 'recharts';
import { Search, Filter, LayoutGrid, LayoutList, Heart, Star, TrendingUp, TrendingDown, Activity, ChevronRight, BarChart } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useNavigate } from 'react-router-dom';

const getSentimentColor = (sentiment) => {
  if (sentiment === 'positive') return 'bg-emerald-500';
  if (sentiment === 'neutral') return 'bg-amber-500';
  return 'bg-rose-500';
};

const CustomTreemapContent = (props) => {
  const { root, depth, x, y, width, height, index, name, score } = props;
  
  if (depth === 1) {
    const color = score > 75 ? 'rgba(16, 185, 129, 0.8)' : score > 50 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(239, 68, 68, 0.8)';
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} style={{ fill: color, stroke: '#fff', strokeWidth: 2, strokeOpacity: 0.5 }} />
        {width > 50 && height > 30 && <text x={x + 8} y={y + 20} fill="#fff" fontSize={13} fontWeight="bold" className="drop-shadow-sm">{name}</text>}
        {width > 50 && height > 50 && <text x={x + 8} y={y + 36} fill="#fff" fontSize={11} opacity={0.8} className="drop-shadow-sm">Score: {score}</text>}
      </g>
    );
  }
  return null;
};

export default function CompanyBrowser() {
  const { dashboardData } = useAppData();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');

  const companies = useMemo(() => {
    return dashboardData.sectorCompanyList.flatMap(s => 
      s.companies.map(c => ({
        ...c,
        sector: s.sector,
        marketCap: Math.floor(Math.random() * 500000) + 10000,
        sentiment: Math.random() > 0.6 ? 'positive' : Math.random() > 0.3 ? 'neutral' : 'negative',
        sparkline: Array.from({length: 10}, () => Math.random() * 100 + 50)
      }))
    );
  }, [dashboardData]);

  const treemapData = useMemo(() => {
    return dashboardData.sectorCompanyList.map(s => ({
      name: s.sector,
      children: s.companies.map(c => ({
        name: c.name,
        size: Math.floor(Math.random() * 500000) + 10000,
        score: c.score,
      })),
    }));
  }, [dashboardData]);

  const filteredCompanies = companies.filter(c => {
    if (selectedSector !== 'All' && c.sector !== selectedSector) return false;
    if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row gap-6 h-full">
        {/* LEFT SIDEBAR: Filters */}
          <div className="w-full md:w-[280px] shrink-0 flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100 flex flex-col gap-4">
              <h3 className="font-bold text-[#0f1f0f] flex items-center gap-2">
                <Filter size={18} className="text-[#2d6a4f]" />
                Filters
              </h3>
              
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search companies..." 
                  className="w-full bg-gray-50 border border-emerald-100 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20 transition"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sector</h4>
                <div className="flex flex-col gap-2">
                  {['All', ...new Set(companies.map(c => c.sector))].map(s => (
                    <button 
                      key={s}
                      onClick={() => setSelectedSector(s)}
                      className={`text-left px-3 py-2 rounded-lg text-sm transition ${selectedSector === s ? 'bg-[#2d6a4f] text-white font-medium' : 'hover:bg-emerald-50 text-gray-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Composite Score</h4>
                <div className="px-2">
                  <input type="range" className="w-full accent-[#2d6a4f]" min="0" max="100" defaultValue="50" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0</span>
                    <span>50+</span>
                    <span>100</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sentiment</h4>
                <div className="flex gap-2">
                  {['positive', 'neutral', 'negative'].map(sent => (
                    <button key={sent} className="flex-1 capitalize text-xs py-2 bg-gray-50 rounded-lg border border-gray-100 hover:border-emerald-200 transition">
                      {sent}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-[#2d6a4f] to-[#1b4332] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20"><Star size={64} /></div>
              <h3 className="font-bold mb-2 relative z-10">Smart Watchlist</h3>
              <p className="text-sm opacity-80 mb-4 relative z-10">Pin companies and monitor systemic risk correlations instantly.</p>
              <button className="bg-white text-[#2d6a4f] w-full py-2 rounded-xl text-sm font-bold shadow-md hover:bg-emerald-50 transition relative z-10">
                View Watchlist
              </button>
            </div>
          </div>

          {/* MAIN AREA */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header / Toggle */}
            <div className="flex justify-between items-end mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-[#0f1f0f] tracking-tight">Company Browser</h1>
                <p className="text-sm text-[#8fa88f] mt-1">Navigate, filter, and analyze systemic risk across the universe.</p>
              </div>
              <div className="bg-white border border-emerald-100 p-1 rounded-xl flex gap-1 shadow-sm">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg flex items-center gap-2 text-sm transition ${viewMode === 'grid' ? 'bg-emerald-50 text-[#2d6a4f] font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <LayoutGrid size={16} /> Grid
                </button>
                <button 
                  onClick={() => setViewMode('treemap')}
                  className={`p-2 rounded-lg flex items-center gap-2 text-sm transition ${viewMode === 'treemap' ? 'bg-emerald-50 text-[#2d6a4f] font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <BarChart size={16} /> Treemap
                </button>
              </div>
            </div>

            {/* Content Area */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                {filteredCompanies.map((c, i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-md hover:border-emerald-300 transition-all group flex flex-col h-[200px] relative overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-[#0f1f0f] text-lg">{c.name}</h3>
                          <span className={`w-2 h-2 rounded-full ${getSentimentColor(c.sentiment)}`} title={`Sentiment: ${c.sentiment}`} />
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-md tracking-wide">
                          {c.sector}
                        </span>
                      </div>
                      <button className="text-gray-300 hover:text-rose-500 transition">
                        <Heart size={18} />
                      </button>
                    </div>

                    <div className="flex gap-4 items-end mt-2 mb-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Risk Score</div>
                        <div className={`text-2xl font-black ${c.score > 75 ? 'text-emerald-600' : c.score > 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                          {c.score}
                        </div>
                      </div>
                      <div className="flex-1 h-8 opacity-60 group-hover:opacity-100 transition">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={c.sparkline.map((v, i) => ({ val: v, index: i }))}>
                            <defs>
                              <linearGradient id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={c.change > 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={c.change > 0 ? '#10b981' : '#f43f5e'} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Area 
                              type="monotone" 
                              dataKey="val" 
                              stroke={c.change > 0 ? '#10b981' : '#f43f5e'} 
                              strokeWidth={2}
                              fill={`url(#grad${i})`} 
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
                      <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        MCap: ₹{(c.marketCap/1000).toFixed(1)}k Cr
                      </div>
                      <button className="flex items-center gap-1 text-xs font-bold text-[#2d6a4f] hover:text-[#1b4332] transition group-hover:translate-x-1">
                        Deep Dive <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 bg-white rounded-2xl shadow-sm border border-emerald-100 p-2 overflow-hidden min-h-[500px] relative">
                <div className="absolute top-6 left-6 z-10 p-4 bg-white/90 backdrop-blur rounded-xl shadow border border-gray-100 max-w-sm">
                  <h3 className="font-bold text-gray-800 mb-1">Market Cap vs Score Matrix</h3>
                  <p className="text-xs text-gray-500">Box size represents Market Cap. Color represents Composite Score (Risk rating). Green is healthy, Red indicates systemic vulnerabilities.</p>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={treemapData}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    fill="#2d6a4f"
                    content={<CustomTreemapContent />}
                  >
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-100">
                              <p className="font-bold text-gray-800 text-lg">{data.name}</p>
                              <div className="flex gap-4 mt-2">
                                <div>
                                  <p className="text-xs text-gray-400">Score</p>
                                  <p className={`font-bold ${data.score > 75 ? 'text-emerald-500' : 'text-rose-500'}`}>{data.score || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">Market Cap</p>
                                  <p className="font-bold text-gray-700">₹{(data.size/1000).toFixed(1)}k Cr</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </Treemap>
                </ResponsiveContainer>
              </div>
            )}
        </div>
      </div>
    </PageLayout>
  );
}
