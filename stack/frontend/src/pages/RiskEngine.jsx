import React, { useState } from "react";
import { Search, ShieldAlert, HeartPulse, AlertTriangle, Eye, ArrowUpRight, Zap, Activity } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, BarChart, Bar, CartesianGrid } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { Link } from "react-router-dom";

const SCORE_COLOR = s => s >= 70 ? "#10B981" : s >= 40 ? "#F59E0B" : "#EF4444";
const BUCKETS = [
  { label: "0–20", fill: "#EF4444" }, { label: "20–40", fill: "#F97316" },
  { label: "40–60", fill: "#F59E0B" }, { label: "60–80", fill: "#84CC16" }, { label: "80–100", fill: "#10B981" },
];

export default function RiskEngine() {
  const { latestMl, portfolioStats, companies, loading } = useAppData();
  const ct = useChartTheme();
  const [sort, setSort] = useState("score_asc");
  const [search, setSearch] = useState("");

  const compMap = React.useMemo(() => { const m = {}; companies.forEach(c => { m[c.id] = c; }); return m; }, [companies]);
  const sorted = React.useMemo(() => {
    let data = latestMl.filter(r => { const c = compMap[r.company_id]; return !search || c?.name?.toLowerCase().includes(search.toLowerCase()); });
    if (sort === "score_asc") data = [...data].sort((a, b) => (a.survival_score || 0) - (b.survival_score || 0));
    if (sort === "score_desc") data = [...data].sort((a, b) => (b.survival_score || 0) - (a.survival_score || 0));
    if (sort === "distress") data = [...data].sort((a, b) => (b.distress_probability || 0) - (a.distress_probability || 0));
    return data;
  }, [latestMl, sort, search, compMap]);

  const scatterData = latestMl.map(r => ({ x: r.survival_score || 0, y: r.distress_probability || 0, name: compMap[r.company_id]?.name || "" }));
  const bucketData = BUCKETS.map((b, i) => { const ranges = [[0,20],[20,40],[40,60],[60,80],[80,100]]; const [lo, hi] = ranges[i]; return { ...b, count: latestMl.filter(r => (r.survival_score || 0) >= lo && (r.survival_score || 0) < hi).length }; });

  if (loading) return <PageLayout title="Risk Engine"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Risk Engine">
      <div className="space-y-8 pb-12">

        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="page-heading">Risk Engine</h1>
          <p className="page-subheading">CatBoost-powered machine learning survival predictions and distress probability modeling.</p>
        </div>

        {/* ── Hero Banner ──────────────────────────────── */}
        <div className="card-dark relative overflow-hidden p-8 stagger-1">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neutral-800/40 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-neutral-900/[0.04] dark:bg-white/[0.04] border border-neutral-900/[0.08] dark:border-white/[0.08] flex items-center justify-center">
                  <Zap size={24} className="text-neutral-900 dark:text-white" />
                </div>
                <div>
                  <h2 className="title-lg text-neutral-900 dark:text-white">ML Intelligence</h2>
                  <p className="text-sm text-neutral-400 mt-1">Real-time portfolio scoring</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-1">Portfolio Avg</p>
                <p className="value-xl text-brand-orange">{portfolioStats.avgSurvival}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Scored", value: latestMl.length, icon: Activity, color: "text-neutral-900 dark:text-white" },
                { label: "Healthy ≥70", value: portfolioStats.healthy, icon: HeartPulse, color: "text-emerald-400" },
                { label: "Watch 40–70", value: portfolioStats.watch, icon: Eye, color: "text-amber-400" },
                { label: "Distress <40", value: portfolioStats.distress, icon: AlertTriangle, color: "text-red-400" },
              ].map(({ label, value, icon: Icon, color }, i) => (
                <div key={label} className="bg-neutral-900/[0.03] dark:bg-white/[0.03] border border-neutral-900/[0.05] dark:border-white/[0.05] rounded-2xl p-5 hover:bg-neutral-900/[0.06] dark:bg-white/[0.06] transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={16} className={`${color} opacity-80`} />
                    <p className="text-[10px] uppercase font-semibold tracking-widest text-neutral-400">{label}</p>
                  </div>
                  <p className={`value-lg ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Charts ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-2">
          <div className="card-glass p-8">
            <div className="mb-6">
              <p className="title-md">Score Distribution</p>
              <p className="muted mt-1">Histogram of all tracked companies</p>
            </div>
            {bucketData.some(b => b.count > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={bucketData}>
                  <CartesianGrid strokeDasharray="2 6" stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip {...ct.tooltip} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={48}>{bucketData.map((b, i) => <Cell key={i} fill={b.fill} fillOpacity={0.9} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No ML data" />}
          </div>
          <div className="card-glass p-8">
            <div className="mb-6">
              <p className="title-md">Survival vs Distress</p>
              <p className="muted mt-1">Probability mapping scatter plot</p>
            </div>
            {scatterData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="2 6" stroke={ct.grid} />
                  <XAxis dataKey="x" name="Survival" type="number" domain={[0,100]} tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="y" name="Distress" type="number" domain={[0,100]} tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip {...ct.tooltip} formatter={(v, n) => [`${v.toFixed(1)}`, n]} />
                  <Scatter data={scatterData}>{scatterData.map((d, i) => <Cell key={i} fill={SCORE_COLOR(d.x)} fillOpacity={0.7} />)}</Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No ML data" />}
          </div>
        </div>

        {/* ── Rankings Table ──────────────────────────── */}
        <div className="card-glass overflow-hidden stagger-3">
          <div className="p-6 border-b border-neutral-900/[0.08] dark:border-neutral-900/[0.08] dark:border-white/[0.08] flex items-center justify-between flex-wrap gap-4 bg-neutral-900/[0.02] dark:bg-white/[0.01]">
            <div>
              <p className="title-lg">Company Risk Rankings</p>
              <p className="muted mt-1">{sorted.length} companies scored</p>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="input-base pl-9 py-2 text-sm w-48" />
              </div>
              <div className="flex bg-neutral-900/[0.04] dark:bg-neutral-900/[0.04] dark:bg-white/[0.04] p-1 rounded-xl border border-neutral-900/[0.05] dark:border-neutral-900/[0.05] dark:border-white/[0.05]">
                {[{ key: "score_asc", label: "Worst First" }, { key: "score_desc", label: "Best First" }, { key: "distress", label: "High Distress" }].map(({ key, label }) => (
                  <button key={key} onClick={() => setSort(key)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${sort === key ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-900 dark:text-white shadow-sm" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}>{label}</button>
                ))}
              </div>
            </div>
          </div>
          {sorted.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-neutral-900/[0.02] dark:bg-white/[0.01]">
                    {["Company", "Ticker", "Survival Score", "Distress %", "Date", ""].map(h => <th key={h} className="th-base">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => {
                    const c = compMap[r.company_id]; const s = r.survival_score;
                    const barColor = s >= 70 ? "bg-emerald-500" : s >= 40 ? "bg-amber-400" : "bg-red-500";
                    const textColor = s >= 70 ? "text-emerald-600 dark:text-emerald-400" : s >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-500";
                    return (
                      <tr key={r.id} className="tr-base group">
                        <td className="td-base"><p className="text-base font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-brand-orange transition-colors">{c?.name || "—"}</p></td>
                        <td className="td-base"><span className="text-[11px] font-mono font-semibold text-neutral-500 bg-neutral-900/[0.05] dark:bg-neutral-900/[0.05] dark:bg-white/[0.05] px-2.5 py-1 rounded-lg">{c?.ticker || "—"}</span></td>
                        <td className="td-base">
                          <div className="flex items-center gap-4">
                            <div className="w-24 h-1.5 bg-neutral-900/[0.05] dark:bg-neutral-900/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden"><div className={`h-full rounded-full ${barColor}`} style={{ width: `${s || 0}%` }} /></div>
                            <span className={`text-sm font-bold tabular-nums ${textColor}`}>{s?.toFixed(0)}</span>
                          </div>
                        </td>
                        <td className="td-base"><span className={`text-sm font-bold tabular-nums ${(r.distress_probability || 0) > 60 ? "text-red-500" : "text-neutral-500"}`}>{r.distress_probability?.toFixed(1)}%</span></td>
                        <td className="td-base"><span className="text-[11px] font-mono text-neutral-400">{r.date}</span></td>
                        <td className="td-base"><Link to={`/companies/${r.company_id}`} className="text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-brand-orange transition-colors flex items-center gap-1.5">View <ArrowUpRight size={14} /></Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="p-12"><EmptyState title="No ML predictions" sub="Run the ML pipeline to generate survival scores." /></div>}
        </div>
      </div>
    </PageLayout>
  );
}
