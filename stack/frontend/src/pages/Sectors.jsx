import React, { useEffect, useState, useMemo } from "react";
import { Layers, TrendingUp } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, CartesianGrid
} from "recharts";
import AppLayout from "../components/layout/AppLayout";
import StatusBadge from "../components/ui/StatusBadge";
import ScoreBar from "../components/ui/ScoreBar";
import LoadingSpinner, { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import SectionHeader from "../components/ui/SectionHeader";
import LiveMarketBar from "../components/ui/LiveMarketBar";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchSectorHealthHistory, fetchSectorMetricsHistory } from "../lib/api";

function ChartTooltip({ active, payload, label, ct }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={ct.tooltip.contentStyle}>
      <p className="text-xs font-medium mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-semibold tabular-nums">{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

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

  const healthMap = useMemo(() => {
    const m = {};
    latestSectorHealth.forEach(r => { m[r.sector_id] = r; });
    return m;
  }, [latestSectorHealth]);

  const selectedSector = sectors.find(s => s.id === selected);
  const selectedHealth = healthMap[selected];

  if (loading) return <AppLayout title="Sectors"><PageSkeleton /></AppLayout>;

  return (
    <AppLayout title="Sectors">
      <div className="grid grid-cols-12 gap-4">

        <LiveMarketBar />

        {/* Left — sector list */}
        <div className="col-span-4 space-y-2">
          <p className="label-caps mb-3">All Sectors ({sectors.length})</p>
          {sectors.length ? sectors.map(s => {
            const h = healthMap[s.id];
            const isSelected = selected === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={`w-full text-left p-4 rounded-card border-2 transition-all duration-150 ${
                  isSelected
                    ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-surface-card hover:border-neutral-400 dark:hover:border-neutral-600"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{s.name}</p>
                    <p className="text-xs font-mono text-neutral-400 mt-0.5">{s.yf_ticker}</p>
                  </div>
                  {h ? <StatusBadge status={h.signal} /> : <span className="badge-gray">No data</span>}
                </div>
                {h && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${h.health_score >= 70 ? "bar-healthy" : h.health_score >= 40 ? "bar-watch" : "bar-distress"}`}
                        style={{ width: `${Math.min(100, h.health_score || 0)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-neutral-500 tabular-nums">{h.health_score?.toFixed(1)}</span>
                  </div>
                )}
              </button>
            );
          }) : <EmptyState icon={Layers} title="No sectors" subtitle="Sectors will appear after the pipeline runs." />}
        </div>

        {/* Right — detail */}
        <div className="col-span-8 space-y-4">
          {!selected ? (
            <div className="card p-16 flex flex-col items-center justify-center gap-3">
              <Layers size={32} className="text-neutral-300 dark:text-neutral-600" />
              <p className="text-sm text-neutral-400">Select a sector to view details</p>
            </div>
          ) : detailLoading ? <LoadingSpinner /> : (
            <>
              {/* Header card */}
              <div className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{selectedSector?.name}</h2>
                    <p className="text-xs font-mono text-neutral-400 mt-0.5">{selectedSector?.yf_ticker}</p>
                  </div>
                  {selectedHealth && (
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={selectedHealth.signal} />
                      <StatusBadge status={selectedHealth.regime} />
                    </div>
                  )}
                </div>
                {selectedHealth && (
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      ["Health Score", selectedHealth.health_score?.toFixed(1)],
                      ["Composite",    selectedHealth.composite?.toFixed(3)],
                      ["Ret Z",        selectedHealth.ret_z?.toFixed(3)],
                      ["Vol Z",        selectedHealth.vol_z?.toFixed(3)],
                    ].map(([l, v]) => (
                      <div key={l} className="bg-neutral-50 dark:bg-neutral-900 rounded-card p-3 border border-neutral-100 dark:border-neutral-800">
                        <p className="label-caps mb-1">{l}</p>
                        <p className="text-base font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{v ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Health score chart */}
              {healthHistory.length > 0 && (
                <div className="card p-5">
                  <SectionHeader title="Health Score (90d)" />
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={healthHistory}>
                      <defs>
                        <linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={ct.yellow} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={ct.yellow} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                      <Tooltip content={<ChartTooltip ct={ct} />} />
                      <Area type="monotone" dataKey="health_score" stroke={ct.yellow} strokeWidth={2} fill="url(#hGrad)" dot={false} name="Health" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Returns chart */}
              {metricsHistory.length > 0 && (
                <div className="card p-5">
                  <SectionHeader title="Sector Returns (90d)" />
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={metricsHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                      <Tooltip content={<ChartTooltip ct={ct} />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="sector_return_1d" stroke={ct.yellow} dot={false} name="Return 1d" strokeWidth={1.5} />
                      <Line type="monotone" dataKey="sector_return_5d" stroke={ct.blue}   dot={false} name="Return 5d" strokeWidth={1.5} />
                      <Line type="monotone" dataKey="sector_momentum"  stroke={ct.green}  dot={false} name="Momentum"  strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Signal log */}
              {healthHistory.length > 0 && (
                <div className="card p-5">
                  <SectionHeader title="Health Signal Log" />
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-white dark:bg-surface-card">
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
                            <td className="td-base"><StatusBadge status={r.signal} /></td>
                            <td className="td-base"><StatusBadge status={r.regime} /></td>
                            <td className="td-base text-xs tabular-nums">{r.health_score?.toFixed(1)}</td>
                            <td className="td-base text-xs font-mono tabular-nums">{r.composite?.toFixed(3)}</td>
                            <td className="td-base">{r.spike_up   ? <span className="badge-green text-[10px]">↑</span> : "—"}</td>
                            <td className="td-base">{r.spike_down ? <span className="badge-red text-[10px]">↓</span>  : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!healthHistory.length && !metricsHistory.length && (
                <EmptyState icon={TrendingUp} title="No historical data" subtitle="Run the pipeline to populate sector history." />
              )}
            </>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
