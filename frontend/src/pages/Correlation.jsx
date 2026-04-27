import React, { useEffect, useState, useMemo } from "react";
import { Search, GitBranch, Activity } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceLine
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import SignalBadge from "../components/ui/SignalBadge";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import {
  fetchStaticCorr, fetchRollingCorr, fetchTopSectors,
  fetchCompanyOHLCVHistory, fetchSectorOHLCVHistory
} from "../lib/api";

// Windows stored in company_vs_sectors: { sectorName: { full, 20d, 60d, 100d } }
const WINDOWS = ["20d", "60d", "100d", "full"];
const COLORS  = ["#E8572A","#3B82F6","#10B981","#F59E0B","#8B5CF6","#22D3EE","#84CC16","#FB7185"];

// Correlation cell — color and size driven by actual value
function CorrCell({ value }) {
  if (value == null) return <span className="text-[10px] text-[var(--text-3)]">—</span>;
  const abs = Math.abs(value);
  const pos = value > 0;
  const bg  = pos
    ? `rgba(232,87,42,${0.08 + abs * 0.82})`
    : `rgba(100,116,139,${0.08 + abs * 0.65})`;
  const textColor = abs > 0.4 ? "#fff" : pos ? "var(--orange)" : "var(--text-2)";
  return (
    <div className="relative group flex items-center justify-center w-full h-full">
      <div className="w-full h-8 rounded-lg flex items-center justify-center text-[10px] font-bold tabular-nums transition-all"
        style={{ background: bg, color: textColor }}>
        {value > 0 ? "+" : ""}{value.toFixed(2)}
      </div>
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
        {value > 0 ? "+" : ""}{value.toFixed(4)}
      </div>
    </div>
  );
}

