import React, { useState } from "react";
import { Brain, AlertTriangle, CheckCircle, Eye, Search, ShieldAlert } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, CartesianGrid
} from "recharts";
import AppLayout from "../components/layout/AppLayout";
import KPICard from "../components/ui/KPICard";
import StatusBadge from "../components/ui/StatusBadge";
import ScoreBar from "../components/ui/ScoreBar";
import LoadingSpinner, { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import SectionHeader from "../components/ui/SectionHeader";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { Link } from "react-router-dom";

// Score range → bar color
const RANGE_COLORS = [
  "#EF4444","#F97316","#F59E0B","#84CC16","#22C55E",
  "#22C55E","#84CC16","#F59E0B","#F97316","#EF4444",
];

function CustomTooltip({ active, payload, label, ct }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={ct.tooltip.contentStyle}>
      <p className="text-xs font-medium mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-xs font-semibold tabular-nums" style={{ color: p.fill || p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function RiskEngine() {
  const { latestMl, portfolioStats, companies, loading } = useAppData();
  const ct = useChartTheme();
  const [sort, setSort]     = useState("score_asc");
  const [search, setSearch] = useState("");

  const compMap = React.useMemo(() => {
    const m = {};
    companies.forEach(c => { m[c.id] = c; });
    return m;
  }, [companies]);

  const sorted = React.useMemo(() => {
    let data = latestMl.filter(r => {
      const c = compMap[r.company_id];
      return !search || c?.name?.toLowerCase().includes(search.toLowerCase());
    });
    if (sort === "score_asc")  data = [...data].sort((a, b) => (a.survival_score || 0) - (b.survival_score || 0));
    if (sort === "score_desc") data = [...data].sort((a, b) => (b.survival_score || 0) - (a.survival_score || 0));
    if (sort === "distress")   data = [...data].sort((a, b) => (b.distress_probability || 0) - (a.distress_probability || 0));
    return data;
  }, [latestMl, sort, search, compMap]);

  // Score distribution — 10 buckets of 10
  const buckets = Array.from({ length: 10 }, (_, i) => {
    const lo = i * 10, hi = lo + 10;
    return {
      label: `${lo}–${hi}`,
      count: latestMl.filter(r => r.survival_score >= lo && r.survival_score < hi).length,
      fill:  RANGE_COLORS[i],
    };
  });

  // Pie data
  const pieData = [
    { name: "Healthy",  value: portfolioStats.healthy,  fill: ct.green },
    { name: "Watch",    value: portfolioStats.watch,     fill: ct.amber },
    { name: "Distress", value: portfolioStats.distress,  fill: ct.red   },
  ].filter(d => d.value > 0);

  const avgScore = portfolioStats.avgSurvival;

  if (loading) return <AppLayout title="Risk Engine"><PageSkeleton /></AppLayout>;

  return (
    <AppLayout title="Risk Engine · ML Predictions">
      <div className="grid grid-cols-12 gap-4">

        {/* KPI row */}
        <div className="col-span-3 card-dark rounded-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={16} className="text-yellow-400" />
            <p className="label-caps text-neutral-400">Scored</p>
          </div>
          <p className="number-display tabular-nums text-yellow-400">{latestMl.length}</p>
        </div>
        <div className="col-span-3">
          <KPICard label="Healthy ≥ 70" value={portfolioStats.healthy} icon={CheckCircle} variant="healthy" />
        </div>
        <div className="col-span-3">
          <KPICard label="Watch 40–70" value={portfolioStats.watch} icon={Eye} variant="watch" />
        </div>
        <div className="col-span-3">
          <KPICard label="Distress < 40" value={portfolioStats.distress} icon={AlertTriangle} variant="distress" />
        </div>

        {/* Score distribution */}
        <div className="col-span-8 card p-5">
          <SectionHeader title="Score Distribution" subtitle="Company count per 10-point survival score bucket" />
          {buckets.some(b => b.count > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={buckets}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={24} />
                <Tooltip content={<CustomTooltip ct={ct} />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32} name="Companies">
                  {buckets.map((b, i) => <Cell key={i} fill={b.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No ML data" subtitle="Run the pipeline to generate survival scores." />}
        </div>

        {/* Donut */}
        <div className="col-span-4 card p-5">
          <SectionHeader title="Portfolio Health" />
          {pieData.length ? (
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip ct={ct} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{avgScore}</span>
                <span className="text-xs text-neutral-400">avg score</span>
              </div>
            </div>
          ) : <EmptyState title="No data" />}
        </div>

        {/* Rankings table */}
        <div className="col-span-12 card p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <SectionHeader title="Company Risk Rankings" />
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="input-base pl-7 py-1.5 text-xs w-36" />
              </div>
              {[
                { key: "score_asc",  label: "Worst First" },
                { key: "score_desc", label: "Best First"  },
                { key: "distress",   label: "High Distress" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors duration-100 ${
                    sort === key
                      ? "bg-neutral-900 dark:bg-yellow-400 text-white dark:text-neutral-900"
                      : "border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {sorted.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    {["Company", "Ticker", "Survival Score", "Distress %", "Status", "Date", ""].map(h => (
                      <th key={h} className="th-base">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => {
                    const c = compMap[r.company_id];
                    const s = r.survival_score;
                    const status = s == null ? "gray" : s >= 70 ? "healthy" : s >= 40 ? "watch" : "distress";
                    return (
                      <tr key={r.id} className="tr-base">
                        <td className="td-base text-sm font-medium text-neutral-900 dark:text-neutral-100">{c?.name || "—"}</td>
                        <td className="td-base text-xs font-mono text-neutral-500">{c?.ticker || "—"}</td>
                        <td className="td-base"><ScoreBar score={s} /></td>
                        <td className="td-base">
                          <span className={`text-xs font-semibold tabular-nums ${(r.distress_probability || 0) > 60 ? "text-red-600 dark:text-red-400" : "text-neutral-500"}`}>
                            {r.distress_probability?.toFixed(1)}%
                          </span>
                        </td>
                        <td className="td-base"><StatusBadge status={status} /></td>
                        <td className="td-base text-xs text-neutral-400">{r.date}</td>
                        <td className="td-base">
                          <Link to={`/companies/${r.company_id}`} className="text-xs font-medium text-neutral-500 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">
                            Details →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyState icon={ShieldAlert} title="No ML predictions" subtitle="Run the ML pipeline to generate survival scores." />}
        </div>

      </div>
    </AppLayout>
  );
}
