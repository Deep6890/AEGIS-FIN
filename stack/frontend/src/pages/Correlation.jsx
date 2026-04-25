import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import LoadingSpinner, { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchStaticCorr, fetchRollingCorr, fetchTopSectors } from "../lib/api";

const COLORS = ["#E8C547","#60A5FA","#52B788","#FB923C","#F87171","#A78BFA","#22D3EE","#84cc16","#FB7185","#14b8a6","#f43f5e","#c084fc"];

function CorrCell({ value }) {
  if (value == null) return <td className="py-2 px-2 text-xs text-[#9CA3AF] text-center">—</td>;
  const abs = Math.abs(value);
  const bg = value > 0
    ? `rgba(232,197,71,${abs * 0.7})`
    : `rgba(96,165,250,${abs * 0.7})`;
  return (
    <td className="py-2 px-2 text-xs text-center font-mono tabular-nums" style={{ background: bg, color: abs > 0.5 ? "#fff" : "#6B7280" }}>
      {value.toFixed(2)}
    </td>
  );
}

export default function Correlation() {
  const { companies, sectors } = useAppData();
  const ct = useChartTheme();
  const [search, setSearch]               = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [window_, setWindow]              = useState(60);
  const [staticCorr, setStaticCorr]       = useState([]);
  const [rollingCorr, setRollingCorr]     = useState([]);
  const [topSectors, setTopSectors]       = useState([]);
  const [loading, setLoading]             = useState(false);

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

  const staticMap = React.useMemo(() => {
    const m = {};
    staticCorr.forEach(r => { if (!m[r.sector_id]) m[r.sector_id] = r; });
    return m;
  }, [staticCorr]);

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
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search company..."
              className="w-full pl-9 pr-3 py-2.5 text-xs input-base"
            />
          </div>
          <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            {filtered.slice(0, 100).map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCompany(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all duration-200 ${
                  selectedCompany === c.id
                    ? "bg-[#0D0D0D] dark:bg-[#E8C547] text-[#E8C547] dark:text-[#0D0D0D] font-bold shadow-sm"
                    : "text-[#6B7280] hover:bg-[#F7F5F0] dark:hover:bg-[#22252E] hover:text-[#0D0D0D] dark:hover:text-white"
                }`}
              >
                <p className="font-bold">{c.name}</p>
                <p className={`font-mono text-[10px] mt-0.5 ${selectedCompany === c.id ? "opacity-60" : "text-[#9CA3AF]"}`}>{c.ticker}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedCompany ? (
            <div className="card p-16 flex items-center justify-center">
              <p className="text-sm text-[#9CA3AF]">Select a company to explore correlations</p>
            </div>
          ) : loading ? <LoadingSpinner /> : (
            <>
              <div className="flex items-center justify-between">
                <p className="title-md">{selectedComp?.name} · Correlation Analysis</p>
                <div className="flex gap-1.5">
                  {[20, 60, 100].map(w => (
                    <button
                      key={w}
                      onClick={() => setWindow(w)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border-2 transition-all duration-200 ${
                        window_ === w
                          ? "bg-[#0D0D0D] dark:bg-[#E8C547] text-[#E8C547] dark:text-[#0D0D0D] border-[#0D0D0D] dark:border-[#E8C547]"
                          : "bg-white dark:bg-[#1A1C23] border-[#E5E1D8] dark:border-[#1F2128] text-[#6B7280] hover:border-[#E8C547]/40"
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
                  <p className="title-md mb-3">Top Correlated Sectors</p>
                  <div className="flex flex-wrap gap-2">
                    {topSectors.slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center gap-2 px-3 py-2 bg-[#E8C547]/8 border border-[#E8C547]/15 rounded-xl hover-scale">
                        <span className="w-6 h-6 rounded-lg bg-[#0D0D0D] dark:bg-[#E8C547] text-[#E8C547] dark:text-[#0D0D0D] text-xs font-black flex items-center justify-center">{r.rank}</span>
                        <span className="text-xs font-bold text-[#0D0D0D] dark:text-[#E8E6E0]">{r.sectors?.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Static Correlation Heatmap */}
              {Object.keys(staticMap).length > 0 && (
                <div className="card p-5 overflow-x-auto">
                  <p className="title-md mb-3">Static Correlation Matrix</p>
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="py-2 px-2 text-left th-base">Sector</th>
                        {["return_1d","return_5d","return_20d","volatility_20d","atr","drawdown_20d","volume_ratio","momentum"].map(m => (
                          <th key={m} className="py-2 px-2 th-base text-center whitespace-nowrap">{m.replace(/_/g," ")}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(staticMap).map(r => (
                        <tr key={r.sector_id} className="border-b border-[#E5E1D8]/30 dark:border-[#1F2128]/30">
                          <td className="py-2 px-2 font-bold text-[#0D0D0D] dark:text-[#E8E6E0] whitespace-nowrap">{r.sectors?.name || `S${r.sector_id}`}</td>
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
                  <p className="title-md mb-4">Rolling Correlation ({window_}d) — Return 1d</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={rollingChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                      <YAxis domain={[-1, 1]} tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                      <Tooltip {...ct.tooltip} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {sectorNames.map((name, i) => (
                        <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.5} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {!Object.keys(staticMap).length && !rollingChartData.length && (
                <EmptyState title="No correlation data" sub="Run the pipeline to compute correlations." />
              )}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
