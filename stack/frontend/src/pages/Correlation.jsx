import React, { useEffect, useState } from "react";
import { Search, GitBranch, ArrowRight, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchStaticCorr, fetchRollingCorr, fetchTopSectors } from "../lib/api";

const COLORS = ["#E85D04","#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#22D3EE","#84cc16","#FB7185","#14b8a6"];
const METRICS = ["return_1d","return_5d","return_20d","volatility_20d","atr","drawdown_20d","volume_ratio","momentum"];
const METRIC_LABELS = { return_1d: "Ret 1d", return_5d: "Ret 5d", return_20d: "Ret 20d", volatility_20d: "Vol 20d", atr: "ATR", drawdown_20d: "DD 20d", volume_ratio: "Vol Ratio", momentum: "Mom" };

function InsightBox({ title, children }) {
  return (
    <div className="insight-box mt-4">
      {title && <p className="text-xs font-bold text-[#8B6914] dark:text-[#E8C547] mb-1">{title}</p>}
      <p className="text-[11px] text-[#8B6914]/80 dark:text-[#E8C547]/80 leading-relaxed">{children}</p>
    </div>
  );
}

function CorrDot({ value }) {
  if (value == null) return <span className="text-[10px] text-neutral-400">—</span>;
  const abs = Math.abs(value);
  const size = 8 + abs * 32;
  const bg = value > 0 ? `rgba(0,179,65,${0.1 + abs * 0.85})` : `rgba(255,59,48,${0.1 + abs * 0.85})`;
  const border = value > 0 ? `rgba(0,179,65,${0.3 + abs * 0.7})` : `rgba(255,59,48,${0.3 + abs * 0.7})`;
  return (
    <div className="flex items-center justify-center">
      <div className="relative group cursor-default">
        <div className="rounded-full transition-all duration-300 shadow-sm" style={{ width: size, height: size, background: bg, border: `1px solid ${border}` }} />
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-900 dark:bg-white text-neutral-900 dark:text-white dark:text-neutral-900 text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
          {value.toFixed(3)}
        </div>
      </div>
    </div>
  );
}

