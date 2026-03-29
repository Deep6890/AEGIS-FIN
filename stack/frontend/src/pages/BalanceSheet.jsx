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
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            />
          </div>
          <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
            {filtered.slice(0, 100).map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCompany(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                  selectedCompany === c.id
                    ? "bg-orange-500 text-white"
                    : "hover:bg-orange-50 text-gray-700"
                }`}
              >
                <p className="font-medium">{c.name}</p>
                <p className={`font-mono ${selectedCompany === c.id ? "text-orange-100" : "text-gray-400"}`}>{c.ticker}</p>
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
                    {[
                      { label: "Healthy",  count: counts.green, color: "text-emerald-600" },
                      { label: "Caution",  count: counts.amber, color: "text-amber-600"   },
                      { label: "Critical", count: counts.red,   color: "text-red-600"     },
                      { label: "No Data",  count: counts.gray,  color: "text-gray-400"    },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="card p-4 text-center">
                        <p className={`text-2xl font-bold ${color}`}>{count}</p>
                        <p className="text-xs text-gray-500 mt-1">{label}</p>
                      </div>
                    ))}
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
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} name={selectedRatio} />
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
                          <tr className="border-b border-gray-100">
                            {["Ratio","Value","YoY %","Hist Rank","Status","Trend","Sector Pressure","Adj Status"].map(h => (
                              <th key={h} className="text-left py-2 px-3 stat-label">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(r => (
                            <tr
                              key={r.id}
                              onClick={() => setSelectedRatio(r.ratio)}
                              className={`border-b border-gray-50 cursor-pointer transition-colors ${
                                selectedRatio === r.ratio ? "bg-orange-50" : "hover:bg-orange-50/20"
                              }`}
                            >
                              <td className="py-2 px-3 font-medium text-gray-800 text-xs">{r.ratio}</td>
                              <td className="py-2 px-3 text-xs">{r.value_str || r.value?.toFixed(2) || "—"}</td>
                              <td className="py-2 px-3 text-xs">
                                {r.yoy_pct != null ? (
                                  <span className={r.yoy_pct >= 0 ? "text-emerald-600" : "text-red-500"}>
                                    {r.yoy_pct >= 0 ? "▲" : "▼"} {Math.abs(r.yoy_pct).toFixed(1)}%
                                  </span>
                                ) : "—"}
                              </td>
                              <td className="py-2 px-3 text-xs">{r.hist_pct_rank != null ? `${r.hist_pct_rank.toFixed(0)}p` : "—"}</td>
                              <td className="py-2 px-3"><SignalBadge value={r.status} /></td>
                              <td className="py-2 px-3 text-xs">{r.trend || "—"}</td>
                              <td className="py-2 px-3 text-xs">{r.sector_pressure?.toFixed(2) ?? "—"}</td>
                              <td className="py-2 px-3"><SignalBadge value={r.adjusted_status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {selectedRatio && <p className="text-xs text-orange-400 mt-2">Click a ratio row to view its historical trend</p>}
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
