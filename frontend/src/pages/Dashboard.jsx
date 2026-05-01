import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell, ReferenceLine, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import {
  ArrowUpRight, TrendingUp, TrendingDown, Zap, Globe,
  Brain, Activity, Shield, ChevronRight, BarChart3
} from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LiveMarketBar from "../components/ui/LiveMarketBar";
import { PageSkeleton } from "../components/ui/LoadingSpinner";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";

// ── Micro components ──────────────────────────────────────────────────────────

function MetricTile({ label, value, sub, accent }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="label-caps">{label}</p>
      <p className={`text-2xl font-bold tabular-nums tracking-tight ${accent ? "text-[var(--orange)]" : "text-[var(--text)]"}`}>{value ?? "—"}</p>
      {sub && <p className="text-[10px] text-[var(--text-3)]">{sub}</p>}
    </div>
  );
}

function ScoreBar({ score, label, id }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const color = pct >= 70 ? "var(--orange)" : pct >= 40 ? "#F5C842" : "#D1D1D1";
  return (
    <Link to={`/companies/${id}`} className="flex items-center gap-3 group hover:bg-neutral-50 dark:hover:bg-neutral-900/40 px-4 py-2.5 transition-colors">
      <span className="text-xs font-medium text-[var(--text)] truncate flex-1 group-hover:text-[var(--orange)] transition-colors">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-16 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="text-xs font-bold tabular-nums text-[var(--text)] w-6 text-right">{pct.toFixed(0)}</span>
      </div>
    </Link>
  );
}

