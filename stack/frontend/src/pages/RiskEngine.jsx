import React, { useState } from "react";
import { Brain, AlertTriangle, CheckCircle, Eye, Search } from "lucide-react";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, BarChart, Bar, CartesianGrid
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { Link } from "react-router-dom";

const SCORE_COLOR = s => s >= 70 ? "#52B788" : s >= 40 ? "#E8C547" : "#F87171";

const BUCKETS = [
  { label: "0–20",   fill: "#F87171" },
  { label: "20–40",  fill: "#FB923C" },
  { label: "40–60",  fill: "#E8C547" },
  { label: "60–80",  fill: "#86EFAC" },
  { label: "80–100", fill: "#52B788" },
];

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

  const scatterData = latestMl.map(r => ({
    x: r.survival_score || 0,
    y: r.distress_probability || 0,
    name: compMap[r.company_id]?.name || "",
  }));

  const bucketData = BUCKETS.map((b, i) => {
    const ranges = [[0,20],[20,40],[40,60],[60,80],[80,100]];
    const [lo, hi] = ranges[i];
    return { ...b, count: latestMl.filter(r => r.survival_score >= lo && r.survival_score < hi).length };
  });

  if (loading) return <PageLayout title="Risk Engine"><LoadingSpinner /></PageLayout>;

  return (
    <PageLayout title="Risk Engine · ML Predictions">
      <div className="space-y-4">

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card-ink rounded-2xl p-5">
            <p className="label mb-2 text-white/50">Scored</p>
            <p className="value-xl text-[#E8C547]">{latestMl.length}</p>
          </div>
          <div className="card-green rounded-2xl p-5">
            <p className="label mb-2 text-white/60">Healthy ≥70</p>
            <p className="value-xl text-white">{portfolioStats.healthy}</p>
          </div>
          <div className="card-yellow rounded-2xl p-5">
            <p className="label mb-2 text-[#0D0D0D]/60">Watch 40–70</p>
            <p className="value-xl">{portfolioStats.watch}</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="label mb-2">Distress &lt;40</p>
            <p className="value-xl text-red-500">{portfolioStats.distress}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="title-md mb-4">Score Distribution</p>
            {bucketData.some(b => b.count > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={bucketData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={24} />
                  <Tooltip {...ct.tooltip} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {bucketData.map((b, i) => <Cell key={i} fill={b.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No ML data" />}
          </div>

          <div className="card p-5">
            <p className="title-md mb-4">Survival vs Distress</p>
            {scatterData.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="x" name="Survival" type="number" domain={[0,100]} tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="y" name="Distress" type="number" domain={[0,100]} tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip {...ct.tooltip} formatter={(v, n) => [`${v.toFixed(1)}`, n]} />
                  <Scatter data={scatterData}>
                    {scatterData.map((d, i) => <Cell key={i} fill={SCORE_COLOR(d.x)} fillOpacity={0.75} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No ML data" />}
          </div>
        </div>

        {/* Table */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="title-md">Company Risk Rankings</p>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="input-base pl-7 py-1.5 text-xs w-36" />
              </div>
              {[
                { key: "score_asc",  label: "Worst First" },
                { key: "score_desc", label: "Best First"  },
                { key: "distress",   label: "High Distress" },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setSort(key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${sort === key ? "btn-active" : "btn-inactive"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {sorted.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F5F2EC] dark:bg-[#111318] border-b border-[#E5E1D8] dark:border-[#1F2128]">
                  <tr>
                    {["Company","Ticker","Survival Score","Distress %","Date",""].map(h => (
                      <th key={h} className="th-base">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => {
                    const c = compMap[r.company_id];
                    const s = r.survival_score;
                    const color = s >= 70 ? "bar-high" : s >= 40 ? "bar-mid" : "bar-low";
                    const text  = s >= 70 ? "score-high" : s >= 40 ? "score-mid" : "score-low";
                    return (
                      <tr key={r.id} className="tr-base">
                        <td className="td-base text-sm font-semibold text-[#0D0D0D] dark:text-[#E8E6E0]">{c?.name || "—"}</td>
                        <td className="td-base text-xs font-mono text-[#6B7280]">{c?.ticker || "—"}</td>
                        <td className="td-base">
                          <div className="flex items-center gap-2">
                            <div className="progress-track w-16">
                              <div className={`progress-fill ${color}`} style={{ width: `${s || 0}%` }} />
                            </div>
                            <span className={`text-xs font-bold ${text}`}>{s?.toFixed(0)}</span>
                          </div>
                        </td>
                        <td className="td-base">
                          <span className={`text-xs font-semibold ${(r.distress_probability || 0) > 60 ? "text-red-500" : "text-[#6B7280]"}`}>
                            {r.distress_probability?.toFixed(1)}%
                          </span>
                        </td>
                        <td className="td-base text-xs text-[#6B7280]">{r.date}</td>
                        <td className="td-base">
                          <Link to={`/companies/${r.company_id}`} className="text-xs font-semibold text-[#0D0D0D] dark:text-[#E8E6E0] hover:text-[#E8A020] transition-colors">
                            Details →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No ML predictions" sub="Run the ML pipeline to generate survival scores." />}
        </div>
      </div>
    </PageLayout>
  );
}
