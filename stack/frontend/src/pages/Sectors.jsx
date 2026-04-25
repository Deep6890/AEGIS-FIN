import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, CartesianGrid, BarChart, Bar, Cell
} from "recharts";
import { TrendingUp, TrendingDown, PieChart, Activity, Zap, ArrowUpRight } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner, { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import LiveMarketBar from "../components/ui/LiveMarketBar";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchSectorHealthHistory, fetchSectorMetricsHistory } from "../lib/api";

/* ── Sector type filter tabs ─────────────────────────────────────────────── */
const FILTERS = [
  { key: "all",    label: "All" },
  { key: "sector", label: "Sectors" },
  { key: "macro",  label: "Macro" },
];

export default function Sectors() {
  const { sectors, latestSectorHealth, loading } = useAppData();
  const ct = useChartTheme();
  const [selected, setSelected]         = useState(null);
  const [typeFilter, setTypeFilter]     = useState("all");
  const [healthHistory, setHealthHistory]   = useState([]);
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [detailLoading, setDetailLoading]   = useState(false);

  useEffect(() => {
    if (!selected) return;
    setDetailLoading(true);
    Promise.all([
      fetchSectorHealthHistory(selected, 90),
      fetchSectorMetricsHistory(selected, 90),
    ]).then(([h, m]) => {
      setHealthHistory(h.data || []);
      setMetricsHistory(m.data || []);
    }).finally(() => setDetailLoading(false));
  }, [selected]);

  const healthMap = React.useMemo(() => {
    const m = {};
    latestSectorHealth.forEach(r => { m[r.sector_id] = r; });
    return m;
  }, [latestSectorHealth]);

  /* ── Signal distribution — must be before any early return ─────────────── */
  const signalDist = React.useMemo(() => {
    if (!healthHistory.length) return [];
    const counts = { STRONG: 0, NEUTRAL: 0, WATCH: 0, WEAK: 0 };
    healthHistory.forEach(r => { if (counts[r.signal] !== undefined) counts[r.signal]++; });
    return Object.entries(counts).map(([signal, count]) => ({ signal, count }));
  }, [healthHistory]);

  const filteredSectors = sectors.filter(s =>
    typeFilter === "all" || s.sector_type === typeFilter
  );

  const selectedSector = sectors.find(s => s.id === selected);
  const selectedHealth = healthMap[selected];

  if (loading) return <PageLayout title="Sectors"><PageSkeleton /></PageLayout>;

  /* ── Chart data ─────────────────────────────────────────────────────────── */
  const healthChartData = healthHistory.map(r => ({
    date:         r.date?.slice(5),
    health_score: r.health_score,
    composite:    r.composite,
  }));

  const returnsChartData = metricsHistory.map(r => ({
    date:        r.date?.slice(5),
    daily_return: r.daily_return != null ? +(r.daily_return * 100).toFixed(3) : null,
    momentum_z:  r.momentum_z,
    ret_z:       r.ret_z,
    vol_z:       r.vol_z,
    close:       r.close,
  }));

  const closeChartData = metricsHistory.filter(r => r.close != null).map(r => ({
    date:  r.date?.slice(5),
    close: r.close,
  }));

  return (
    <PageLayout title="Sectors">
      <div className="space-y-5 pb-10">

        {/* Header */}
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Market Intelligence</p>
          <h1 className="page-heading">Sector Intelligence</h1>
          <p className="page-subheading">
            NSE sector indices and macro assets — health scores, z-scores, price action, and regime classification.
          </p>
        </div>

        <LiveMarketBar />

        {/* Type filter */}
        <div className="flex items-center gap-2 stagger-1">
          <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-[var(--border)]">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setTypeFilter(f.key)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${
                  typeFilter === f.key
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                    : "text-[var(--text-3)] hover:text-[var(--text)]"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-[var(--text-3)]">{filteredSectors.length} {typeFilter === "all" ? "total" : typeFilter + "s"}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in">

          {/* ── Left: Sector list ─────────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-2">
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-2">
              {filteredSectors.length ? filteredSectors.map(s => {
                const h   = healthMap[s.id];
                const pct = h ? Math.min(100, h.health_score || 0) : 0;
                const isSelected = selected === s.id;
                const isMacro = s.sector_type === "macro";
                return (
                  <button key={s.id} onClick={() => setSelected(s.id)}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border ${
                      isSelected
                        ? "border-[var(--orange)]/40 shadow-sm"
                        : "border-[var(--border)] hover:border-[var(--orange)]/20"
                    }`}
                    style={isSelected ? {
                      background: "rgba(255,255,255,0.65)",
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                    } : { background: "var(--surface)" }}
                  >
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--text)] truncate">{s.name}</p>
                          {isMacro && (
                            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[var(--text-3)]">
                              macro
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-[var(--text-3)] mt-0.5">{s.yf_ticker}</p>
                      </div>
                      {h ? <SignalBadge value={h.signal} /> : <span className="badge-gray">—</span>}
                    </div>

                    {h ? (
                      <>
                        {/* Health bar */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[var(--orange)] transition-all duration-700"
                              style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold tabular-nums text-[var(--text)] w-7 text-right">
                            {h.health_score?.toFixed(0)}
                          </span>
                        </div>
                        {/* Meta row */}
                        <div className="flex items-center gap-3 text-[10px] text-[var(--text-3)]">
                          {h.regime && <span className="font-semibold">{h.regime}</span>}
                          {h.market_phase && <span>· {h.market_phase}</span>}
                          {h.trend && (
                            <span className={`flex items-center gap-0.5 ${h.trend === "Upward" ? "text-[var(--orange)]" : "text-[var(--text-3)]"}`}>
                              {h.trend === "Upward" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {h.trend}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] text-[var(--text-3)]">No data — run pipeline</p>
                    )}
                  </button>
                );
              }) : (
                <EmptyState title="No sectors" sub="Run the pipeline to populate sector data." />
              )}
            </div>
          </div>

          {/* ── Right: Detail panel ───────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-5">
            {!selected ? (
              <div className="card flex flex-col items-center justify-center text-center p-16 h-[calc(100vh-280px)] min-h-[480px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[var(--orange)]/5 blur-[80px] pointer-events-none" />
                <div className="w-20 h-20 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] flex items-center justify-center mb-6 animate-float">
                  <PieChart size={36} className="text-[var(--text-3)]" />
                </div>
                <h3 className="title-lg mb-2">Select a Sector</h3>
                <p className="text-sm text-[var(--text-3)] max-w-sm leading-relaxed">
                  Choose any sector or macro asset from the left to view health scores, price action, z-scores, and signal history.
                </p>
              </div>
            ) : detailLoading ? (
              <div className="h-[480px] flex items-center justify-center"><LoadingSpinner /></div>
            ) : (
              <>
                {/* ── Hero glass card ─────────────────────────────────────── */}
                <div className="glass-card p-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-[var(--orange)]/6 blur-[60px] pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="title-lg">{selectedSector?.name}</p>
                          {selectedSector?.sector_type === "macro" && (
                            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg bg-[var(--orange)]/10 text-[var(--orange)]">macro</span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-[var(--text-3)]">{selectedSector?.yf_ticker}</p>
                      </div>
                      {selectedHealth && (
                        <div className="flex gap-2 flex-wrap justify-end">
                          <SignalBadge value={selectedHealth.signal} />
                          {selectedHealth.regime && <SignalBadge value={selectedHealth.regime} />}
                        </div>
                      )}
                    </div>

                    {selectedHealth ? (
                      <>
                        {/* 6 metric tiles */}
                        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                          {[
                            { l: "Health",    v: selectedHealth.health_score?.toFixed(1), accent: true },
                            { l: "Composite", v: selectedHealth.composite?.toFixed(2) },
                            { l: "Ret Z",     v: selectedHealth.ret_z?.toFixed(2) },
                            { l: "Vol Z",     v: selectedHealth.vol_z?.toFixed(2) },
                            { l: "Mom Z",     v: selectedHealth.momentum_z?.toFixed(2) },
                            { l: "Slope Z",   v: selectedHealth.slope_z?.toFixed(2) },
                          ].map(({ l, v, accent }) => (
                            <div key={l} className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3 text-center">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-3)] mb-1">{l}</p>
                              <p className={`text-base font-bold tabular-nums ${accent ? "text-[var(--orange)]" : "text-[var(--text)]"}`}>
                                {v ?? "—"}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Spikes + phase */}
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          {selectedHealth.market_phase && (
                            <span className="text-xs font-semibold text-[var(--text-2)] bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-xl">
                              {selectedHealth.market_phase}
                            </span>
                          )}
                          {selectedHealth.trend && (
                            <span className={`text-xs font-semibold flex items-center gap-1 px-3 py-1 rounded-xl ${
                              selectedHealth.trend === "Upward"
                                ? "bg-[var(--orange)]/10 text-[var(--orange)]"
                                : "bg-neutral-100 dark:bg-neutral-800 text-[var(--text-3)]"
                            }`}>
                              {selectedHealth.trend === "Upward" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                              {selectedHealth.trend}
                            </span>
                          )}
                          {selectedHealth.spike_up && <span className="badge-green">↑ Spike Up</span>}
                          {selectedHealth.spike_down && <span className="badge-red">↓ Spike Down</span>}
                          {selectedHealth.date && (
                            <span className="text-[10px] font-mono text-[var(--text-3)] ml-auto">Updated {selectedHealth.date}</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-[var(--text-3)]">No health data — run the pipeline to populate this sector.</p>
                    )}
                  </div>
                </div>

                {/* ── Close price chart ────────────────────────────────────── */}
                {closeChartData.length > 0 && (
                  <div className="card p-6">
                    <p className="title-md mb-1">Close Price (90d)</p>
                    <p className="text-xs text-[var(--text-3)] mb-5">Daily closing price of the sector index.</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={closeChartData}>
                        <defs>
                          <linearGradient id="closeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#E8572A" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#E8572A" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={50} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                        <Tooltip {...ct.tooltip} formatter={v => [v?.toFixed(2), "Close"]} />
                        <Area type="monotone" dataKey="close" stroke="#E8572A" strokeWidth={2.5} fill="url(#closeGrad)" dot={false} name="Close" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* ── Health score chart ───────────────────────────────────── */}
                {healthChartData.length > 0 && (
                  <div className="glass-card p-6">
                    <p className="title-md mb-1">Health Score (90d)</p>
                    <p className="text-xs text-[var(--text-3)] mb-5">
                      Rolling percentile rank vs own 60-day history. 100 = historically strongest, 0 = weakest.
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={healthChartData}>
                        <defs>
                          <linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#E8572A" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#E8572A" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip {...ct.tooltip} />
                        <Area type="monotone" dataKey="health_score" stroke="#E8572A" strokeWidth={2.5} fill="url(#hGrad)" dot={false} name="Health Score" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* ── Returns + Z-scores chart ─────────────────────────────── */}
                {returnsChartData.length > 0 && (
                  <div className="card p-6">
                    <p className="title-md mb-1">Returns & Z-Scores (90d)</p>
                    <p className="text-xs text-[var(--text-3)] mb-5">
                      Daily return %, momentum z-score, and return z-score over the last 90 trading days.
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={returnsChartData}>
                        <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={32} />
                        <Tooltip {...ct.tooltip} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="daily_return" stroke="#E8572A" dot={false} name="Return %" strokeWidth={2} />
                        <Line type="monotone" dataKey="momentum_z"   stroke="#3B82F6" dot={false} name="Momentum Z" strokeWidth={1.5} />
                        <Line type="monotone" dataKey="ret_z"        stroke="#10B981" dot={false} name="Ret Z" strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* ── Signal distribution ──────────────────────────────────── */}
                {signalDist.some(d => d.count > 0) && (
                  <div className="card p-6">
                    <p className="title-md mb-1">Signal Distribution (90d)</p>
                    <p className="text-xs text-[var(--text-3)] mb-5">
                      How many days each signal was active over the last 90 trading days.
                    </p>
                    <div className="grid grid-cols-4 gap-3">
                      {signalDist.map(({ signal, count }) => {
                        const pct = healthHistory.length ? Math.round((count / healthHistory.length) * 100) : 0;
                        return (
                          <div key={signal} className="text-center p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl">
                            <SignalBadge value={signal} />
                            <p className="text-xl font-bold tabular-nums text-[var(--text)] mt-2">{count}</p>
                            <p className="text-[10px] text-[var(--text-3)] mt-0.5">{pct}% of days</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Signal log table ─────────────────────────────────────── */}
                {healthHistory.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="px-5 py-4 border-b border-[var(--border)]">
                      <p className="title-md">Health Signal Log</p>
                      <p className="text-xs text-[var(--text-3)] mt-1">Daily signals, regime, and z-score components.</p>
                    </div>
                    <div className="overflow-x-auto max-h-72 overflow-y-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] z-10">
                          <tr>
                            {["Date","Signal","Regime","Phase","Health","Composite","Ret Z","Vol Z","Spikes"].map(h => (
                              <th key={h} className="th-base">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...healthHistory].reverse().map(r => (
                            <tr key={r.id} className="tr-base">
                              <td className="td-base"><span className="text-[11px] font-mono text-[var(--text-3)]">{r.date}</span></td>
                              <td className="td-base"><SignalBadge value={r.signal} /></td>
                              <td className="td-base"><SignalBadge value={r.regime} /></td>
                              <td className="td-base"><span className="text-[10px] text-[var(--text-3)]">{r.market_phase || "—"}</span></td>
                              <td className="td-base"><span className="text-sm font-bold tabular-nums text-[var(--text)]">{r.health_score?.toFixed(1)}</span></td>
                              <td className="td-base"><span className="text-sm font-mono tabular-nums text-[var(--text-2)]">{r.composite?.toFixed(2)}</span></td>
                              <td className="td-base"><span className="text-sm font-mono tabular-nums text-[var(--text-2)]">{r.ret_z?.toFixed(2)}</span></td>
                              <td className="td-base"><span className="text-sm font-mono tabular-nums text-[var(--text-2)]">{r.vol_z?.toFixed(2)}</span></td>
                              <td className="td-base">
                                <div className="flex gap-1">
                                  {r.spike_up   && <span className="badge-green">↑</span>}
                                  {r.spike_down && <span className="badge-red">↓</span>}
                                  {!r.spike_up && !r.spike_down && <span className="text-[var(--text-3)]">—</span>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!healthHistory.length && !metricsHistory.length && (
                  <EmptyState title="No historical data" sub="Run the pipeline to populate sector history." />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
