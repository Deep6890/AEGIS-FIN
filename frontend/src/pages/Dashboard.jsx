import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell, ReferenceLine, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import {
  AlertTriangle, TrendingUp, TrendingDown, Shield, Globe,
  Building2, Activity, ArrowUpRight, Eye, Zap, ChevronRight
} from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LiveMarketBar from "../components/ui/LiveMarketBar";
import { PageSkeleton } from "../components/ui/LoadingSpinner";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";

// ── Risk status helpers ───────────────────────────────────────────────────────

function riskColor(score) {
  if (score == null) return "#ABABAB";
  if (score >= 70) return "#22C55E";
  if (score >= 40) return "var(--orange)";
  return "#EF4444";
}

function riskLabel(score) {
  if (score == null) return "No Data";
  if (score >= 70) return "Stable";
  if (score >= 40) return "Warning";
  return "High Risk";
}

function riskBg(score) {
  if (score == null) return "bg-neutral-100 dark:bg-neutral-800 text-neutral-500";
  if (score >= 70) return "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400";
  if (score >= 40) return "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400";
  return "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RiskBadge({ score }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${riskBg(score)}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor(score) }} />
      {riskLabel(score)}
    </span>
  );
}

function CompanyRiskRow({ company, ml, rank }) {
  const score = ml?.composite_score;
  const distress = ml?.distress_probability;
  const pct = Math.min(100, Math.max(0, score || 0));
  return (
    <Link to={`/companies/${company.id}`}
      className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors group">
      <span className="text-[10px] font-mono text-[var(--text-3)] w-4 shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--text)] truncate group-hover:text-[var(--orange)] transition-colors">{company.name}</p>
        <p className="text-[10px] font-mono text-[var(--text-3)]">{company.ticker}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-14 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: riskColor(score) }} />
        </div>
        <span className="text-xs font-bold tabular-nums w-6 text-right" style={{ color: riskColor(score) }}>{pct.toFixed(0)}</span>
      </div>
      <RiskBadge score={score} />
      <ChevronRight size={12} className="text-[var(--text-3)] group-hover:text-[var(--orange)] transition-colors shrink-0" />
    </Link>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { latestSectorHealth, macro, portfolioStats, latestMl, companies, loading } = useAppData();
  const ct = useChartTheme();
  const [riskTab, setRiskTab] = useState("distress");

  const compMap = useMemo(() => {
    const m = {};
    companies.forEach(c => { m[c.id] = c; });
    return m;
  }, [companies]);

  // High risk companies — sorted by distress probability
  const highRisk = useMemo(() =>
    [...latestMl]
      .filter(r => r.composite_score != null && r.composite_score < 40)
      .sort((a, b) => (b.distress_probability || 0) - (a.distress_probability || 0))
      .slice(0, 8),
    [latestMl]);

  // Warning zone
  const watchZone = useMemo(() =>
    [...latestMl]
      .filter(r => r.composite_score != null && r.composite_score >= 40 && r.composite_score < 70)
      .sort((a, b) => a.composite_score - b.composite_score)
      .slice(0, 8),
    [latestMl]);

  // Sector returns
  const sectorData = useMemo(() =>
    latestSectorHealth
      .filter(r => r.sectors?.sector_type === "sector" && r.daily_return != null)
      .map(r => ({
        name: (r.sectors?.name || "").replace(" Sector", "").replace(" Nifty", ""),
        ret:  +(r.daily_return * 100).toFixed(2),
        hs:   +(r.health_score || 0).toFixed(1),
      }))
      .sort((a, b) => b.ret - a.ret),
    [latestSectorHealth]);

  // Portfolio risk radar
  const radarData = useMemo(() => {
    const ml = latestMl.filter(r => r.composite_score != null);
    if (!ml.length) return [];
    const avg = f => ml.reduce((s, r) => s + (r[f] || 0), 0) / ml.length;
    return [
      { subject: "Market",      A: avg("health_score") || avg("trend_score") || 50 },
      { subject: "Financial",   A: avg("fundamental_score") || 50 },
      { subject: "Governance",  A: avg("strength") || 50 },
      { subject: "Momentum",    A: avg("momentum") || 50 },
      { subject: "Sector Fit",  A: avg("sector_alignment_score") || 50 },
      { subject: "Sentiment",   A: avg("sentiment_score") || 50 },
    ];
  }, [latestMl]);

  // Score distribution
  const distData = useMemo(() => [
    { label: "0–20",   lo: 0,  hi: 20,  risk: "high" },
    { label: "20–40",  lo: 20, hi: 40,  risk: "high" },
    { label: "40–60",  lo: 40, hi: 60,  risk: "watch" },
    { label: "60–80",  lo: 60, hi: 80,  risk: "stable" },
    { label: "80–100", lo: 80, hi: 100, risk: "stable" },
  ].map(b => ({
    ...b,
    count: latestMl.filter(r => (r.composite_score || 0) >= b.lo && (r.composite_score || 0) < b.hi).length,
  })), [latestMl]);

  if (loading) return <PageLayout title="Risk Dashboard"><PageSkeleton /></PageLayout>;

  const regime = macro?.macro_regime || "NEUTRAL";
  const macroRisk = regime === "RISK_OFF";

  return (
    <PageLayout title="Risk Dashboard">
      <div className="space-y-5 pb-10">

        {/* ── Header ── */}
        <div className="animate-fade-in">
          <p className="label-caps text-[var(--orange)] mb-1">AEGIS-FIN · Bank Risk Intelligence</p>
          <div className="flex items-end justify-between gap-4">
            <h1 className="page-heading">Portfolio Risk Overview</h1>
            {macroRisk && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 shrink-0">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs font-bold text-red-600 dark:text-red-400">Macro Risk-Off Environment</span>
              </div>
            )}
          </div>
        </div>

        <LiveMarketBar />

        {/* ── Row 1: Risk KPI strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 stagger-1">
          {[
            { label: "Total SMEs",     value: portfolioStats.total,    sub: "under monitoring",   color: "text-[var(--text)]" },
            { label: "Scored",         value: portfolioStats.scored,   sub: "ML risk assessed",   color: "text-[var(--text)]" },
            { label: "Stable",         value: portfolioStats.healthy,  sub: "score ≥ 70",         color: "text-green-600 dark:text-green-400" },
            { label: "Watch Zone",     value: portfolioStats.watch,    sub: "score 40–70",        color: "text-[var(--orange)]" },
            { label: "High Risk",      value: portfolioStats.distress, sub: "immediate review",   color: "text-red-500" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="card p-5">
              <p className="label-caps mb-2">{label}</p>
              <p className={`text-3xl font-bold tabular-nums tracking-tight ${color}`}>{value ?? "—"}</p>
              <p className="text-[10px] text-[var(--text-3)] mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Row 2: Portfolio health + Macro + Risk radar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-2">

          {/* Portfolio risk distribution */}
          <div className="card p-6">
            <p className="label-caps mb-1">Risk Distribution</p>
            <p className="text-xs text-[var(--text-3)] mb-3">SME portfolio by risk score bucket</p>
            <div className="flex items-end gap-1 mb-3">
              <p className="text-3xl font-bold tabular-nums text-[var(--text)]">{portfolioStats.avgSurvival}</p>
              <p className="text-xs text-[var(--text-3)] mb-1">/ 100 avg score</p>
            </div>
            {/* Stacked risk bar */}
            <div className="flex h-2.5 rounded-full overflow-hidden gap-px mb-3">
              {portfolioStats.total > 0 ? <>
                <div className="bg-red-400 rounded-l-full" style={{ width: `${(portfolioStats.distress / portfolioStats.total) * 100}%` }} />
                <div className="bg-[var(--orange)]/70" style={{ width: `${(portfolioStats.watch / portfolioStats.total) * 100}%` }} />
                <div className="bg-green-400 rounded-r-full" style={{ width: `${(portfolioStats.healthy / portfolioStats.total) * 100}%` }} />
              </> : <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full" />}
            </div>
            <div className="flex items-center gap-4 mb-4">
              {[
                { l: "High Risk", v: portfolioStats.distress, c: "bg-red-400" },
                { l: "Watch",     v: portfolioStats.watch,    c: "bg-[var(--orange)]/70" },
                { l: "Stable",    v: portfolioStats.healthy,  c: "bg-green-400" },
              ].map(({ l, v, c }) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${c}`} />
                  <span className="text-[10px] text-[var(--text-3)]">{l} <span className="font-bold text-[var(--text)]">{v}</span></span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={distData} barSize={24}>
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distData.map((b, i) => (
                    <Cell key={i}
                      fill={b.risk === "high" ? "#EF4444" : b.risk === "watch" ? "var(--orange)" : "#22C55E"}
                      fillOpacity={0.8} />
                  ))}
                </Bar>
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                <Tooltip {...ct.tooltip} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Macro environment */}
          <div className="card p-6" style={{ borderTop: `3px solid ${macroRisk ? "#EF4444" : regime === "RISK_ON" ? "#22C55E" : "#ABABAB"}` }}>
            <p className="label-caps mb-2">Macro Environment</p>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-xl font-bold text-[var(--text)]">{regime.replace("_", " ")}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                macroRisk ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400" :
                regime === "RISK_ON" ? "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400" :
                "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
              }`}>
                {macroRisk ? "Headwind" : regime === "RISK_ON" ? "Tailwind" : "Neutral"}
              </span>
            </div>
            <p className="text-xs text-[var(--text-3)] mb-4 leading-relaxed">
              {macroRisk
                ? "Elevated macro stress — VIX high, INR weak. SME credit risk elevated."
                : regime === "RISK_ON"
                ? "Supportive macro conditions. Low volatility, stable currency."
                : "Balanced macro environment. No strong directional signal."}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: "VIX Z-Score",   v: macro?.vix_z,   warn: v => v > 1 },
                { l: "USD-INR Z",     v: macro?.usd_z,   warn: v => v > 1 },
                { l: "Gold Z-Score",  v: macro?.gold_z,  warn: v => v > 1 },
                { l: "Crude Z-Score", v: macro?.crude_z, warn: v => v > 1 },
              ].map(({ l, v, warn }) => (
                <div key={l} className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-3)] mb-1">{l}</p>
                  <p className={`text-sm font-bold tabular-nums ${warn(v || 0) ? "text-red-500" : "text-[var(--text)]"}`}>
                    {v != null ? (v > 0 ? "+" : "") + v.toFixed(2) : "—"}
                  </p>
                </div>
              ))}
            </div>
            <Link to="/macro" className="flex items-center gap-1 text-[10px] font-semibold text-[var(--orange)] mt-3 hover:underline">
              Full macro analysis <ArrowUpRight size={11} />
            </Link>
          </div>

          {/* Risk radar */}
          <div className="card p-6">
            <p className="label-caps mb-1">Portfolio Risk Dimensions</p>
            <p className="text-[10px] text-[var(--text-3)] mb-2">Average risk scores across all SMEs</p>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={ct.grid} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: ct.tick }} />
                  <Radar dataKey="A" stroke="var(--orange)" fill="var(--orange)" fillOpacity={0.12} strokeWidth={2} />
                  <Tooltip {...ct.tooltip} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-xs text-[var(--text-3)]">Data unavailable — run pipeline</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 3: High risk + Sector health ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 stagger-3">

          {/* Risk watchlist */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex gap-1">
                {[
                  { key: "distress", label: "High Risk", count: portfolioStats.distress },
                  { key: "watch",    label: "Watch",     count: portfolioStats.watch },
                ].map(t => (
                  <button key={t.key} onClick={() => setRiskTab(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                      riskTab === t.key
                        ? t.key === "distress" ? "bg-red-500 text-white" : "bg-[var(--orange)] text-white"
                        : "text-[var(--text-3)] hover:text-[var(--text)]"
                    }`}>
                    {t.label}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${riskTab === t.key ? "bg-white/20" : "bg-neutral-100 dark:bg-neutral-800"}`}>
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>
              <Link to="/risk-engine" className="text-[10px] font-semibold text-[var(--orange)] flex items-center gap-0.5 hover:underline">
                All <ArrowUpRight size={10} />
              </Link>
            </div>
            <div>
              {(riskTab === "distress" ? highRisk : watchZone).map((r, i) => {
                const c = compMap[r.company_id];
                return c ? <CompanyRiskRow key={r.company_id} company={c} ml={r} rank={i + 1} /> : null;
              })}
              {!(riskTab === "distress" ? highRisk : watchZone).length && (
                <p className="text-xs text-[var(--text-3)] text-center py-8">
                  {riskTab === "distress" ? "No high-risk companies detected" : "No companies in watch zone"}
                </p>
              )}
            </div>
          </div>

          {/* Sector returns */}
          <div className="lg:col-span-3 card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="title-md">Sector Performance</p>
                <p className="text-xs text-[var(--text-3)]">Daily returns · NSE sector indices</p>
              </div>
              <Link to="/sectors" className="text-xs font-semibold text-[var(--orange)] flex items-center gap-1 hover:underline">
                Sector analysis <ArrowUpRight size={11} />
              </Link>
            </div>
            {sectorData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sectorData} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={72} />
                  <Tooltip {...ct.tooltip} formatter={v => [`${v}%`, "Return"]} />
                  <ReferenceLine x={0} stroke={ct.grid} />
                  <Bar dataKey="ret" radius={[0, 5, 5, 0]} maxBarSize={14}>
                    {sectorData.map((e, i) => (
                      <Cell key={i} fill={e.ret >= 0 ? "#22C55E" : "#EF4444"} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center">
                <p className="text-xs text-[var(--text-3)]">Data unavailable — run pipeline</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 4: Sector health signals ── */}
        <div className="card overflow-hidden stagger-4">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <p className="title-md">Sector Health Signals</p>
              <p className="text-xs text-[var(--text-3)] mt-0.5">Rolling z-score health · 14 NSE indices · affects SME credit risk</p>
            </div>
            <Link to="/sectors" className="text-xs font-semibold text-[var(--orange)] flex items-center gap-1 hover:underline">
              Deep dive <ArrowUpRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 divide-x divide-[var(--border)]">
            {latestSectorHealth.filter(r => r.sectors?.sector_type === "sector").slice(0, 7).map(row => {
              const hs = row.health_score ?? 0;
              const ret = row.daily_return;
              return (
                <div key={row.sector_id} className="px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors">
                  <p className="text-[10px] font-semibold text-[var(--text)] truncate mb-2">
                    {(row.sectors?.name || "—").replace(" Sector", "").replace(" Nifty", "")}
                  </p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: riskColor(hs) }}>{hs.toFixed(0)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {ret != null && (
                      <span className={`text-[9px] font-bold tabular-nums flex items-center gap-0.5 ${ret >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {ret >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {Math.abs(ret * 100).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${hs}%`, background: riskColor(hs) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Row 5: Quick actions ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-5">
          {[
            { label: "SME Portfolio",  path: "/companies",   icon: Building2, desc: `${companies.length} companies · daily risk scoring` },
            { label: "Risk Engine",    path: "/risk-engine", icon: Shield,    desc: "Distress probability · classification" },
            { label: "Correlation",    path: "/correlation", icon: Activity,  desc: "Company vs sector co-movement" },
            { label: "Macro Overlay",  path: "/macro",       icon: Globe,     desc: "VIX · USD · Gold · Crude signals" },
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
