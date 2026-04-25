import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight, Filter, X, Building2, HeartPulse, AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";

function ScoreBar({ score }) {
  if (score == null) return <span className="text-xs text-neutral-400">—</span>;
  const color = score >= 70 ? "bg-[#00B341]" : score >= 40 ? "bg-[#FFC224]" : "bg-[#FF3B30]";
  const text = score >= 70 ? "text-[#00B341]" : score >= 40 ? "text-[#FFC224]" : "text-[#FF3B30]";
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 h-1.5 bg-neutral-900/[0.05] dark:bg-neutral-900/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className={`text-sm font-bold tabular-nums ${text}`}>{score.toFixed(0)}</span>
    </div>
  );
}

export default function Companies() {
  const { companies, latestMl, loading, isCsvMode, csvTickers, clearCsvFilter } = useAppData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const mlMap = React.useMemo(() => { const m = {}; latestMl.forEach(r => { m[r.company_id] = r; }); return m; }, [latestMl]);
  const filtered = companies.filter(c => {
    const ml = mlMap[c.id]; const q = search.toLowerCase();
    if (q && !c.name.toLowerCase().includes(q) && !(c.ticker || "").toLowerCase().includes(q)) return false;
    if (filter === "healthy") return (ml?.survival_score ?? 0) >= 70;
    if (filter === "watch") return (ml?.survival_score ?? 0) >= 40 && (ml?.survival_score ?? 0) < 70;
    if (filter === "distress") return (ml?.survival_score ?? 101) < 40;
    return true;
  });

  const stats = React.useMemo(() => ({
    total: companies.length, healthy: latestMl.filter(r => r.survival_score >= 70).length,
    watch: latestMl.filter(r => r.survival_score >= 40 && r.survival_score < 70).length,
    distress: latestMl.filter(r => r.survival_score < 40).length,
  }), [companies, latestMl]);

  if (loading) return <PageLayout title="Companies"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Companies">
      <div className="space-y-8 pb-12">

        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="page-heading">Companies</h1>
          <p className="page-subheading">Track and analyze all companies across the portfolio, filtered by real-time ML risk predictions.</p>
        </div>

        {/* ── Hero Stats ──────────────────────────────── */}
        <div className="card-dark relative overflow-hidden p-8 stagger-1">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-orange/15 to-transparent blur-[80px] pointer-events-none" />
          
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Total", value: stats.total, icon: Building2, color: "text-neutral-900 dark:text-white" },
              { label: "Healthy", value: stats.healthy, icon: HeartPulse, color: "text-[#00B341]" },
              { label: "Watch", value: stats.watch, icon: AlertTriangle, color: "text-[#FFC224]" },
              { label: "Distress", value: stats.distress, icon: ShieldAlert, color: "text-[#FF3B30]" },
            ].map(({ label, value, icon: Icon, color }, i) => (
              <div key={label} className={`bg-neutral-900/[0.03] dark:bg-white/[0.03] border border-neutral-900/[0.05] dark:border-white/[0.05] rounded-2xl p-6 hover:bg-neutral-900/[0.06] dark:bg-white/[0.06] transition-all animate-slide-up`} style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-3 mb-4">
                  <Icon size={18} className={`${color} opacity-80`} />
                  <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">{label}</p>
                </div>
                <p className={`value-xl ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CSV Banner */}
        {isCsvMode && (
          <div className="flex items-center justify-between p-4 card-glass border-brand-orange/20 stagger-2">
            <div className="flex items-center gap-3">
              <Filter size={16} className="text-brand-orange" />
              <p className="text-sm font-semibold text-brand-orange">Showing {companies.length} from CSV ({csvTickers?.length} tickers)</p>
            </div>
            <button onClick={clearCsvFilter} className="btn-inactive text-xs py-1.5"><X size={14} /> Clear filter</button>
          </div>
        )}

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-4 stagger-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or ticker…" className="input-base w-full pl-11 text-base" />
          </div>
          <div className="flex bg-neutral-900/[0.04] dark:bg-neutral-900/[0.04] dark:bg-white/[0.04] p-1.5 rounded-xl border border-neutral-900/[0.05] dark:border-neutral-900/[0.05] dark:border-white/[0.05]">
            {["all", "healthy", "watch", "distress"].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${filter === f ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}>{f}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filtered.length ? (
          <div className="card-glass overflow-hidden stagger-3">
            <div className="px-6 py-5 border-b border-neutral-900/[0.08] dark:border-neutral-900/[0.08] dark:border-white/[0.08] bg-neutral-900/[0.02] dark:bg-white/[0.01]">
              <p className="title-md">{filtered.length} companies found</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-neutral-900/[0.02] dark:bg-white/[0.01]">
                    {["Company", "Ticker", "Exchange", "Survival Score", "Distress %", "Status", ""].map(h => <th key={h} className="th-base">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const ml = mlMap[c.id]; const score = ml?.survival_score; const distress = ml?.distress_probability;
                    const status = score == null ? "gray" : score >= 70 ? "green" : score >= 40 ? "amber" : "red";
                    return (
                      <tr key={c.id} className="tr-base group">
                        <td className="td-base"><p className="text-base font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-brand-orange transition-colors">{c.name}</p></td>
                        <td className="td-base"><span className="text-[11px] font-mono font-semibold text-neutral-500 bg-neutral-900/[0.05] dark:bg-neutral-900/[0.05] dark:bg-white/[0.05] px-2.5 py-1 rounded-lg">{c.ticker || "—"}</span></td>
                        <td className="td-base"><span className="text-xs text-neutral-500 font-mono">{c.exchange || "NSE"}</span></td>
                        <td className="td-base"><ScoreBar score={score} /></td>
                        <td className="td-base"><span className={`text-sm font-bold tabular-nums ${distress != null && distress > 60 ? "text-[#FF3B30]" : "text-neutral-500"}`}>{distress != null ? `${distress.toFixed(1)}%` : "—"}</span></td>
                        <td className="td-base"><SignalBadge value={status} /></td>
                        <td className="td-base"><Link to={`/companies/${c.id}`} className="text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-brand-orange transition-colors flex items-center gap-1.5">View <ArrowUpRight size={14} /></Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card-glass p-16 flex flex-col items-center text-center stagger-3">
            <div className="w-20 h-20 rounded-3xl bg-neutral-900/[0.04] dark:bg-neutral-900/[0.04] dark:bg-white/[0.04] border border-neutral-900/[0.05] dark:border-neutral-900/[0.05] dark:border-white/[0.05] flex items-center justify-center mb-6 animate-float">
              <Sparkles size={32} className="text-neutral-400" />
            </div>
            <h3 className="title-lg mb-2">No companies found</h3>
            <p className="muted">Run the pipeline to populate company data, or adjust your search filters.</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
