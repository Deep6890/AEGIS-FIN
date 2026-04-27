import React, { useEffect, useState } from "react";
import { Search, GitBranch, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchStaticCorr, fetchRollingCorr, fetchTopSectors } from "../lib/api";

const COLORS = ["#E8572A","#3B82F6","#10B981","#F59E0B","#8B5CF6","#22D3EE","#84CC16","#FB7185","#14B8A6","#F97316"];
const METRICS = ["return_1d","return_5d","return_20d","volatility_20d","atr","drawdown_20d","volume_ratio","momentum"];
const METRIC_LABELS = { return_1d:"Ret 1d", return_5d:"Ret 5d", return_20d:"Ret 20d", volatility_20d:"Vol 20d", atr:"ATR", drawdown_20d:"DD 20d", volume_ratio:"Vol Ratio", momentum:"Mom" };

function CorrDot({ value }) {
  if (value == null) return <span className="text-[10px] text-[var(--text-3)]">—</span>;
  const abs  = Math.abs(value);
  const size = 8 + abs * 28;
  const bg   = value > 0 ? `rgba(232,87,42,${0.12 + abs * 0.8})` : `rgba(100,100,100,${0.1 + abs * 0.6})`;
  const bdr  = value > 0 ? `rgba(232,87,42,${0.3 + abs * 0.6})` : `rgba(100,100,100,${0.2 + abs * 0.5})`;
  return (
    <div className="flex items-center justify-center">
      <div className="relative group cursor-default">
        <div className="rounded-full transition-all duration-200" style={{ width: size, height: size, background: bg, border: `1px solid ${bdr}` }} />
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg z-10">
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

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.ticker || "").toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selectedCompany) return;
    setLoading(true);
    Promise.all([fetchStaticCorr(selectedCompany), fetchRollingCorr(selectedCompany, window_), fetchTopSectors(selectedCompany)])
      .then(([sc, rc, ts]) => {
        const latest = sc.data?.[0];
        if (!latest) { setStaticCorr([]); setRollingCorr([]); setTopSectors([]); return; }
        
        // Parse company_vs_sectors JSONB: { metric: { sectorName: corrValue } }
        const cvs = latest.company_vs_sectors || {};
        const sectorDataMap = {};
        Object.entries(cvs).forEach(([metric, sectors]) => {
          if (typeof sectors !== "object") return;
          Object.entries(sectors).forEach(([sectorName, val]) => {
            if (!sectorDataMap[sectorName]) {
              sectorDataMap[sectorName] = { sector_id: sectorName, sectors: { name: sectorName } };
            }
            sectorDataMap[sectorName][metric] = typeof val === "number" ? val : null;
          });
        });
        setStaticCorr(Object.values(sectorDataMap));
        setRollingCorr(rc.data || []);
        
        // Parse top_sectors from JSONB
        const rawTop = latest.top_sectors || [];
        const topList = Array.isArray(rawTop) ? rawTop : [];
        setTopSectors(topList.map((t, i) => ({ 
          ...t, 
          rank: t.rank || i + 1,
          correlation: t.corr_60d ?? t.corr ?? t.correlation ?? 0, 
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
      const returns = r.company_vs_sectors?.return_1d || {};
      Object.entries(returns).forEach(([sectorName, val]) => {
        byDate[d][sectorName.replace(" Sector","").replace(" Nifty","")] = val?.toFixed(3);
      });
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [rollingCorr]);
  const sectorNames = React.useMemo(() => {
    const names = new Set();
    rollingCorr.forEach(r => { Object.keys(r.company_vs_sectors?.return_1d || {}).forEach(n => names.add(n.replace(" Sector","").replace(" Nifty",""))); });
    return [...names];
  }, [rollingCorr]);
  const selectedComp = companies.find(c => c.id === selectedCompany);

  return (
    <PageLayout title="Correlation">
      <div className="space-y-5 pb-10">
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Analysis</p>
          <h1 className="page-heading">Correlation Explorer</h1>
          <p className="page-subheading">Map company performance against NSE sector indices across 8 price metrics and rolling time windows.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in">
          {/* Company picker */}
          <div className="lg:col-span-4 space-y-3">
            <p className="title-md">Select Company</p>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company…" className="input-base pl-10" />
            </div>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
              {filtered.slice(0, 100).map(c => (
                <button key={c.id} onClick={() => setSelectedCompany(c.id)}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border ${
                    selectedCompany === c.id
                      ? "bg-[var(--surface)] border-[var(--orange)]/30 shadow-sm"
                      : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--orange)]/20"
                  }`}>
                  <p className="text-sm font-semibold text-[var(--text)] truncate">{c.name}</p>
                  <p className="text-[11px] font-mono text-[var(--text-3)] mt-0.5">{c.ticker}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-8 space-y-5">
            {!selectedCompany ? (
              <div className="card flex flex-col items-center justify-center text-center p-16 h-[calc(100vh-260px)] min-h-[500px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[var(--orange)]/5 blur-[80px] pointer-events-none" />
                <div className="w-20 h-20 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] flex items-center justify-center mb-6 animate-float">
                  <GitBranch size={36} className="text-[var(--text-3)]" />
                </div>
                <h3 className="title-lg mb-2">Correlation Heatmaps</h3>
                <p className="text-sm text-[var(--text-3)] max-w-sm leading-relaxed mb-6">
                  Select a company to map its alignment with broad sector trends across 8 distinct price metrics.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {METRICS.slice(0, 5).map(m => (
                    <span key={m} className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] rounded-xl text-[10px] text-[var(--text-3)] font-mono">
                      {METRIC_LABELS[m]}
                    </span>
                  ))}
                </div>
              </div>
            ) : loading ? (
              <div className="h-[500px] flex items-center justify-center"><LoadingSpinner /></div>
            ) : (
              <>
                {/* Header */}
                <div className="card-glass p-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-[var(--orange)]/5 blur-[50px] pointer-events-none" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="title-lg mb-1">{selectedComp?.name}</p>
                      <p className="text-xs font-mono text-[var(--text-3)]">{selectedComp?.ticker} · Cross-Sector Alignment</p>
                    </div>
                    <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-[var(--border)]">
                      {[20, 60, 100].map(w => (
                        <button key={w} onClick={() => setWindow(w)}
                          className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all ${
                            window_ === w
                              ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                              : "text-[var(--text-3)] hover:text-[var(--text)]"
                          }`}>{w}d</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top correlated sectors */}
                {topSectors.length > 0 && (
                  <div className="card p-5">
                    <p className="label-caps mb-4">Highest Correlation Rank</p>
                    <p className="text-xs text-[var(--text-3)] mb-4 leading-relaxed">
                      Sectors with the strongest co-movement with this company's daily returns over the selected window.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {topSectors.slice(0, 5).map((r, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] rounded-2xl hover:border-[var(--orange)]/30 transition-all group">
                          <span className="w-7 h-7 rounded-xl bg-[var(--orange)] text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                            #{r.rank || i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--orange)] transition-colors">{r.sectors?.name}</p>
                            <p className="text-[10px] font-mono text-[var(--text-3)] mt-0.5">{(r.correlation * 100).toFixed(1)}% alignment</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bubble map — glass card */}
                {Object.keys(staticMap).length > 0 && (
                  <div className="card-glass p-6 overflow-x-auto">
                    <div className="flex items-end justify-between mb-5">
                      <div>
                        <p className="title-md">Correlation Bubble Map</p>
                        <p className="text-xs text-[var(--text-3)] mt-1">
                          Bubble size = correlation strength. Orange = positive co-movement, gray = negative.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--orange)]" /> Positive</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" /> Negative</span>
                      </div>
                    </div>
                    <div className="min-w-[700px]">
                      <div className="grid" style={{ gridTemplateColumns: `150px repeat(${METRICS.length}, 1fr)` }}>
                        {/* Header row */}
                        <div />
                        {METRICS.map(m => (
                          <div key={m} className="pb-4 text-center">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-3)]">{METRIC_LABELS[m]}</p>
                          </div>
                        ))}
                        {/* Data rows */}
                        {Object.values(staticMap).map(r => (
                          <React.Fragment key={r.sector_id}>
                            <div className="py-3 pr-4 text-xs font-semibold text-[var(--text)] flex items-center border-b border-[var(--border)]">
                              <span className="truncate">{r.sectors?.name?.replace(" Sector","").replace(" Nifty","") || `S${r.sector_id}`}</span>
                            </div>
                            {METRICS.map(m => (
                              <div key={m} className="py-3 flex items-center justify-center border-b border-[var(--border)]">
                                <CorrDot value={r[m]} />
                              </div>
                            ))}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Rolling correlation chart */}
                <div className="card p-6">
                  <p className="title-md mb-1">Rolling Correlation Index</p>
                  <p className="text-xs text-[var(--text-3)] mb-5">
                    Daily co-movement trend over {window_} trading days. Each line = one sector index.
                  </p>
                  {rollingCorr.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={rollingChartData}>
                        <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                        <YAxis domain={[-1, 1]} tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                        <Tooltip {...ct.tooltip} />
                        {sectorNames.map((name, i) => (
                          <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.75} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[260px] flex flex-col items-center justify-center text-center bg-neutral-50 dark:bg-neutral-900/40 rounded-xl">
                      <Activity size={24} className="text-[var(--text-3)] mb-3" />
                      <p className="text-sm font-semibold text-[var(--text-2)]">No rolling correlation data</p>
                      <p className="text-xs text-[var(--text-3)] mt-1">Run the pipeline to compute correlations for this company.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
