import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { fetchStaticCorr, fetchRollingCorr, fetchTopSectors } from "../lib/api";

const COLORS = ["#FF8A00","#3b82f6","#00B341","#FFC224","#ef4444","#8b5cf6","#06b6d4","#84cc16","#ec4899","#14b8a6","#f43f5e","#a78bfa"];

function CorrCell({ value }) {
  if (value == null) return <td className="py-1.5 px-2 text-xs text-gray-300 dark:text-gray-600 text-center">—</td>;
  const abs = Math.abs(value);
  const bg = value > 0
    ? `rgba(255,138,0,${abs * 0.8})`
    : `rgba(59,130,246,${abs * 0.8})`;
  return (
    <td className="py-1.5 px-2 text-xs text-center font-mono" style={{ background: bg, color: abs > 0.5 ? "#fff" : "#374151" }}>
      {value.toFixed(2)}
    </td>
  );
}

export default function Correlation() {
  const { companies, sectors } = useAppData();
  const [search, setSearch]         = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [window_, setWindow]        = useState(60);
  const [staticCorr, setStaticCorr] = useState([]);
  const [rollingCorr, setRollingCorr] = useState([]);
  const [topSectors, setTopSectors] = useState([]);
  const [loading, setLoading]       = useState(false);

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.ticker || "").toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selectedCompany) return;
    setLoading(true);
    Promise.all([
      fetchStaticCorr(selectedCompany),
      fetchRollingCorr(selectedCompany, window_),
      fetchTopSectors(selectedCompany),
    ]).then(([sc, rc, ts]) => {
      setStaticCorr(sc.data || []);
      setRollingCorr(rc.data || []);
      setTopSectors(ts.data || []);
    }).finally(() => setLoading(false));
  }, [selectedCompany, window_]);

  // Build static corr matrix: latest per sector
  const staticMap = React.useMemo(() => {
    const m = {};
    staticCorr.forEach(r => { if (!m[r.sector_id]) m[r.sector_id] = r; });
    return m;
  }, [staticCorr]);

  // Build rolling corr chart data: group by date, one line per sector
  const rollingChartData = React.useMemo(() => {
    const byDate = {};
    rollingCorr.forEach(r => {
      const d = r.date;
      if (!byDate[d]) byDate[d] = { date: d.slice(5) };
      const sName = r.sectors?.name?.replace(" Sector","").replace(" Nifty","") || `S${r.sector_id}`;
      byDate[d][sName] = r.return_1d?.toFixed(3);
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [rollingCorr]);

  const sectorNames = [...new Set(rollingCorr.map(r => r.sectors?.name?.replace(" Sector","").replace(" Nifty","") || `S${r.sector_id}`))];

  const selectedComp = companies.find(c => c.id === selectedCompany);

  return (
    <PageLayout title="Correlation Explorer">
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
              <p className="text-sm text-gray-400">Select a company to explore correlations</p>
            </div>
          ) : loading ? <LoadingSpinner /> : (
            <>
              <div className="flex items-center justify-between">
                <p className="section-title">{selectedComp?.name} · Correlation Analysis</p>
                <div className="flex gap-2">
                  {[20, 60, 100].map(w => (
                    <button
                      key={w}
                      onClick={() => setWindow(w)}
                      className={`px-3 py-1.5 text-xs font-black rounded-xl border transition-all ${
                        window_ === w
                          ? "bg-black dark:bg-[#FFC224] text-[#FFC224] dark:text-black border-black dark:border-[#FFC224]"
                          : "bg-white dark:bg-[#111] border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:border-black dark:hover:border-[#FFC224]"
                      }`}
                    >
                      {w}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Top Sectors */}
              {topSectors.length > 0 && (
                <div className="card p-5">
                  <p className="section-title mb-3">Top Correlated Sectors</p>
                  <div className="flex flex-wrap gap-2">
                    {topSectors.slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center gap-2 px-3 py-2 bg-[#FFC224]/10 border border-[#FFC224]/20 rounded-2xl">
                        <span className="w-5 h-5 rounded-full bg-black text-[#FFC224] text-xs font-black flex items-center justify-center">{r.rank}</span>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{r.sectors?.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Static Correlation Heatmap */}
              {Object.keys(staticMap).length > 0 && (
                <div className="card p-5 overflow-x-auto">
                  <p className="section-title mb-3">Static Correlation Matrix</p>
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="py-1.5 px-2 text-left th-base">Sector</th>
                        {["return_1d","return_5d","return_20d","volatility_20d","atr","drawdown_20d","volume_ratio","momentum"].map(m => (
                          <th key={m} className="py-1.5 px-2 th-base text-center">{m.replace(/_/g," ")}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(staticMap).map(r => (
                        <tr key={r.sector_id} className="border-b border-gray-50 dark:border-[#1a1a1a]">
                          <td className="py-1.5 px-2 font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">{r.sectors?.name || `S${r.sector_id}`}</td>
                          <CorrCell value={r.return_1d} />
                          <CorrCell value={r.return_5d} />
                          <CorrCell value={r.return_20d} />
                          <CorrCell value={r.volatility_20d} />
                          <CorrCell value={r.atr} />
                          <CorrCell value={r.drawdown_20d} />
                          <CorrCell value={r.volume_ratio} />
                          <CorrCell value={r.momentum} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Rolling Correlation Chart */}
              {rollingChartData.length > 0 && (
                <div className="card p-5">
                  <p className="section-title mb-4">Rolling Correlation ({window_}d) — Return 1d</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={rollingChartData}>
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[-1, 1]} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: 10, borderRadius: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {sectorNames.map((name, i) => (
                        <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.5} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {!Object.keys(staticMap).length && !rollingChartData.length && (
                <EmptyState title="No correlation data" sub="Run the pipeline to compute correlations for this company." />
              )}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
