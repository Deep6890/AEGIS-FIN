import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, CartesianGrid
} from "recharts";
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
  const [selected, setSelected]           = useState(null);
  const [healthHistory, setHealthHistory] = useState([]);
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const selectedSector = sectors.find(s => s.id === selected);

  if (loading) return <PageLayout title="Sectors"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Sectors">
      <div className="space-y-4">
        <LiveMarketBar />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Sector list */}
          <div>
            <p className="label-caps mb-3">All Sectors ({sectors.length})</p>
            <div className="space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {sectors.length ? sectors.map(s => {
                const h = healthMap[s.id];
                const isSelected = selected === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? "border-brand-orange bg-brand-orange/5"
                        : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-brand-orange/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{s.name}</p>
                        <p className="text-[10px] font-mono text-neutral-400 mt-0.5">{s.yf_ticker}</p>
                      </div>
                      {h ? <SignalBadge value={h.signal} /> : <span className="badge-gray">No data</span>}
                    </div>
                    {h && (
                      <div className="flex items-center gap-2">
                        <div className="progress-track flex-1">
                          <div className="progress-fill bg-brand-orange" style={{ width: `${Math.min(100, h.health_score || 0)}%` }} />
                        </div>
                        <span className="text-[10px] font-semibold tabular-nums text-neutral-500">{h.health_score?.toFixed(1)}</span>
                      </div>
                    )}
                  </button>
                );
              }) : <EmptyState title="No sectors" />}
            </div>
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2 space-y-4">
            {!selected ? (
              <div className="card p-16 flex items-center justify-center">
                <p className="text-sm text-neutral-400">Select a sector to view details</p>
              </div>
            ) : detailLoading ? <LoadingSpinner /> : (
              <>
                {/* Header */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{selectedSector?.name}</p>
                      <p className="text-xs font-mono text-neutral-400 mt-0.5">{selectedSector?.yf_ticker}</p>
                    </div>
                    {healthMap[selected] && (
                      <div className="text-right space-y-1">
                        <SignalBadge value={healthMap[selected].signal} />
                        <div><SignalBadge value={healthMap[selected].regime} /></div>
                      </div>
                    )}
                  </div>
                  {healthMap[selected] && (
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        ["Health Score", healthMap[selected].health_score?.toFixed(1)],
                        ["Composite",    healthMap[selected].composite?.toFixed(2)],
                        ["Ret Z",        healthMap[selected].ret_z?.toFixed(2)],
                        ["Vol Z",        healthMap[selected].vol_z?.toFixed(2)],
                      ].map(([l, v]) => (
                        <div key={l} className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3">
                          <p className="label-caps mb-1">{l}</p>
                          <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">{v ?? "—"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {healthHistory.length > 0 && (
                  <div className="card p-5">
                    <p className="title-md mb-4">Health Score (90d)</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={healthHistory}>
                        <defs>
                          <linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={ct.orange} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={ct.orange} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip {...ct.tooltip} />
                        <Area type="monotone" dataKey="health_score" stroke={ct.orange} strokeWidth={2} fill="url(#hGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {metricsHistory.length > 0 && (
                  <div className="card p-5">
                    <p className="title-md mb-4">Sector Returns (90d)</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={metricsHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip {...ct.tooltip} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="sector_return_1d" stroke={ct.orange} dot={false} name="Return 1d" strokeWidth={1.5} />
                        <Line type="monotone" dataKey="sector_return_5d" stroke={ct.blue}   dot={false} name="Return 5d" strokeWidth={1.5} />
                        <Line type="monotone" dataKey="sector_momentum"  stroke={ct.green}  dot={false} name="Momentum"  strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {healthHistory.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="p-5 pb-0">
                      <p className="title-md mb-3">Health Signal Log</p>
                    </div>
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-white dark:bg-neutral-900">
                          <tr className="border-b border-neutral-100 dark:border-neutral-800">
                            {["Date","Signal","Regime","Health","Composite","↑","↓"].map(h => (
                              <th key={h} className="th-base">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...healthHistory].reverse().map(r => (
                            <tr key={r.id} className="tr-base">
                              <td className="td-base text-xs text-neutral-500">{r.date}</td>
                              <td className="td-base"><SignalBadge value={r.signal} /></td>
                              <td className="td-base"><SignalBadge value={r.regime} /></td>
                              <td className="td-base text-xs font-semibold tabular-nums">{r.health_score?.toFixed(1)}</td>
                              <td className="td-base text-xs font-mono tabular-nums">{r.composite?.toFixed(2)}</td>
                              <td className="td-base">{r.spike_up   ? <span className="badge-green">↑</span> : "—"}</td>
                              <td className="td-base">{r.spike_down ? <span className="badge-red">↓</span>  : "—"}</td>
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
