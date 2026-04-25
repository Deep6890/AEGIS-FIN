import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight, Building2, TrendingUp, ShieldAlert,
  Activity, ArrowRight, ChevronRight, Zap
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

/* ── Tiny helpers ─────────────────────────────────────────────────────────── */

function ScoreBar({ score }) {
  if (score == null) return <span className="text-sm text-neutral-300">—</span>;
  const pct = Math.min(100, score);
  const color = pct >= 70 ? "#FF4D00" : pct >= 40 ? "#FF4D00" : "#FF4D00"; // always orange
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-[#FF4D00] transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold tabular-nums text-neutral-900 dark:text-neutral-100 w-8 text-right">{score.toFixed(0)}</span>
    </div>
  );
}

function CompanyRow({ rank, name, ticker, score, companyId }) {
  return (
    <Link
      to={`/companies/${companyId}`}
      className="flex items-center gap-4 py-3.5 px-5 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors group border-b border-neutral-100 dark:border-neutral-800/60 last:border-0"
    >
      <span className="text-xs font-mono text-neutral-300 dark:text-neutral-600 w-5 shrink-0 tabular-nums">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-[#FF4D00] transition-colors">{name}</p>
        <p className="text-[11px] font-mono text-neutral-400 mt-0.5">{ticker}</p>
      </div>
      <div className="w-28 shrink-0">
        <ScoreBar score={score} />
      </div>
      <ChevronRight size={14} className="text-neutral-300 group-hover:text-[#FF4D00] transition-colors shrink-0" />
    </Link>
  );
}

function SectorHealthRow({ row, index }) {
  const pct = Math.min(100, row.health_score || 0);
  return (
    <div className="flex items-center gap-4 py-3 px-5 border-b border-neutral-100 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors">
      <span className="text-xs font-mono text-neutral-300 dark:text-neutral-600 w-5 shrink-0">{index + 1}</span>
      <p className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
        {row.sectors?.name || `Sector ${row.sector_id}`}
      </p>
      <SignalBadge value={row.signal} />
      <div className="flex items-center gap-2 w-28 shrink-0">
        <div className="flex-1 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[#FF4D00]" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-bold tabular-nums text-neutral-600 dark:text-neutral-400 w-7 text-right">{row.health_score?.toFixed(0) ?? "—"}</span>
      </div>
    </div>
  );
}

/* ── Main Dashboard ───────────────────────────────────────────────────────── */

export default function Dashboard() {
  const { latestSectorHealth, macro, portfolioStats, latestMl, companies, loading } = useAppData();
  const ct = useChartTheme();
  const [macroHistory, setMacroHistory] = useState([]);
  const [sectorMetrics, setSectorMetrics] = useState([]);

  useEffect(() => {
    fetchMacroOverlay(60).then(r => setMacroHistory(r.data || []));
    fetchLatestSectorMetrics().then(r => setSectorMetrics(r.data || []));
  }, []);

  const macroChartData = macroHistory.slice(-30).map(r => ({
    date: r.date?.slice(5),
    score: parseFloat(r.health_score?.toFixed(2) || 0),
  }));

  const latestMetrics = useMemo(() => {
    const seen = new Map();
    for (const row of sectorMetrics) { if (!seen.has(row.sector_id)) seen.set(row.sector_id, row); }
    return Array.from(seen.values());
  }, [sectorMetrics]);

  const sectorReturnData = latestMetrics
    .filter(r => r.daily_return != null)
    .map(r => ({
      name: r.sectors?.name?.replace(" Sector", "").replace(" Nifty", ""),
      ret: +(r.daily_return * 100).toFixed(2),
    }))
    .sort((a, b) => b.ret - a.ret)
    .slice(0, 8);

  const compMap = useMemo(() => { const m = {}; companies.forEach(c => { m[c.id] = c; }); return m; }, [companies]);
  const topPicks = useMemo(() => [...latestMl].filter(r => r.survival_score != null).sort((a, b) => b.survival_score - a.survival_score).slice(0, 7), [latestMl]);
  const atRisk   = useMemo(() => [...latestMl].filter(r => r.survival_score != null).sort((a, b) => a.survival_score - b.survival_score).slice(0, 5), [latestMl]);

  const macroRegime = macro?.macro_regime;
  const macroScore  = macro?.macro_score;

  if (loading) return <PageLayout title="Dashboard"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Dashboard">
      <div className="space-y-5 pb-10">

        {/* ── Greeting + Live Bar ─────────────────────────── */}
        <div className="animate-fade-in">
          <h1 className="page-heading">Good morning 👋</h1>
          <p className="page-subheading">Here's your AEGIS-FIN portfolio overview for today.</p>
        </div>

        <LiveMarketBar />

        {/* ── Row 1: 4 KPI cards ──────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-1">
          {[
            { label: "Total Companies", value: portfolioStats.total, sub: "tracked", icon: Building2 },
            { label: "Healthy", value: portfolioStats.healthy, sub: "score ≥ 70", icon: TrendingUp },
            { label: "Watch Zone", value: portfolioStats.watch, sub: "score 40–70", icon: Activity },
            { label: "Distress", value: portfolioStats.distress, sub: "score < 40", icon: ShieldAlert },
          ].map(({ label, value, sub, icon: Icon }, i) => (
            <div key={label} className="card p-5 hover-lift">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#FF4D00]/8 flex items-center justify-center">
                  <Icon size={17} className="text-[#FF4D00]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 bg-neutral-50 dark:bg-neutral-800/60 px-2 py-1 rounded-lg">{sub}</span>
              </div>
              <p className="value-xl text-neutral-900 dark:text-neutral-100">{value ?? "—"}</p>
              <p className="text-xs font-medium text-neutral-400 mt-1.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Row 2: Portfolio Score + Macro + Sector Returns ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 stagger-2">

          {/* Portfolio Score Card */}
          <div className="lg:col-span-4 card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-semibold text-neutral-500">Portfolio Health</p>
              <Link to="/risk-engine" className="text-xs font-bold text-[#FF4D00] flex items-center gap-1 hover:underline">
                Details <ArrowUpRight size={12} />
              </Link>
            </div>

            {/* Big avg score */}
            <div className="flex items-end gap-3 mb-5">
              <p className="value-xl text-neutral-900 dark:text-neutral-100">{portfolioStats.avgSurvival}</p>
              <p className="text-sm text-neutral-400 mb-2">/ 100 avg score</p>
            </div>

            {/* Stacked bar */}
            <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 mb-4">
              {portfolioStats.total > 0 ? (
                <>
                  <div className="bg-[#FF4D00] rounded-l-full transition-all duration-1000" style={{ width: `${(portfolioStats.healthy / portfolioStats.total) * 100}%` }} />
                  <div className="bg-[#FF4D00]/40 transition-all duration-1000" style={{ width: `${(portfolioStats.watch / portfolioStats.total) * 100}%` }} />
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded-r-full transition-all duration-1000" style={{ width: `${(portfolioStats.distress / portfolioStats.total) * 100}%` }} />
                </>
              ) : (
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full" />
              )}
            </div>

            <div className="flex items-center gap-4 text-xs">
              {[
                { l: "Healthy", v: portfolioStats.healthy, c: "bg-[#FF4D00]" },
                { l: "Watch",   v: portfolioStats.watch,   c: "bg-[#FF4D00]/40" },
                { l: "Distress",v: portfolioStats.distress,c: "bg-neutral-200 dark:bg-neutral-700" },
              ].map(({ l, v, c }) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${c}`} />
                  <span className="text-neutral-500">{l}</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{v}</span>
                </div>
              ))}
            </div>

            {/* Quick nav pills */}
            <div className="mt-auto pt-5 grid grid-cols-2 gap-2">
              {[
                { label: "Companies", path: "/companies", icon: Building2 },
                { label: "Risk Engine", path: "/risk-engine", icon: ShieldAlert },
                { label: "Sectors", path: "/sectors", icon: TrendingUp },
                { label: "Pipeline", path: "/pipeline", icon: Activity },
              ].map(({ label, path, icon: Icon }) => (
                <Link key={path} to={path}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/60 hover:border-[#FF4D00]/30 hover:bg-[#FF4D00]/4 transition-all group">
                  <Icon size={14} className="text-neutral-400 group-hover:text-[#FF4D00] transition-colors" />
                  <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Macro Score Chart */}
          <div className="lg:col-span-5 card p-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-sm font-semibold text-neutral-500">Macro Score</p>
                <p className="value-lg text-neutral-900 dark:text-neutral-100 mt-1">
                  {macroScore != null ? macroScore.toFixed(2) : "—"}
                </p>
              </div>
              {macroRegime && (
                <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide ${
                  macroRegime === "RISK_ON"  ? "bg-[#FF4D00]/10 text-[#FF4D00]" :
                  macroRegime === "RISK_OFF" ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900" :
                  "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                }`}>
                  {macroRegime.replace("_", " ")}
                </div>
              )}
            </div>
            <p className="text-xs text-neutral-400 mb-4">30-day composite · VIX · USD-INR · Gold · Crude</p>
            {macroChartData.length ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={macroChartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#FF4D00" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#FF4D00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <Tooltip {...ct.tooltip} />
                  <Area type="monotone" dataKey="score" stroke="#FF4D00" strokeWidth={2} fill="url(#mgGrad)" dot={false} name="Score" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-neutral-300">No data yet</div>
            )}

            {/* Macro mini stats */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[
                { l: "VIX Z",   v: macro?.vix_z?.toFixed(2)   ?? "—" },
                { l: "USD Z",   v: macro?.usd_z?.toFixed(2)   ?? "—" },
                { l: "Gold Z",  v: macro?.gold_z?.toFixed(2)  ?? "—" },
                { l: "Crude Z", v: macro?.crude_z?.toFixed(2) ?? "—" },
              ].map(({ l, v }) => (
                <div key={l} className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">{l}</p>
                  <p className="text-sm font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sector Returns */}
          <div className="lg:col-span-3 card p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-neutral-500">Sector Returns</p>
              <Link to="/sectors" className="text-xs font-bold text-[#FF4D00] flex items-center gap-1 hover:underline">
                All <ArrowUpRight size={12} />
              </Link>
            </div>
            {sectorReturnData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sectorReturnData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip {...ct.tooltip} formatter={v => [`${v}%`, "Return"]} />
                  <Bar dataKey="ret" radius={[0, 4, 4, 0]} maxBarSize={12}>
                    {sectorReturnData.map((e, i) => (
                      <Cell key={i} fill={e.ret >= 0 ? "#FF4D00" : "#E5E5E3"} fillOpacity={e.ret >= 0 ? 0.9 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-neutral-300">No data yet</div>
            )}
          </div>
        </div>

        {/* ── Row 3: Top Picks + At Risk + Sector Health ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 stagger-3">

          {/* Top Picks */}
          <div className="lg:col-span-4 card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/60">
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Top Picks</p>
                <p className="text-xs text-neutral-400 mt-0.5">Highest survival scores</p>
              </div>
              <Link to="/risk-engine" className="text-xs font-bold text-[#FF4D00] flex items-center gap-1 hover:underline">
                See all <ArrowUpRight size={12} />
              </Link>
            </div>
            {topPicks.length ? (
              <div>
                {topPicks.map((r, i) => {
                  const c = compMap[r.company_id];
                  return (
                    <CompanyRow
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
            ) : (
              <div className="py-16 text-center text-sm text-neutral-300">
                <Zap size={24} className="mx-auto mb-3 text-neutral-200" />
                Run the pipeline to generate scores
              </div>
            )}
          </div>

          {/* At Risk */}
          <div className="lg:col-span-4 card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/60">
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Needs Review</p>
                <p className="text-xs text-neutral-400 mt-0.5">Lowest survival scores</p>
              </div>
              <Link to="/risk-engine" className="text-xs font-bold text-[#FF4D00] flex items-center gap-1 hover:underline">
                See all <ArrowUpRight size={12} />
              </Link>
            </div>
            {atRisk.length ? (
              <div>
                {atRisk.map((r, i) => {
                  const c = compMap[r.company_id];
                  return (
                    <CompanyRow
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
            ) : (
              <div className="py-16 text-center text-sm text-neutral-300">
                <ShieldAlert size={24} className="mx-auto mb-3 text-neutral-200" />
                No distress signals
              </div>
            )}
          </div>

          {/* Sector Health */}
          <div className="lg:col-span-4 card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/60">
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Sector Health</p>
                <p className="text-xs text-neutral-400 mt-0.5">Rolling z-score signals</p>
              </div>
              <Link to="/sectors" className="text-xs font-bold text-[#FF4D00] flex items-center gap-1 hover:underline">
                See all <ArrowUpRight size={12} />
              </Link>
            </div>
            {latestSectorHealth.length ? (
              <div>
                {latestSectorHealth.slice(0, 8).map((row, i) => (
                  <SectorHealthRow key={row.id} row={row} index={i} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-neutral-300">
                <TrendingUp size={24} className="mx-auto mb-3 text-neutral-200" />
                Run the pipeline to populate
              </div>
            )}
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
