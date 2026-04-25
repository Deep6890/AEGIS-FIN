import React, { useEffect, useState, useMemo } from "react";
import {
  Building2, CheckCircle, Eye, AlertTriangle,
  Activity, Globe, Zap, Layers, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, CartesianGrid
} from "recharts";
import AppLayout from "../components/layout/AppLayout";
import KPICard from "../components/ui/KPICard";
import StatusBadge from "../components/ui/StatusBadge";
import LiveMarketBar from "../components/ui/LiveMarketBar";
import LoadingSpinner, { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import SectionHeader from "../components/ui/SectionHeader";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchMacroOverlay, fetchLatestSectorMetrics } from "../lib/api";

// ── Intelligence Engine Banner ────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { num: "01", name: "Market Data" },
  { num: "02", name: "Price Metrics" },
  { num: "03", name: "Z-Score Windows" },
  { num: "04", name: "Balance Sheet" },
  { num: "05", name: "Shareholder Patterns" },
  { num: "06", name: "Macro Overlay" },
  { num: "07", name: "Sector Health" },
  { num: "08", name: "ML Survival Model" },
  { num: "09", name: "Score Output" },
];

const PIPELINE_DETAIL = {
  "01": "Every trading day, AEGIS fetches OHLCV data for all tracked companies and all 9 sector indices from NSE via Yahoo Finance.",
  "02": "Computes 1d/5d/20d returns, rolling volatility, ATR, drawdown, volume ratio, momentum, and price slope.",
  "03": "Each metric is z-scored against its own 60-day rolling window to normalise across sectors with different volatility profiles.",
  "04": "20 financial ratios computed from quarterly data: D/E, Interest Coverage, Current Ratio, EBITDA Margin, ROE, Asset Turnover, etc.",
  "05": "Tracks promoter holding %, promoter pledge %, FII/DII flow direction, and change in institutional ownership QoQ.",
  "06": "VIX, USD-INR, Gold, Crude Oil z-scores combined into a macro composite. Adjusts all company scores based on external environment.",
  "07": "Each sector gets a 0–100 health score (rolling percentile rank). STRONG/NEUTRAL/WATCH/WEAK signal assigned.",
  "08": "CatBoost gradient boosting model ingests ~40 features, outputs distress probability. survival_score = (1 − distress_prob) × 100.",
  "09": "Final 0–100 score per company, updated daily. 70+ = low risk. 40–70 = watch. Below 40 = high distress.",
};

function IntelligenceBanner() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  return (
    <div className="card-dark rounded-card p-6 col-span-12">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-caps text-yellow-400 mb-1">Intelligence Engine</p>
          <h2 className="text-2xl font-semibold text-white">9-Layer Risk Analysis Pipeline</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Live market data → price metrics → balance sheet → macro signals →{" "}
            <span className="text-yellow-400 font-medium">0–100 survival score</span> per company, daily.
          </p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors mt-1"
        >
          {open ? "Collapse" : "Expand"}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {PIPELINE_STEPS.map(s => (
          <button
            key={s.num}
            onClick={() => setActive(active === s.num ? null : s.num)}
            className={`inline-flex items-center gap-2 text-xs rounded-full px-3 py-1 border font-mono transition-all ${
              active === s.num
                ? "bg-yellow-400 text-neutral-900 border-yellow-400"
                : "bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-500"
            }`}
          >
            <span className="opacity-60">{s.num}</span> {s.name}
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-4 p-4 bg-neutral-800 rounded-card border border-neutral-700 animate-slide-up">
          <p className="text-xs font-mono text-yellow-400 mb-1">Step {active}</p>
          <p className="text-sm text-neutral-300 leading-relaxed">{PIPELINE_DETAIL[active]}</p>
        </div>
      )}
    </div>
  );
}

