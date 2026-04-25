import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronRight, Filter, X, Building2, CheckCircle, Eye, AlertTriangle } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";

function ScoreBar({ score }) {
  if (score == null) return <span className="muted">—</span>;
  const pct   = Math.min(100, score);
  const color = score >= 70 ? "bar-high" : score >= 40 ? "bar-mid" : "bar-low";
  const text  = score >= 70 ? "score-high" : score >= 40 ? "score-mid" : "score-low";
  return (
    <div className="flex items-center gap-2">
      <div className="progress-track w-16">
        <div className={`progress-fill ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold ${text}`}>{score.toFixed(0)}</span>
    </div>
  );
}

const FILTERS = ["all", "healthy", "watch", "distress"];

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
    const scored = latestMl;
    return {
      total:    companies.length,
      healthy:  scored.filter(r => r.survival_score >= 70).length,
      watch:    scored.filter(r => r.survival_score >= 40 && r.survival_score < 70).length,
      distress: scored.filter(r => r.survival_score < 40).length,
    };
  }, [companies, latestMl]);

  if (loading) return <PageLayout title="Companies"><LoadingSpinner /></PageLayout>;

  return (
    <PageLayout title="Companies">
      <div className="space-y-4">

        {/* Summary bento row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Building2,    label: "Total",    value: stats.total,    cls: "card p-4" },
            { icon: CheckCircle,  label: "Healthy",  value: stats.healthy,  cls: "card-green p-4" },
            { icon: Eye,          label: "Watch",    value: stats.watch,    cls: "card-yellow p-4" },
            { icon: AlertTriangle,label: "Distress", value: stats.distress, cls: "card p-4" },
          ].map(({ icon: Icon, label, value, cls }) => (
            <div key={label} className={`${cls} rounded-2xl`}>
              <p className="label mb-1 opacity-70">{label}</p>
              <p className="value-lg">{value}</p>
            </div>
          ))}
        </div>

        {/* CSV banner */}
        {isCsvMode && (
          <div className="flex items-center justify-between p-3 insight-box">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-[#E8A020]" />
              <p className="text-xs font-semibold text-[#8B6914] dark:text-[#E8C547]">
                Showing {companies.length} companies from CSV ({csvTickers?.length} tickers)
              </p>
            </div>
            <button onClick={clearCsvFilter} className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-red-500 transition-colors">
              <X size={12} /> Show all
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
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
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all ${
                  filter === f ? "btn-active" : "btn-inactive"
                }`}
              >
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
                <thead className="bg-[#F5F2EC] dark:bg-[#111318] border-b border-[#E5E1D8] dark:border-[#1F2128]">
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
                      <tr key={c.id} className="tr-base">
                        <td className="td-base">
                          <p className="text-sm font-semibold text-[#0D0D0D] dark:text-[#E8E6E0]">{c.name}</p>
                        </td>
                        <td className="td-base">
                          <span className="text-xs font-mono text-[#6B7280]">{c.ticker || "—"}</span>
                        </td>
                        <td className="td-base">
                          <span className="text-xs text-[#6B7280]">{c.exchange || "NSE"}</span>
                        </td>
                        <td className="td-base"><ScoreBar score={score} /></td>
                        <td className="td-base">
                          <span className={`text-xs font-semibold ${distress != null && distress > 60 ? "text-red-500" : "text-[#6B7280]"}`}>
                            {distress != null ? `${distress.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                        <td className="td-base"><SignalBadge value={status} /></td>
                        <td className="td-base">
                          <Link
                            to={`/companies/${c.id}`}
                            className="flex items-center gap-1 text-xs font-semibold text-[#0D0D0D] dark:text-[#E8E6E0] hover:text-[#E8A020] transition-colors"
                          >
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
