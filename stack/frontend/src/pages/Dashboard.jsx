import React, { useEffect, useState } from "react";
import {
  Building2, TrendingUp, ShieldAlert, Activity,
  AlertTriangle, CheckCircle, Eye, Zap, BarChart2, Globe
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import StatCard from "../components/ui/StatCard";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { fetchMacroOverlay, fetchLatestSectorMetrics } from "../lib/api";

const SIGNAL_COLOR = { STRONG: "#10b981", NEUTRAL: "#6b7280", WATCH: "#f59e0b", WEAK: "#ef4444" };
const REGIME_COLOR = { RISK_OFF: "#ef4444", RISK_ON: "#10b981", NEUTRAL: "#f59e0b" };

export default function Dashboard() {
  const { companies, latestSectorHealth, macro, portfolioStats, loading } = useAppData();
  const [macroHistory, setMacroHistory] = useState([]);
  const [sectorMetrics, setSectorMetrics] = useState([]);

  useEffect(() => {
    fetchMacroOverlay(60).then(r => setMacroHistory(r.data || []));
    fetchLatestSectorMetrics().then(r => setSectorMetrics(r.data || []));
  }, []);

  // Deduplicate sector metrics to latest per sector
  const latestMetrics = React.useMemo(() => {
    const seen = new Map();
    for (const row of sectorMetrics) {
      if (!seen.has(row.sector_id)) seen.set(row.sector_id, row);
    }
    return Array.from(seen.values());
  }, [sectorMetrics]);

  // Sector health signal distribution
  const signalDist = React.useMemo(() => {
    const counts = { STRONG: 0, NEUTRAL: 0, WATCH: 0, WEAK: 0 };
    latestSectorHealth.forEach(s => { if (counts[s.signal] !== undefined) counts[s.signal]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [latestSectorHealth]);

  // Macro score chart
  const macroChartData = macroHistory.slice(-30).map(r => ({
    date: r.date?.slice(5),
    score: r.macro_score?.toFixed(2),
    vix: r.vix_z?.toFixed(2),
  }));

  // Sector return bar chart
  const sectorReturnData = latestMetrics
    .filter(r => r.sector_return_1d != null)
    .map(r => ({ name: r.sectors?.name?.replace(" Sector", "").replace(" Nifty", ""), ret: +(r.sector_return_1d * 100).toFixed(2) }))
    .sort((a, b) => b.ret - a.ret);

  if (loading) return <PageLayout title="Dashboard"><LoadingSpinner /></PageLayout>;

  return (
    <PageLayout title="Dashboard">
      <div className="space-y-6">

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Building2}    label="Total Companies"   value={portfolioStats.total}          color="orange"  />
          <StatCard icon={CheckCircle}  label="Healthy (≥70)"     value={portfolioStats.healthy}         color="emerald" />
          <StatCard icon={Eye}          label="Watch Zone"         value={portfolioStats.watch}           color="amber"   />
          <StatCard icon={AlertTriangle} label="Distress (<40)"   value={portfolioStats.distress}        color="red"     />
        </div>

        {/* Second KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Activity}  label="Avg Survival Score"  value={`${portfolioStats.avgSurvival}`} sub="out of 100"  color="orange" />
          <StatCard icon={TrendingUp} label="Sectors Tracked"    value={latestSectorHealth.length}       color="blue"   />
          <StatCard icon={Globe}     label="Macro Regime"        value={macro?.macro_regime?.replace("_"," ") || "—"} color={macro?.macro_regime === "RISK_ON" ? "emerald" : macro?.macro_regime === "RISK_OFF" ? "red" : "amber"} />
          <StatCard icon={Zap}       label="Macro Score"         value={macro?.macro_score?.toFixed(2) || "—"} sub="composite z-score" color="orange" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Macro Score History */}
          <div className="card p-5">
            <p className="section-title mb-4">Macro Score (30d)</p>
            {macroChartData.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={macroChartData}>
                  <defs>
                    <linearGradient id="macroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f97316" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #f3f4f6" }} />
                  <Area type="monotone" dataKey="score" stroke="#f97316" strokeWidth={2} fill="url(#macroGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No macro data" sub="Run the pipeline to populate macro overlay." />}
          </div>

          {/* Sector 1d Returns */}
          <div className="card p-5">
            <p className="section-title mb-4">Sector 1-Day Returns (%)</p>
            {sectorReturnData.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={sectorReturnData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={v => [`${v}%`]} />
                  <Bar dataKey="ret" radius={[0, 4, 4, 0]}>
                    {sectorReturnData.map((entry, i) => (
                      <Cell key={i} fill={entry.ret >= 0 ? "#10b981" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No sector data" sub="Run the pipeline to populate sector metrics." />}
          </div>
        </div>

        {/* Sector Health Table */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title">Sector Health Monitor</p>
            {latestSectorHealth.some(r => r.signal === "INSUFFICIENT_DATA") && (
              <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                ⏳ Some sectors need more pipeline runs to compute scores
              </span>
            )}
          </div>
          {latestSectorHealth.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Sector","Signal","Regime","Health Score","Trend","Composite","Spike Up","Spike Down"].map(h => (
                      <th key={h} className="text-left py-2 px-3 stat-label">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {latestSectorHealth.map(row => (
                    <tr key={row.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-gray-900">{row.sectors?.name || `Sector ${row.sector_id}`}</td>
                      <td className="py-2.5 px-3"><SignalBadge value={row.signal} /></td>
                      <td className="py-2.5 px-3"><SignalBadge value={row.regime} /></td>
                      <td className="py-2.5 px-3">
                        {row.health_score != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(100, row.health_score)}%` }} />
                            </div>
                            <span className="text-xs text-gray-600">{row.health_score.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">needs more data</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-600">{row.trend || "—"}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-600">{row.composite != null ? row.composite.toFixed(2) : "—"}</td>
                      <td className="py-2.5 px-3">{row.spike_up  ? <span className="badge-green">Yes</span> : <span className="badge-gray">No</span>}</td>
                      <td className="py-2.5 px-3">{row.spike_down ? <span className="badge-red">Yes</span>  : <span className="badge-gray">No</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No sector health data" />}
        </div>

        {/* Signal Distribution */}
        {signalDist.some(d => d.value > 0) && (
          <div className="grid grid-cols-4 gap-3">
            {signalDist.map(({ name, value }) => (
              <div key={name} className="card p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: SIGNAL_COLOR[name] }}>{value}</p>
                <p className="text-xs text-gray-500 mt-1">{name}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </PageLayout>
  );
}
