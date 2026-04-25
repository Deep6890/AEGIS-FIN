import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight, Building2, HeartPulse, AlertTriangle, ShieldAlert,
  TrendingUp, ArrowRight, Activity
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, CartesianGrid
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import { PageSkeleton } from "../components/ui/LoadingSpinner";
import LiveMarketBar from "../components/ui/LiveMarketBar";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchMacroOverlay, fetchLatestSectorMetrics } from "../lib/api";

function StatCard({ value, label, sub, icon: Icon, color, iconBg, delay }) {
  return (
    <div className={`card-glass p-8 animate-slide-up ${delay} hover:-translate-y-1 transition-transform duration-500`}>
      <div className="flex items-center justify-between mb-8">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${iconBg}`}>
          <Icon size={24} className={color} />
        </div>
        <span className="text-[10px] font-mono font-semibold text-neutral-500 bg-neutral-900/[0.04] dark:bg-white/[0.04] px-3 py-1.5 rounded-xl uppercase tracking-widest">{sub}</span>
      </div>
      <p className={`value-xl ${color}`}>{value ?? "—"}</p>
      <p className="text-base font-medium text-neutral-500 mt-2 tracking-tight">{label}</p>
    </div>
  );
}

function PickRow({ rank, name, ticker, score, companyId }) {
  const color = score >= 70 ? "text-[#00B341]" : score >= 40 ? "text-[#FFC224]" : "text-[#FF3B30]";
  const bar = score >= 70 ? "bg-[#00B341]" : score >= 40 ? "bg-[#FFC224]" : "bg-[#FF3B30]";
  return (
    <Link to={`/companies/${companyId}`} className="tr-base flex items-center gap-6 py-5 px-8 group last:border-0 hover:bg-neutral-900/[0.02] dark:hover:bg-white/[0.02]">
      <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 w-6 shrink-0 tabular-nums">{String(rank).padStart(2, "0")}</span>
      <div className="flex-1 min-w-0">
        <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-brand-orange transition-colors">{name}</p>
        <p className="text-xs font-mono text-neutral-500 mt-1">{ticker}</p>
      </div>
      <div className="flex items-center gap-5 shrink-0">
        <div className="w-24 h-1.5 bg-neutral-900/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, score)}%` }} />
        </div>
        <span className={`text-lg font-bold tabular-nums w-10 text-right ${color}`}>{score?.toFixed(0)}</span>
      </div>
      <ArrowUpRight size={18} className="text-neutral-300 dark:text-neutral-600 group-hover:text-brand-orange transition-colors shrink-0 ml-2" />
    </Link>
  );
}

