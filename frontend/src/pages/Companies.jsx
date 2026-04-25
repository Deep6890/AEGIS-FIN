import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight, Filter, X, Building2, Sparkles } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import { PageSkeleton } from "../components/ui/LoadingSpinner";
import { useAppData } from "../context/AppDataContext";

function ScoreBar({ score }) {
  if (score == null) return <span className="text-xs text-[var(--text-3)]">—</span>;
  const pct = Math.min(100, score);
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--orange)] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold tabular-nums text-[var(--text)]">{score.toFixed(0)}</span>
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
      <div className="space-y-5 pb-10">

        {/* Header */}
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Portfolio</p>
          <h1 className="page-heading">Companies</h1>
          <p className="page-subheading">
            Track and analyze all companies across the portfolio, filtered by real-time ML risk predictions.
          </p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-1">
          <div className="card p-6 hover-lift">
            <p className="label-caps mb-3">Total</p>
            <p className="value-xl">{stats.total}</p>
            <p className="text-xs text-[var(--text-3)] mt-1">Companies tracked</p>
          </div>
          <div className="card-orange p-6 hover-lift">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-3">Healthy ≥ 70</p>
            <p className="value-xl text-white">{stats.healthy}</p>
            <p className="text-xs text-white/70 mt-1">Low distress probability</p>
          </div>
          <div className="card p-6 hover-lift">
            <p className="label-caps mb-3">Watch Zone</p>
            <p className="value-xl">{stats.watch}</p>
            <p className="text-xs text-[var(--text-3)] mt-1">Score 40–70</p>
          </div>
          <div className="card p-6 hover-lift">
            <p className="label-caps mb-3">Distress</p>
            <p className="value-xl">{stats.distress}</p>
            <p className="text-xs text-[var(--text-3)] mt-1">Immediate review needed</p>
          </div>
        </div>

        {/* CSV Banner */}
        {isCsvMode && (
          <div className="insight-box flex items-center justify-between stagger-2">
            <div className="flex items-center gap-3">
              <Filter size={16} className="text-[var(--orange)]" />
              <p className="text-sm font-semibold text-[var(--orange)]">
                Showing {companies.length} from CSV ({csvTickers?.length} tickers)
              </p>
            </div>
            <button onClick={clearCsvFilter} className="btn-ghost text-xs py-1.5 px-3">
              <X size={14} /> Clear filter
            </button>
          </div>
        )}

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 stagger-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search company or ticker…"
              className="input-base pl-11"
            />
          </div>
          <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-[var(--border)]">
            {["all", "healthy", "watch", "distress"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${
                  filter === f
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                    : "text-[var(--text-3)] hover:text-[var(--text)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filtered.length ? (
          <div className="card overflow-hidden stagger-3">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <p className="title-md">{filtered.length} companies</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
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
                    const status  = score == null ? "gray" : score >= 70 ? "green" : score >= 40 ? "amber" : "red";
                    return (
                      <tr key={c.id} className="tr-base group">
                        <td className="td-base">
                          <p className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--orange)] transition-colors">
                            {c.name}
                          </p>
                        </td>
                        <td className="td-base">
                          <span className="text-[11px] font-mono text-[var(--text-2)] bg-neutral-50 dark:bg-neutral-900 px-2 py-1 rounded-lg border border-[var(--border)]">
                            {c.ticker || "—"}
                          </span>
                        </td>
                        <td className="td-base">
                          <span className="text-xs text-[var(--text-3)] font-mono">{c.exchange || "NSE"}</span>
                        </td>
                        <td className="td-base"><ScoreBar score={score} /></td>
                        <td className="td-base">
                          <span className="text-sm font-bold tabular-nums text-[var(--text-2)]">
                            {distress != null ? `${distress.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                        <td className="td-base"><SignalBadge value={status} /></td>
                        <td className="td-base">
                          <Link
                            to={`/companies/${c.id}`}
                            className="text-xs font-bold text-[var(--text-3)] hover:text-[var(--orange)] transition-colors flex items-center gap-1"
                          >
                            View <ArrowUpRight size={13} />
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
          <div className="card p-16 flex flex-col items-center text-center stagger-3">
            <div className="w-16 h-16 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] flex items-center justify-center mb-4 animate-float">
              <Sparkles size={28} className="text-[var(--text-3)]" />
            </div>
            <p className="title-md mb-1">No companies found</p>
            <p className="text-sm text-[var(--text-3)]">
              Run the pipeline to populate company data, or adjust your search filters.
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