function SectorPill({ row }) {
  const hs = row.health_score ?? 0;
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: hs >= 75 ? "var(--orange)" : hs >= 50 ? "#F5C842" : "#D1D1D1" }} />
        <span className="text-xs font-medium text-[var(--text)] truncate">{row.sectors?.name || "—"}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <SignalBadge value={row.signal} />
        <span className="text-xs font-bold tabular-nums text-[var(--text-2)] w-6 text-right">{hs.toFixed(0)}</span>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { latestSectorHealth, macro, portfolioStats, latestMl, companies, loading } = useAppData();
  const ct = useChartTheme();
  const [tab, setTab] = useState("top");

  const compMap = useMemo(() => { const m = {}; companies.forEach(c => { m[c.id] = c; }); return m; }, [companies]);

  const topPicks = useMemo(() =>
    [...latestMl].filter(r => r.composite_score != null)
      .sort((a, b) => b.composite_score - a.composite_score).slice(0, 8),
    [latestMl]);

  const atRisk = useMemo(() =>
    [...latestMl].filter(r => r.composite_score != null)
      .sort((a, b) => a.composite_score - b.composite_score).slice(0, 8),
    [latestMl]);

  const sectorChartData = useMemo(() =>
    latestSectorHealth
      .filter(r => r.sectors?.sector_type === "sector" && r.daily_return != null)
      .map(r => ({
        name: (r.sectors?.name || "").replace(" Sector", "").replace(" Nifty", ""),
        ret:  +(r.daily_return * 100).toFixed(2),
        hs:   +(r.health_score || 0).toFixed(1),
      }))
      .sort((a, b) => b.ret - a.ret),
    [latestSectorHealth]);

  const radarData = useMemo(() => {
    if (!portfolioStats.scored) return [];
    const ml = latestMl.filter(r => r.composite_score != null);
    const avg = f => ml.length ? ml.reduce((s, r) => s + (r[f] || 0), 0) / ml.length : 0;
    return [
      { subject: "Trend",       A: avg("trend_score")            || avg("health_score") },
      { subject: "Fundamental", A: avg("fundamental_score")      || 50 },
      { subject: "Sentiment",   A: avg("sentiment_score")        || 50 },
      { subject: "Sector Fit",  A: avg("sector_alignment_score") || 50 },
      { subject: "Momentum",    A: avg("momentum")               || 50 },
      { subject: "Strength",    A: avg("strength")               || 50 },
    ];
  }, [latestMl, portfolioStats]);

  const scoreDistribution = useMemo(() => {
    const buckets = [
      { label: "0–20",   lo: 0,  hi: 20  },
      { label: "20–40",  lo: 20, hi: 40  },
      { label: "40–60",  lo: 40, hi: 60  },
      { label: "60–80",  lo: 60, hi: 80  },
      { label: "80–100", lo: 80, hi: 100 },
    ];
    return buckets.map(b => ({
      ...b,
      count: latestMl.filter(r => (r.composite_score || 0) >= b.lo && (r.composite_score || 0) < b.hi).length,
    }));
  }, [latestMl]);

  if (loading) return <PageLayout title="Dashboard"><PageSkeleton /></PageLayout>;

  const regime = macro?.macro_regime || "NEUTRAL";
  const isRiskOn = regime === "RISK_ON";

  return (
    <PageLayout title="Dashboard">
      <div className="space-y-5 pb-10">

        {/* ── Header ── */}
        <div className="animate-fade-in">
          <p className="label-caps text-[var(--orange)] mb-1">AEGIS-FIN · Intelligence Platform</p>
          <h1 className="page-heading">Command Center</h1>
        </div>

        <LiveMarketBar />

        {/* ── Row 1: KPI strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 stagger-1">
          {[
            { label: "Universe",    value: portfolioStats.total,        sub: "companies tracked" },
            { label: "Scored",      value: portfolioStats.scored,       sub: "with ML scores" },
            { label: "Healthy ≥70", value: portfolioStats.healthy,      sub: "low distress",    accent: true },
            { label: "Watch 40–70", value: portfolioStats.watch,        sub: "monitor closely" },
            { label: "Distress <40",value: portfolioStats.distress,     sub: "review now" },
          ].map(({ label, value, sub, accent }) => (
            <div key={label} className="card p-5 hover-lift">
              <MetricTile label={label} value={value} sub={sub} accent={accent} />
            </div>
          ))}
        </div>

        {/* ── Row 2: Portfolio score + Macro + Radar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-2">

          {/* Portfolio health */}
          <div className="card p-6 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-[var(--orange)]/6 pointer-events-none" />
            <p className="label-caps mb-3">Portfolio Health</p>
            <p className="value-xl mb-1">{portfolioStats.avgSurvival}</p>
            <p className="text-xs text-[var(--text-3)] mb-4">avg composite score / 100</p>
            <div className="flex h-2 rounded-full overflow-hidden gap-px mb-3">
              {portfolioStats.total > 0 ? <>
                <div className="bg-[var(--orange)] rounded-l-full transition-all duration-1000" style={{ width: `${(portfolioStats.healthy / portfolioStats.total) * 100}%` }} />
                <div className="bg-[var(--orange)]/40 transition-all duration-1000" style={{ width: `${(portfolioStats.watch / portfolioStats.total) * 100}%` }} />
                <div className="bg-neutral-200 dark:bg-neutral-700 rounded-r-full transition-all duration-1000" style={{ width: `${(portfolioStats.distress / portfolioStats.total) * 100}%` }} />
              </> : <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full" />}
            </div>
            {/* Score distribution mini chart */}
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={scoreDistribution} barSize={20}>
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreDistribution.map((b, i) => (
                    <Cell key={i} fill={i >= 2 ? "var(--orange)" : "#D1D1D1"} fillOpacity={0.85} />
                  ))}
                </Bar>
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                <Tooltip {...ct.tooltip} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Macro regime */}
          <div className="card p-6 relative overflow-hidden"
            style={{ borderTop: `3px solid ${isRiskOn ? "var(--orange)" : "#888"}` }}>
            <div className="absolute right-0 top-0 w-32 h-32 rounded-full blur-[60px] pointer-events-none"
              style={{ background: isRiskOn ? "rgba(232,87,42,0.08)" : "rgba(100,100,100,0.05)" }} />
            <p className="label-caps mb-2">Macro Regime</p>
            <div className="flex items-end gap-3 mb-3">
              <p className="text-2xl font-bold tracking-tight text-[var(--text)]">{regime.replace("_", " ")}</p>
              <SignalBadge value={regime} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: "VIX Z",   v: macro?.vix_z,   icon: "⚡" },
                { l: "USD Z",   v: macro?.usd_z,   icon: "💱" },
                { l: "Gold Z",  v: macro?.gold_z,  icon: "🥇" },
                { l: "Crude Z", v: macro?.crude_z, icon: "🛢" },
              ].map(({ l, v, icon }) => (
                <div key={l} className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-3)] mb-1">{icon} {l}</p>
                  <p className={`text-sm font-bold tabular-nums ${Math.abs(v || 0) > 1 ? "text-[var(--orange)]" : "text-[var(--text)]"}`}>
                    {v != null ? v.toFixed(2) : "—"}
                  </p>
                </div>
              ))}
            </div>
            <Link to="/macro" className="flex items-center gap-1 text-[10px] font-semibold text-[var(--orange)] mt-3 hover:underline">
              Full macro analysis <ArrowUpRight size={11} />
            </Link>
          </div>

          {/* Portfolio radar */}
          <div className="card p-6">
            <p className="label-caps mb-1">Portfolio Intelligence</p>
            <p className="text-[10px] text-[var(--text-3)] mb-2">Avg scores across all dimensions</p>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={ct.grid} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: ct.tick }} />
                  <Radar dataKey="A" stroke="var(--orange)" fill="var(--orange)" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip {...ct.tooltip} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-xs text-[var(--text-3)]">Run pipeline to generate scores</div>
            )}
          </div>
        </div>

        {/* ── Row 3: Sector returns + Companies ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 stagger-3">

          {/* Sector returns bar */}
          <div className="lg:col-span-3 card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="title-md">Sector Returns</p>
                <p className="text-xs text-[var(--text-3)]">Daily performance · NSE indices</p>
              </div>
              <Link to="/sectors" className="text-xs font-semibold text-[var(--orange)] flex items-center gap-1 hover:underline">
                All sectors <ArrowUpRight size={11} />
              </Link>
            </div>
            {sectorChartData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sectorChartData} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={72} />
                  <Tooltip {...ct.tooltip} formatter={v => [`${v}%`, "Return"]} />
                  <ReferenceLine x={0} stroke={ct.grid} />
                  <Bar dataKey="ret" radius={[0, 5, 5, 0]} maxBarSize={14}>
                    {sectorChartData.map((e, i) => (
                      <Cell key={i} fill={e.ret >= 0 ? "var(--orange)" : "#D1D1D1"} fillOpacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-xs text-[var(--text-3)]">No sector data — run pipeline</div>
            )}
          </div>

          {/* Top / At Risk companies */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex gap-1">
                {["top", "risk"].map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-lg transition-all ${tab === t ? "bg-[var(--orange)] text-white" : "text-[var(--text-3)] hover:text-[var(--text)]"}`}>
                    {t === "top" ? "Top Picks" : "At Risk"}
                  </button>
                ))}
              </div>
              <Link to="/risk-engine" className="text-[10px] font-semibold text-[var(--orange)] flex items-center gap-0.5 hover:underline">
                All <ArrowUpRight size={10} />
              </Link>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {(tab === "top" ? topPicks : atRisk).map(r => {
                const c = compMap[r.company_id];
                return c ? (
                  <ScoreBar key={r.company_id} id={r.company_id} label={c.name} score={r.composite_score} />
                ) : null;
              })}
              {!(tab === "top" ? topPicks : atRisk).length && (
                <p className="text-xs text-[var(--text-3)] text-center py-8">No data — run pipeline</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 4: Sector health monitor ── */}
        <div className="card overflow-hidden stagger-4">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <p className="title-md">Sector Health Monitor</p>
              <p className="text-xs text-[var(--text-3)] mt-0.5">Rolling z-score health signals · all 14 indices</p>
            </div>
            <Link to="/sectors" className="text-xs font-semibold text-[var(--orange)] flex items-center gap-1 hover:underline">
              Deep dive <ArrowUpRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
            {latestSectorHealth.slice(0, 8).map(row => {
              const hs = row.health_score ?? 0;
              return (
                <div key={row.sector_id} className="px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-[var(--text)] truncate">{row.sectors?.name || "—"}</p>
                    <SignalBadge value={row.signal} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--orange)] transition-all duration-700" style={{ width: `${hs}%` }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums text-[var(--text-2)] w-6 text-right">{hs.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-[var(--text-3)]">{row.regime}</span>
                    {row.daily_return != null && (
                      <span className={`text-[9px] font-bold tabular-nums ${row.daily_return >= 0 ? "text-[var(--orange)]" : "text-[var(--text-3)]"}`}>
                        {row.daily_return >= 0 ? "+" : ""}{(row.daily_return * 100).toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Row 5: Quick nav ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-5">
          {[
            { label: "Companies",   path: "/companies",   icon: Brain,    desc: `${companies.length} tracked · ML scored daily` },
            { label: "Risk Engine", path: "/risk-engine", icon: Shield,   desc: "Distress probability · tier classification" },
            { label: "Correlation", path: "/correlation", icon: Activity, desc: "Company vs sector co-movement analysis" },
            { label: "Macro",       path: "/macro",       icon: Globe,    desc: "VIX · USD · Gold · Crude regime overlay" },
          ].map(({ label, path, icon: Icon, desc }) => (
            <Link key={path} to={path} className="card p-5 group hover-lift flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[var(--orange)]/8 flex items-center justify-center group-hover:bg-[var(--orange)] transition-colors duration-200">
                  <Icon size={17} className="text-[var(--orange)] group-hover:text-white transition-colors duration-200" />
                </div>
                <ArrowUpRight size={14} className="text-[var(--text-3)] group-hover:text-[var(--orange)] transition-colors" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--orange)] transition-colors">{label}</p>
                <p className="text-xs text-[var(--text-3)] mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </PageLayout>
  );
}
