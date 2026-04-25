import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Building2, ChevronRight, Filter, X } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";

function SurvivalBar({ score }) {
  const color = score >= 70 ? "bg-emerald-400" : score >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score || 0}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700">{score?.toFixed(0) ?? "—"}</span>
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

  if (loading) return <PageLayout title="Companies"><LoadingSpinner /></PageLayout>;

  return (
    <PageLayout title="Companies">
      <div className="space-y-4">

        {/* CSV filter banner */}
        {isCsvMode && (
          <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-orange-500" />
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
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
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            />
          </div>
          <div className="flex gap-2">
            {["all","healthy","watch","distress"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all capitalize ${
                  filter === f
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
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
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Company","Ticker","Exchange","Survival Score","Distress %","Status"].map(h => (
                      <th key={h} className="text-left py-3 px-4 stat-label">{h}</th>
                    ))}
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const ml = mlMap[c.id];
                    const score = ml?.survival_score;
                    const distress = ml?.distress_probability;
                    const status = score == null ? "gray" : score >= 70 ? "green" : score >= 40 ? "amber" : "red";
                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-orange-50/20 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">{c.name}</td>
                        <td className="py-3 px-4 text-gray-500 font-mono text-xs">{c.ticker || "—"}</td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{c.exchange || "NSE"}</td>
                        <td className="py-3 px-4"><SurvivalBar score={score} /></td>
                        <td className="py-3 px-4 text-xs text-gray-600">{distress != null ? `${distress.toFixed(1)}%` : "—"}</td>
                        <td className="py-3 px-4"><SignalBadge value={status} /></td>
                        <td className="py-3 px-4">
                          <Link to={`/companies/${c.id}`} className="flex items-center gap-1 text-orange-500 hover:text-orange-600 text-xs font-medium">
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
