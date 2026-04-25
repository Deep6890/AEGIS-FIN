import React, { useEffect, useState, useMemo } from "react";
import {
  Building2, TrendingUp, AlertTriangle, CheckCircle,
  Eye, Zap, Globe, Activity, ArrowUpRight, ChevronDown, ChevronUp
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, CartesianGrid, LineChart, Line
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner, { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import LiveMarketBar from "../components/ui/LiveMarketBar";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchMacroOverlay, fetchLatestSectorMetrics } from "../lib/api";

/* ── KPI Card ─────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, icon: Icon, accent = false, dark = false, trend }) {
  const base = dark
    ? "bg-neutral-900 dark:bg-neutral-950 border border-neutral-800 text-white"
    : accent
      ? "bg-brand-orange text-white"
      : "card";
  const labelCls = dark || accent ? "text-white/50" : "label-caps";
  const valueCls = dark || accent ? "text-white" : "text-neutral-900 dark:text-neutral-100";
  const subCls   = dark || accent ? "text-white/40" : "text-neutral-500";
  const iconBg   = dark ? "bg-white/10" : accent ? "bg-white/20" : "bg-brand-orange/10";
  const iconCls  = dark || accent ? "text-white" : "text-brand-orange";

  return (
    <div className={`${base} rounded-2xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon size={17} className={iconCls} />
          </div>
        )}
        {trend !== undefined && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.1em] mb-1 ${labelCls}`}>{label}</p>
      <p className={`text-2xl font-black leading-none tabular-nums ${valueCls}`}>{value ?? "—"}</p>
      {sub && <p className={`text-xs mt-1 ${subCls}`}>{sub}</p>}
    </div>
  );
}

/* ── Sector Row ───────────────────────────────────────────────────────────── */
function SectorRow({ row }) {
  const [open, setOpen] = useState(false);
  const healthColor = row.health_score >= 70 ? "bar-high" : row.health_score >= 40 ? "bar-mid" : "bar-low";

  return (
    <>
      <tr className="tr-base cursor-pointer" onClick={() => setOpen(v => !v)}>
        <td className="td-base">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {row.sectors?.name || `Sector ${row.sector_id}`}
            </span>
            {open ? <ChevronUp size={12} className="text-brand-orange" /> : <ChevronDown size={12} className="text-neutral-400" />}
          </div>
        </td>
        <td className="td-base"><SignalBadge value={row.signal} /></td>
        <td className="td-base"><SignalBadge value={row.regime} /></td>
        <td className="td-base">
          {row.health_score != null ? (
            <div className="flex items-center gap-2">
              <div className="progress-track w-16">
                <div className={`progress-fill ${healthColor}`} style={{ width: `${Math.min(100, row.health_score)}%` }} />
              </div>
              <span className="text-xs font-semibold tabular-nums text-neutral-600 dark:text-neutral-400">{row.health_score.toFixed(1)}</span>
            </div>
          ) : <span className="text-xs text-neutral-400">—</span>}
        </td>
        <td className="td-base text-xs text-neutral-500">{row.trend || "—"}</td>
        <td className="td-base text-xs font-mono text-neutral-600 dark:text-neutral-400">{row.composite?.toFixed(2) ?? "—"}</td>
        <td className="td-base">
          <div className="flex gap-1">
            {row.spike_up   && <span className="badge-green">↑</span>}
            {row.spike_down && <span className="badge-red">↓</span>}
            {!row.spike_up && !row.spike_down && <span className="text-xs text-neutral-400">—</span>}
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-neutral-50 dark:bg-neutral-800/50">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Health Score", value: row.health_score?.toFixed(1) },
                { label: "Composite Z",  value: row.composite?.toFixed(3) },
                { label: "Ret Z",        value: row.ret_z?.toFixed(3) },
                { label: "Vol Z",        value: row.vol_z?.toFixed(3) },
                { label: "Momentum Z",   value: row.momentum_z?.toFixed(3) },
                { label: "Slope Z",      value: row.slope_z?.toFixed(3) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white dark:bg-neutral-900 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700">
                  <p className="label-caps mb-1">{label}</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{value ?? "—"}</p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Main Dashboard ───────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { companies, latestSectorHealth, macro, portfolioStats, loading } = useAppData();
  const ct = useChartTheme();
  const [macroHistory, setMacroHistory]   = useState([]);
  const [sectorMetrics, setSectorMetrics] = useState([]);

  useEffect(() => {
    fetchMacroOverlay(60).then(r => setMacroHistory(r.data || []));
    fetchLatestSectorMetrics().then(r => setSectorMetrics(r.data || []));
  }, []);

  const macroChartData = macroHistory.slice(-30).map(r => ({
    date:  r.date?.slice(5),
    score: parseFloat(r.macro_score?.toFixed(2) || 0),
  }));

  const latestMetrics = useMemo(() => {
    const seen = new Map();
    for (const row of sectorMetrics) {
      if (!seen.has(row.sector_id)) seen.set(row.sector_id, row);
    }
    return Array.from(seen.values());
  }, [sectorMetrics]);

  const sectorReturnData = latestMetrics
    .filter(r => r.sector_return_1d != null)
    .map(r => ({
      name: r.sectors?.name?.replace(" Sector","").replace(" Nifty",""),
      ret:  +(r.sector_return_1d * 100).toFixed(2),
    }))
    .sort((a, b) => b.ret - a.ret);

  const signalCounts = useMemo(() => {
    const c = { STRONG: 0, NEUTRAL: 0, WATCH: 0, WEAK: 0 };
    latestSectorHealth.forEach(s => { if (c[s.signal] !== undefined) c[s.signal]++; });
    return c;
  }, [latestSectorHealth]);

  if (loading) return <PageLayout title="Dashboard"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Dashboard">
      <div className="space-y-5">

        {/* Live market ticker */}
        <LiveMarketBar />

        {/* Intelligence Engine banner */}
        <div className="card-dark rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-brand-orange/10 to-transparent pointer-events-none" />
          <div className="relative">
            <p className="label-caps text-brand-orange mb-2">INTELLIGENCE ENGINE · 9 LAYERS</p>
            <h2 className="text-xl font-bold text-white mb-4">Real-time risk scoring across 9 predictive layers</h2>
            <div className="flex flex-wrap gap-2">
              {[
                "01 Market Data","02 Price Metrics","03 Z-Scores",
                "04 Balance Sheet","05 Holdings","06 Correlation",
                "07 Sector Health","08 Macro Overlay","09 ML Survival"
              ].map((chip, i) => (
                <span key={i} className="text-xs font-mono bg-white/5 text-neutral-400 rounded-full px-3 py-1 border border-white/10">
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Companies"  value={portfolioStats.total}    icon={Building2}    />
          <KpiCard label="Healthy ≥ 70"     value={portfolioStats.healthy}  icon={CheckCircle}  accent />
          <KpiCard label="Watch 40–70"       value={portfolioStats.watch}    icon={Eye}          />
          <KpiCard label="Distress < 40"    value={portfolioStats.distress} icon={AlertTriangle} dark />
        </div>

        {/* KPI Row 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Avg Survival Score" value={portfolioStats.avgSurvival} sub="portfolio average" icon={Activity} />
          <KpiCard label="Sectors Tracked"    value={latestSectorHealth.length}  icon={TrendingUp} />
          <KpiCard label="Macro Regime"        value={macro?.macro_regime?.replace("_"," ") || "—"} icon={Globe} />
          <KpiCard label="Macro Score"         value={macro?.macro_score?.toFixed(2) || "—"} sub="composite z-score" icon={Zap} />
        </div>

        {/* Survival Score Formula */}
        <div className="card p-6">
          <p className="title-md mb-5">Survival Score Formula</p>
          <div className="flex flex-wrap items-center gap-3">
            {[
              { label: "Price Momentum", weight: "25%", color: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
              { label: "Balance Sheet",  weight: "30%", color: "bg-brand-orange/10 text-brand-orange border-brand-orange/20" },
              { label: "Sector Context", weight: "20%", color: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
              { label: "Macro Overlay",  weight: "15%", color: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
              { label: "Shareholder",    weight: "10%", color: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
            ].map((f, i, arr) => (
              <React.Fragment key={f.label}>
                <div className={`flex flex-col items-center px-4 py-3 rounded-xl border ${f.color}`}>
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{f.label}</span>
                  <span className="text-xl font-black mt-0.5">{f.weight}</span>
                </div>
                {i < arr.length - 1 && <span className="text-neutral-300 dark:text-neutral-600 text-lg font-light">+</span>}
              </React.Fragment>
            ))}
            <span className="text-neutral-300 dark:text-neutral-600 text-lg font-light">=</span>
            <div className="flex flex-col items-center px-4 py-3 rounded-xl border-2 border-brand-orange bg-brand-orange/5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-orange opacity-70">Survival Score</span>
              <span className="text-xl font-black text-brand-orange mt-0.5">0–100</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Macro Score Chart */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="title-md">Macro Score (30d)</p>
                <p className="muted mt-0.5">Composite z-score of VIX, USD-INR, Gold & Crude</p>
              </div>
              {macro?.macro_regime && <SignalBadge value={macro.macro_regime} />}
            </div>
            {macroChartData.length ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={macroChartData}>
                  <defs>
                    <linearGradient id="macroG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={ct.orange} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={ct.orange} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip {...ct.tooltip} />
                  <Area type="monotone" dataKey="score" stroke={ct.orange} strokeWidth={2} fill="url(#macroG)" dot={false} name="Macro Score" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No macro data" sub="Run the pipeline to populate macro overlay." />}
          </div>

          {/* Sector Returns */}
          <div className="card p-5">
            <div className="mb-4">
              <p className="title-md">Sector 1-Day Returns</p>
              <p className="muted mt-0.5">Today's performance across NSE sector indices</p>
            </div>
            {sectorReturnData.length ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={sectorReturnData} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip {...ct.tooltip} formatter={v => [`${v}%`, "Return"]} />
                  <Bar dataKey="ret" radius={[0, 4, 4, 0]}>
                    {sectorReturnData.map((e, i) => <Cell key={i} fill={e.ret >= 0 ? ct.green : ct.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No sector data" sub="Run the pipeline to populate sector metrics." />}
          </div>
        </div>

        {/* Signal Distribution */}
        {Object.values(signalCounts).some(v => v > 0) && (
          <div className="card p-5">
            <p className="title-md mb-4">Sector Signal Distribution</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: "STRONG", count: signalCounts.STRONG, cls: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-400" },
                { name: "NEUTRAL", count: signalCounts.NEUTRAL, cls: "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700", text: "text-neutral-600 dark:text-neutral-400" },
                { name: "WATCH",  count: signalCounts.WATCH,  cls: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400" },
                { name: "WEAK",   count: signalCounts.WEAK,   cls: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-400" },
              ].map(({ name, count, cls, text }) => (
                <div key={name} className={`flex flex-col items-center p-4 rounded-2xl border ${cls}`}>
                  <p className={`text-3xl font-black ${text}`}>{count}</p>
                  <p className={`text-xs font-semibold mt-1 ${text}`}>{name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sector Health Table */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-neutral-100 dark:border-neutral-800">
            <p className="title-md">Sector Health Monitor</p>
            <p className="muted mt-0.5">Daily health signals from rolling z-scores · Click any row to expand</p>
          </div>
          {latestSectorHealth.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    {["Sector","Signal","Regime","Health Score","Trend","Composite","Spikes"].map(h => (
                      <th key={h} className="th-base">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {latestSectorHealth.map(row => <SectorRow key={row.id} row={row} />)}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No sector health data" />}
        </div>

      </div>
    </PageLayout>
  );
}
