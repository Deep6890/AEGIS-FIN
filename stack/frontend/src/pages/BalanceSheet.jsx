import React, { useEffect, useState } from "react";
import { Search, BarChart2, TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { fetchBalanceSheet, fetchBalanceSheetHistory } from "../lib/api";

export default function BalanceSheet() {
  const { companies, loading } = useAppData();
  const [search, setSearch]         = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedRatio, setSelectedRatio]     = useState(null);
  const [balance, setBalance]       = useState([]);
  const [ratioHistory, setRatioHistory] = useState([]);
  const [bsLoading, setBsLoading]   = useState(false);

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.ticker || "").toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selectedCompany) return;
    setBsLoading(true);
    fetchBalanceSheet(selectedCompany).then(r => {
      setBalance(r.data || []);
      setSelectedRatio(null);
      setRatioHistory([]);
    }).finally(() => setBsLoading(false));
  }, [selectedCompany]);

  useEffect(() => {
    if (!selectedCompany || !selectedRatio) return;
    fetchBalanceSheetHistory(selectedCompany, selectedRatio).then(r => {
      setRatioHistory(r.data || []);
    });
  }, [selectedCompany, selectedRatio]);

  // Latest snapshot per ratio
  const latestBs = React.useMemo(() => {
    const m = {};
    balance.forEach(r => { if (!m[r.ratio]) m[r.ratio] = r; });
    return m;
  }, [balance]);

  const categories = [...new Set(Object.values(latestBs).map(r => r.category))].filter(Boolean);
  const selectedComp = companies.find(c => c.id === selectedCompany);

  if (loading) return <PageLayout title="Balance Sheet"><LoadingSpinner /></PageLayout>;

  return (
    <PageLayout title="Balance Sheet Analysis">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Company Picker */}
        <div className="space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search company..."
              className="w-full pl-8 pr-3 py-2 text-xs input-base"
            />
          </div>
          <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
            {filtered.slice(0, 100).map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCompany(c.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all ${
                  selectedCompany === c.id
                    ? "bg-black dark:bg-[#FFC224] text-[#FFC224] dark:text-black font-black"
                    : "hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-700 dark:text-gray-300"
                }`}
              >
                <p className="font-bold">{c.name}</p>
                <p className={`font-mono text-[10px] ${selectedCompany === c.id ? "text-[#FFC224]/70 dark:text-black/60" : "text-gray-400"}`}>{c.ticker}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedCompany ? (
            <div className="card p-10 flex items-center justify-center">
              <p className="text-sm text-gray-400">Select a company to view balance sheet</p>
            </div>
          ) : bsLoading ? <LoadingSpinner /> : (
            <>
              <p className="section-title">{selectedComp?.name} · Balance Sheet</p>

              {/* Status Summary */}
              {Object.keys(latestBs).length > 0 && (() => {
                const statuses = Object.values(latestBs).map(r => r.status);
                const counts = { green: 0, amber: 0, red: 0, gray: 0 };
                statuses.forEach(s => { if (counts[s] !== undefined) counts[s]++; });
                return (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bento-green text-center">
                      <p className="text-2xl font-black text-white">{counts.green}</p>
                      <p className="text-xs text-white/70 mt-1">Healthy</p>
                    </div>
                    <div className="bento-yellow text-center">
                      <p className="text-2xl font-black text-black">{counts.amber}</p>
                      <p className="text-xs text-black/60 mt-1">Caution</p>
                    </div>
                    <div className="bento-white text-center">
                      <p className="text-2xl font-black text-red-500">{counts.red}</p>
                      <p className="stat-label mt-1">Critical</p>
                    </div>
                    <div className="bento-white text-center">
                      <p className="text-2xl font-black text-gray-400">{counts.gray}</p>
                      <p className="stat-label mt-1">No Data</p>
                    </div>
                  </div>
                );
              })()}

              {/* Ratio History Chart */}
              {selectedRatio && ratioHistory.length > 0 && (
                <div className="card p-5">
                  <p className="section-title mb-4">{selectedRatio} — Historical Trend</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={ratioHistory}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                      <Line type="monotone" dataKey="value" stroke="#FF8A00" strokeWidth={2} dot={{ r: 3, fill: "#FF8A00" }} name={selectedRatio} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Categories */}
              {categories.length ? categories.map(cat => {
                const rows = Object.values(latestBs).filter(r => r.category === cat);
                return (
                  <div key={cat} className="card p-5">
                    <p className="section-title mb-3">{cat}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-[#1f1f1f]">
                            {["Ratio","Value","YoY %","Hist Rank","Status","Trend","Sector Pressure","Adj Status"].map(h => (
                              <th key={h} className="th-base">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(r => (
                            <tr
                              key={r.id}
                              onClick={() => setSelectedRatio(r.ratio)}
                              className={`border-b border-gray-50 dark:border-[#1a1a1a] cursor-pointer transition-colors ${
                                selectedRatio === r.ratio
                                  ? "bg-[#FFC224]/10"
                                  : "hover:bg-[#FFC224]/5"
                              }`}
                            >
                              <td className="td-base font-bold text-gray-800 dark:text-gray-200 text-xs">{r.ratio}</td>
                              <td className="td-base text-xs">{r.value_str || r.value?.toFixed(2) || "—"}</td>
                              <td className="td-base text-xs">
                                {r.yoy_pct != null ? (
                                  <span className={r.yoy_pct >= 0 ? "text-[#00B341] font-bold" : "text-red-500 font-bold"}>
                                    {r.yoy_pct >= 0 ? "▲" : "▼"} {Math.abs(r.yoy_pct).toFixed(1)}%
                                  </span>
                                ) : "—"}
                              </td>
                              <td className="td-base text-xs">{r.hist_pct_rank != null ? `${r.hist_pct_rank.toFixed(0)}p` : "—"}</td>
                              <td className="td-base"><SignalBadge value={r.status} /></td>
                              <td className="td-base text-xs">{r.trend || "—"}</td>
                              <td className="td-base text-xs">{r.sector_pressure?.toFixed(2) ?? "—"}</td>
                              <td className="td-base"><SignalBadge value={r.adjusted_status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {selectedRatio && <p className="text-xs text-[#FF8A00] mt-2">Click a ratio row to view its historical trend</p>}
                  </div>
                );
              }) : <EmptyState title="No balance sheet data" sub="Run the pipeline to populate financial ratios." />}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