export default function Correlation() {
  const { companies } = useAppData();
  const ct = useChartTheme();
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [window_, setWindow] = useState(60);
  const [staticCorr, setStaticCorr] = useState([]);
  const [rollingCorr, setRollingCorr] = useState([]);
  const [topSectors, setTopSectors] = useState([]);
  const [loading, setLoading] = useState(false);

  const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.ticker || "").toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!selectedCompany) return;
    setLoading(true);
    Promise.all([fetchStaticCorr(selectedCompany), fetchRollingCorr(selectedCompany, window_), fetchTopSectors(selectedCompany)])
      .then(([sc, rc, ts]) => { 
        // sc, rc, ts all contain the same 'correlation' rows
        const latest = sc.data?.[0];
        if (!latest) {
          setStaticCorr([]);
          setRollingCorr([]);
          setTopSectors([]);
          return;
        }

        // Transform company_vs_sectors JSONB into list of sector rows
        // company_vs_sectors: { "return_1d": { "Sector Name": val, ... }, "volatility_20d": ... }
        const sectorDataMap = {};
        const cvs = latest.company_vs_sectors || {};
        const foundMetrics = new Set();
        
        Object.entries(cvs).forEach(([metric, sectors]) => {
          foundMetrics.add(metric);
          Object.entries(sectors).forEach(([sectorName, val]) => {
            if (!sectorDataMap[sectorName]) sectorDataMap[sectorName] = { sectors: { name: sectorName }, sector_id: sectorName };
            sectorDataMap[sectorName][metric] = val;
          });
        });
        setStaticCorr(Object.values(sectorDataMap));
        // Dynamically update available metrics if needed, or stick to a curated list that prioritizes what's found
        if (foundMetrics.size > 0) {
          // We could set a state here, but for now let's just ensure the map logic works
        }

        // Rolling correlation - rc has multiple rows (time series)
        setRollingCorr(rc.data || []);

        // Top Sectors - from latest.top_sectors JSONB
        const rawTop = latest.top_sectors || [];
        const topList = Array.isArray(rawTop) ? rawTop : (rawTop["1d"] || rawTop["60d"] || []);
        setTopSectors(topList.map(t => ({ 
          ...t, 
          correlation: t.corr ?? t.correlation ?? 0,
          sectors: { name: t.sector || t.name || "Unknown" } 
        })));
      })
      .finally(() => setLoading(false));
  }, [selectedCompany, window_]);

  const staticMap = React.useMemo(() => { const m = {}; staticCorr.forEach(r => { if (!m[r.sector_id]) m[r.sector_id] = r; }); return m; }, [staticCorr]);
  const rollingChartData = React.useMemo(() => {
    const byDate = {};
    rollingCorr.forEach(r => { 
      const d = r.date; 
      if (!byDate[d]) byDate[d] = { date: d.slice(5) }; 
      // Extract from JSONB company_vs_sectors for the 'return_1d' metric
      const returns = r.company_vs_sectors?.return_1d || {};
      Object.entries(returns).forEach(([sectorName, val]) => {
        const n = sectorName.replace(" Sector","").replace(" Nifty","");
        byDate[d][n] = val?.toFixed(3);
      });
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [rollingCorr]);
  const sectorNames = React.useMemo(() => {
    const names = new Set();
    rollingCorr.forEach(r => {
      const returns = r.company_vs_sectors?.return_1d || {};
      Object.keys(returns).forEach(n => names.add(n.replace(" Sector","").replace(" Nifty","")));
    });
    return [...names];
  }, [rollingCorr]);
  const selectedComp = companies.find(c => c.id === selectedCompany);

  return (
    <PageLayout title="Correlation">
      <div className="space-y-8 pb-12">
        <div className="animate-fade-in">
          <h1 className="page-heading">Correlation Explorer</h1>
          <p className="page-subheading">Analyze multi-dimensional relationships between individual equities and sector indices.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Company Picker - Left Col */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="title-md">Select Company</p>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company..." className="w-full pl-11 pr-4 py-3 text-sm input-base" />
            </div>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {filtered.slice(0, 100).map(c => (
                <button key={c.id} onClick={() => setSelectedCompany(c.id)}
                  className={`w-full text-left px-5 py-4 rounded-2xl transition-all duration-300 border ${
                    selectedCompany === c.id ? "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-sm" : "bg-neutral-900/[0.03] dark:bg-neutral-900/[0.02] dark:bg-white/[0.02] border-transparent hover:bg-neutral-900/[0.06] dark:hover:bg-neutral-900/[0.05] dark:bg-white/[0.05]"
                  }`}>
                  <p className="font-semibold text-base text-neutral-900 dark:text-neutral-100 truncate tracking-tight">{c.name}</p>
                  <p className="font-mono text-[11px] mt-1 text-neutral-500">{c.ticker}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Detail - Right Col */}
          <div className="lg:col-span-8 space-y-6">
            {!selectedCompany ? (
              <div className="card-dark flex flex-col items-center justify-center text-center p-16 h-[calc(100vh-260px)] min-h-[500px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 to-transparent blur-[100px] pointer-events-none" />
                <div className="w-24 h-24 rounded-3xl bg-neutral-900/[0.04] dark:bg-white/[0.04] border border-neutral-900/[0.08] dark:border-white/[0.08] flex items-center justify-center mb-6 animate-float">
                  <GitBranch size={40} className="text-neutral-900 dark:text-white opacity-80" />
                </div>
                <h3 className="value-lg text-neutral-900 dark:text-white mb-3">Correlation Heatmaps</h3>
                <p className="text-base text-neutral-400 max-w-sm leading-relaxed mb-8">Select a company to map its alignment with broad sector trends across 8 distinct metrics.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {METRICS.slice(0, 5).map(m => <span key={m} className="px-3 py-1.5 bg-neutral-900/[0.04] dark:bg-white/[0.04] border border-neutral-900/[0.06] dark:border-white/[0.06] rounded-xl text-[10px] text-neutral-500 font-mono">{METRIC_LABELS[m]}</span>)}
                </div>
              </div>
            ) : loading ? <div className="h-[500px] flex items-center justify-center"><LoadingSpinner /></div> : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="value-lg">{selectedComp?.name}</p>
                    <p className="text-sm font-mono text-neutral-500 mt-1">{selectedComp?.ticker} — Cross-Sector Alignment</p>
                  </div>
                  <div className="flex bg-neutral-900/[0.04] dark:bg-neutral-900/[0.04] dark:bg-white/[0.04] p-1.5 rounded-xl border border-neutral-900/[0.05] dark:border-neutral-900/[0.05] dark:border-white/[0.05]">
                    {[20, 60, 100].map(w => (
                      <button key={w} onClick={() => setWindow(w)} className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${window_ === w ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}>{w}d</button>
                    ))}
                  </div>
                </div>

                <InsightBox title="Cross-Sector Alignment Index">
                  This explorer maps the company's daily performance against 10 primary Nifty sectors. High bubble size indicates strong co-movement across the specified window.
                </InsightBox>

                {/* Top Sectors */}
                {topSectors.length > 0 && (
                  <div className="card-glass p-6">
                    <p className="label-caps mb-4">Highest Correlation Rank</p>
                    <div className="flex flex-wrap gap-4">
                      {topSectors.slice(0, 5).map((r, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-3.5 bg-neutral-900/[0.02] dark:bg-neutral-900/[0.02] dark:bg-white/[0.02] border border-neutral-900/[0.05] dark:border-neutral-900/[0.05] dark:border-white/[0.05] rounded-2xl hover:border-brand-orange/30 transition-all group">
                          <span className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-white text-neutral-900 dark:text-white dark:text-neutral-900 text-[10px] font-bold flex items-center justify-center shadow-sm">#{r.rank || i+1}</span>
                          <div>
                            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-brand-orange transition-colors">{r.sectors?.name}</p>
                            <p className="text-[10px] font-mono text-neutral-500 mt-0.5">{(r.correlation * 100).toFixed(1)}% Alignment</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(staticMap).length > 0 && (
                  <div className="card-glass p-8 overflow-x-auto">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                      <div>
                        <p className="title-md">Bubble Map</p>
                        <p className="muted mt-1">Multi-metric static correlations. Size = strength.</p>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-neutral-900/[0.03] dark:bg-neutral-900/[0.02] dark:bg-white/[0.02] px-4 py-2 rounded-xl">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00B341]" /> Positive</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FF3B30]" /> Negative</span>
                      </div>
                    </div>
                    <div className="min-w-[700px]">
                      <div className="grid" style={{ gridTemplateColumns: `140px repeat(${METRICS.length}, 1fr)` }}>
                        {METRICS.map(m => (
                          <div key={m} className="pb-6 text-center">
                            <p className="label-caps !text-[9px] mb-1">{METRIC_LABELS[m] || m.replace("_"," ")}</p>
                          </div>
                        ))}
                        {Object.values(staticMap).map(r => (
                          <React.Fragment key={r.sector_id}>
                            <div className="py-4 pr-4 text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center border-b border-neutral-900/[0.04] dark:border-white/[0.04]">
                              <span className="truncate">{r.sectors?.name?.replace(" Sector","").replace(" Nifty","") || `S${r.sector_id}`}</span>
                            </div>
                            {METRICS.map(m => (
                              <div key={m} className="py-4 flex items-center justify-center border-b border-neutral-900/[0.04] dark:border-white/[0.04]">
                                <CorrDot value={r[m]} />
                              </div>
                            ))}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="card-glass p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="title-md">Rolling Correlation Index</p>
                      <p className="muted mt-1">Relative co-movement trend over {window_} trading days.</p>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    {rollingCorr.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={rollingChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={ct.grid} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                          <YAxis domain={[-1, 1]} tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                          <Tooltip {...ct.tooltip} />
                          {sectorNames.map((name, i) => <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />)}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-neutral-900/[0.02] rounded-2xl border border-dashed border-neutral-900/[0.1]">
                        <Activity size={24} className="text-neutral-300 mb-3" />
                        <p className="text-sm font-bold text-neutral-400">No rolling correlation data found</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
