import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Building2, TrendingUp, ShieldAlert, Activity, ChevronRight, Zap, Globe, Brain } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import { PageSkeleton } from "../components/ui/LoadingSpinner";
import LiveMarketBar from "../components/ui/LiveMarketBar";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchMacroOverlay, fetchLatestSectorMetrics } from "../lib/api";
import { adaptSectorHealthRow } from "../lib/adapter";

function CompanyRow({ rank, name, ticker, score, companyId }) {
  const pct = Math.min(100, score || 0);
  return (
    <Link to={`/companies/${companyId}`} className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border)] last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors group">
      <span className="text-xs font-mono text-[var(--text-3)] w-5 shrink-0 tabular-nums">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text)] truncate group-hover:text-[var(--orange)] transition-colors">{name}</p>
        <p className="text-[11px] font-mono text-[var(--text-3)] mt-0.5">{ticker}</p>
      </div>
      <div className="flex items-center gap-2.5 w-24 shrink-0">
        <div className="flex-1 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[var(--orange)] transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-bold tabular-nums text-[var(--text)] w-7 text-right">{score?.toFixed(0)}</span>
      </div>
      <ChevronRight size={13} className="text-[var(--text-3)] group-hover:text-[var(--orange)] transition-colors shrink-0" />
    </Link>
  );
}

