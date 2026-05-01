import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight, Filter, X, SlidersHorizontal } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import { PageSkeleton } from "../components/ui/LoadingSpinner";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip } from "recharts";

function ScoreGauge({ score }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const color = pct >= 70 ? "var(--orange)" : pct >= 40 ? "#F5C842" : "#D1D1D1";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums text-[var(--text)] w-6 text-right">{pct.toFixed(0)}</span>
    </div>
  );
}

const FILTERS = ["all", "healthy", "watch", "distress"];
const SORT_OPTIONS = [
  { key: "score_desc", label: "Score ↓" },
  { key: "score_asc",  label: "Score ↑" },
  { key: "name",       label: "Name" },
  { key: "distress",   label: "Distress ↓" },
];

export default function Companies() {
  const { companies, latestMl, portfolioStats, loading, isCsvMode, csvTickers, clearCsvFilter } = useAppData();
  const ct = useChartTheme();
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all");
  const [sort,   setSort]     = useState("score_desc");
  const [showSort, setShowSort] = useState(false);

  const mlMap = useMemo(() => {
    const m = {};
    latestMl.forEach(r => { m[r.company_id] = r; });
    return m;
  }, [latestMl]);

  const filtered = useMemo(() => {
    let list = companies.map(c => ({ ...c, ml: mlMap[c.id] || null }));

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.ticker || "").toLowerCase().includes(q));
    }

    // Filter
    if (filter === "healthy")  list = list.filter(c => (c.ml?.composite_score ?? 0) >= 70);
    if (filter === "watch")    list = list.filter(c => { const s = c.ml?.composite_score ?? 0; return s >= 40 && s < 70; });
    if (filter === "distress") list = list.filter(c => c.ml != null && (c.ml.composite_score ?? 0) < 40);

    // Sort
    if (sort === "score_desc") list.sort((a, b) => (b.ml?.composite_score ?? -1) - (a.ml?.composite_score ?? -1));
    if (sort === "score_asc")  list.sort((a, b) => (a.ml?.composite_score ?? 101) - (b.ml?.composite_score ?? 101));
    if (sort === "name")       list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "distress")   list.sort((a, b) => (b.ml?.distress_probability ?? -1) - (a.ml?.distress_probability ?? -1));

    return list;
  }, [companies, mlMap, search, filter, sort]);

  // Mini distribution for header
  const dist = useMemo(() => [
    { label: "H", count: portfolioStats.healthy,  fill: "var(--orange)" },
    { label: "W", count: portfolioStats.watch,    fill: "#F5C842" },
    { label: "D", count: portfolioStats.distress, fill: "#D1D1D1" },
  ], [portfolioStats]);

  if (loading) return <PageLayout title="Companies"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Companies">
      <div className="space-y-5 pb-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 animate-fade-in">
          <div>
            <p className="label-caps text-[var(--orange)] mb-1">Portfolio</p>
            <h1 className="page-heading">Companies</h1>
            <p className="page-subheading">ML-scored universe · {portfolioStats.total} companies · {portfolioStats.scored} scored</p>
          </div>
          {/* Mini dist chart */}
          <div className="hidden lg:flex items-center gap-4 card px-5 py-3 shrink-0">
            {dist.map(d => (
              <div key={d.label} className="text-center">
                <p className="text-xl font-bold tabular-nums" style={{ color: d.fill }}>{d.count}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-3)] mt-0.5">
                  {d.label === "H" ? "Healthy" : d.label === "W" ? "Watch" : "Distress"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CSV banner */}
        {isCsvMode && (
          <div className="insight-box flex items-center justify-between stagger-1">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-[var(--orange)]" />
              <p className="text-xs font-semibold text-[var(--orange)]">
                CSV filter active · {companies.length} of {csvTickers?.length} tickers
              </p>
            </div>
            <button onClick={clearCsvFilter} className="btn-ghost text-xs py-1 px-3 flex items-center gap-1">
              <X size={12} /> Clear
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 stagger-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search company or ticker…" className="input-base pl-10" />
          </div>
          <div className="flex gap-2">
            <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-[var(--border)]">
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-lg transition-all capitalize ${filter === f ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-3)] hover:text-[var(--text)]"}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="relative">
              <button onClick={() => setShowSort(v => !v)}
                className="btn-inactive flex items-center gap-1.5 text-xs py-2 px-3">
                <SlidersHorizontal size={13} />
                {SORT_OPTIONS.find(s => s.key === sort)?.label}
              </button>
              {showSort && (
                <div className="absolute right-0 top-full mt-1 card py-1 z-20 min-w-[140px] animate-scale-in">
                  {SORT_OPTIONS.map(s => (
                    <button key={s.key} onClick={() => { setSort(s.key); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 ${sort === s.key ? "text-[var(--orange)] font-bold" : "text-[var(--text-2)]"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Count */}
        <p className="text-xs text-[var(--text-3)]">{filtered.length} companies</p>

        {/* Table */}
        {filtered.length ? (
          <div className="card overflow-hidden stagger-3">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {["Company", "Ticker", "Score", "Distress", "Signal", "Regime", "Momentum", "Risk", "Class", ""].map(h => (
                      <th key={h} className="th-base">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const ml = c.ml;
                    const score = ml?.composite_score;
                    const distress = ml?.distress_probability;
                    return (
                      <tr key={c.id} className="tr-base group">
                        <td className="td-base">
                          <p className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--orange)] transition-colors truncate max-w-[180px]">{c.name}</p>
                        </td>
                        <td className="td-base">
                          <span className="text-[11px] font-mono text-[var(--text-2)] bg-neutral-50 dark:bg-neutral-900 px-2 py-0.5 rounded-lg border border-[var(--border)]">{c.ticker || "—"}</span>
                        </td>
                        <td className="td-base"><ScoreGauge score={score} /></td>
                        <td className="td-base">
                          <span className={`text-xs font-bold tabular-nums ${(distress || 0) > 60 ? "text-red-500" : (distress || 0) > 40 ? "text-amber-500" : "text-[var(--text-2)]"}`}>
                            {distress != null ? `${distress.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                        <td className="td-base"><SignalBadge value={ml?.signal} /></td>
                        <td className="td-base"><SignalBadge value={ml?.regime} /></td>
                        <td className="td-base">
                          <span className="text-xs font-bold tabular-nums text-[var(--text-2)]">
                            {ml?.momentum != null ? ml.momentum.toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="td-base">
                          <span className={`text-xs font-bold tabular-nums ${(ml?.risk || 0) > 60 ? "text-red-500" : "text-[var(--text-2)]"}`}>
                            {ml?.risk != null ? ml.risk.toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="td-base">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                            ml?.class === "STRONG"    ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" :
                            ml?.class === "POSITIVE"  ? "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400" :
                            ml?.class === "DISTRESSED"? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400" :
                            "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}>{ml?.class || "—"}</span>
                        </td>
                        <td className="td-base">
                          <Link to={`/companies/${c.id}`} className="text-xs font-bold text-[var(--text-3)] hover:text-[var(--orange)] transition-colors flex items-center gap-1">
                            View <ArrowUpRight size={12} />
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
          <div className="card p-16 flex flex-col items-center text-center">
            <p className="title-md mb-1">No companies found</p>
            <p className="text-sm text-[var(--text-3)]">Adjust your search or run the pipeline to populate data.</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
