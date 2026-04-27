import React, { useEffect, useState, useMemo } from "react";
import { Search, GitBranch, Activity, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceLine, AreaChart, Area
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

const COLORS = ["#E8572A","#3B82F6","#10B981","#F59E0B","#8B5CF6","#22D3EE","#84CC16","#FB7185"];
const METRICS = ["return_1d","return_5d","return_20d","volatility_20d","atr","drawdown_20d","volume_ratio","momentum"];
const METRIC_LABELS = {
  return_1d: "Ret 1d", return_5d: "Ret 5d", return_20d: "Ret 20d",
  volatility_20d: "Vol 20d", atr: "ATR", drawdown_20d: "DD 20d",
  volume_ratio: "Vol Ratio", momentum: "Mom"
};

// Correlation bubble — size and color driven by actual value
function CorrDot({ value }) {
  if (value == null) return <span className="text-[10px] text-[var(--text-3)]">—</span>;
  const abs  = Math.abs(value);
  const size = Math.max(6, 6 + abs * 30);
  const pos  = value > 0;
  const bg   = pos
    ? `rgba(232,87,42,${0.15 + abs * 0.75})`
    : `rgba(156,163,175,${0.15 + abs * 0.6})`;
  const border = pos
    ? `rgba(232,87,42,${0.4 + abs * 0.5})`
    : `rgba(156,163,175,${0.3 + abs * 0.4})`;
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="relative group cursor-default flex items-center justify-center"
        style={{ width: size, height: size }}>
        <div className="rounded-full"
          style={{ width: size, height: size, background: bg, border: `1.5px solid ${border}` }} />
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
          {value > 0 ? "+" : ""}{value.toFixed(3)}
        </div>
      </div>
    </div>
  );
}

