import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid } from "recharts";
import { TrendingUp, Activity, PieChart } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner, { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import LiveMarketBar from "../components/ui/LiveMarketBar";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchSectorHealthHistory, fetchSectorMetricsHistory } from "../lib/api";

export default function Sectors() {
  const { sectors, latestSectorHealth, loading } = useAppData();
  const ct = useChartTheme();
  const [selected, setSelected] = useState(null);
  const [healthHistory, setHealthHistory] = useState([]);
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setDetailLoading(true);
    Promise.all([fetchSectorHealthHistory(selected, 90), fetchSectorMetricsHistory(selected, 90)])
      .then(([h, m]) => { setHealthHistory(h.data || []); setMetricsHistory(m.data || []); })
      .finally(() => setDetailLoading(false));
  }, [selected]);

  const healthMap = React.useMemo(() => { const m = {}; latestSectorHealth.forEach(r => { m[r.sector_id] = r; }); return m; }, [latestSectorHealth]);
  const selectedSector = sectors.find(s => s.id === selected);

  if (loading) return <PageLayout title="Sectors"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Sectors">
      <div className="space-y-8 pb-12">
        <div className="animate-fade-in">
          <h1 className="page-heading">Sector Intelligence</h1>
          <p className="page-subheading">Analyze sector health, z-scores, and performance trends over a 90-day window.</p>
        </div>

        <LiveMarketBar />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Sector Cards - Left Col */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="title-md">All Sectors</p>
              <span className="badge-gray">{sectors.length} tracked</span>
            </div>
            <div className="space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto pr-2">
              {sectors.length ? sectors.map(s => {
                const h = healthMap[s.id]; const pct = h ? Math.min(100, h.health_score || 0) : 0;
                const barColor = pct >= 70 ? "bg-[#00B341]" : pct >= 40 ? "bg-[#FFC224]" : "bg-[#FF3B30]";
                return (
                  <button key={s.id} onClick={() => setSelected(s.id)}
                    className={`w-full text-left p-5 rounded-2xl transition-all duration-300 border ${
                      selected === s.id ? "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-sm" : "bg-neutral-900/[0.03] dark:bg-neutral-900/[0.02] dark:bg-white/[0.02] border-transparent hover:bg-neutral-900/[0.06] dark:hover:bg-neutral-900/[0.05] dark:bg-white/[0.05]"
                    }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{s.name}</p>
                        <p className="text-[10px] font-mono text-neutral-500 mt-1 uppercase">{s.yf_ticker}</p>
                      </div>
                      {h ? <SignalBadge value={h.signal} /> : <span className="badge-gray">—</span>}
                    </div>
                    {h && (
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-1.5 bg-neutral-900/[0.05] dark:bg-neutral-900/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-sm font-bold tabular-nums ${pct >= 70 ? "text-[#00B341]" : pct >= 40 ? "text-[#FFC224]" : "text-[#FF3B30]"}`}>{h.health_score?.toFixed(0)}</span>
                      </div>
                    )}
                  </button>
                );
              }) : <EmptyState title="No sectors" />}
            </div>
          </div>

          {/* Detail - Right Col */}
          <div className="lg:col-span-8 space-y-6">
            {!selected ? (
              <div className="card-dark flex flex-col items-center justify-center text-center p-16 h-[calc(100vh-260px)] min-h-[500px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-orange/15 to-transparent blur-[100px] pointer-events-none" />
                <div className="w-24 h-24 rounded-3xl bg-neutral-900/[0.04] dark:bg-white/[0.04] border border-neutral-900/[0.08] dark:border-white/[0.08] flex items-center justify-center mb-6 animate-float">
                  <PieChart size={40} className="text-neutral-900 dark:text-white opacity-80" />
                </div>
                <h3 className="value-lg text-neutral-900 dark:text-white mb-3">Sector Deep Dive</h3>
                <p className="text-base text-neutral-400 max-w-sm leading-relaxed">Select a sector to view historical health scores, price action, and signals.</p>
              </div>
            ) : detailLoading ? <div className="h-[500px] flex items-center justify-center"><LoadingSpinner /></div> : (
              <>
                {/* Header */}
                <div className="card-dark relative overflow-hidden p-8">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-brand-orange/15 blur-[100px] pointer-events-none" />
                  <div className="relative flex items-center justify-between mb-8">
                    <div>
                      <p className="value-lg text-neutral-900 dark:text-white mb-1">{selectedSector?.name}</p>
                      <p className="text-xs font-mono font-semibold text-neutral-500 uppercase tracking-widest">{selectedSector?.yf_ticker}</p>
                    </div>
                    {healthMap[selected] && <div className="flex gap-3"><SignalBadge value={healthMap[selected].signal} /><SignalBadge value={healthMap[selected].regime} /></div>}
                  </div>
                  {healthMap[selected] && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[["Health", healthMap[selected].health_score?.toFixed(1), "text-brand-orange"], ["Composite", healthMap[selected].composite?.toFixed(2), "text-blue-400"], ["Ret Z", healthMap[selected].ret_z?.toFixed(2), healthMap[selected].ret_z >= 0 ? "text-emerald-400" : "text-red-400"], ["Vol Z", healthMap[selected].vol_z?.toFixed(2), healthMap[selected].vol_z <= 0 ? "text-emerald-400" : "text-red-400"]].map(([l, v, c]) => (
                        <div key={l} className="bg-neutral-900/[0.04] dark:bg-white/[0.04] border border-neutral-900/[0.06] dark:border-white/[0.06] rounded-2xl p-4">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">{l}</p>
                          <p className={`text-2xl font-bold tabular-nums tracking-tight ${c}`}>{v ?? "—"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {healthHistory.length > 0 && (
                    <div className="card-glass p-8">
                      <p className="title-md mb-6">Health Score (90d)</p>
                      <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={healthHistory}>
                          <defs><linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={ct.orange} stopOpacity={0.25} /><stop offset="95%" stopColor={ct.orange} stopOpacity={0} /></linearGradient></defs>
                          <CartesianGrid strokeDasharray="2 6" stroke={ct.grid} vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} width={28} />
                          <Tooltip {...ct.tooltip} />
                          <Area type="monotone" dataKey="health_score" stroke={ct.orange} strokeWidth={2.5} fill="url(#hGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {metricsHistory.length > 0 && (
                    <div className="card-glass p-8">
                      <p className="title-md mb-6">Sector Returns (90d)</p>
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={metricsHistory}>
                          <CartesianGrid strokeDasharray="2 6" stroke={ct.grid} vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} width={28} />
                          <Tooltip {...ct.tooltip} />
                          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} />
                          <Line type="monotone" dataKey="daily_return" stroke={ct.orange} dot={false} name="Daily Return" strokeWidth={2.5} />
                          <Line type="monotone" dataKey="momentum_z" stroke="#00B341" dot={false} name="Momentum Z" strokeWidth={2.5} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {healthHistory.length > 0 && (
                    <div className="card-glass overflow-hidden">
                      <div className="px-6 py-5 border-b border-neutral-900/[0.08] dark:border-neutral-900/[0.08] dark:border-white/[0.08] bg-neutral-900/[0.02] dark:bg-white/[0.01]">
                        <p className="title-md">Health Signal Log</p>
                      </div>
                      <div className="overflow-x-auto max-h-64 overflow-y-auto">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-[#f0f0f0]/90 dark:bg-[#080808]/90 backdrop-blur-xl border-b border-neutral-900/[0.05] dark:border-neutral-900/[0.05] dark:border-white/[0.05] z-10">
                            <tr>{["Date","Signal","Regime","Health","Composite","Spikes"].map(h => <th key={h} className="th-base">{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {[...healthHistory].reverse().map(r => (
                              <tr key={r.id} className="tr-base">
                                <td className="td-base"><span className="text-[11px] font-mono text-neutral-500">{r.date}</span></td>
                                <td className="td-base"><SignalBadge value={r.signal} /></td>
                                <td className="td-base"><SignalBadge value={r.regime} /></td>
                                <td className="td-base"><span className="text-sm font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{r.health_score?.toFixed(1)}</span></td>
                                <td className="td-base"><span className="text-sm font-mono tabular-nums text-neutral-500">{r.composite?.toFixed(2)}</span></td>
                                <td className="td-base">
                                  <div className="flex gap-2">
                                    {r.spike_up && <span className="badge-green">↑</span>}
                                    {r.spike_down && <span className="badge-red">↓</span>}
                                    {!r.spike_up && !r.spike_down && <span className="text-neutral-400">—</span>}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {!healthHistory.length && !metricsHistory.length && <EmptyState title="No historical data" sub="Run the pipeline." />}
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
