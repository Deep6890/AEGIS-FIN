import React, { useState } from "react";
import { Brain, AlertTriangle, CheckCircle, Eye, TrendingDown } from "lucide-react";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, BarChart, Bar, CartesianGrid
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import StatCard from "../components/ui/StatCard";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { Link } from "react-router-dom";

const SCORE_COLOR = s => s >= 70 ? "#00B341" : s >= 40 ? "#FFC224" : "#ef4444";

export default function RiskEngine() {
  const { latestMl, portfolioStats, companies, loading } = useAppData();
  const [sort, setSort] = useState("score_asc");
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

  // Scatter data: survival vs distress
  const scatterData = latestMl.map(r => ({
    x: r.survival_score || 0,
    y: r.distress_probability || 0,
    name: compMap[r.company_id]?.name || `C${r.company_id}`,
    id: r.company_id,
  }));

  // Distribution buckets
  const buckets = [
    { label: "0–20",   count: latestMl.filter(r => r.survival_score < 20).length },
    { label: "20–40",  count: latestMl.filter(r => r.survival_score >= 20 && r.survival_score < 40).length },
    { label: "40–60",  count: latestMl.filter(r => r.survival_score >= 40 && r.survival_score < 60).length },
    { label: "60–80",  count: latestMl.filter(r => r.survival_score >= 60 && r.survival_score < 80).length },
    { label: "80–100", count: latestMl.filter(r => r.survival_score >= 80).length },
  ];

  if (loading) return <PageLayout title="Risk Engine"><LoadingSpinner /></PageLayout>;

  return (
    <PageLayout title="Risk Engine · ML Predictions">
      <div className="space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Brain}         label="Companies Scored"  value={latestMl.length}        color="black"   />
          <StatCard icon={CheckCircle}   label="Healthy (≥70)"     value={portfolioStats.healthy}  color="emerald" />
          <StatCard icon={Eye}           label="Watch (40–70)"      value={portfolioStats.watch}    color="amber"   />
          <StatCard icon={AlertTriangle} label="Distress (<40)"    value={portfolioStats.distress} color="red"     />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Score Distribution */}
          <div className="card p-5">
            <p className="section-title mb-4">Score Distribution</p>
            {buckets.some(b => b.count > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={buckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {buckets.map((b, i) => (
                      <Cell key={i} fill={["#ef4444","#FF8A00","#FFC224","#00B341","#00B341"][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No ML data" />}
          </div>

          {/* Scatter: Survival vs Distress */}
          <div className="card p-5">
            <p className="section-title mb-4">Survival vs Distress Probability</p>
            {scatterData.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="x" name="Survival" type="number" domain={[0,100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: "Survival Score", position: "insideBottom", offset: -2, fontSize: 10 }} />
                  <YAxis dataKey="y" name="Distress" type="number" domain={[0,100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: "Distress %", angle: -90, position: "insideLeft", fontSize: 10 }} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ fontSize: 10, borderRadius: 12 }} formatter={(v, n) => [`${v.toFixed(1)}`, n]} />
                  <Scatter data={scatterData} fill="#FF8A00">
                    {scatterData.map((d, i) => (
                      <Cell key={i} fill={SCORE_COLOR(d.x)} fillOpacity={0.7} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No ML data" />}
          </div>
        </div>

        {/* Company Risk Table */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="section-title">Company Risk Rankings</p>
            <div className="flex gap-2 flex-wrap">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="px-3 py-1.5 text-xs input-base"
              />
              {[
                { key: "score_asc",  label: "Worst First" },
                { key: "score_desc", label: "Best First"  },
                { key: "distress",   label: "High Distress" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={`px-3 py-1.5 text-xs font-black rounded-xl border transition-all ${
                    sort === key
                      ? "bg-black dark:bg-[#FFC224] text-[#FFC224] dark:text-black border-black dark:border-[#FFC224]"
                      : "bg-white dark:bg-[#111] border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:border-black dark:hover:border-[#FFC224]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {sorted.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#1f1f1f]">
                    {["Company","Ticker","Survival Score","Distress %","Model","Date","Action"].map(h => (
                      <th key={h} className="th-base">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => {
                    const c = compMap[r.company_id];
                    const score = r.survival_score;
                    return (
                      <tr key={r.id} className="tr-base">
                        <td className="td-base font-bold text-gray-900 dark:text-white">{c?.name || `Company ${r.company_id}`}</td>
                        <td className="td-base text-xs font-mono text-gray-500">{c?.ticker || "—"}</td>
                        <td className="td-base">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${score || 0}%`, background: SCORE_COLOR(score) }} />
                            </div>
                            <span className="text-xs font-black" style={{ color: SCORE_COLOR(score) }}>{score?.toFixed(0)}</span>
                          </div>
                        </td>
                        <td className="td-base text-xs text-red-500 font-bold">{r.distress_probability?.toFixed(1)}%</td>
                        <td className="td-base text-xs font-mono text-gray-500">{r.model_version}</td>
                        <td className="td-base text-xs text-gray-400">{r.date}</td>
                        <td className="td-base">
                          <Link to={`/companies/${r.company_id}`} className="text-xs text-black dark:text-white font-black hover:text-[#FF8A00] transition-colors">
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
