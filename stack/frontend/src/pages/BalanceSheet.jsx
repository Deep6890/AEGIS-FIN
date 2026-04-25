import React, { useEffect, useState, useMemo } from "react";
import { Search, Building2, FileSpreadsheet, TrendingUp, DollarSign, Activity, Scale, Percent, Eye, ChevronDown, ShieldAlert } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { fetchBalanceSheet } from "../lib/api";

const RATIO_ICONS = {
  "Gross Margin %": Percent,
  "Net Profit Margin %": Percent,
  "EBITDA Margin %": Percent,
  "ROE %": TrendingUp,
  "ROA %": TrendingUp,
  "Current Ratio": Activity,
  "Quick Ratio": Activity,
  "Cash Ratio": DollarSign,
  "Debt/Equity": Scale,
  "Debt/Assets": Scale,
  "Interest Coverage": ShieldAlert,
  "Asset Turnover": Activity,
  "Inventory Turnover": Activity,
  "Receivables Turnover": Activity,
  "CFO/Net Income": DollarSign,
  "FCF Margin %": Percent,
  "Revenue Growth %": TrendingUp,
  "Net Income Growth %": TrendingUp,
  "Equity Ratio": Scale,
  "Equity Growth %": TrendingUp,
};

export default function BalanceSheet() {
  const { companies } = useAppData();
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [ratios, setRatios] = useState([]);
  const [loading, setLoading] = useState(false);

  const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.ticker || "").toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!selectedCompany) return;
    setLoading(true);
    fetchBalanceSheet(selectedCompany)
      .then(res => setRatios(res.data || []))
      .finally(() => setLoading(false));
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
      <div className="space-y-8 pb-12">
        <div className="animate-fade-in mb-8">
          <h1 className="page-heading">Balance Sheet Analysis</h1>
          <p className="page-subheading">Quarterly fundamental ratios, YoY growth, and sector-relative pressure analysis.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
          {/* Company Picker */}
          <div className="space-y-4">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company..." className="w-full pl-11 pr-4 py-3 text-sm input-base" />
            </div>
            <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-2">
              {filtered.slice(0, 100).map(c => (
                <button key={c.id} onClick={() => setSelectedCompany(c.id)}
                  className={`w-full text-left px-5 py-4 rounded-2xl transition-all duration-200 border ${
                    selectedCompany === c.id ? "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-sm" : "bg-neutral-900/[0.02] dark:bg-neutral-900/[0.02] dark:bg-white/[0.02] border-transparent hover:bg-neutral-900/[0.05] dark:hover:bg-neutral-900/[0.05] dark:bg-white/[0.05]"
                  }`}>
                  <p className="font-semibold text-base text-neutral-900 dark:text-neutral-100 truncate tracking-tight">{c.name}</p>
                  <p className="font-mono text-[11px] mt-1 text-neutral-500">{c.ticker}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-3 space-y-6">
            {!selectedCompany ? (
              <div className="card-dark p-12 lg:p-20 flex flex-col items-center text-center relative overflow-hidden h-[calc(100vh-260px)] min-h-[500px]">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 to-transparent blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-orange/10 to-transparent blur-[80px] pointer-events-none" />
                
                <div className="relative m-auto flex flex-col items-center">
                  <div className="w-24 h-24 rounded-3xl bg-neutral-900/[0.04] dark:bg-white/[0.04] border border-neutral-900/[0.08] dark:border-white/[0.08] flex items-center justify-center mb-8 animate-float">
                    <FileSpreadsheet size={40} className="text-neutral-900 dark:text-white opacity-80" />
                  </div>
                  <h3 className="value-lg text-neutral-900 dark:text-white mb-4 tracking-tighter">Fundamental Analysis</h3>
                  <p className="text-base text-neutral-400 max-w-lg leading-relaxed mb-8">
                    Select a company to view comprehensive financial health metrics across profitability, liquidity, leverage, efficiency, and growth.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                    {Object.keys(RATIO_ICONS).slice(0, 4).map(k => {
                      const Icon = RATIO_ICONS[k];
                      return (
                        <div key={k} className="flex items-center gap-3 bg-neutral-900/[0.03] dark:bg-white/[0.03] border border-neutral-900/[0.05] dark:border-white/[0.05] px-4 py-3 rounded-xl">
                          <Icon size={16} className="text-neutral-400" />
                          <span className="text-xs font-semibold text-neutral-300 truncate">{k}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : loading ? <div className="h-64 flex items-center justify-center"><LoadingSpinner /></div> : (
              <>
                <div className="card-dark p-8 flex items-center justify-between">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-brand-orange/10 blur-[100px] pointer-events-none" />
                  <div className="relative">
                    <p className="value-lg text-neutral-900 dark:text-white mb-1">{selectedComp?.name}</p>
                    <p className="text-sm font-mono text-neutral-400">{selectedComp?.ticker}</p>
                  </div>
                  <div className="relative w-14 h-14 rounded-2xl bg-neutral-900/[0.05] dark:bg-white/[0.05] border border-neutral-900/[0.1] dark:border-white/[0.1] flex items-center justify-center">
                    <Building2 size={24} className="text-neutral-900 dark:text-white opacity-80" />
                  </div>
                </div>

                {Object.keys(groupedRatios).length === 0 ? <EmptyState title="No balance sheet data" sub="Run the pipeline to populate fundamentals." /> : (
                  <div className="space-y-8">
                    {Object.entries(groupedRatios).map(([category, items]) => (
                      <div key={category} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <h3 className="title-md">{category}</h3>
                          <div className="h-px flex-1 bg-neutral-900/[0.05] dark:bg-neutral-900/[0.05] dark:bg-white/[0.05]" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {items.map(r => {
                            const ratioName = r.ratio_definitions?.name || "Ratio";
                            const Icon = RATIO_ICONS[ratioName] || Activity;
                            return (
                              <div key={r.id || ratioName} className="card-glass p-5 group hover:border-brand-orange/30 transition-all">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <Icon size={14} className="text-neutral-400 group-hover:text-brand-orange transition-colors" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{ratioName}</p>
                                  </div>
                                  <SignalBadge value={r.status} />
                                </div>
                                <div className="flex items-end justify-between">
                                  <div>
                                    <p className="text-2xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">{r.value?.toFixed(2)}</p>
                                    {r.yoy_pct != null && (
                                      <p className={`text-xs font-semibold tabular-nums mt-1 flex items-center gap-1 ${r.yoy_pct >= 0 ? "text-[#00B341]" : "text-[#FF3B30]"}`}>
                                        {r.yoy_pct >= 0 ? "↑" : "↓"} {Math.abs(r.yoy_pct).toFixed(1)}% YoY
                                      </p>
                                    )}
                                  </div>
                                  {r.sector_direction && (
                                    <div className="text-right">
                                      <p className="text-[9px] text-neutral-400 uppercase tracking-widest mb-0.5">Vs Sector</p>
                                      <span className={`text-[10px] font-bold uppercase ${r.sector_direction === "outperforming" ? "text-[#00B341]" : "text-[#FF3B30]"}`}>{r.sector_direction}</span>
                                    </div>
                                  )}
                                </div>
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