export default function Correlation() {
  const { companies } = useAppData();
  const ct = useChartTheme();
  const [search, setSearch]           = useState("");
  const [selectedId, setSelectedId]   = useState(null);
  const [corrData, setCorrData]       = useState(null);   // latest correlation row
  const [rollingRows, setRollingRows] = useState([]);     // all rolling rows
  const [topSectors, setTopSectors]   = useState([]);
  const [overlayData, setOverlayData] = useState([]);     // company + top sector overlay
  const [loading, setLoading]         = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState("return_1d");

  const filtered = useMemo(() =>
    companies.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.ticker || "").toLowerCase().includes(search.toLowerCase())
    ), [companies, search]);

  // Load correlation data when company selected
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setCorrData(null);
    setRollingRows([]);
    setTopSectors([]);
    setOverlayData([]);

    Promise.all([
      fetchStaticCorr(selectedId),
      fetchRollingCorr(selectedId),
      fetchTopSectors(selectedId),
    ]).then(([sc, rc, ts]) => {
      const latest = sc.data?.[0] || null;
      setCorrData(latest);
      setRollingRows(rc.data || []);

      // Parse top_sectors from JSONB
      const raw = latest?.top_sectors || ts.data?.[0]?.top_sectors || [];
      const list = Array.isArray(raw) ? raw : [];
      setTopSectors(list.map((t, i) => ({
        rank:        t.rank || i + 1,
        sector:      t.sector || t.name || "Unknown",
        corr_20d:    t.corr_20d ?? null,
        corr_60d:    t.corr_60d ?? null,
        corr_100d:   t.corr_100d ?? null,
        health:      t.health ?? null,
        signal:      t.signal ?? null,
      })));
    }).finally(() => setLoading(false));
  }, [selectedId]);

  // Load overlay chart: company health + top sector health on same timeline
  useEffect(() => {
    if (!selectedId || topSectors.length === 0) return;
    const topSectorName = topSectors[0]?.sector;
    if (!topSectorName) return;

    setOverlayLoading(true);
    Promise.all([
      fetchCompanyOHLCVHistory(selectedId, 90),
      fetchSectorOHLCVHistory(topSectorName, 90),
    ]).then(([compRes, secRes]) => {
      const compRows = compRes.data || [];
      const secRows  = secRes.data || [];

      // Merge by date
      const secMap = {};
      secRows.forEach(r => { secMap[r.date] = r; });

      const merged = compRows.map(r => ({
        date:          r.date?.slice(5),
        company_health: r.health_score ?? null,
        company_ret:    r.ret_z ?? null,
        sector_health:  secMap[r.date]?.health_score ?? null,
        sector_ret:     secMap[r.date]?.ret_z ?? null,
      })).filter(r => r.company_health != null || r.sector_health != null);

      setOverlayData(merged);
    }).finally(() => setOverlayLoading(false));
  }, [selectedId, topSectors]);

  // Build bubble map data from company_vs_sectors JSONB
  const bubbleMap = useMemo(() => {
    if (!corrData?.company_vs_sectors) return {};
    const cvs = corrData.company_vs_sectors;
    const map = {};
    // Structure: { metric: { sectorName: value } }
    Object.entries(cvs).forEach(([metric, sectors]) => {
      if (!sectors || typeof sectors !== "object") return;
      Object.entries(sectors).forEach(([sectorName, val]) => {
        if (!map[sectorName]) map[sectorName] = { name: sectorName };
        map[sectorName][metric] = typeof val === "number" ? val : null;
      });
    });
    return map;
  }, [corrData]);

  // Build rolling chart data for selected metric
  const rollingChartData = useMemo(() => {
    const byDate = {};
    rollingRows.forEach(r => {
      const d = r.date;
      if (!byDate[d]) byDate[d] = { date: d?.slice(5) };
      const metricData = r.company_vs_sectors?.[selectedMetric] || {};
      Object.entries(metricData).forEach(([sectorName, val]) => {
        const key = sectorName.replace(" Sector","").replace(" Nifty","");
        byDate[d][key] = typeof val === "number" ? parseFloat(val.toFixed(3)) : null;
      });
    });
    return Object.values(byDate).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [rollingRows, selectedMetric]);

  const rollingLines = useMemo(() => {
    const names = new Set();
    rollingRows.forEach(r => {
      Object.keys(r.company_vs_sectors?.[selectedMetric] || {}).forEach(n =>
        names.add(n.replace(" Sector","").replace(" Nifty",""))
      );
    });
    return [...names];
  }, [rollingRows, selectedMetric]);

  const selectedComp = companies.find(c => c.id === selectedId);
  const sectorRows   = Object.values(bubbleMap);

  return (
    <PageLayout title="Correlation">
      <div className="space-y-5 pb-10">

        {/* Header */}
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Analysis</p>
          <h1 className="page-heading">Correlation Explorer</h1>
          <p className="page-subheading">
            Map company co-movement with NSE sector indices across 8 price metrics.
            Top correlated sectors drive the balance sheet and holding overlays.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ── Company picker ─────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-3">
            <p className="title-md">Select Company</p>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…" className="input-base pl-10 text-sm" />
            </div>
            <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filtered.length === 0 && (
                <p className="text-xs text-[var(--text-3)] text-center py-4">No companies found</p>
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

          {/* ── Detail panel ───────────────────────────────────────────── */}
          <div className="lg:col-span-9 space-y-5">

            {!selectedId ? (
              <div className="card flex flex-col items-center justify-center text-center p-16 min-h-[500px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[var(--orange)]/5 blur-[80px] pointer-events-none" />
                <div className="w-20 h-20 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] flex items-center justify-center mb-6">
                  <GitBranch size={36} className="text-[var(--text-3)]" />
                </div>
                <h3 className="title-lg mb-2">Correlation Explorer</h3>
                <p className="text-sm text-[var(--text-3)] max-w-sm leading-relaxed">
                  Select a company to see its correlation with all 14 NSE sector indices,
                  top correlated sectors, and overlay charts.
                </p>
              </div>
            ) : loading ? (
              <div className="h-[500px] flex items-center justify-center card">
                <LoadingSpinner />
              </div>
            ) : !corrData ? (
              <div className="card p-12">
                <EmptyState
                  title="No correlation data"
                  sub={`Run the pipeline for ${selectedComp?.name} to compute sector correlations.`}
                />
              </div>
            ) : (
              <>
                {/* ── Company header ──────────────────────────────────── */}
                <div className="card p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="title-lg">{selectedComp?.name}</p>
                    <p className="text-xs font-mono text-[var(--text-3)] mt-0.5">
                      {selectedComp?.ticker} · Last updated {corrData.date}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="label-caps mb-1">Top Sector</p>
                    <p className="text-sm font-bold text-[var(--orange)]">
                      {topSectors[0]?.sector || "—"}
                    </p>
                    {topSectors[0]?.corr_60d != null && (
                      <p className="text-[10px] text-[var(--text-3)] mt-0.5">
                        {(topSectors[0].corr_60d * 100).toFixed(1)}% 60d alignment
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Top correlated sectors ──────────────────────────── */}
                {topSectors.length > 0 && (
                  <div className="card p-5">
                    <p className="title-md mb-1">Top Correlated Sectors</p>
                    <p className="text-xs text-[var(--text-3)] mb-4">
                      Ranked by 60-day Pearson correlation with company daily returns.
                      These sectors drive the balance sheet and holding overlays.
                    </p>
                    <div className="space-y-2">
                      {topSectors.slice(0, 5).map((s, i) => {
                        const corr = s.corr_60d ?? s.corr_20d ?? s.corr_100d ?? 0;
                        const pct  = Math.abs(corr) * 100;
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
                                <div className="h-full rounded-full bg-[var(--orange)] transition-all duration-700"
                                  style={{ width: `${Math.min(100, pct)}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Company vs Top Sector overlay chart ─────────────── */}
                {overlayData.length > 0 && topSectors[0] && (
                  <div className="card p-5">
                    <p className="title-md mb-1">
                      {selectedComp?.name} vs {topSectors[0].sector}
                    </p>
                    <p className="text-xs text-[var(--text-3)] mb-5">
                      Health score comparison (90d). Shows how closely the company tracks its top correlated sector.
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={overlayData}>
                        <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip {...ct.tooltip} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line
                          type="monotone" dataKey="company_health"
                          stroke="var(--orange)" strokeWidth={2.5} dot={false}
                          name={selectedComp?.ticker || "Company"}
                        />
                        <Line
                          type="monotone" dataKey="sector_health"
                          stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="4 2"
                          name={topSectors[0].sector}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* ── Return Z-score overlay ───────────────────────────── */}
                {overlayData.length > 0 && topSectors[0] && (
                  <div className="card p-5">
                    <p className="title-md mb-1">Return Z-Score Overlay</p>
                    <p className="text-xs text-[var(--text-3)] mb-5">
                      Daily return z-scores — when lines move together, correlation is high.
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
                )}

                {/* ── Correlation Bubble Map ───────────────────────────── */}
                {sectorRows.length > 0 ? (
                  <div className="card p-5 overflow-x-auto">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <div>
                        <p className="title-md">Correlation Bubble Map</p>
                        <p className="text-xs text-[var(--text-3)] mt-0.5">
                          Bubble size = |correlation|. Orange = positive, gray = negative. Hover for exact value.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--text-3)]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[var(--orange)]" /> Positive
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-600" /> Negative
                        </span>
                      </div>
                    </div>
                    <div className="min-w-[680px]">
                      <div className="grid" style={{ gridTemplateColumns: `160px repeat(${METRICS.length}, 1fr)` }}>
                        <div className="pb-3" />
                        {METRICS.map(m => (
                          <div key={m} className="pb-3 text-center">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-3)]">{METRIC_LABELS[m]}</p>
                          </div>
                        ))}
                        {sectorRows.map(r => (
                          <React.Fragment key={r.name}>
                            <div className="py-2.5 pr-3 text-xs font-semibold text-[var(--text)] flex items-center border-b border-[var(--border)] truncate">
                              {r.name.replace(" Sector","").replace(" Nifty","")}
                            </div>
                            {METRICS.map(m => (
                              <div key={m} className="py-2.5 flex items-center justify-center border-b border-[var(--border)]" style={{ minHeight: 40 }}>
                                <CorrDot value={r[m]} />
                              </div>
                            ))}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card p-8">
                    <EmptyState title="No bubble map data" sub="company_vs_sectors JSONB is empty for this company." />
                  </div>
                )}

                {/* ── Rolling correlation chart ────────────────────────── */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                      <p className="title-md">Rolling Correlation (90d)</p>
                      <p className="text-xs text-[var(--text-3)] mt-0.5">
                        Daily correlation trend per sector. Each line = one sector index.
                      </p>
                    </div>
                    {/* Metric selector */}
                    <div className="flex flex-wrap gap-1">
                      {METRICS.map(m => (
                        <button key={m} onClick={() => setSelectedMetric(m)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            selectedMetric === m
                              ? "bg-[var(--orange)] text-white"
                              : "bg-neutral-100 dark:bg-neutral-800 text-[var(--text-3)] hover:text-[var(--text)]"
                          }`}>
                          {METRIC_LABELS[m]}
                        </button>
                      ))}
                    </div>
                  </div>
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
                            stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.75}
                            connectNulls />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[260px] flex flex-col items-center justify-center text-center bg-neutral-50 dark:bg-neutral-900/40 rounded-xl">
                      <Activity size={24} className="text-[var(--text-3)] mb-3" />
                      <p className="text-sm font-semibold text-[var(--text-2)]">No rolling data for {METRIC_LABELS[selectedMetric]}</p>
                      <p className="text-xs text-[var(--text-3)] mt-1">Try a different metric or run the pipeline.</p>
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
