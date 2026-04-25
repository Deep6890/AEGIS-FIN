import React, { useEffect, useState, useMemo } from "react";
import {
  Building2, TrendingUp, AlertTriangle, CheckCircle,
  Eye, Zap, Globe, Activity, ArrowUpRight,
  ChevronDown, ChevronUp, TrendingDown, Minus
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, CartesianGrid
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import LiveMarketBar from "../components/ui/LiveMarketBar";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchMacroOverlay, fetchLatestSectorMetrics } from "../lib/api";

/* ─────────────────────────────────────────────────────────────────────────── */
/* Stat number with animated entrance                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
function BigStat({ value, label, sub, color = "text-neutral-900 dark:text-neutral-100", size = "text-5xl" }) {
  return (
    <div>
      <p className={`${size} font-bold tracking-tighter leading-none tabular-nums ${color}`}>{value ?? "—"}</p>
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mt-2">{label}</p>
      {sub && <p className="text-xs text-neutral-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Inline score pill                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */
function ScorePill({ score }) {
  if (score == null) return <span className="text-neutral-400 text-xs">—</span>;
  const color = score >= 70
    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
    : score >= 40
      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
      : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border tabular-nums ${color}`}>
      {score.toFixed(0)}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Sector health row — expandable                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
function SectorRow({ row }) {
  const [open, setOpen] = useState(false);
  const pct = Math.min(100, row.health_score || 0);
  const barColor = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-red-500";

  return (
    <>
      <tr
        className="border-b border-neutral-100 dark:border-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        <td className="py-3.5 px-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 tracking-tight">
              {row.sectors?.name || `Sector ${row.sector_id}`}
            </span>
            {open
              ? <ChevronUp size={12} className="text-brand-orange shrink-0" />
              : <ChevronDown size={12} className="text-neutral-400 shrink-0" />
            }
          </div>
        </td>
        <td className="py-3.5 px-5"><SignalBadge value={row.signal} /></td>
        <td className="py-3.5 px-5"><SignalBadge value={row.regime} /></td>
        <td className="py-3.5 px-5">
          <div className="flex items-center gap-3">
            <div className="w-20 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold tabular-nums text-neutral-600 dark:text-neutral-400 w-8">
              {row.health_score?.toFixed(0) ?? "—"}
            </span>
          </div>
        </td>
        <td className="py-3.5 px-5">
          <span className="text-xs font-mono text-neutral-500 tabular-nums">
            {row.composite?.toFixed(2) ?? "—"}
          </span>
        </td>
        <td className="py-3.5 px-5">
          <div className="flex gap-1">
            {row.spike_up   && <span className="badge-green text-[10px]">↑ Up</span>}
            {row.spike_down && <span className="badge-red text-[10px]">↓ Down</span>}
            {!row.spike_up && !row.spike_down && <span className="text-neutral-300 dark:text-neutral-700 text-xs">—</span>}
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-neutral-50/80 dark:bg-neutral-800/20">
          <td colSpan={6} className="px-5 py-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { k: "Ret Z",      v: row.ret_z },
                { k: "Vol Z",      v: row.vol_z },
                { k: "Mom Z",      v: row.momentum_z },
                { k: "Slope Z",    v: row.slope_z },
                { k: "Composite",  v: row.composite },
                { k: "Health",     v: row.health_score },
              ].map(({ k, v }) => (
                <div key={k} className="bg-white dark:bg-neutral-900 rounded-xl p-3 border border-neutral-200/80 dark:border-neutral-800">
                  <p className="label-caps mb-1.5">{k}</p>
                  <p className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {v?.toFixed(2) ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Main Dashboard                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { latestSectorHealth, macro, portfolioStats, loading } = useAppData();
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

  const macroRegime = macro?.macro_regime;
  const macroScore  = macro?.macro_score;

  if (loading) return <PageLayout title="Dashboard"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Dashboard">
      <div className="space-y-5 animate-fade-in">

        {/* ── Live ticker ─────────────────────────────────────────────────── */}
        <LiveMarketBar />

        {/* ── HERO ROW: big numbers + macro state ─────────────────────────── */}
        <div className="grid grid-cols-12 gap-4">

          {/* Portfolio overview — large editorial card */}
          <div className="col-span-12 lg:col-span-8 card p-7 relative overflow-hidden">
            {/* Subtle background accent */}
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-brand-orange/[0.03] blur-3xl pointer-events-none" />

            <div className="relative">
              <p className="label-caps mb-6">Portfolio Overview</p>

              {/* Big number grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
                <BigStat
                  value={portfolioStats.total}
                  label="Companies"
                  sub="tracked"
                  size="text-5xl"
                />
                <BigStat
                  value={portfolioStats.healthy}
                  label="Healthy"
                  sub="score ≥ 70"
                  color="text-emerald-600 dark:text-emerald-400"
                  size="text-5xl"
                />
                <BigStat
                  value={portfolioStats.watch}
                  label="Watch"
                  sub="score 40–70"
                  color="text-amber-600 dark:text-amber-400"
                  size="text-5xl"
                />
                <BigStat
                  value={portfolioStats.distress}
                  label="Distress"
                  sub="score < 40"
                  color="text-red-600 dark:text-red-400"
                  size="text-5xl"
                />
              </div>

              {/* Segmented health bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="label-caps">Portfolio Health Distribution</p>
                  <p className="text-xs font-semibold text-neutral-500">
                    Avg score: <span className="text-neutral-900 dark:text-neutral-100">{portfolioStats.avgSurvival}</span>
                  </p>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                  {portfolioStats.total > 0 && (
                    <>
                      <div
                        className="bg-emerald-500 rounded-l-full transition-all duration-700"
                        style={{ width: `${(portfolioStats.healthy / portfolioStats.total) * 100}%` }}
                      />
                      <div
                        className="bg-amber-400 transition-all duration-700"
                        style={{ width: `${(portfolioStats.watch / portfolioStats.total) * 100}%` }}
                      />
                      <div
                        className="bg-red-500 rounded-r-full transition-all duration-700"
                        style={{ width: `${(portfolioStats.distress / portfolioStats.total) * 100}%` }}
                      />
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2">
                  {[
                    { label: "Healthy", color: "bg-emerald-500" },
                    { label: "Watch",   color: "bg-amber-400" },
                    { label: "Distress",color: "bg-red-500" },
                  ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-[11px] text-neutral-500">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Macro state — dark editorial card */}
          <div className="col-span-12 lg:col-span-4 card-dark rounded-2xl p-7 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-brand-orange/10 blur-3xl pointer-events-none" />

            <div className="relative">
              <p className="label-caps text-neutral-500 mb-6">Macro Environment</p>

              <div className="mb-6">
                <p className="text-[11px] text-neutral-500 mb-1">Regime</p>
                <p className="text-3xl font-bold tracking-tight text-white leading-none">
                  {macroRegime?.replace("_", " ") || "—"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Score</p>
                  <p className="text-xl font-bold text-white tabular-nums">
                    {macroScore?.toFixed(2) ?? "—"}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Sectors</p>
                  <p className="text-xl font-bold text-white tabular-nums">
                    {latestSectorHealth.length}
                  </p>
                </div>
              </div>

              {/* Signal pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Strong", count: signalCounts.STRONG,  color: "bg-emerald-500/20 text-emerald-400" },
                  { label: "Neutral",count: signalCounts.NEUTRAL, color: "bg-neutral-500/20 text-neutral-400" },
                  { label: "Watch",  count: signalCounts.WATCH,   color: "bg-amber-500/20 text-amber-400" },
                  { label: "Weak",   count: signalCounts.WEAK,    color: "bg-red-500/20 text-red-400" },
                ].map(({ label, count, color }) => (
                  <span key={label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${color}`}>
                    <span className="tabular-nums">{count}</span> {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── CHARTS ROW ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-4">

          {/* Macro score chart */}
          <div className="col-span-12 lg:col-span-7 card p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="title-md">Macro Score</p>
                <p className="muted mt-1">30-day composite z-score · VIX · USD-INR · Gold · Crude</p>
              </div>
              {macroRegime && <SignalBadge value={macroRegime} />}
            </div>
            {macroChartData.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={macroChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="macroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={ct.orange} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={ct.orange} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Geist Mono" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Geist Mono" }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip {...ct.tooltip} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={ct.orange}
                    strokeWidth={1.5}
                    fill="url(#macroGrad)"
                    dot={false}
                    name="Macro Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No macro data" sub="Run the pipeline to populate macro overlay." />
            )}
          </div>

          {/* Sector returns */}
          <div className="col-span-12 lg:col-span-5 card p-6">
            <div className="mb-5">
              <p className="title-md">Sector Returns</p>
              <p className="muted mt-1">1-day performance · NSE indices</p>
            </div>
            {sectorReturnData.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={sectorReturnData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Geist Mono" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `${v}%`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 9, fill: ct.tick }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip {...ct.tooltip} formatter={v => [`${v}%`, "Return"]} />
                  <Bar dataKey="ret" radius={[0, 3, 3, 0]} maxBarSize={10}>
                    {sectorReturnData.map((e, i) => (
                      <Cell key={i} fill={e.ret >= 0 ? ct.green : ct.red} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No sector data" sub="Run the pipeline to populate sector metrics." />
            )}
          </div>
        </div>

        {/* ── SURVIVAL SCORE FORMULA ───────────────────────────────────────── */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="title-md">Survival Score Formula</p>
              <p className="muted mt-1">CatBoost ML model · 8 input features · 0–100 output</p>
            </div>
            <span className="text-xs font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
              v2.1
            </span>
          </div>

          {/* Formula visual */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {[
              { label: "Price Momentum", weight: "25%", desc: "Returns, volatility, ATR, drawdown, momentum", color: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20" },
              { label: "Balance Sheet",  weight: "30%", desc: "20 financial ratios, sector-adjusted", color: "border-brand-orange/30 bg-brand-orange/5" },
              { label: "Sector Context", weight: "20%", desc: "Health score, regime, correlation", color: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" },
              { label: "Macro Overlay",  weight: "15%", desc: "VIX, INR, Gold, Crude z-scores", color: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20" },
              { label: "Shareholder",    weight: "10%", desc: "HHI, institutional %, promoter pledge", color: "border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20" },
            ].map((f, i) => (
              <div key={f.label} className={`rounded-xl border p-3 ${f.color}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">{f.label}</p>
                <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{f.weight}</p>
                <p className="text-[10px] text-neutral-400 mt-1.5 leading-relaxed hidden sm:block">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-400 text-sm">
              <span>25% + 30% + 20% + 15% + 10%</span>
              <span>=</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-orange text-white">
              <span className="text-sm font-semibold">Survival Score</span>
              <span className="text-lg font-bold tabular-nums">0–100</span>
            </div>
            <p className="text-xs text-neutral-400 ml-2">
              100 = financially strongest · 0 = highest distress risk
            </p>
          </div>
        </div>

        {/* ── SECTOR HEALTH TABLE ──────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <p className="title-md">Sector Health Monitor</p>
              <p className="muted mt-0.5">Daily signals from rolling z-scores · click any row to expand</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              <span className="text-xs text-neutral-500">Live</span>
            </div>
          </div>

          {latestSectorHealth.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/30">
                    <th className="text-left py-3 px-5 label-caps">Sector</th>
                    <th className="text-left py-3 px-5 label-caps">Signal</th>
                    <th className="text-left py-3 px-5 label-caps">Regime</th>
                    <th className="text-left py-3 px-5 label-caps">Health</th>
                    <th className="text-left py-3 px-5 label-caps">Composite Z</th>
                    <th className="text-left py-3 px-5 label-caps">Spikes</th>
                  </tr>
                </thead>
                <tbody>
                  {latestSectorHealth.map(row => <SectorRow key={row.id} row={row} />)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8">
              <EmptyState title="No sector health data" sub="Run the pipeline to populate sector health signals." />
            </div>
          )}
        </div>

        {/* ── 9-LAYER PIPELINE STRIP ───────────────────────────────────────── */}
        <div className="card-dark rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-orange/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="label-caps text-neutral-500 mb-1">Intelligence Engine</p>
                <p className="text-lg font-semibold tracking-tight text-white">9-Layer Risk Scoring Pipeline</p>
              </div>
              <span className="text-xs font-mono text-brand-orange bg-brand-orange/10 border border-brand-orange/20 px-2.5 py-1 rounded-lg">
                Daily · Post-Market
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { n: "01", label: "Market Data" },
                { n: "02", label: "Price Metrics" },
                { n: "03", label: "Z-Scores" },
                { n: "04", label: "Balance Sheet" },
                { n: "05", label: "Holdings" },
                { n: "06", label: "Correlation" },
                { n: "07", label: "Sector Health" },
                { n: "08", label: "Macro Overlay" },
                { n: "09", label: "ML Survival" },
              ].map(({ n, label }) => (
                <div key={n} className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2">
                  <span className="text-[10px] font-mono text-brand-orange">{n}</span>
                  <span className="text-xs font-medium text-neutral-300">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