// ── Sector health row ─────────────────────────────────────────────────────────
function SectorRow({ row }) {
  const [open, setOpen] = useState(false);
  const score = row.health_score;
  const barColor = score >= 70 ? "bar-healthy" : score >= 40 ? "bar-watch" : "bar-distress";

  return (
    <>
      <tr className="tr-base cursor-pointer" onClick={() => setOpen(o => !o)}>
        <td className="td-base">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {row.sectors?.name || `Sector ${row.sector_id}`}
            </span>
            {open ? <ChevronUp size={12} className="text-neutral-400" /> : <ChevronDown size={12} className="text-neutral-400" />}
          </div>
        </td>
        <td className="td-base"><StatusBadge status={row.signal} /></td>
        <td className="td-base"><StatusBadge status={row.regime} /></td>
        <td className="td-base">
          {score != null ? (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, score)}%` }} />
              </div>
              <span className="text-xs font-semibold tabular-nums text-neutral-700 dark:text-neutral-300">{score.toFixed(1)}</span>
            </div>
          ) : <span className="text-xs text-neutral-400">—</span>}
        </td>
        <td className="td-base text-xs font-mono text-neutral-500">{row.composite?.toFixed(2) ?? "—"}</td>
        <td className="td-base">
          <div className="flex gap-1">
            {row.spike_up   && <span className="badge-green text-[10px]">↑ Up</span>}
            {row.spike_down && <span className="badge-red text-[10px]">↓ Down</span>}
            {!row.spike_up && !row.spike_down && <span className="text-xs text-neutral-400">—</span>}
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-neutral-50 dark:bg-neutral-900/50">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="label-caps mb-1">Ret Z</p>
                <p className="font-mono font-semibold">{row.ret_z?.toFixed(3) ?? "—"}</p>
              </div>
              <div>
                <p className="label-caps mb-1">Vol Z</p>
                <p className="font-mono font-semibold">{row.vol_z?.toFixed(3) ?? "—"}</p>
              </div>
              <div>
                <p className="label-caps mb-1">Momentum Z</p>
                <p className="font-mono font-semibold">{row.momentum_z?.toFixed(3) ?? "—"}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, ct }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={ct.tooltip.contentStyle}>
      <p className="text-xs font-medium mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-semibold tabular-nums">{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { companies, latestSectorHealth, macro, portfolioStats, loading } = useAppData();
  const ct = useChartTheme();
  const [macroHistory, setMacroHistory]   = useState([]);
  const [sectorMetrics, setSectorMetrics] = useState([]);

  useEffect(() => {
    fetchMacroOverlay(60).then(r => setMacroHistory(r.data || []));
    fetchLatestSectorMetrics().then(r => setSectorMetrics(r.data || []));
  }, []);

  const latestMetrics = useMemo(() => {
    const seen = new Map();
    for (const row of sectorMetrics) {
      if (!seen.has(row.sector_id)) seen.set(row.sector_id, row);
    }
    return Array.from(seen.values());
  }, [sectorMetrics]);

  const macroChartData = macroHistory.slice(-30).map(r => ({
    date:  r.date?.slice(5),
    score: parseFloat((r.macro_score ?? 0).toFixed(2)),
  }));

  const sectorReturnData = latestMetrics
    .filter(r => r.sector_return_1d != null)
    .map(r => ({
      name: r.sectors?.name?.replace(" Sector", "").replace(" Nifty", "") || "—",
      ret:  +(r.sector_return_1d * 100).toFixed(2),
    }))
    .sort((a, b) => b.ret - a.ret);

  const signalCounts = useMemo(() => {
    const c = { STRONG: 0, NEUTRAL: 0, WATCH: 0, WEAK: 0 };
    latestSectorHealth.forEach(s => { if (c[s.signal] !== undefined) c[s.signal]++; });
    return c;
  }, [latestSectorHealth]);

  if (loading) return <AppLayout title="Dashboard"><PageSkeleton /></AppLayout>;

  return (
    <AppLayout title="Dashboard">
      <div className="grid grid-cols-12 gap-4">

        {/* Live market ticker */}
        <LiveMarketBar />

        {/* Intelligence Engine */}
        <IntelligenceBanner />

        {/* KPI Row 1 */}
        <div className="col-span-3">
          <KPICard label="Total Companies" value={portfolioStats.total} icon={Building2} variant="default" />
        </div>
        <div className="col-span-3">
          <KPICard label="Healthy ≥ 70" value={portfolioStats.healthy} icon={CheckCircle} variant="healthy" />
        </div>
        <div className="col-span-3">
          <KPICard label="Watch 40–70" value={portfolioStats.watch} icon={Eye} variant="watch" />
        </div>
        <div className="col-span-3">
          <KPICard label="Distress < 40" value={portfolioStats.distress} icon={AlertTriangle} variant="distress" />
        </div>

        {/* KPI Row 2 */}
        <div className="col-span-3">
          <KPICard label="Avg Survival Score" value={portfolioStats.avgSurvival} icon={Activity} subtitle="portfolio average" />
        </div>
        <div className="col-span-3">
          <KPICard label="Sectors Tracked" value={latestSectorHealth.length} icon={Globe} />
        </div>
        <div className="col-span-3">
          <KPICard label="Macro Regime" value={macro?.macro_regime?.replace("_", " ") || "—"} icon={Globe} />
        </div>
        <div className="col-span-3">
          <KPICard label="Macro Score" value={macro?.macro_score?.toFixed(2) || "—"} icon={Zap} subtitle="composite z-score" />
        </div>

        {/* Macro chart */}
        <div className="col-span-8 card p-5">
          <SectionHeader title="Macro Composite Score (30d)" subtitle="VIX · USD-INR · Gold · Crude Oil z-score composite" />
          {macroChartData.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={macroChartData}>
                <defs>
                  <linearGradient id="macroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={ct.yellow} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={ct.yellow} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                <Tooltip content={<ChartTooltip ct={ct} />} />
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <Area type="monotone" dataKey="score" stroke={ct.yellow} strokeWidth={2} fill="url(#macroGrad)" dot={false} name="Score" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No macro data" subtitle="Run the pipeline to populate macro overlay." />}
        </div>

        {/* Signal distribution */}
        <div className="col-span-4 card p-5">
          <SectionHeader title="Signal Distribution" />
          <div className="space-y-3 mt-2">
            {[
              { label: "STRONG", count: signalCounts.STRONG, color: "bg-green-500",  text: "text-green-600 dark:text-green-400" },
              { label: "NEUTRAL",count: signalCounts.NEUTRAL,color: "bg-neutral-400",text: "text-neutral-600 dark:text-neutral-400" },
              { label: "WATCH",  count: signalCounts.WATCH,  color: "bg-amber-400",  text: "text-amber-600 dark:text-amber-400" },
              { label: "WEAK",   count: signalCounts.WEAK,   color: "bg-red-500",    text: "text-red-600 dark:text-red-400" },
            ].map(({ label, count, color, text }) => {
              const total = Object.values(signalCounts).reduce((a, b) => a + b, 0) || 1;
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="label-caps">{label}</span>
                    <span className={`text-sm font-bold tabular-nums ${text}`}>{count}</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sector returns */}
        <div className="col-span-6 card p-5">
          <SectionHeader title="Sector 1-Day Returns" subtitle="Today's performance by sector index" />
          {sectorReturnData.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sectorReturnData} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={64} />
                <Tooltip content={<ChartTooltip ct={ct} />} formatter={v => [`${v}%`, "Return"]} />
                <Bar dataKey="ret" radius={[0, 4, 4, 0]} maxBarSize={14}>
                  {sectorReturnData.map((e, i) => (
                    <Cell key={i} fill={e.ret >= 0 ? ct.green : ct.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No sector data" subtitle="Run the pipeline to populate sector metrics." />}
        </div>

        {/* Sector health table */}
        <div className="col-span-6 card p-5">
          <SectionHeader title="Sector Health Monitor" subtitle="Rolling z-score health signals" />
          {latestSectorHealth.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800">
                    {["Sector", "Signal", "Regime", "Health", "Composite", "Spikes"].map(h => (
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

        {/* Survival formula */}
        <div className="col-span-12 card p-6">
          <SectionHeader title="Survival Score Formula" subtitle="How the 0–100 score is computed from 5 weighted components" />
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {[
              { label: "Price Momentum",  weight: "25%" },
              { label: "Balance Sheet",   weight: "30%" },
              { label: "Sector Context",  weight: "20%" },
              { label: "Macro Overlay",   weight: "15%" },
              { label: "Shareholder",     weight: "10%" },
            ].map((c, i, arr) => (
              <React.Fragment key={c.label}>
                <div className="flex flex-col items-center px-4 py-3 bg-neutral-50 dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 text-center min-w-24">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{c.label}</span>
                  <span className="text-xl font-bold tabular-nums text-yellow-600 dark:text-yellow-400 mt-0.5">{c.weight}</span>
                </div>
                {i < arr.length - 1 && <span className="text-neutral-300 dark:text-neutral-600 text-lg font-light">+</span>}
              </React.Fragment>
            ))}
            <span className="text-neutral-300 dark:text-neutral-600 text-lg font-light">=</span>
            <div className="flex flex-col items-center px-4 py-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-card border border-yellow-200 dark:border-yellow-900/40 text-center min-w-24">
              <span className="text-xs text-yellow-600 dark:text-yellow-400">Survival Score</span>
              <span className="text-xl font-bold text-yellow-700 dark:text-yellow-300 mt-0.5">0–100</span>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
