import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Building2, CheckCircle, Eye, AlertTriangle, ChevronRight, Filter, X } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import StatusBadge from "../components/ui/StatusBadge";
import ScoreBar from "../components/ui/ScoreBar";
import LoadingSpinner, { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import SectionHeader from "../components/ui/SectionHeader";
import { useAppData } from "../context/AppDataContext";

const FILTERS = [
  { key: "all",      label: "All" },
  { key: "healthy",  label: "Healthy" },
  { key: "watch",    label: "Watch" },
  { key: "distress", label: "Distress" },
];

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
    const q  = search.toLowerCase();
    if (q && !c.name.toLowerCase().includes(q) && !(c.ticker || "").toLowerCase().includes(q)) return false;
    if (filter === "healthy")  return (ml?.survival_score ?? 0) >= 70;
    if (filter === "watch")    return (ml?.survival_score ?? 0) >= 40 && (ml?.survival_score ?? 0) < 70;
    if (filter === "distress") return (ml?.survival_score ?? 101) < 40;
    return true;
  });

  const stats = React.useMemo(() => {
    return {
      total:    companies.length,
      healthy:  latestMl.filter(r => r.survival_score >= 70).length,
      watch:    latestMl.filter(r => r.survival_score >= 40 && r.survival_score < 70).length,
      distress: latestMl.filter(r => r.survival_score < 40).length,
    };
  }, [companies, latestMl]);

  if (loading) return <AppLayout title="Companies"><PageSkeleton /></AppLayout>;

  return (
    <AppLayout title="Companies">
      <div className="grid grid-cols-12 gap-4">

        {/* Status cards */}
        <div className="col-span-3 card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={16} className="text-neutral-400" />
            <p className="label-caps">Total</p>
          </div>
          <p className="number-display tabular-nums text-neutral-900 dark:text-neutral-100">{stats.total}</p>
        </div>
        <div className="col-span-3 card-green rounded-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-300" />
            <p className="label-caps text-green-300">Healthy</p>
          </div>
          <p className="number-display tabular-nums text-white">{stats.healthy}</p>
        </div>
        <div className="col-span-3 card-amber rounded-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={16} className="text-amber-800" />
            <p className="label-caps text-amber-800">Watch</p>
          </div>
          <p className="number-display tabular-nums text-neutral-900">{stats.watch}</p>
        </div>
        <div className="col-span-3 card p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500" />
            <p className="label-caps">Distress</p>
          </div>
          <p className="number-display tabular-nums text-red-600 dark:text-red-400">{stats.distress}</p>
        </div>

        {/* CSV banner */}
        {isCsvMode && (
          <div className="col-span-12 insight-box flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-yellow-600 dark:text-yellow-400" />
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                Showing {companies.length} companies from CSV ({csvTickers?.length} tickers)
              </p>
            </div>
            <button onClick={clearCsvFilter} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-red-500 transition-colors">
              <X size={12} /> Show all
            </button>
          </div>
        )}

        {/* Search + filters */}
        <div className="col-span-12 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search company or ticker…"
              className="input-base w-full pl-8"
            />
          </div>
          <div className="flex gap-1.5">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 text-xs font-medium rounded-full transition-colors duration-100 ${
                  filter === f.key
                    ? "bg-neutral-900 dark:bg-yellow-400 text-white dark:text-neutral-900"
                    : "border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <p className="col-span-12 text-xs text-neutral-400">{filtered.length} companies</p>

        {/* Table */}
        <div className="col-span-12 card overflow-hidden">
          {filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    {["Company", "Ticker", "Exchange", "Survival Score", "Distress %", "Status", ""].map(h => (
                      <th key={h} className="th-base">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const ml      = mlMap[c.id];
                    const score   = ml?.survival_score;
                    const distress = ml?.distress_probability;
                    const status  = score == null ? "gray" : score >= 70 ? "healthy" : score >= 40 ? "watch" : "distress";
                    return (
                      <tr key={c.id} className="tr-base">
                        <td className="td-base">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{c.name}</p>
                        </td>
                        <td className="td-base">
                          <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">{c.ticker || "—"}</span>
                        </td>
                        <td className="td-base">
                          <span className="text-xs text-neutral-500">{c.exchange || "NSE"}</span>
                        </td>
                        <td className="td-base"><ScoreBar score={score} /></td>
                        <td className="td-base">
                          <span className={`text-xs font-semibold tabular-nums ${distress != null && distress > 60 ? "text-red-600 dark:text-red-400" : "text-neutral-500"}`}>
                            {distress != null ? `${distress.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                        <td className="td-base"><StatusBadge status={status} score={score != null ? Math.round(score) : undefined} /></td>
                        <td className="td-base">
                          <Link to={`/companies/${c.id}`} className="flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">
                            View <ChevronRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Building2} title="No companies found" subtitle="Run the pipeline to populate company data, or adjust your search." />
          )}
        </div>

      </div>
    </AppLayout>
  );
}
