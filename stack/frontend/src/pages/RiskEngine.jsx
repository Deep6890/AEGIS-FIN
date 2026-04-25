import React, { useState } from "react";
import { Search, ShieldAlert, HeartPulse, AlertTriangle, Eye, ArrowUpRight, Zap, Activity } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, BarChart, Bar, CartesianGrid } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { Link } from "react-router-dom";

const BUCKETS = [
  { label: "0–20",   fill: "#D1D1D1" },
  { label: "20–40",  fill: "#BDBDBD" },
  { label: "40–60",  fill: "#E8572A" },
  { label: "60–80",  fill: "#E8572A" },
  { label: "80–100", fill: "#E8572A" },
];

export default function RiskEngine() {
  const { latestMl, portfolioStats, companies, loading } = useAppData();
  const ct = useChartTheme();
  const [sort, setSort] = useState("score_asc");
  const [search, setSearch] = useState("");

  const compMap = React.useMemo(() => { const m = {}; companies.forEach(c => { m[c.id] = c; }); return m; }, [companies]);
  const sorted = React.useMemo(() => {
    let data = latestMl.filter(r => { const c = compMap[r.company_id]; return !search || c?.name?.toLowerCase().includes(search.toLowerCase()); });
    if (sort === "score_asc")  data = [...data].sort((a, b) => (a.survival_score || 0) - (b.survival_score || 0));
    if (sort === "score_desc") data = [...data].sort((a, b) => (b.survival_score || 0) - (a.survival_score || 0));
    if (sort === "distress")   data = [...data].sort((a, b) => (b.distress_probability || 0) - (a.distress_probability || 0));
    return data;
  }, [latestMl, sort, search, compMap]);

  const scatterData = latestMl.map(r => ({ x: r.survival_score || 0, y: r.distress_probability || 0, name: compMap[r.company_id]?.name || "" }));
  const bucketData  = BUCKETS.map((b, i) => { const ranges = [[0,20],[20,40],[40,60],[60,80],[80,100]]; const [lo, hi] = ranges[i]; return { ...b, count: latestMl.filter(r => (r.survival_score || 0) >= lo && (r.survival_score || 0) < hi).length }; });

  if (loading) return <PageLayout title="Risk Engine"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Risk Engine">
      <div className="space-y-5 pb-10">

        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">ML Intelligence</p>
          <h1 className="page-heading">Risk Engine</h1>
          <p className="page-subheading">CatBoost-powered survival predictions and distress probability modeling across all tracked companies.</p>
        </div>

        {/* Hero stats — glass card */}
        <div className="card-glass p-7 relative overflow-hidden stagger-1">
          <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-[var(--orange)]/6 blur-[80px] pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="label-caps mb-2">Portfolio Average Score</p>
                <div className="flex items-end gap-3">
                  <p style={{ fontSize: "3.5rem", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--text)" }}>{portfolioStats.avgSurvival}</p>
                  <p className="text-sm text-[var(--text-3)] mb-2">/ 100</p>
                </div>
                <p className="text-sm text-[var(--text-2)] mt-1">
                  Composite ML survival score across {latestMl.length} scored companies.
                </p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-[var(--orange)]/10 flex items-center justify-center">
                <Zap size={28} className="text-[var(--orange)]" />
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Scored",      value: latestMl.length,         icon: Activity,      desc: "Total companies" },
                { label: "Healthy ≥70", value: portfolioStats.healthy,  icon: HeartPulse,    desc: "Low distress" },
                { label: "Watch 40–70", value: portfolioStats.watch,    icon: Eye,           desc: "Monitor closely" },
                { label: "Distress <40",value: portfolioStats.distress, icon: AlertTriangle, desc: "Review now" },
              ].map(({ label, value, icon: Icon, desc }) => (
                <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 hover:-translate-y-0.5 transition-transform duration-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className="text-[var(--orange)]" />
                    <p className="label-caps">{label}</p>
                  </div>
                  <p className="value-lg">{value}</p>
                  <p className="text-[10px] text-[var(--text-3)] mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger-2">
          <div className="card p-6">
            <p className="title-md mb-1">Score Distribution</p>
            <p className="text-xs text-[var(--text-3)] mb-5">Histogram of all tracked companies by survival score bucket.</p>
            {bucketData.some(b => b.count > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bucketData}>
                  <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip {...ct.tooltip} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {bucketData.map((b, i) => <Cell key={i} fill={b.fill} fillOpacity={0.9} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No ML data" />}
          </div>
          <div className="card p-6">
            <p className="title-md mb-1">Survival vs Distress</p>
            <p className="text-xs text-[var(--text-3)] mb-5">Each dot = one company. Orange = healthy, gray = distress.</p>
            {scatterData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} />
                  <XAxis dataKey="x" name="Survival" type="number" domain={[0,100]} tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="y" name="Distress" type="number" domain={[0,100]} tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip {...ct.tooltip} formatter={(v, n) => [`${v.toFixed(1)}`, n]} />
                  <Scatter data={scatterData}>
                    {scatterData.map((d, i) => <Cell key={i} fill={d.x >= 70 ? "var(--orange)" : d.x >= 40 ? "var(--orange)" : "#D1D1D1"} fillOpacity={0.7} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No ML data" />}
          </div>
        </div>

        {/* Rankings table */}
        <div className="card overflow-hidden stagger-3">
          <div className="px-5 py-5 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="title-md">Company Risk Rankings</p>
              <p className="text-xs text-[var(--text-3)] mt-1">{sorted.length} companies scored · sorted by {sort.replace("_"," ")}</p>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="input-base pl-8 py-2 text-sm w-44" />
              </div>
              <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-[var(--border)]">
                {[{ key: "score_asc", label: "Worst" }, { key: "score_desc", label: "Best" }, { key: "distress", label: "Distress" }].map(({ key, label }) => (
                  <button key={key} onClick={() => setSort(key)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all ${
                      sort === key ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-3)] hover:text-[var(--text)]"
                    }`}>{label}</button>
                ))}
              </div>
            </div>
          </div>
          {sorted.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {["Company", "Ticker", "Survival Score", "Distress %", "Date", ""].map(h => <th key={h} className="th-base">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => {
                    const c = compMap[r.company_id];
                    const s = r.survival_score;
                    return (
                      <tr key={r.id} className="tr-base group">
                        <td className="td-base">
                          <p className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--orange)] transition-colors">{c?.name || "—"}</p>
                        </td>
                        <td className="td-base">
                          <span className="text-[11px] font-mono text-[var(--text-2)] bg-neutral-50 dark:bg-neutral-900 px-2 py-1 rounded-lg border border-[var(--border)]">{c?.ticker || "—"}</span>
                        </td>
                        <td className="td-base">
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-[var(--orange)]" style={{ width: `${s || 0}%` }} />
                            </div>
                            <span className="text-sm font-bold tabular-nums text-[var(--text)]">{s?.toFixed(0)}</span>
                          </div>
                        </td>
                        <td className="td-base">
                          <span className="text-sm font-bold tabular-nums text-[var(--text-2)]">{r.distress_probability?.toFixed(1)}%</span>
                        </td>
                        <td className="td-base">
                          <span className="text-[11px] font-mono text-[var(--text-3)]">{r.date}</span>
                        </td>
                        <td className="td-base">
                          <Link to={`/companies/${r.company_id}`} className="text-xs font-bold text-[var(--text-3)] hover:text-[var(--orange)] transition-colors flex items-center gap-1">
                            View <ArrowUpRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12"><EmptyState title="No ML predictions" sub="Run the ML pipeline to generate survival scores." /></div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
