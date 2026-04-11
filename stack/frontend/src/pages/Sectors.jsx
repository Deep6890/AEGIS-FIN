import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import LiveMarketBar from "../components/ui/LiveMarketBar";
import { useAppData } from "../context/AppDataContext";
import { fetchSectorHealthHistory, fetchSectorMetricsHistory } from "../lib/api";

export default function Sectors() {
  const { sectors, latestSectorHealth, loading } = useAppData();
  const [selected, setSelected] = useState(null);
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

  if (loading) return <PageLayout title="Sectors"><LoadingSpinner /></PageLayout>;

  return (
    <PageLayout title="Sectors">
      <div className="space-y-4">
        {/* Live Market Bar */}
        <LiveMarketBar />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Sector List */}
          <div className="space-y-2">
          <p className="stat-label mb-3">All Sectors ({sectors.length})</p>
          {sectors.length ? sectors.map(s => {
            const h = healthMap[s.id];
            const isSelected = selected === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "border-orange-300 bg-orange-50"
                    : "border-gray-100 bg-white hover:border-orange-200 hover:bg-orange-50/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{s.ticker}</p>
                  </div>
                  {h ? <SignalBadge value={h.signal} /> : <span className="badge-gray">No data</span>}
                </div>
                {h && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(100, h.health_score || 0)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{h.health_score?.toFixed(1)}</span>
                  </div>
                )}
              </button>
            );
          }) : <EmptyState title="No sectors" />}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="card p-10 flex items-center justify-center">
              <p className="text-sm text-gray-400">Select a sector to view details</p>
            </div>
          ) : detailLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              {/* Header */}
              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{selectedSector?.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{selectedSector?.ticker}</p>
                  </div>
                  {healthMap[selected] && (
                    <div className="text-right space-y-1">
                      <SignalBadge value={healthMap[selected].signal} />
                      <div><SignalBadge value={healthMap[selected].regime} /></div>
                    </div>
                  )}
                </div>
                {healthMap[selected] && (
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    {[
                      ["Health Score", healthMap[selected].health_score?.toFixed(1)],
                      ["Composite",    healthMap[selected].composite?.toFixed(2)],
                      ["Ret Z",        healthMap[selected].ret_z?.toFixed(2)],
                      ["Vol Z",        healthMap[selected].vol_z?.toFixed(2)],
                    ].map(([l, v]) => (
                      <div key={l} className="bg-gray-50 rounded-xl p-3">
                        <p className="stat-label">{l}</p>
                        <p className="text-base font-bold text-gray-900 mt-1">{v ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Health Score Chart */}
              {healthHistory.length > 0 && (
                <div className="card p-5">
                  <p className="section-title mb-4">Health Score (90d)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={healthHistory}>
                      <defs>
                        <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#f97316" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="health_score" stroke="#f97316" strokeWidth={2} fill="url(#healthGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Metrics Chart */}
              {metricsHistory.length > 0 && (
                <div className="card p-5">
                  <p className="section-title mb-4">Sector Returns (90d)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={metricsHistory}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="sector_return_1d"  stroke="#f97316" dot={false} name="Return 1d"  strokeWidth={1.5} />
                      <Line type="monotone" dataKey="sector_return_5d"  stroke="#6366f1" dot={false} name="Return 5d"  strokeWidth={1.5} />
                      <Line type="monotone" dataKey="sector_momentum"   stroke="#10b981" dot={false} name="Momentum"   strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Health History Table */}
              {healthHistory.length > 0 && (
                <div className="card p-5">
                  <p className="section-title mb-3">Health Signal Log</p>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b border-gray-100">
                          {["Date","Signal","Regime","Health","Composite","Spike Up","Spike Down"].map(h => (
                            <th key={h} className="text-left py-2 px-3 stat-label">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...healthHistory].reverse().map(r => (
                          <tr key={r.id} className="border-b border-gray-50 hover:bg-orange-50/20">
                            <td className="py-2 px-3 text-xs text-gray-600">{r.date}</td>
                            <td className="py-2 px-3"><SignalBadge value={r.signal} /></td>
                            <td className="py-2 px-3"><SignalBadge value={r.regime} /></td>
                            <td className="py-2 px-3 text-xs">{r.health_score?.toFixed(1)}</td>
                            <td className="py-2 px-3 text-xs">{r.composite?.toFixed(2)}</td>
                            <td className="py-2 px-3">{r.spike_up   ? <span className="badge-green">↑</span> : "—"}</td>
                            <td className="py-2 px-3">{r.spike_down ? <span className="badge-red">↓</span>  : "—"}</td>
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
