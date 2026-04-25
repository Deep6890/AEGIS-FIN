import React, { useEffect, useState, useMemo } from "react";
import { Search, Building2, FileSpreadsheet, TrendingUp, DollarSign, Activity, Scale, Percent, ShieldAlert } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { fetchBalanceSheet } from "../lib/api";

const RATIO_ICONS = {
  "Gross Margin %": Percent, "Net Profit Margin %": Percent, "EBITDA Margin %": Percent,
  "ROE %": TrendingUp, "ROA %": TrendingUp,
  "Current Ratio": Activity, "Quick Ratio": Activity, "Cash Ratio": DollarSign,
  "Debt/Equity": Scale, "Debt/Assets": Scale, "Interest Coverage": ShieldAlert,
  "Asset Turnover": Activity, "Inventory Turnover": Activity, "Receivables Turnover": Activity,
  "CFO/Net Income": DollarSign, "FCF Margin %": Percent,
  "Revenue Growth %": TrendingUp, "Net Income Growth %": TrendingUp,
  "Equity Ratio": Scale, "Equity Growth %": TrendingUp,
};

export default function BalanceSheet() {
  const { companies } = useAppData();
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [ratios, setRatios] = useState([]);
  const [loading, setLoading] = useState(false);

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.ticker || "").toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selectedCompany) return;
    setLoading(true);
    fetchBalanceSheet(selectedCompany).then(res => setRatios(res.data || [])).finally(() => setLoading(false));
  }, [selectedCompany]);

  const selectedComp = companies.find(c => c.id === selectedCompany);

  const groupedRatios = useMemo(() => {
    const groups = {};
    ratios.forEach(r => {
      const cat = r.ratio_definitions?.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(r);
    });
    return groups;
  }, [ratios]);

  return (
    <PageLayout title="Balance Sheet">
      <div className="space-y-5 pb-10">
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Fundamentals</p>
          <h1 className="page-heading">Balance Sheet Analysis</h1>
          <p className="page-subheading">Quarterly fundamental ratios, YoY growth, and sector-relative pressure analysis across 20 financial metrics.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 animate-fade-in">
          {/* Company picker */}
          <div className="space-y-3">
            <p className="title-md">Select Company</p>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company…" className="input-base pl-10" />
            </div>
            <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {filtered.slice(0, 100).map(c => (
                <button key={c.id} onClick={() => setSelectedCompany(c.id)}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border ${
                    selectedCompany === c.id
                      ? "bg-[var(--surface)] border-[var(--orange)]/30 shadow-sm"
                      : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--orange)]/20"
                  }`}>
                  <p className="text-sm font-semibold text-[var(--text)] truncate">{c.name}</p>
                  <p className="text-[11px] font-mono text-[var(--text-3)] mt-0.5">{c.ticker}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3 space-y-5">
            {!selectedCompany ? (
              <div className="card flex flex-col items-center justify-center text-center p-16 h-[calc(100vh-260px)] min-h-[500px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[var(--orange)]/5 blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[var(--orange)]/3 blur-[60px] pointer-events-none" />
                <div className="w-20 h-20 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] flex items-center justify-center mb-6 animate-float">
                  <FileSpreadsheet size={36} className="text-[var(--text-3)]" />
                </div>
                <h3 className="title-lg mb-2">Fundamental Analysis</h3>
                <p className="text-sm text-[var(--text-3)] max-w-md leading-relaxed mb-6">
                  Select a company to view comprehensive financial health metrics across profitability, liquidity, leverage, efficiency, and growth.
                </p>
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                  {["Gross Margin %", "Debt/Equity", "Current Ratio", "ROE %"].map(k => {
                    const Icon = RATIO_ICONS[k] || Activity;
                    return (
                      <div key={k} className="flex items-center gap-2.5 bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] px-3 py-2.5 rounded-xl">
                        <Icon size={14} className="text-[var(--orange)] shrink-0" />
                        <span className="text-xs font-medium text-[var(--text-2)] truncate">{k}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : loading ? (
              <div className="h-64 flex items-center justify-center"><LoadingSpinner /></div>
            ) : (
              <>
                {/* Company header — glass card */}
                <div className="card-glass p-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-[var(--orange)]/6 blur-[50px] pointer-events-none" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="title-lg mb-1">{selectedComp?.name}</p>
                      <p className="text-xs font-mono text-[var(--text-3)]">{selectedComp?.ticker} · Balance Sheet</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[var(--orange)]/10 flex items-center justify-center">
                      <Building2 size={22} className="text-[var(--orange)]" />
                    </div>
                  </div>
                  {/* Summary counts */}
                  {Object.keys(groupedRatios).length > 0 && (() => {
                    const all = Object.values(groupedRatios).flat();
                    const green = all.filter(r => r.status === "green").length;
                    const amber = all.filter(r => r.status === "amber").length;
                    const red   = all.filter(r => r.status === "red").length;
                    return (
                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border)]">
                        {[{ l: "Healthy", v: green, c: "text-[var(--orange)]" }, { l: "Caution", v: amber, c: "text-[var(--text-2)]" }, { l: "Critical", v: red, c: "text-[var(--text-3)]" }].map(({ l, v, c }) => (
                          <div key={l} className="text-center">
                            <p className={`text-xl font-bold tabular-nums ${c}`}>{v}</p>
                            <p className="text-[10px] text-[var(--text-3)] mt-0.5">{l}</p>
                          </div>
                        ))}
                        <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden ml-2">
                          {all.length > 0 && <div className="h-full bg-[var(--orange)] rounded-full" style={{ width: `${(green / all.length) * 100}%` }} />}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {Object.keys(groupedRatios).length === 0 ? (
                  <EmptyState title="No balance sheet data" sub="Run the pipeline to populate fundamentals." />
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedRatios).map(([category, items]) => (
                      <div key={category}>
                        <div className="flex items-center gap-3 mb-3">
                          <p className="title-md">{category}</p>
                          <div className="h-px flex-1 bg-[var(--border)]" />
                          <span className="text-xs text-[var(--text-3)]">{items.length} ratios</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {items.map(r => {
                            const ratioName = r.ratio_definitions?.name || "Ratio";
                            const Icon = RATIO_ICONS[ratioName] || Activity;
                            return (
                              <div key={r.id || ratioName} className="card p-5 group hover:border-[var(--orange)]/30 hover:-translate-y-0.5 transition-all duration-200">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-[var(--orange)]/8 flex items-center justify-center group-hover:bg-[var(--orange)] transition-colors duration-200">
                                      <Icon size={13} className="text-[var(--orange)] group-hover:text-white transition-colors duration-200" />
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">{ratioName}</p>
                                  </div>
                                  <SignalBadge value={r.status} />
                                </div>
                                <p className="text-2xl font-bold tabular-nums text-[var(--text)] mb-1">
                                  {r.value != null ? r.value.toFixed(2) : "—"}
                                </p>
                                {r.yoy_pct != null && (
                                  <p className={`text-xs font-semibold tabular-nums flex items-center gap-1 ${r.yoy_pct >= 0 ? "text-[var(--orange)]" : "text-[var(--text-3)]"}`}>
                                    {r.yoy_pct >= 0 ? "↑" : "↓"} {Math.abs(r.yoy_pct).toFixed(1)}% YoY
                                  </p>
                                )}
                                {r.ratio_definitions?.description && (
                                  <p className="text-[10px] text-[var(--text-3)] mt-2 leading-relaxed">{r.ratio_definitions.description}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