export default function Correlation() {
  const { companies } = useAppData();
  const ct = useChartTheme();
  const [search, setSearch]         = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [corrData, setCorrData]     = useState(null);
  const [rollingRows, setRollingRows] = useState([]);
  const [topSectors, setTopSectors] = useState([]);
  const [overlayData, setOverlayData] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);

  const filtered = useMemo(() =>
    companies.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.ticker || "").toLowerCase().includes(search.toLowerCase())
    ), [companies, search]);

  // Load correlation data
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setCorrData(null); setRollingRows([]); setTopSectors([]); setOverlayData([]);

    Promise.all([
      fetchStaticCorr(selectedId),
      fetchRollingCorr(selectedId),
      fetchTopSectors(selectedId),
    ]).then(([sc, rc, ts]) => {
      const latest = sc.data?.[0] || null;
      setCorrData(latest);
      setRollingRows(rc.data || []);

      // top_sectors JSONB: [{ rank, sector, corr_60d, corr_100d, health, signal }]
      const raw  = latest?.top_sectors || ts.data?.[0]?.top_sectors || [];
      const list = Array.isArray(raw) ? raw : [];
      setTopSectors(list.map((t, i) => ({
        rank:      t.rank || i + 1,
        sector:    t.sector || t.name || "Unknown",
        corr_20d:  t.corr_20d  ?? null,
        corr_60d:  t.corr_60d  ?? null,
        corr_100d: t.corr_100d ?? null,
        corr_full: t.corr_full ?? t.full ?? null,
        health:    t.health    ?? null,
        signal:    t.signal    ?? null,
      })));
    }).finally(() => setLoading(false));
  }, [selectedId]);

  // Load overlay when top sector is known
  useEffect(() => {
    if (!selectedId || !topSectors[0]?.sector) return;
    setOverlayLoading(true);
    Promise.all([
      fetchCompanyOHLCVHistory(selectedId, 90),
      fetchSectorOHLCVHistory(topSectors[0].sector, 90),
    ]).then(([compRes, secRes]) => {
      const secMap = {};
      (secRes.data || []).forEach(r => { secMap[r.date] = r; });
      const merged = (compRes.data || []).map(r => ({
        date:           r.date?.slice(5),
        company_health: r.health_score ?? null,
        company_ret:    r.ret_z ?? null,
        sector_health:  secMap[r.date]?.health_score ?? null,
        sector_ret:     secMap[r.date]?.ret_z ?? null,
      })).filter(r => r.company_health != null || r.sector_health != null);
      setOverlayData(merged);
    }).finally(() => setOverlayLoading(false));
  }, [selectedId, topSectors]);

  // company_vs_sectors: { sectorName: { full, 20d, 60d, 100d } }
  const cvs = corrData?.company_vs_sectors || {};
  const sectorNames = Object.keys(cvs).sort();

  // Rolling chart: 60d correlation per sector over time
  const rollingChartData = useMemo(() => {
    const byDate = {};
    rollingRows.forEach(r => {
      const d = r.date;
      if (!byDate[d]) byDate[d] = { date: d?.slice(5) };
      const cvs_ = r.company_vs_sectors || {};
      Object.entries(cvs_).forEach(([sectorName, windows]) => {
        const key = sectorName.replace(" Sector","").replace(" Nifty","");
        const val = windows?.["60d"] ?? windows?.["full"] ?? null;
        if (typeof val === "number") byDate[d][key] = parseFloat(val.toFixed(3));
      });
    });
    return Object.values(byDate).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [rollingRows]);

  const rollingLines = useMemo(() => {
    const names = new Set();
    rollingRows.forEach(r => {
      Object.keys(r.company_vs_sectors || {}).forEach(n =>
        names.add(n.replace(" Sector","").replace(" Nifty",""))
      );
    });
    return [...names];
  }, [rollingRows]);

  const selectedComp = companies.find(c => c.id === selectedId);

  return (
    <PageLayout title="Correlation">
      <div className="space-y-5 pb-10">

        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Analysis</p>
          <h1 className="page-heading">Correlation Explorer</h1>
          <p className="page-subheading">
            Company co-movement with NSE sector indices across 20d / 60d / 100d windows.
            Top correlated sectors drive the balance sheet and holding overlays.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Company picker */}
          <div className="lg:col-span-3 space-y-3">
            <p className="title-md">Select Company</p>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…" className="input-base pl-10 text-sm" />
            </div>
            <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filtered.length === 0 && (
                <p className="text-xs text-[var(--text-3)] text-center py-4">No companies</p>
              )}
              {filtered.slice(0, 100).map(c => (
                <button key={c.id} onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all border ${
                    selectedId === c.id
                      ? "border-[var(--orange)]/40 bg-[var(--surface)] shadow-sm"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--orange)]/20"
                  }`}>
                  <p className="text-sm font-semibold text-[var(--text)] truncate">{c.name}</p>
                  <p className="text-[10px] font-mono text-[var(--text-3)] mt-0.5">{c.ticker}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-9 space-y-5">

            {!selectedId ? (
              <div className="card flex flex-col items-center justify-center text-center p-16 min-h-[500px]">
                <div className="w-20 h-20 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] flex items-center justify-center mb-6">
                  <GitBranch size={36} className="text-[var(--text-3)]" />
                </div>
                <h3 className="title-lg mb-2">Correlation Explorer</h3>
                <p className="text-sm text-[var(--text-3)] max-w-sm leading-relaxed">
                  Select a company to see its Pearson correlation with all 14 NSE sector indices
                  across 20d, 60d, 100d windows, plus overlay charts with the top sector.
                </p>
              </div>
            ) : loading ? (
              <div className="h-[500px] flex items-center justify-center card"><LoadingSpinner /></div>
            ) : !corrData ? (
              <div className="card p-12">
                <EmptyState title="No correlation data"
                  sub={`Run the pipeline for ${selectedComp?.name} to compute sector correlations.`} />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="card p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="title-lg">{selectedComp?.name}</p>
                    <p className="text-xs font-mono text-[var(--text-3)] mt-0.5">
                      {selectedComp?.ticker} · Updated {corrData.date}
                    </p>
                  </div>
                  {topSectors[0] && (
                    <div className="text-right shrink-0">
                      <p className="label-caps mb-1">Top Sector</p>
                      <p className="text-sm font-bold text-[var(--orange)]">{topSectors[0].sector}</p>
                      {topSectors[0].corr_60d != null && (
                        <p className="text-[10px] text-[var(--text-3)] mt-0.5">
                          {(topSectors[0].corr_60d * 100).toFixed(1)}% 60d correlation
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Top correlated sectors */}
                {topSectors.length > 0 && (
                  <div className="card p-5">
                    <p className="title-md mb-1">Top Correlated Sectors</p>
                    <p className="text-xs text-[var(--text-3)] mb-4">
                      Ranked by 60d Pearson correlation. These sectors drive the balance sheet and holding overlays.
                    </p>
                    <div className="space-y-2">
                      {topSectors.slice(0, 5).map((s, i) => {
                        const corr = s.corr_60d ?? s.corr_100d ?? s.corr_20d ?? 0;
                        return (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-neutral-50 dark:bg-neutral-900/60">
                            <span className="w-7 h-7 rounded-lg bg-[var(--orange)] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              #{s.rank}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-semibold text-[var(--text)] truncate">{s.sector}</p>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  {s.signal && <SignalBadge value={s.signal} />}
                                  <span className="text-xs font-bold tabular-nums text-[var(--text)]">
                                    {corr > 0 ? "+" : ""}{(corr * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[var(--orange)]"
                                  style={{ width: `${Math.min(100, Math.abs(corr) * 100)}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Overlay charts */}
                {overlayLoading ? (
                  <div className="card p-8 flex items-center justify-center"><LoadingSpinner /></div>
                ) : overlayData.length > 0 && topSectors[0] ? (
                  <>
                    <div className="card p-5">
                      <p className="title-md mb-1">{selectedComp?.name} vs {topSectors[0].sector}</p>
                      <p className="text-xs text-[var(--text-3)] mb-5">
                        Health score (90d). Solid = company, dashed = top sector.
                        Convergence = high correlation, divergence = decoupling.
                      </p>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={overlayData}>
                          <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                          <Tooltip {...ct.tooltip} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="company_health" stroke="var(--orange)" strokeWidth={2.5} dot={false} name={selectedComp?.ticker} />
                          <Line type="monotone" dataKey="sector_health"  stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="4 2" name={topSectors[0].sector} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="card p-5">
                      <p className="title-md mb-1">Return Z-Score Overlay</p>
                      <p className="text-xs text-[var(--text-3)] mb-5">
                        When lines move together, correlation is high. Divergence = company decoupling from sector.
                      </p>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={overlayData}>
                          <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                          <Tooltip {...ct.tooltip} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <ReferenceLine y={0} stroke={ct.grid} strokeDasharray="3 3" />
                          <Line type="monotone" dataKey="company_ret" stroke="var(--orange)" strokeWidth={2} dot={false} name={selectedComp?.ticker} />
                          <Line type="monotone" dataKey="sector_ret"  stroke="#3B82F6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name={topSectors[0].sector} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : null}

                {/* Correlation matrix — rows = sectors, cols = windows */}
                {sectorNames.length > 0 ? (
                  <div className="card p-5 overflow-x-auto">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <div>
                        <p className="title-md">Correlation Matrix</p>
                        <p className="text-xs text-[var(--text-3)] mt-0.5">
                          Pearson correlation per sector per window. Orange = positive, gray = negative.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--text-3)]">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[var(--orange)]" /> Positive</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-600" /> Negative</span>
                      </div>
                    </div>
                    <div className="min-w-[500px]">
                      <div className="grid" style={{ gridTemplateColumns: `180px repeat(${WINDOWS.length}, 1fr)` }}>
                        {/* Header */}
                        <div className="pb-3" />
                        {WINDOWS.map(w => (
                          <div key={w} className="pb-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">{w}</p>
                          </div>
                        ))}
                        {/* Rows */}
                        {sectorNames.map(sectorName => {
                          const windows = cvs[sectorName] || {};
                          return (
                            <React.Fragment key={sectorName}>
                              <div className="py-1.5 pr-3 text-xs font-semibold text-[var(--text)] flex items-center border-b border-[var(--border)] truncate">
                                {sectorName.replace(" Sector","").replace(" Nifty","")}
                              </div>
                              {WINDOWS.map(w => (
                                <div key={w} className="py-1.5 px-1 flex items-center justify-center border-b border-[var(--border)]">
                                  <CorrCell value={windows[w] ?? null} />
                                </div>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card p-8">
                    <EmptyState title="No correlation matrix data"
                      sub="company_vs_sectors is empty. Run the pipeline to compute correlations." />
                  </div>
                )}

                {/* Rolling 60d correlation chart */}
                <div className="card p-5">
                  <p className="title-md mb-1">Rolling 60d Correlation (90 days)</p>
                  <p className="text-xs text-[var(--text-3)] mb-5">
                    Daily 60d rolling Pearson correlation per sector. Each line = one sector.
                  </p>
                  {rollingChartData.length > 0 && rollingLines.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={rollingChartData}>
                        <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                        <YAxis domain={[-1, 1]} tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip {...ct.tooltip} />
                        <ReferenceLine y={0} stroke={ct.grid} strokeDasharray="3 3" />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {rollingLines.map((name, i) => (
                          <Line key={name} type="monotone" dataKey={name}
                            stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.75} connectNulls />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[260px] flex flex-col items-center justify-center text-center bg-neutral-50 dark:bg-neutral-900/40 rounded-xl">
                      <Activity size={24} className="text-[var(--text-3)] mb-3" />
                      <p className="text-sm font-semibold text-[var(--text-2)]">No rolling correlation data</p>
                      <p className="text-xs text-[var(--text-3)] mt-1">Run the pipeline to compute rolling correlations.</p>
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