function SectorRow({ row, index }) {
  const pct = Math.min(100, row.health_score || 0);
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border)] last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors">
      <span className="text-xs font-mono text-[var(--text-3)] w-5 shrink-0">{index + 1}</span>
      <p className="flex-1 text-sm font-medium text-[var(--text)] truncate">{row.sectors?.name || `Sector ${row.sector_id}`}</p>
      <SignalBadge value={row.signal} />
      <div className="flex items-center gap-2 w-24 shrink-0">
        <div className="flex-1 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[var(--orange)]" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-bold tabular-nums text-[var(--text-2)] w-6 text-right">{row.health_score?.toFixed(0) ?? "—"}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { latestSectorHealth, macro, portfolioStats, latestMl, companies, loading } = useAppData();
  const ct = useChartTheme();
  const [macroHistory, setMacroHistory] = useState([]);
  const [sectorMetrics, setSectorMetrics] = useState([]);

  useEffect(() => {
    fetchMacroOverlay(60).then(r => setMacroHistory(r.data || []));
    fetchLatestSectorMetrics().then(r => setSectorMetrics((r.data || []).map(adaptSectorHealthRow)));
  }, []);

  const macroChartData = macroHistory.slice(-30).map(r => ({ date: r.date?.slice(5), score: parseFloat(r.health_score?.toFixed(2) || 0) }));

  const latestMetrics = useMemo(() => {
    const seen = new Map();
    for (const row of sectorMetrics) { if (!seen.has(row.sector_id)) seen.set(row.sector_id, row); }
    return Array.from(seen.values());
  }, [sectorMetrics]);

  const sectorReturnData = latestMetrics.filter(r => r.daily_return != null).map(r => ({ name: r.sectors?.name?.replace(" Sector","").replace(" Nifty",""), ret: +(r.daily_return * 100).toFixed(2) })).sort((a, b) => b.ret - a.ret).slice(0, 8);

  const compMap = useMemo(() => { const m = {}; companies.forEach(c => { m[c.id] = c; }); return m; }, [companies]);
  const topPicks = useMemo(() => [...latestMl].filter(r => r.survival_score != null).sort((a, b) => b.survival_score - a.survival_score).slice(0, 6), [latestMl]);
  const atRisk   = useMemo(() => [...latestMl].filter(r => r.survival_score != null).sort((a, b) => a.survival_score - b.survival_score).slice(0, 5), [latestMl]);
  const macroRegime = macro?.macro_regime;
  const macroScore  = macro?.macro_score;

  if (loading) return <PageLayout title="Dashboard"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Dashboard">
      <div className="space-y-5 pb-10">

        {/* ── Header ── */}
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">AEGIS-FIN · Risk Intelligence Platform</p>
          <h1 className="page-heading">Portfolio Overview</h1>
          <p className="page-subheading">Real-time ML survival scores, macro regime analysis, and sector health signals — updated daily after NSE market close.</p>
        </div>

        <LiveMarketBar />

        {/* ── Row 1: 4 KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-1">
          <div className="card p-6 hover-lift">
            <p className="label-caps mb-3">Total Companies</p>
            <p className="value-xl mb-1">{portfolioStats.total ?? "—"}</p>
            <p className="text-xs text-[var(--text-3)] leading-relaxed">Tracked across all NSE sectors with daily ML scoring</p>
          </div>
          <div className="card-orange p-6 hover-lift">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-3">Healthy ≥ 70</p>
            <p className="value-xl text-white mb-1">{portfolioStats.healthy ?? "—"}</p>
            <p className="text-xs text-white/70 leading-relaxed">Low distress probability, strong fundamentals</p>
          </div>
          <div className="card p-6 hover-lift">
            <p className="label-caps mb-3">Watch Zone</p>
            <p className="value-xl mb-1">{portfolioStats.watch ?? "—"}</p>
            <p className="text-xs text-[var(--text-3)] leading-relaxed">Score 40–70, at least one warning signal present</p>
          </div>
          <div className="card p-6 hover-lift">
            <p className="label-caps mb-3">Distress &lt; 40</p>
            <p className="value-xl mb-1">{portfolioStats.distress ?? "—"}</p>
            <p className="text-xs text-[var(--text-3)] leading-relaxed">High distress signals, immediate review required</p>
          </div>
        </div>

        {/* ── Row 2: Portfolio score + Macro chart ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-2">

          {/* Portfolio health */}
          <div className="card p-7 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-[var(--orange)]/6 pointer-events-none" />
            <div className="absolute -right-4 -bottom-6 w-28 h-28 rounded-full bg-[var(--orange)]/4 pointer-events-none" />
            <div className="relative">
              <p className="label-caps mb-4">Portfolio Health Score</p>
              <div className="flex items-end gap-4 mb-4">
                <p style={{ fontSize: "4rem", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--text)" }}>{portfolioStats.avgSurvival}</p>
                <div className="mb-2">
                  <p className="text-sm font-semibold text-[var(--text-2)]">/ 100</p>
                  <p className="text-xs text-[var(--text-3)]">avg survival score</p>
                </div>
              </div>
              <p className="text-sm text-[var(--text-2)] leading-relaxed mb-6">
                Composite ML score across {portfolioStats.total} tracked companies.
                {portfolioStats.healthy > 0 && ` ${portfolioStats.healthy} companies are in the healthy zone (≥70).`}
                {portfolioStats.distress > 0 && ` ${portfolioStats.distress} require immediate attention.`}
              </p>
              <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 mb-4">
                {portfolioStats.total > 0 ? <>
                  <div className="bg-[var(--orange)] rounded-l-full transition-all duration-1000" style={{ width: `${(portfolioStats.healthy / portfolioStats.total) * 100}%` }} />
                  <div className="bg-[var(--orange)]/35 transition-all duration-1000" style={{ width: `${(portfolioStats.watch / portfolioStats.total) * 100}%` }} />
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded-r-full transition-all duration-1000" style={{ width: `${(portfolioStats.distress / portfolioStats.total) * 100}%` }} />
                </> : <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full" />}
              </div>
              <div className="flex items-center gap-5">
                {[{ l: "Healthy", v: portfolioStats.healthy, c: "bg-[var(--orange)]" }, { l: "Watch", v: portfolioStats.watch, c: "bg-[var(--orange)]/35" }, { l: "Distress", v: portfolioStats.distress, c: "bg-neutral-200 dark:bg-neutral-700" }].map(({ l, v, c }) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${c}`} />
                    <span className="text-xs text-[var(--text-3)]">{l} <span className="font-bold text-[var(--text)]">{v}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Macro chart */}
          <div className="card p-7">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="label-caps mb-2">Macro Environment</p>
                <div className="flex items-end gap-3">
                  <p className="value-xl">{macroScore != null ? macroScore.toFixed(2) : "—"}</p>
                  {macroRegime && (
                    <div className={`mb-1 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide ${macroRegime === "RISK_ON" ? "bg-[var(--orange)] text-white" : macroRegime === "RISK_OFF" ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900" : "bg-neutral-100 dark:bg-neutral-800 text-[var(--text-2)]"}`}>
                      {macroRegime.replace("_", " ")}
                    </div>
                  )}
                </div>
              </div>
              <Link to="/macro" className="text-xs font-semibold text-[var(--orange)] flex items-center gap-1 hover:underline mt-1">Full analysis <ArrowUpRight size={12} /></Link>
            </div>
            <p className="text-sm text-[var(--text-2)] mb-5 leading-relaxed">
              Composite z-score of VIX, USD-INR, Gold and Crude Oil.
              {macroRegime === "RISK_ON" && " Macro tailwinds present — constructive for risk assets."}
              {macroRegime === "RISK_OFF" && " Multiple headwinds active — consider defensive positioning."}
              {macroRegime === "NEUTRAL" && " Balanced environment — no strong directional signal."}
              {!macroRegime && " Run the pipeline to populate macro data."}
            </p>
            {macroChartData.length ? (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={macroChartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E8572A" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#E8572A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <Tooltip {...ct.tooltip} />
                  <Area type="monotone" dataKey="score" stroke="#E8572A" strokeWidth={2.5} fill="url(#mgGrad)" dot={false} name="Macro Score" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-sm text-[var(--text-3)] bg-neutral-50 dark:bg-neutral-900/40 rounded-xl">No macro data — run the pipeline</div>
            )}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[{ l: "VIX Z", v: macro?.vix_z?.toFixed(2) ?? "—", d: "Fear gauge" }, { l: "USD Z", v: macro?.usd_z?.toFixed(2) ?? "—", d: "Currency" }, { l: "Gold Z", v: macro?.gold_z?.toFixed(2) ?? "—", d: "Safe haven" }, { l: "Crude Z", v: macro?.crude_z?.toFixed(2) ?? "—", d: "Input cost" }].map(({ l, v, d }) => (
                <div key={l} className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-3)] mb-1">{l}</p>
                  <p className="text-base font-bold tabular-nums text-[var(--text)]">{v}</p>
                  <p className="text-[10px] text-[var(--text-3)] mt-0.5">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 3: Sector Returns ── */}
        <div className="card p-7 stagger-3">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="label-caps mb-1">Today's Sector Returns</p>
              <p className="text-sm text-[var(--text-2)]">NSE sector index daily performance. Orange bars = positive return, gray = negative.</p>
            </div>
            <Link to="/sectors" className="text-xs font-semibold text-[var(--orange)] flex items-center gap-1 hover:underline shrink-0 ml-4">All sectors <ArrowUpRight size={12} /></Link>
          </div>
          {sectorReturnData.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sectorReturnData} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={64} />
                <Tooltip {...ct.tooltip} formatter={v => [`${v}%`, "Return"]} />
                <Bar dataKey="ret" radius={[0, 6, 6, 0]} maxBarSize={16}>
                  {sectorReturnData.map((e, i) => <Cell key={i} fill={e.ret >= 0 ? "#E8572A" : "#D1D1D1"} fillOpacity={e.ret >= 0 ? 0.9 : 0.7} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-[var(--text-3)] bg-neutral-50 dark:bg-neutral-900/40 rounded-xl mt-4">No sector data yet — run the pipeline</div>
          )}
        </div>

        {/* ── Row 4: Top Picks + At Risk ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-5 border-b border-[var(--border)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="title-md">Top Picks</p>
                  <p className="text-xs text-[var(--text-3)] mt-1 leading-relaxed">Companies with the highest ML survival scores. Low distress probability, strong fundamentals across all 9 pipeline layers.</p>
                </div>
                <Link to="/risk-engine" className="text-xs font-semibold text-[var(--orange)] flex items-center gap-1 hover:underline shrink-0 ml-3 mt-0.5">See all <ArrowUpRight size={12} /></Link>
              </div>
            </div>
            {topPicks.length ? (
              <div>{topPicks.map((r, i) => { const c = compMap[r.company_id]; return <CompanyRow key={r.id || r.company_id} rank={i + 1} name={c?.name || "—"} ticker={c?.ticker || "—"} score={r.survival_score} companyId={r.company_id} />; })}</div>
            ) : (
              <div className="py-14 flex flex-col items-center text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center mb-3 animate-float"><Zap size={20} className="text-[var(--text-3)]" /></div>
                <p className="text-sm font-semibold text-[var(--text-2)]">No predictions yet</p>
                <p className="text-xs text-[var(--text-3)] mt-1">Run the pipeline to generate ML survival scores for all companies.</p>
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-5 border-b border-[var(--border)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="title-md">Needs Review</p>
                  <p className="text-xs text-[var(--text-3)] mt-1 leading-relaxed">Lowest survival scores. These companies show elevated distress signals — balance sheet stress, sector weakness, or declining momentum.</p>
                </div>
                <Link to="/risk-engine" className="text-xs font-semibold text-[var(--orange)] flex items-center gap-1 hover:underline shrink-0 ml-3 mt-0.5">See all <ArrowUpRight size={12} /></Link>
              </div>
            </div>
            {atRisk.length ? (
              <div>{atRisk.map((r, i) => { const c = compMap[r.company_id]; return <CompanyRow key={r.id || r.company_id} rank={i + 1} name={c?.name || "—"} ticker={c?.ticker || "—"} score={r.survival_score} companyId={r.company_id} />; })}</div>
            ) : (
              <div className="py-14 flex flex-col items-center text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center mb-3 animate-float"><ShieldAlert size={20} className="text-[var(--text-3)]" /></div>
                <p className="text-sm font-semibold text-[var(--text-2)]">No distress signals</p>
                <p className="text-xs text-[var(--text-3)] mt-1">All tracked companies are within acceptable risk thresholds.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 5: Sector Health ── */}
        <div className="card overflow-hidden stagger-5">
          <div className="px-5 py-5 border-b border-[var(--border)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="title-md">Sector Health Monitor</p>
                <p className="text-xs text-[var(--text-3)] mt-1 leading-relaxed">Daily signals from rolling z-scores. Health score = percentile rank vs own 60-day history. 100 = historically strongest day, 0 = weakest.</p>
              </div>
              <Link to="/sectors" className="text-xs font-semibold text-[var(--orange)] flex items-center gap-1 hover:underline shrink-0 ml-3 mt-0.5">Full details <ArrowUpRight size={12} /></Link>
            </div>
          </div>
          {latestSectorHealth.length ? (
            <div>{latestSectorHealth.slice(0, 10).map((row, i) => <SectorRow key={row.id} row={row} index={i} />)}</div>
          ) : (
            <div className="py-14 flex flex-col items-center text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center mb-3 animate-float"><TrendingUp size={20} className="text-[var(--text-3)]" /></div>
              <p className="text-sm font-semibold text-[var(--text-2)]">No sector data</p>
              <p className="text-xs text-[var(--text-3)] mt-1">Run the pipeline to populate sector health signals.</p>
            </div>
          )}
        </div>

        {/* ── Row 6: Quick nav ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Companies", path: "/companies", icon: Building2, desc: `${companies.length} companies tracked across all NSE sectors with daily ML scoring and survival analysis.` },
            { label: "Risk Engine", path: "/risk-engine", icon: Brain, desc: "CatBoost survival model. Distress probability, tier classification, and score distribution." },
            { label: "Correlation", path: "/correlation", icon: Activity, desc: "Company vs sector correlation heatmaps across 8 price metrics and rolling windows." },
            { label: "Macro Overlay", path: "/macro", icon: Globe, desc: "VIX, USD-INR, Gold and Crude Oil z-scores driving the daily macro regime classification." },
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
                <p className="text-xs text-[var(--text-3)] mt-1 leading-relaxed">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </PageLayout>
  );
}