function SectorRow({ row, index }) {
  const pct = Math.min(100, row.health_score || 0);
  const barColor = pct >= 70 ? "bg-[#00B341]" : pct >= 40 ? "bg-[#FFC224]" : "bg-[#FF3B30]";
  const scoreColor = pct >= 70 ? "text-[#00B341]" : pct >= 40 ? "text-[#FFC224]" : "text-[#FF3B30]";
  return (
    <tr className="tr-base group">
      <td className="td-base py-5 px-8">
        <div className="flex items-center gap-5">
          <span className="text-xs font-mono text-neutral-400 w-6 shrink-0">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-brand-orange transition-colors">{row.sectors?.name || `Sector ${row.sector_id}`}</span>
        </div>
      </td>
      <td className="td-base py-5 px-8"><SignalBadge value={row.signal} /></td>
      <td className="td-base py-5 px-8"><SignalBadge value={row.regime} /></td>
      <td className="td-base py-5 px-8">
        <div className="flex items-center gap-5">
          <div className="w-32 h-1.5 bg-neutral-900/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-base font-bold tabular-nums ${scoreColor}`}>{row.health_score?.toFixed(0) ?? "—"}</span>
        </div>
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const { latestSectorHealth, macro, portfolioStats, latestMl, companies, loading } = useAppData();
  const ct = useChartTheme();
  const [macroHistory, setMacroHistory] = useState([]);
  const [sectorMetrics, setSectorMetrics] = useState([]);

  useEffect(() => {
    fetchMacroOverlay(60).then(r => setMacroHistory(r.data || []));
    fetchLatestSectorMetrics().then(r => setSectorMetrics(r.data || []));
  }, []);

  const macroChartData = macroHistory.slice(-30).map(r => ({ date: r.date?.slice(5), score: parseFloat(r.health_score?.toFixed(2) || 0) }));

  const latestMetrics = useMemo(() => {
    const seen = new Map();
    for (const row of sectorMetrics) { if (!seen.has(row.sector_id)) seen.set(row.sector_id, row); }
    return Array.from(seen.values());
  }, [sectorMetrics]);

  const sectorReturnData = latestMetrics.filter(r => r.daily_return != null).map(r => ({
    name: r.sectors?.name?.replace(" Sector", "").replace(" Nifty", ""), ret: +(r.daily_return * 100).toFixed(2),
  })).sort((a, b) => b.ret - a.ret);

  const signalCounts = useMemo(() => {
    const c = { STRONG: 0, NEUTRAL: 0, WATCH: 0, WEAK: 0 };
    latestSectorHealth.forEach(s => { if (c[s.signal] !== undefined) c[s.signal]++; });
    return c;
  }, [latestSectorHealth]);

  const compMap = useMemo(() => { const m = {}; companies.forEach(c => { m[c.id] = c; }); return m; }, [companies]);
  const topPicks = useMemo(() => [...latestMl].filter(r => r.survival_score != null).sort((a, b) => b.survival_score - a.survival_score).slice(0, 6), [latestMl]);
  const atRisk = useMemo(() => [...latestMl].filter(r => r.survival_score != null).sort((a, b) => a.survival_score - b.survival_score).slice(0, 5), [latestMl]);

  const macroRegime = macro?.macro_regime;
  const macroScore = macro?.macro_score;

  if (loading) return <PageLayout title="Dashboard"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Dashboard">
      <div className="space-y-12 pb-16">
        
        {/* Header */}
        <div className="animate-fade-in mb-6">
          <h1 className="page-heading">Dashboard</h1>
          <p className="page-subheading">Platform overview, macro environment, and AI risk predictions.</p>
        </div>

        <LiveMarketBar />

        {/* ── Quick Nav (Expanded) ────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 stagger-1">
          {[
            { label: "Companies", path: "/companies", desc: `${companies.length} tracked`, icon: Building2 },
            { label: "Risk Engine", path: "/risk-engine", desc: "ML survival predictions", icon: ShieldAlert },
            { label: "Sectors", path: "/sectors", desc: `${latestSectorHealth.length} sectors`, icon: TrendingUp },
            { label: "Pipeline", path: "/pipeline", desc: "9-layer intelligence", icon: Activity },
          ].map(({ label, path, desc, icon: Icon }) => (
            <Link key={path} to={path} className="card-glass p-8 group flex flex-col hover:-translate-y-1 transition-all duration-500 hover:border-brand-orange/30">
              <div className="w-14 h-14 rounded-2xl bg-brand-orange/10 flex items-center justify-center mb-6 group-hover:bg-brand-orange group-hover:scale-110 transition-all duration-500">
                <Icon size={24} className="text-brand-orange group-hover:text-white transition-colors" />
              </div>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-brand-orange transition-colors tracking-tight mb-1">{label}</p>
              <p className="text-sm text-neutral-500">{desc}</p>
              <ArrowRight size={20} className="text-neutral-300 dark:text-neutral-600 group-hover:text-brand-orange mt-6 shrink-0 group-hover:translate-x-2 transition-all duration-500" />
            </Link>
          ))}
        </div>

        {/* ── Stats + Macro ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 stagger-2">
          <div className="col-span-1 lg:col-span-8 space-y-8">
            {/* Portfolio Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard value={portfolioStats.total} label="Total Tracked" sub="Assets" icon={Building2} color="text-neutral-900 dark:text-neutral-100" iconBg="bg-neutral-200/50 dark:bg-neutral-800/50" delay="stagger-1" />
              <StatCard value={portfolioStats.healthy} label="Healthy" sub="Score ≥70" icon={HeartPulse} color="text-[#00B341]" iconBg="bg-[#00B341]/10" delay="stagger-2" />
              <StatCard value={portfolioStats.watch} label="Watch List" sub="40–70" icon={AlertTriangle} color="text-[#FFC224]" iconBg="bg-[#FFC224]/10" delay="stagger-3" />
              <StatCard value={portfolioStats.distress} label="Distress" sub="< 40" icon={ShieldAlert} color="text-[#FF3B30]" iconBg="bg-[#FF3B30]/10" delay="stagger-4" />
            </div>
            {/* Health Bar */}
            <div className="card-glass p-8">
              <div className="flex items-center justify-between mb-6">
                <p className="label-caps">Health Distribution</p>
                <p className="text-base font-semibold text-neutral-500">Portfolio Average: <span className="font-bold text-brand-orange text-xl ml-2">{portfolioStats.avgSurvival}</span> <span className="text-sm">/ 100</span></p>
              </div>
              <div className="flex h-5 rounded-full overflow-hidden gap-1.5 bg-neutral-900/[0.04] dark:bg-white/[0.04] p-1">
                {portfolioStats.total > 0 && <>
                  <div className="bg-[#00B341] rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${(portfolioStats.healthy / portfolioStats.total) * 100}%` }} />
                  <div className="bg-[#FFC224] rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${(portfolioStats.watch / portfolioStats.total) * 100}%` }} />
                  <div className="bg-[#FF3B30] rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${(portfolioStats.distress / portfolioStats.total) * 100}%` }} />
                </>}
              </div>
              <div className="flex items-center gap-10 mt-8">
                {[{ l: "Healthy", c: "bg-[#00B341]", v: portfolioStats.healthy }, { l: "Watch", c: "bg-[#FFC224]", v: portfolioStats.watch }, { l: "Distress", c: "bg-[#FF3B30]", v: portfolioStats.distress }].map(({ l, c, v }) => (
                  <div key={l} className="flex items-center gap-3">
                    <span className={`w-3.5 h-3.5 rounded-full ${c} shadow-sm`} />
                    <span className="text-sm font-medium text-neutral-500">{l} <span className="font-bold text-neutral-900 dark:text-neutral-100 ml-2 text-base">{v}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Macro Card */}
          <div className="col-span-1 lg:col-span-4 card-dark p-10 flex flex-col relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-brand-orange/15 blur-[120px] pointer-events-none" />
            <div className="relative flex-1 flex flex-col">
              <p className="label-caps text-neutral-500 mb-8">Macro Environment</p>
              <div className="mb-10">
                <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-3">Market Regime</p>
                <p className={`text-5xl font-bold tracking-tighter ${macroRegime === "RISK_ON" ? "text-emerald-500" : macroRegime === "RISK_OFF" ? "text-red-500" : "text-neutral-900 dark:text-white"}`}>
                  {macroRegime?.replace("_", " ") || "—"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-10">
                {[{ l: "Score", v: macroScore?.toFixed(2) ?? "—" }, { l: "Sectors", v: latestSectorHealth.length }, { l: "VIX Z", v: macro?.vix_z?.toFixed(2) ?? "—" }, { l: "USD Z", v: macro?.usd_z?.toFixed(2) ?? "—" }].map(({ l, v }) => (
                  <div key={l} className="bg-neutral-900/[0.04] dark:bg-white/[0.04] border border-neutral-900/[0.06] dark:border-white/[0.06] rounded-2xl p-5">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-3">{l}</p>
                    <p className="text-3xl font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">{v}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2.5 mt-auto">
                {[{ l: "Strong", c: signalCounts.STRONG, s: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" }, { l: "Neutral", c: signalCounts.NEUTRAL, s: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20" }, { l: "Watch", c: signalCounts.WATCH, s: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" }, { l: "Weak", c: signalCounts.WEAK, s: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" }].map(({ l, c: cnt, s }) => (
                  <span key={l} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${s}`}>
                    <span className="tabular-nums font-bold">{cnt}</span> {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Charts ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 stagger-3">
          <div className="col-span-1 lg:col-span-7 card-glass p-10">
            <div className="flex items-start justify-between mb-10">
              <div><p className="title-lg mb-2 text-2xl">Macro Score Trend</p><p className="text-base text-neutral-500">30-day composite of VIX, USD-INR, Gold, and Crude Oil.</p></div>
              {macroRegime && <SignalBadge value={macroRegime} />}
            </div>
            {macroChartData.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={macroChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs><linearGradient id="macroGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ct.orange} stopOpacity={0.2} /><stop offset="100%" stopColor={ct.orange} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="2 6" stroke={ct.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: ct.tick, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: ct.tick, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip {...ct.tooltip} />
                  <Area type="monotone" dataKey="score" stroke={ct.orange} strokeWidth={3} fill="url(#macroGrad)" dot={false} name="Macro Score" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-sm text-neutral-400">No macro data</div>}
          </div>
          <div className="col-span-1 lg:col-span-5 card-glass p-10">
            <div className="mb-10"><p className="title-lg mb-2 text-2xl">Sector Returns</p><p className="text-base text-neutral-500">Today's NSE sector index performance</p></div>
            {sectorReturnData.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sectorReturnData} layout="vertical" margin={{ top: 0, right: 8, left: 10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: ct.tick }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: ct.tick, fontWeight: 500 }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip {...ct.tooltip} formatter={v => [`${v}%`, "Return"]} />
                  <Bar dataKey="ret" radius={[0, 6, 6, 0]} maxBarSize={20}>{sectorReturnData.map((e, i) => <Cell key={i} fill={e.ret >= 0 ? ct.green : ct.red} fillOpacity={0.85} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-sm text-neutral-400">No sector data</div>}
          </div>
        </div>

        {/* ── Top Picks + At Risk ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 stagger-4">
          <div className="card-glass overflow-hidden">
            <div className="px-8 py-6 border-b border-neutral-900/[0.08] dark:border-white/[0.08] flex items-center justify-between bg-neutral-900/[0.02] dark:bg-white/[0.02]">
              <div><p className="title-lg">Top Picks</p><p className="text-sm text-neutral-500 mt-1">Highest ML survival scores across portfolio</p></div>
              <Link to="/risk-engine" className="text-sm font-bold text-brand-orange hover:underline flex items-center gap-1 uppercase tracking-widest">View all <ArrowUpRight size={16} /></Link>
            </div>
            {topPicks.length ? <div>{topPicks.map((r, i) => { const c = compMap[r.company_id]; return <PickRow key={r.id || r.company_id} rank={i + 1} name={c?.name || "—"} ticker={c?.ticker || "—"} score={r.survival_score} companyId={r.company_id} />; })}</div> : <div className="py-20 text-center text-sm text-neutral-400">No ML predictions</div>}
          </div>
          <div className="card-glass overflow-hidden border border-red-500/20 shadow-[0_8px_32px_rgba(239,68,68,0.05)]">
            <div className="px-8 py-6 border-b border-red-500/10 bg-red-500/[0.02] flex items-center justify-between">
              <div><p className="title-lg flex items-center gap-3">At Risk <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse-soft shadow-sm" /></p><p className="text-sm text-neutral-500 mt-1">Lowest scores — immediate review</p></div>
              <Link to="/risk-engine" className="text-sm font-bold text-red-500 hover:underline flex items-center gap-1 uppercase tracking-widest">View all <ArrowUpRight size={16} /></Link>
            </div>
            {atRisk.length ? <div>{atRisk.map((r, i) => { const c = compMap[r.company_id]; return <PickRow key={r.id || r.company_id} rank={i + 1} name={c?.name || "—"} ticker={c?.ticker || "—"} score={r.survival_score} companyId={r.company_id} />; })}</div> : <div className="py-20 text-center text-sm text-neutral-400">No ML predictions</div>}
          </div>
        </div>

        {/* ── Sector Health ─────────────────────────────────── */}
        <div className="card-glass overflow-hidden stagger-5">
          <div className="px-8 py-8 border-b border-neutral-900/[0.08] dark:border-white/[0.08] flex items-center justify-between bg-neutral-900/[0.02] dark:bg-white/[0.02]">
            <div>
              <p className="title-lg text-2xl flex items-center gap-4">Sector Health Monitor <span className="flex items-center gap-2 ml-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-1.5 rounded-xl"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-soft shadow-sm" /><span className="text-[11px] font-bold uppercase tracking-widest">Live Feed</span></span></p>
              <p className="text-base text-neutral-500 mt-2">Daily signals generated from rolling 20d z-scores and price action patterns</p>
            </div>
            <Link to="/sectors" className="btn-active px-6 py-3">Full Details <ArrowRight size={16} /></Link>
          </div>
          {latestSectorHealth.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-neutral-900/[0.02] dark:bg-white/[0.01]">
                  {["Sector", "Signal", "Regime", "Health Score"].map(h => <th key={h} className="th-base py-4 px-8 text-xs">{h}</th>)}
                </tr></thead>
                <tbody>{latestSectorHealth.map((row, i) => <SectorRow key={row.id} row={row} index={i} />)}</tbody>
              </table>
            </div>
          ) : <div className="py-24 text-center text-sm text-neutral-400">No sector health data</div>}
        </div>

      </div>
    </PageLayout>
  );
}
