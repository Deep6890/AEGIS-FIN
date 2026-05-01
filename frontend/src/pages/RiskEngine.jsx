import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, BarChart, Bar, CartesianGrid, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, AreaChart, Area
} from "recharts";
import { Search, ArrowUpRight, Activity, HeartPulse, AlertTriangle, Eye, Zap, Shield, Brain, SlidersHorizontal } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import { PageSkeleton } from "../components/ui/LoadingSpinner";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";

const CLASS_COLORS = {
  STRONG:    { bg: "bg-green-50 dark:bg-green-950/30",    text: "text-green-700 dark:text-green-400" },
  POSITIVE:  { bg: "bg-orange-50 dark:bg-orange-950/30",  text: "text-orange-700 dark:text-orange-400" },
  NEUTRAL:   { bg: "bg-neutral-100 dark:bg-neutral-800",  text: "text-neutral-600 dark:text-neutral-400" },
  WEAK:      { bg: "bg-amber-50 dark:bg-amber-950/30",    text: "text-amber-700 dark:text-amber-400" },
  DISTRESSED:{ bg: "bg-red-50 dark:bg-red-950/30",        text: "text-red-700 dark:text-red-400" },
};

export default function RiskEngine() {
  const { latestMl, portfolioStats, companies, loading } = useAppData();
  const ct = useChartTheme();
  const [sort, setSort]     = useState("score_asc");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [tab, setTab]       = useState("rankings");

  const compMap = useMemo(() => { const m = {}; companies.forEach(c => { m[c.id] = c; }); return m; }, [companies]);

  const scored = useMemo(() =>
    latestMl.filter(r => r.composite_score != null),
    [latestMl]);

  const filtered = useMemo(() => {
    let list = scored.filter(r => {
      const c = compMap[r.company_id];
      if (!c) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.ticker?.toLowerCase().includes(search.toLowerCase())) return false;
      if (classFilter !== "all" && r.class !== classFilter) return false;
      return true;
    });
    if (sort === "score_asc")  list = [...list].sort((a, b) => a.composite_score - b.composite_score);
    if (sort === "score_desc") list = [...list].sort((a, b) => b.composite_score - a.composite_score);
    if (sort === "distress")   list = [...list].sort((a, b) => (b.distress_probability || 0) - (a.distress_probability || 0));
    if (sort === "momentum")   list = [...list].sort((a, b) => (b.momentum || 0) - (a.momentum || 0));
    if (sort === "risk")       list = [...list].sort((a, b) => (b.risk || 0) - (a.risk || 0));
    return list;
  }, [scored, compMap, search, classFilter, sort]);

  const bucketData = useMemo(() => [
    { label: "0–20",   lo: 0,  hi: 20,  fill: "#D1D1D1" },
    { label: "20–40",  lo: 20, hi: 40,  fill: "#D1D1D1" },
    { label: "40–60",  lo: 40, hi: 60,  fill: "var(--orange)" },
    { label: "60–80",  lo: 60, hi: 80,  fill: "var(--orange)" },
    { label: "80–100", lo: 80, hi: 100, fill: "var(--orange)" },
  ].map(b => ({ ...b, count: scored.filter(r => r.composite_score >= b.lo && r.composite_score < b.hi).length })),
  [scored]);

  const scatterData = useMemo(() =>
    scored.slice(0, 200).map(r => ({
      x: r.composite_score || 0,
      y: r.distress_probability || 0,
      name: compMap[r.company_id]?.name || "",
      class: r.class,
    })),
    [scored, compMap]);

  const classDist = useMemo(() => {
    const counts = { STRONG: 0, POSITIVE: 0, NEUTRAL: 0, WEAK: 0, DISTRESSED: 0 };
    scored.forEach(r => { if (counts[r.class] !== undefined) counts[r.class]++; });
    return Object.entries(counts).map(([cls, count]) => ({ cls, count, pct: scored.length ? ((count / scored.length) * 100).toFixed(1) : 0 }));
  }, [scored]);

  const dimensionData = useMemo(() => {
    if (!scored.length) return [];
    const avg = f => scored.reduce((s, r) => s + (r[f] || 0), 0) / scored.length;
    return [
      { subject: "Trend",       A: avg("trend_score") || avg("health_score") },
      { subject: "Fundamental", A: avg("fundamental_score") || 50 },
      { subject: "Sentiment",   A: avg("sentiment_score") || 50 },
      { subject: "Sector Fit",  A: avg("sector_alignment_score") || 50 },
      { subject: "Momentum",    A: avg("momentum") || 50 },
      { subject: "Strength",    A: avg("strength") || 50 },
    ];
  }, [scored]);

  if (loading) return <PageLayout title="Risk Engine"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Risk Engine">
      <div className="space-y-5 pb-10">

        {/* Header */}
        <div className="animate-fade-in">
          <p className="label-caps text-[var(--orange)] mb-1">Intelligence</p>
          <h1 className="page-heading">Risk Engine</h1>
          <p className="page-subheading">Composite survival scores · distress probability · classification across {scored.length} companies</p>
        </div>

        {/* Hero stats */}
        <div className="card-glass p-6 relative overflow-hidden stagger-1">
          <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-[var(--orange)]/5 blur-[80px] pointer-events-none" />
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 relative">
            {[
              { label: "Avg Score",    value: portfolioStats.avgSurvival, icon: Zap,          accent: true },
              { label: "Scored",       value: portfolioStats.scored,      icon: Activity },
              { label: "Healthy ≥70",  value: portfolioStats.healthy,     icon: HeartPulse,   accent: true },
              { label: "Watch 40–70",  value: portfolioStats.watch,       icon: Eye },
              { label: "Distress <40", value: portfolioStats.distress,    icon: AlertTriangle },
              { label: "Universe",     value: portfolioStats.total,       icon: Brain },
            ].map(({ label, value, icon: Icon, accent }) => (
              <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={13} className="text-[var(--orange)]" />
                  <p className="label-caps">{label}</p>
                </div>
                <p className={`text-2xl font-bold tabular-nums tracking-tight ${accent ? "text-[var(--orange)]" : "text-[var(--text)]"}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-2">

          {/* Distribution */}
          <div className="card p-5">
            <p className="title-md mb-1">Score Distribution</p>
            <p className="text-xs text-[var(--text-3)] mb-4">Companies by survival score bucket</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={bucketData}>
                <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={24} />
                <Tooltip {...ct.tooltip} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={40}>
                  {bucketData.map((b, i) => <Cell key={i} fill={b.fill} fillOpacity={0.9} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scatter */}
          <div className="card p-5">
            <p className="title-md mb-1">Survival vs Distress</p>
            <p className="text-xs text-[var(--text-3)] mb-4">Each dot = one company</p>
            <ResponsiveContainer width="100%" height={180}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} />
                <XAxis dataKey="x" name="Score" type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                <YAxis dataKey="y" name="Distress" type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                <Tooltip {...ct.tooltip} formatter={(v, n) => [`${v.toFixed(1)}`, n]} />
                <Scatter data={scatterData}>
                  {scatterData.map((d, i) => (
                    <Cell key={i} fill={d.x >= 70 ? "var(--orange)" : d.x >= 40 ? "#F5C842" : "#D1D1D1"} fillOpacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Dimension radar */}
          <div className="card p-5">
            <p className="title-md mb-1">Dimension Breakdown</p>
            <p className="text-xs text-[var(--text-3)] mb-2">Portfolio avg across all score dimensions</p>
            {dimensionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={dimensionData}>
                  <PolarGrid stroke={ct.grid} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: ct.tick }} />
                  <Radar dataKey="A" stroke="var(--orange)" fill="var(--orange)" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip {...ct.tooltip} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-xs text-[var(--text-3)]">No classifier data yet</div>
            )}
          </div>
        </div>

        {/* Class distribution */}
        <div className="grid grid-cols-5 gap-3 stagger-3">
          {classDist.map(({ cls, count, pct }) => {
            const cc = CLASS_COLORS[cls] || CLASS_COLORS.NEUTRAL;
            return (
              <button key={cls} onClick={() => setClassFilter(classFilter === cls ? "all" : cls)}
                className={`card p-4 text-center hover-lift transition-all ${classFilter === cls ? "ring-2 ring-[var(--orange)]" : ""}`}>
                <p className={`text-xl font-bold tabular-nums ${cc.text}`}>{count}</p>
                <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${cc.text}`}>{cls}</p>
                <p className="text-[9px] text-[var(--text-3)] mt-0.5">{pct}%</p>
              </button>
            );
          })}
        </div>

        {/* Rankings table */}
        <div className="card overflow-hidden stagger-4">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="title-md">Company Risk Rankings</p>
              <p className="text-xs text-[var(--text-3)] mt-0.5">{filtered.length} companies · {classFilter !== "all" ? classFilter : "all classes"}</p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search…" className="input-base pl-8 py-2 text-xs w-40" />
              </div>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="input-base py-2 text-xs w-36">
                <option value="score_asc">Worst first</option>
                <option value="score_desc">Best first</option>
                <option value="distress">Distress ↓</option>
                <option value="momentum">Momentum ↓</option>
                <option value="risk">Risk ↓</option>
              </select>
            </div>
          </div>
          {filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {["Company", "Ticker", "Score", "Distress", "Class", "Tier", "Trend", "Fund.", "Sentiment", "Momentum", "Risk", "Strength", ""].map(h => (
                      <th key={h} className="th-base whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const c = compMap[r.company_id];
                    const cc = CLASS_COLORS[r.class] || CLASS_COLORS.NEUTRAL;
                    return (
                      <tr key={r.company_id} className="tr-base group">
                        <td className="td-base">
                          <p className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--orange)] transition-colors truncate max-w-[160px]">{c?.name || "—"}</p>
                        </td>
                        <td className="td-base">
                          <span className="text-[11px] font-mono text-[var(--text-2)] bg-neutral-50 dark:bg-neutral-900 px-2 py-0.5 rounded-lg border border-[var(--border)]">{c?.ticker || "—"}</span>
                        </td>
                        <td className="td-base">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-[var(--orange)]" style={{ width: `${r.composite_score || 0}%` }} />
                            </div>
                            <span className="text-xs font-bold tabular-nums text-[var(--text)]">{r.composite_score?.toFixed(0) ?? "—"}</span>
                          </div>
                        </td>
                        <td className="td-base">
                          <span className={`text-xs font-bold tabular-nums ${(r.distress_probability || 0) > 60 ? "text-red-500" : "text-[var(--text-2)]"}`}>
                            {r.distress_probability?.toFixed(1) ?? "—"}%
                          </span>
                        </td>
                        <td className="td-base">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${cc.bg} ${cc.text}`}>{r.class || "—"}</span>
                        </td>
                        <td className="td-base">
                          <span className="text-[10px] font-bold text-[var(--text-3)]">{r.composite_tier || "—"}</span>
                        </td>
                        {["trend_score", "fundamental_score", "sentiment_score", "momentum", "risk", "strength"].map(f => (
                          <td key={f} className="td-base">
                            <span className={`text-xs font-bold tabular-nums ${f === "risk" && (r[f] || 0) > 60 ? "text-red-500" : "text-[var(--text-2)]"}`}>
                              {r[f] != null ? r[f].toFixed(1) : "—"}
                            </span>
                          </td>
                        ))}
                        <td className="td-base">
                          <Link to={`/companies/${r.company_id}`} className="text-xs font-bold text-[var(--text-3)] hover:text-[var(--orange)] transition-colors flex items-center gap-1">
                            View <ArrowUpRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-sm text-[var(--text-3)]">No companies match your filters.</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
