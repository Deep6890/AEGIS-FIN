import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronRight, Filter, X, Building2, CheckCircle, Eye, AlertTriangle } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner, { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";

function ScoreBar({ score }) {
  if (score == null) return <span className="text-xs text-neutral-400">—</span>;
  const pct   = Math.min(100, score);
  const color = score >= 70 ? "bar-high" : score >= 40 ? "bar-mid" : "bar-low";
  const text  = score >= 70 ? "score-high" : score >= 40 ? "score-mid" : "score-low";
  return (
    <div className="flex items-center gap-2">
      <div className="progress-track w-16">
        <div className={`progress-fill ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums ${text}`}>{score.toFixed(0)}</span>
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
    const q  = search.toLowerCase();
    if (q && !c.name.toLowerCase().includes(q) && !(c.ticker || "").toLowerCase().includes(q)) return false;
    if (filter === "healthy")  return (ml?.survival_score ?? 0) >= 70;
    if (filter === "watch")    return (ml?.survival_score ?? 0) >= 40 && (ml?.survival_score ?? 0) < 70;
    if (filter === "distress") return (ml?.survival_score ?? 101) < 40;
    return true;
  });

  const stats = React.useMemo(() => ({
    total:    companies.length,
    healthy:  latestMl.filter(r => r.survival_score >= 70).length,
    watch:    latestMl.filter(r => r.survival_score >= 40 && r.survival_score < 70).length,
    distress: latestMl.filter(r => r.survival_score < 40).length,
  }), [companies, latestMl]);

  if (loading) return <PageLayout title="Companies"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Companies">
      <div className="space-y-5">

        {/* Summary row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-brand-orange/10 flex items-center justify-center">
                <Building2 size={15} className="text-brand-orange" />
              </div>
              <p className="label-caps">Total</p>
            </div>
            <p className="value-lg text-neutral-900 dark:text-neutral-100">{stats.total}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <CheckCircle size={15} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="label-caps">Healthy</p>
            </div>
            <p className="value-lg score-high">{stats.healthy}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                <Eye size={15} className="text-amber-600 dark:text-amber-400" />
              </div>
              <p className="label-caps">Watch</p>
            </div>
            <p className="value-lg score-mid">{stats.watch}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                <AlertTriangle size={15} className="text-red-600 dark:text-red-400" />
              </div>
              <p className="label-caps">Distress</p>
            </div>
            <p className="value-lg score-low">{stats.distress}</p>
          </div>
        </div>

        {/* CSV banner */}
        {isCsvMode && (
          <div className="flex items-center justify-between p-3 bg-brand-orange/5 border border-brand-orange/20 rounded-2xl">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-brand-orange" />
              <p className="text-xs font-semibold text-brand-orange">
                Showing {companies.length} companies from CSV ({csvTickers?.length} tickers)
              </p>
            </div>
            <button onClick={clearCsvFilter} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-red-500 transition-colors">
              <X size={12} /> Show all
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or ticker…" className="input-base w-full pl-8" />
          </div>
          <div className="flex gap-1.5">
            {["all","healthy","watch","distress"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all ${filter === f ? "btn-active" : "btn-inactive"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <p className="muted">{filtered.length} companies</p>

        {/* Table */}
        {filtered.length ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                  <tr>
                    {["Company","Ticker","Exchange","Survival Score","Distress %","Status",""].map(h => (
                      <th key={h} className="th-base">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const ml      = mlMap[c.id];
                    const score   = ml?.survival_score;
                    const distress = ml?.distress_probability;
                    const status  = score == null ? "gray" : score >= 70 ? "green" : score >= 40 ? "amber" : "red";
                    return (
                      <tr key={c.id} className="tr-base">
                        <td className="td-base">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{c.name}</p>
                        </td>
                        <td className="td-base">
                          <span className="text-xs font-mono text-neutral-500">{c.ticker || "—"}</span>
                        </td>
                        <td className="td-base">
                          <span className="text-xs text-neutral-500">{c.exchange || "NSE"}</span>
                        </td>
                        <td className="td-base"><ScoreBar score={score} /></td>
                        <td className="td-base">
                          <span className={`text-xs font-semibold tabular-nums ${distress != null && distress > 60 ? "text-red-500" : "text-neutral-500"}`}>
                            {distress != null ? `${distress.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                        <td className="td-base"><SignalBadge value={status} /></td>
                        <td className="td-base">
                          <Link to={`/companies/${c.id}`} className="flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-brand-orange transition-colors">
                            View <ChevronRight size={12} />
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
