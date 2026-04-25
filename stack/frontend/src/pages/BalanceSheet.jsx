import React, { useEffect, useState } from "react";
import { Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import LoadingSpinner, { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { fetchBalanceSheet } from "../lib/api";

const STATUS_STYLE = {
  green:  "badge-green",
  amber:  "badge-amber",
  red:    "badge-red",
};

const RATIO_LABELS = {
  de_ratio:          "D/E Ratio",
  current_ratio:     "Current Ratio",
  revenue_growth:    "Revenue Growth",
  ebitda_margin:     "EBITDA Margin",
  roe:               "ROE",
  interest_coverage: "Interest Coverage",
  equity_growth:     "Equity Growth",
  debt_growth:       "Debt Growth",
};

function ChangeIndicator({ val }) {
  if (val == null) return <span className="text-[#9CA3AF]">—</span>;
  const color = val > 5 ? "text-[#52B788]" : val < -5 ? "text-red-400" : "text-[#9CA3AF]";
  const Icon  = val > 5 ? TrendingUp : val < -5 ? TrendingDown : Minus;
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold tabular-nums ${color}`}>
      <Icon size={11} /> {val > 0 ? "+" : ""}{val.toFixed(1)}%
    </span>
  );
}

export default function BalanceSheet() {
  const { companies, loading } = useAppData();
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch]         = useState("");
  const [bsData, setBsData]         = useState(null);
  const [bsLoading, setBsLoading]   = useState(false);

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.ticker || "").toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selectedId) return;
    setBsLoading(true);
    fetchBalanceSheet(selectedId).then(r => setBsData(r.data || null)).finally(() => setBsLoading(false));
  }, [selectedId]);

  const selectedComp = companies.find(c => c.id === selectedId);

  if (loading) return <PageLayout title="Balance Sheet"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Balance Sheet · Financial Ratios">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Company selector */}
        <div className="space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company…" className="w-full pl-9 pr-3 py-2.5 text-xs input-base" />
          </div>
          <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            {filtered.slice(0, 100).map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all duration-200 ${
                  selectedId === c.id
                    ? "bg-[#0D0D0D] dark:bg-[#E8C547] text-[#E8C547] dark:text-[#0D0D0D] font-bold shadow-sm"
                    : "text-[#6B7280] hover:bg-[#F7F5F0] dark:hover:bg-[#22252E] hover:text-[#0D0D0D] dark:hover:text-white"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedId ? (
            <div className="card p-16 flex items-center justify-center">
              <p className="text-sm text-[#9CA3AF]">Select a company to view balance sheet analysis</p>
            </div>
          ) : bsLoading ? <LoadingSpinner /> : !bsData ? (
            <EmptyState title="No balance sheet data" sub="Run the pipeline for this company." />
          ) : (
            <>
              <div className="card-ink p-5 rounded-2xl">
                <p className="label text-white/40 mb-1">Balance Sheet Analysis</p>
                <p className="text-xl font-black text-[#E8C547]">{selectedComp?.name}</p>
                {bsData.quarter && <p className="text-xs text-white/40 mt-1">Latest: {bsData.quarter}</p>}
              </div>

              {/* Ratio cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(RATIO_LABELS).map(([key, label]) => {
                  const value  = bsData[key];
                  const pct    = bsData[`${key}_percentile`];
                  const yoy    = bsData[`${key}_yoy`];
                  const status = bsData[`${key}_status`] || "gray";
                  const color  = pct >= 70 ? "bar-high" : pct >= 40 ? "bar-mid" : "bar-low";

                  return (
                    <div key={key} className="card p-4 hover-lift">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-[#0D0D0D] dark:text-[#E8E6E0]">{label}</p>
                        <span className={STATUS_STYLE[status] || "badge-gray"}>{status}</span>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="value-lg">
                            {value != null ? (typeof value === "number" ? value.toFixed(2) : value) : "—"}
                          </p>
                          {yoy != null && <div className="mt-1"><ChangeIndicator val={yoy} /></div>}
                        </div>
                        {pct != null && (
                          <div className="text-right">
                            <p className="label mb-1">Percentile</p>
                            <div className="flex items-center gap-2">
                              <div className="progress-track w-14">
                                <div className={`progress-fill ${color}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-bold tabular-nums text-[#6B7280]">{pct.toFixed(0)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      {bsData[`${key}_sector_overlay`] && (
                        <div className="mt-3 pt-2 border-t border-[#E5E1D8]/50 dark:border-[#1F2128]/50">
                          <p className="text-[10px] text-[#9CA3AF]">
                            <span className="font-bold text-[#E8C547]">Sector overlay:</span>{" "}
                            {bsData[`${key}_sector_overlay`]}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
