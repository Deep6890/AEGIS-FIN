import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Building2, ChevronRight, Filter, X } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";

function SurvivalBar({ score }) {
  const color = score >= 70 ? "bg-[#00B341]" : score >= 40 ? "bg-[#FFC224]" : "bg-red-400";
  const textColor = score >= 70 ? "text-[#00B341]" : score >= 40 ? "text-[#FFC224]" : "text-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-100 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score || 0}%` }} />
      </div>
      <span className={`text-xs font-bold ${textColor}`}>{score?.toFixed(0) ?? "—"}</span>
    </div>
  );
}

export default function Companies() {
  const { companies, latestMl, loading, isCsvMode, csvTickers, clearCsvFilter } = useAppData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const mlMap = React.useMemo(() => {
    const m = {};
    latestMl.forEach(r => { m[r.company_id] = r; });
    return m;
  }, [latestMl]);

  const filtered = companies.filter(c => {
    const ml = mlMap[c.id];
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        (c.ticker || "").toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "healthy")  return ml?.survival_score >= 70;
    if (filter === "watch")    return ml?.survival_score >= 40 && ml?.survival_score < 70;
    if (filter === "distress") return ml?.survival_score < 40;
    return true;
  });

  // Summary counts
  const totalCount    = companies.length;
  const healthyCount  = companies.filter(c => (mlMap[c.id]?.survival_score ?? -1) >= 70).length;
  const watchCount    = companies.filter(c => { const s = mlMap[c.id]?.survival_score; return s != null && s >= 40 && s < 70; }).length;
  const distressCount = companies.filter(c => { const s = mlMap[c.id]?.survival_score; return s != null && s < 40; }).length;

  if (loading) return <PageLayout title="Companies"><LoadingSpinner /></PageLayout>;

  return (
    <PageLayout title="Companies">
      <div className="space-y-4">

        {/* Summary bento row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bento-black flex flex-col gap-1">
            <p className="stat-label text-white/60">Total</p>
            <p className="text-2xl font-black text-[#FFC224]">{totalCount}</p>
            <p className="text-xs text-white/50">Companies</p>
          </div>
          <div className="bento-white flex flex-col gap-1">
            <p className="stat-label">Healthy</p>
            <p className="text-2xl font-black text-[#00B341]">{healthyCount}</p>
            <p className="text-xs text-gray-400">Score ≥ 70</p>
          </div>
          <div className="bento-white flex flex-col gap-1">
            <p className="stat-label">Watch</p>
            <p className="text-2xl font-black text-[#FFC224]">{watchCount}</p>
            <p className="text-xs text-gray-400">Score 40–70</p>
          </div>
          <div className="bento-white flex flex-col gap-1">
            <p className="stat-label">Distress</p>
            <p className="text-2xl font-black text-red-500">{distressCount}</p>
            <p className="text-xs text-gray-400">Score &lt; 40</p>
          </div>
        </div>

        {/* CSV filter banner */}
        {isCsvMode && (
          <div className="flex items-center justify-between p-3 bg-[#FFC224]/10 border border-[#FFC224]/20 rounded-2xl">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-[#FF8A00]" />
              <p className="text-xs font-bold text-[#b38a00] dark:text-[#FFC224]">
                Showing {companies.length} companies from your CSV ({csvTickers?.length} tickers)
              </p>
            </div>
            <button
              onClick={clearCsvFilter}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={12} /> Show all
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search company or ticker..."
              className="w-full pl-9 pr-4 py-2.5 text-sm input-base"
            />
          </div>
          <div className="flex gap-2">
            {["all","healthy","watch","distress"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 text-xs font-black rounded-xl border transition-all capitalize ${
                  filter === f
                    ? "bg-black dark:bg-[#FFC224] text-[#FFC224] dark:text-black border-black dark:border-[#FFC224]"
                    : "bg-white dark:bg-[#111] border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:border-black dark:hover:border-[#FFC224]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <p className="text-xs text-gray-400">{filtered.length} companies</p>

        {/* Table */}
        {filtered.length ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FDFBF7] dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#1f1f1f]">
                  <tr>
                    {["Company","Ticker","Exchange","Survival Score","Distress %","Status"].map(h => (
                      <th key={h} className="th-base">{h}</th>
                    ))}
                    <th className="py-2.5 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const ml = mlMap[c.id];
                    const score = ml?.survival_score;
                    const distress = ml?.distress_probability;
                    const status = score == null ? "gray" : score >= 70 ? "green" : score >= 40 ? "amber" : "red";
                    return (
                      <tr key={c.id} className="tr-base">
                        <td className="td-base font-bold text-gray-900 dark:text-white">{c.name}</td>
                        <td className="td-base text-gray-500 font-mono text-xs">{c.ticker || "—"}</td>
                        <td className="td-base text-gray-500 text-xs">{c.exchange || "NSE"}</td>
                        <td className="td-base"><SurvivalBar score={score} /></td>
                        <td className="td-base text-xs text-gray-600 dark:text-gray-400">{distress != null ? `${distress.toFixed(1)}%` : "—"}</td>
                        <td className="td-base"><SignalBadge value={status} /></td>
                        <td className="td-base">
                          <Link to={`/companies/${c.id}`} className="flex items-center gap-1 text-black dark:text-white font-black hover:text-[#FF8A00] text-xs transition-colors">
                            View <ChevronRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState title="No companies found" sub="Run the pipeline to populate company data, or adjust your search." />
        )}
      </div>
    </PageLayout>
  );
}
