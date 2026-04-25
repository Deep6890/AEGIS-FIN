import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Building2, TrendingUp, AlertTriangle, CheckCircle,
  Eye, Zap, Globe, Activity, ArrowUpRight,
  ChevronDown, ChevronUp, ArrowRight, Shield
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
/* Stat number                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
function BigStat({ value, label, sub, color = "text-neutral-900 dark:text-neutral-100", size = "text-6xl" }) {
  return (
    <div>
      <p className={`${size} font-bold tracking-tighter leading-none tabular-nums ${color}`}>{value ?? "—"}</p>
      <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mt-3 tracking-tight">{label}</p>
      {sub && <p className="text-[11px] text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Compact KPI tile                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */
function KpiTile({ label, value, icon: Icon, color = "text-neutral-900 dark:text-neutral-100", iconColor = "text-brand-orange" }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60">
      <div className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0 shadow-sm">
        <Icon size={16} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="label-caps truncate">{label}</p>
        <p className={`text-xl font-bold tracking-tight tabular-nums mt-0.5 ${color}`}>{value ?? "—"}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ML top pick row                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
function TopPickRow({ rank, name, ticker, score, companyId }) {
  const color = score >= 70 ? "text-emerald-600 dark:text-emerald-400" : score >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-500";
  const bar   = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-400" : "bg-red-500";
  return (
    <Link to={`/companies/${companyId}`} className="flex items-center gap-4 py-3 px-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 rounded-xl transition-colors group">
      <span className="text-[11px] font-mono text-neutral-400 w-5 shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate tracking-tight">{name}</p>
        <p className="text-[10px] font-mono text-neutral-400 mt-0.5">{ticker}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-16 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, score)}%` }} />
        </div>
        <span className={`text-sm font-bold tabular-nums w-8 text-right ${color}`}>{score?.toFixed(0)}</span>
      </div>
      <ArrowUpRight size={13} className="text-neutral-300 dark:text-neutral-600 group-hover:text-brand-orange transition-colors shrink-0" />
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Sector health row — expandable                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
function SectorRow({ row, index }) {
  const [open, setOpen] = useState(false);
  const pct = Math.min(100, row.health_score || 0);
  const barColor = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-red-500";
  const scoreColor = pct >= 70 ? "text-emerald-600 dark:text-emerald-400" : pct >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-500";

  return (
    <>
      <tr
        className="border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/20 transition-colors cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        <td className="py-3.5 px-5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-neutral-400 w-4 shrink-0">{String(index + 1).padStart(2, "0")}</span>
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {row.sectors?.name || `Sector ${row.sector_id}`}
            </span>
            {open
              ? <ChevronUp size={11} className="text-brand-orange shrink-0" />
              : <ChevronDown size={11} className="text-neutral-300 dark:text-neutral-600 shrink-0" />
            }
          </div>
        </td>
        <td className="py-3.5 px-5"><SignalBadge value={row.signal} /></td>
        <td className="py-3.5 px-5"><SignalBadge value={row.regime} /></td>
        <td className="py-3.5 px-5">
          <div className="flex items-center gap-3">
            <div className="w-24 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-sm font-bold tabular-nums w-8 ${scoreColor}`}>
              {row.health_score?.toFixed(0) ?? "—"}
            </span>
          </div>
        </td>
        <td className="py-3.5 px-5">
          <span className="text-xs font-mono text-neutral-500 tabular-nums">
            {row.composite != null ? (row.composite > 0 ? "+" : "") + row.composite.toFixed(2) : "—"}
          </span>
        </td>
        <td className="py-3.5 px-5">
          <div className="flex gap-1.5">
            {row.spike_up   && <span className="badge-green">↑ Spike</span>}
            {row.spike_down && <span className="badge-red">↓ Spike</span>}
            {!row.spike_up && !row.spike_down && <span className="text-neutral-300 dark:text-neutral-700 text-xs">—</span>}
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-neutral-50/60 dark:bg-neutral-800/10">
          <td colSpan={6} className="px-5 py-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { k: "Ret Z",    v: row.ret_z,      pos: (row.ret_z || 0) > 0 },
                { k: "Vol Z",    v: row.vol_z,      pos: (row.vol_z || 0) > 0 },
                { k: "Mom Z",    v: row.momentum_z, pos: (row.momentum_z || 0) > 0 },
                { k: "Slope Z",  v: row.slope_z,    pos: (row.slope_z || 0) > 0 },
                { k: "EMA Short",v: row.ema_short,  pos: null },
                { k: "EMA Long", v: row.ema_long,   pos: null },
              ].map(({ k, v, pos }) => (
                <div key={k} className="bg-white dark:bg-neutral-900 rounded-xl p-3 border border-neutral-200/60 dark:border-neutral-800">
                  <p className="label-caps mb-1.5">{k}</p>
                  <p className={`text-sm font-semibold tabular-nums ${
                    pos === null ? "text-neutral-900 dark:text-neutral-100" :
                    pos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                  }`}>
                    {v != null ? (pos !== null && v > 0 ? "+" : "") + v.toFixed(3) : "—"}
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
  const { latestSectorHealth, macro, portfolioStats, latestMl, companies, loading } = useAppData();
  const ct = useChartTheme();
  const [macroHistory, setMacroHistory]   = useState([]);
  const [sectorMetrics, setSectorMetrics] = useState([]);

  useEffect(() => {
    fetchMacroOverlay(60).then(r => setMacroHistory(r.data || []));
    fetchLatestSectorMetrics().then(r => setSectorMetrics(r.data || []));
  }, []);

  /* ── derived data ─────────────────────────────────────────────────────── */
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

  // Top 5 ML picks by survival score
  const compMap = useMemo(() => {
    const m = {};
    companies.forEach(c => { m[c.id] = c; });
    return m;
  }, [companies]);

  const topPicks = useMemo(() =>
    [...latestMl]
      .filter(r => r.survival_score != null)
      .sort((a, b) => b.survival_score - a.survival_score)
      .slice(0, 8)
  , [latestMl]);

  const atRisk = useMemo(() =>
    [...latestMl]
      .filter(r => r.survival_score != null)
      .sort((a, b) => a.survival_score - b.survival_score)
      .slice(0, 5)
  , [latestMl]);

  const macroRegime = macro?.macro_regime;
  const macroScore  = macro?.macro_score;

  if (loading) return <PageLayout title="Dashboard"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Dashboard">
      <div className="space-y-4 animate-fade-in">

        {/* ── LIVE TICKER ─────────────────────────────────────────────────── */}
        <LiveMarketBar />

        {/* ── ROW 1: HERO STATS + MACRO CARD ──────────────────────────────── */}
        <div className="grid grid-cols-12 gap-4">

          {/* Left: big portfolio numbers */}
          <div className="col-span-12 lg:col-span-8 card p-8 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-brand-orange/[0.04] blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                <p className="label-caps">Portfolio Intelligence</p>
                <Link to="/companies" className="flex items-center gap-1.5 text-xs font-semibold text-brand-orange hover:underline">
                  View all <ArrowRight size={12} />
                </Link>
              </div>

              {/* 4 giant numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
                <BigStat value={portfolioStats.total}    label="Companies"  sub="tracked"      size="text-6xl" />
                <BigStat value={portfolioStats.healthy}  label="Healthy"    sub="score ≥ 70"   size="text-6xl" color="text-emerald-600 dark:text-emerald-400" />
                <BigStat value={portfolioStats.watch}    label="Watch"      sub="score 40–70"  size="text-6xl" color="text-amber-600 dark:text-amber-400" />
                <BigStat value={portfolioStats.distress} label="Distress"   sub="score < 40"   size="text-6xl" color="text-red-500" />
              </div>

              {/* Segmented bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="label-caps">Health Distribution</p>
                  <p className="text-xs text-neutral-500">
                    Avg <span className="font-bold text-neutral-900 dark:text-neutral-100">{portfolioStats.avgSurvival}</span> / 100
                  </p>
                </div>
                <div className="flex h-2.5 rounded-full overflow-hidden gap-px bg-neutral-100 dark:bg-neutral-800">
                  {portfolioStats.total > 0 && <>
                    <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(portfolioStats.healthy / portfolioStats.total) * 100}%` }} />
                    <div className="bg-amber-400 transition-all duration-700"   style={{ width: `${(portfolioStats.watch   / portfolioStats.total) * 100}%` }} />
                    <div className="bg-red-500 transition-all duration-700"     style={{ width: `${(portfolioStats.distress/ portfolioStats.total) * 100}%` }} />
                  </>}
                </div>
                <div className="flex items-center gap-5 mt-2.5">
                  {[
                    { label: "Healthy",  pct: portfolioStats.total ? ((portfolioStats.healthy  / portfolioStats.total) * 100).toFixed(0) : 0, color: "bg-emerald-500" },
                    { label: "Watch",    pct: portfolioStats.total ? ((portfolioStats.watch    / portfolioStats.total) * 100).toFixed(0) : 0, color: "bg-amber-400" },
                    { label: "Distress", pct: portfolioStats.total ? ((portfolioStats.distress / portfolioStats.total) * 100).toFixed(0) : 0, color: "bg-red-500" },
                  ].map(({ label, pct, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-[11px] text-neutral-500">{label} <span className="font-semibold text-neutral-700 dark:text-neutral-300">{pct}%</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: macro dark card */}
          <div className="col-span-12 lg:col-span-4 bg-[#111111] dark:bg-[#0A0A0A] border border-neutral-800 rounded-2xl p-7 flex flex-col relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-brand-orange/15 blur-3xl pointer-events-none" />
            <div className="relative flex-1 flex flex-col">
              <p className="label-caps text-neutral-600 mb-5">Macro Environment</p>

              {/* Regime */}
              <div className="mb-5">
                <p className="text-[10px] text-neutral-600 uppercase tracking-widest mb-1.5">Regime</p>
                <p className={`text-3xl font-bold tracking-tight leading-none ${
                  macroRegime === "RISK_ON" ? "text-emerald-400" :
                  macroRegime === "RISK_OFF" ? "text-red-400" : "text-white"
                }`}>
                  {macroRegime?.replace("_", " ") || "—"}
                </p>
              </div>

              {/* Score + Sectors */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                {[
                  { label: "Macro Score", value: macroScore?.toFixed(2) ?? "—" },
                  { label: "Sectors",     value: latestSectorHealth.length },
                  { label: "VIX Z",       value: macro?.vix_z?.toFixed(2) ?? "—" },
                  { label: "USD-INR Z",   value: macro?.usd_z?.toFixed(2) ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/[0.04] rounded-xl p-3">
                    <p className="text-[9px] text-neutral-600 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-lg font-bold text-white tabular-nums">{value}</p>
                  </div>
                ))}
              </div>

              {/* Signal distribution pills */}
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {[
                  { label: "Strong",  count: signalCounts.STRONG,  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
                  { label: "Neutral", count: signalCounts.NEUTRAL, cls: "bg-neutral-500/15 text-neutral-400 border-neutral-500/20" },
                  { label: "Watch",   count: signalCounts.WATCH,   cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
                  { label: "Weak",    count: signalCounts.WEAK,    cls: "bg-red-500/15 text-red-400 border-red-500/20" },
                ].map(({ label, count, cls }) => (
                  <span key={label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cls}`}>
                    <span className="tabular-nums font-bold">{count}</span> {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 2: CHARTS ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-4">

          {/* Macro score area chart */}
          <div className="col-span-12 lg:col-span-7 card p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="title-md">Macro Score · 30d</p>
                <p className="muted mt-1">Composite z-score of VIX · USD-INR · Gold · Crude Oil</p>
              </div>
              {macroRegime && <SignalBadge value={macroRegime} />}
            </div>
            {macroChartData.length ? (
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={macroChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="macroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={ct.orange} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={ct.orange} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 6" stroke={ct.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip {...ct.tooltip} />
                  <Area type="monotone" dataKey="score" stroke={ct.orange} strokeWidth={2} fill="url(#macroGrad)" dot={false} name="Macro Score" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No macro data" sub="Run the pipeline to populate macro overlay." />}
          </div>

          {/* Sector 1-day returns */}
          <div className="col-span-12 lg:col-span-5 card p-6">
            <div className="mb-5">
              <p className="title-md">Sector Returns · 1d</p>
              <p className="muted mt-1">Today's performance across NSE sector indices</p>
            </div>
            {sectorReturnData.length ? (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={sectorReturnData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={54} />
                  <Tooltip {...ct.tooltip} formatter={v => [`${v}%`, "Return"]} />
                  <Bar dataKey="ret" radius={[0, 4, 4, 0]} maxBarSize={12}>
                    {sectorReturnData.map((e, i) => <Cell key={i} fill={e.ret >= 0 ? ct.green : ct.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No sector data" sub="Run the pipeline to populate sector metrics." />}
          </div>
        </div>

        {/* ── ROW 3: TOP PICKS + AT RISK ───────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-4">

          {/* Top ML picks */}
          <div className="col-span-12 lg:col-span-6 card overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <p className="title-md">Top Picks</p>
                <p className="muted mt-0.5">Highest ML survival scores</p>
              </div>
              <Link to="/risk-engine" className="text-xs font-semibold text-brand-orange hover:underline flex items-center gap-1">
                All <ArrowRight size={11} />
              </Link>
            </div>
            {topPicks.length ? (
              <div className="py-1">
                {topPicks.map((r, i) => {
                  const c = compMap[r.company_id];
                  return (
                    <TopPickRow
                      key={r.id || r.company_id}
                      rank={i + 1}
                      name={c?.name || "—"}
                      ticker={c?.ticker || "—"}
                      score={r.survival_score}
                      companyId={r.company_id}
                    />
                  );
                })}
              </div>
            ) : <div className="p-6"><EmptyState title="No ML predictions" sub="Run the pipeline to generate survival scores." /></div>}
          </div>

          {/* At risk */}
          <div className="col-span-12 lg:col-span-6 card overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <p className="title-md">At Risk</p>
                <p className="muted mt-0.5">Lowest ML survival scores — needs review</p>
              </div>
              <Link to="/risk-engine" className="text-xs font-semibold text-red-500 hover:underline flex items-center gap-1">
                All <ArrowRight size={11} />
              </Link>
            </div>
            {atRisk.length ? (
              <div className="py-1">
                {atRisk.map((r, i) => {
                  const c = compMap[r.company_id];
                  return (
                    <TopPickRow
                      key={r.id || r.company_id}
                      rank={i + 1}
                      name={c?.name || "—"}
                      ticker={c?.ticker || "—"}
                      score={r.survival_score}
                      companyId={r.company_id}
                    />
                  );
                })}
              </div>
            ) : <div className="p-6"><EmptyState title="No ML predictions" sub="Run the pipeline to generate survival scores." /></div>}
          </div>
        </div>

        {/* ── ROW 4: SECTOR HEALTH TABLE ───────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <p className="title-md">Sector Health Monitor</p>
              <p className="muted mt-0.5">Daily signals from rolling z-scores · click any row to expand z-score breakdown</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                <span className="text-xs text-neutral-500">Live</span>
              </div>
              <Link to="/sectors" className="text-xs font-semibold text-brand-orange hover:underline flex items-center gap-1">
                Details <ArrowRight size={11} />
              </Link>
            </div>
          </div>
          {latestSectorHealth.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/20">
                    <th className="text-left py-3 px-5 label-caps">Sector</th>
                    <th className="text-left py-3 px-5 label-caps">Signal</th>
                    <th className="text-left py-3 px-5 label-caps">Regime</th>
                    <th className="text-left py-3 px-5 label-caps">Health Score</th>
                    <th className="text-left py-3 px-5 label-caps">Composite Z</th>
                    <th className="text-left py-3 px-5 label-caps">Spikes</th>
                  </tr>
                </thead>
                <tbody>
                  {latestSectorHealth.map((row, i) => <SectorRow key={row.id} row={row} index={i} />)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8"><EmptyState title="No sector health data" sub="Run the pipeline to populate sector health signals." /></div>
          )}
        </div>

        {/* ── ROW 5: FORMULA + PIPELINE ────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-4">

          {/* Survival score formula */}
          <div className="col-span-12 lg:col-span-7 card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="title-md">Survival Score Formula</p>
                <p className="muted mt-1">CatBoost ML · 8 features · 0–100 output</p>
              </div>
              <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg">v2.1</span>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[
                { label: "Price",     weight: "25%", color: "border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/20" },
                { label: "Financials",weight: "30%", color: "border-brand-orange/25 bg-brand-orange/5" },
                { label: "Sector",    weight: "20%", color: "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20" },
                { label: "Macro",     weight: "15%", color: "border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20" },
                { label: "Holdings",  weight: "10%", color: "border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-950/20" },
              ].map(f => (
                <div key={f.label} className={`rounded-xl border p-3 text-center ${f.color}`}>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-500 mb-1.5">{f.label}</p>
                  <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{f.weight}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <span className="text-sm text-neutral-400">25 + 30 + 20 + 15 + 10 =</span>
              <span className="px-4 py-2 rounded-xl bg-brand-orange text-white text-sm font-bold">Survival Score 0–100</span>
              <span className="text-xs text-neutral-400 hidden sm:block">100 = strongest · 0 = highest risk</span>
            </div>
          </div>

          {/* 9-layer pipeline */}
          <div className="col-span-12 lg:col-span-5 bg-[#111111] dark:bg-[#0A0A0A] border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-orange/5 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="label-caps text-neutral-600 mb-1">Intelligence Engine</p>
                  <p className="text-base font-semibold tracking-tight text-white">9-Layer Pipeline</p>
                </div>
                <span className="text-[10px] font-mono text-brand-orange bg-brand-orange/10 border border-brand-orange/20 px-2 py-1 rounded-lg">
                  Daily
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
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
                  <div key={n} className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-2.5 py-2">
                    <span className="text-[9px] font-mono text-brand-orange shrink-0">{n}</span>
                    <span className="text-[10px] font-medium text-neutral-400 truncate">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}

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



      </div>
    </PageLayout>
  );
}
