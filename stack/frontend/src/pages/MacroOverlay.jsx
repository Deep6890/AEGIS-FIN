import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, ReferenceLine } from "recharts";
import { Activity } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import { PageSkeleton } from "../components/ui/LoadingSpinner";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchMacroOverlay } from "../lib/api";

export default function MacroOverlay() {
  const { macro: currentMacro, loading } = useAppData();
  const ct = useChartTheme();
  const [history, setHistory] = useState([]);

  useEffect(() => { fetchMacroOverlay(90).then(r => setHistory(r.data || [])); }, []);

  if (loading) return <PageLayout title="Macro Overlay"><PageSkeleton /></PageLayout>;

  const regime = currentMacro?.macro_regime || "NEUTRAL";
  const isRiskOn  = regime === "RISK_ON";
  const isRiskOff = regime === "RISK_OFF";

  const chartData = history.slice().reverse().map(r => ({
    date:  r.date?.slice(5),
    score: parseFloat(r.health_score?.toFixed(2) || 0),
    vix:   parseFloat(r.vol_z?.toFixed(2) || 0),
    usd:   parseFloat(r.ret_z?.toFixed(2) || 0),
  }));

  const zMetrics = [
    { label: "VIX Z-Score",     val: currentMacro?.vix_z,   desc: "Fear gauge. High = elevated market fear." },
    { label: "USD-INR Z-Score", val: currentMacro?.usd_z,   desc: "Currency stress. High = INR weakness." },
    { label: "Gold Z-Score",    val: currentMacro?.gold_z,  desc: "Safe-haven demand. High = risk-off." },
    { label: "Crude Z-Score",   val: currentMacro?.crude_z, desc: "Input cost pressure. High = inflation risk." },
  ];

  return (
    <PageLayout title="Macro Overlay">
      <div className="space-y-5 pb-10">

        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Systemic Risk</p>
          <h1 className="page-heading">Macro Overlay</h1>
          <p className="page-subheading">VIX, USD-INR, Gold and Crude Oil z-scores combined into a daily macro regime classification.</p>
        </div>

        {/* Hero regime card */}
        <div className={`card-glass p-7 relative overflow-hidden stagger-1 ${isRiskOn ? "border-[var(--orange)]/30" : isRiskOff ? "border-neutral-400/30" : ""}`}
          style={{ borderTopWidth: 3, borderTopColor: isRiskOn ? "var(--orange)" : isRiskOff ? "#555" : "#ccc" }}>
          <div className="absolute right-0 top-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none"
            style={{ background: isRiskOn ? "rgba(232,87,42,0.08)" : "rgba(100,100,100,0.05)" }} />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="label-caps mb-3">Current Market Regime</p>
              <div className="flex items-end gap-4">
                <p style={{ fontSize: "clamp(2.5rem,5vw,4rem)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--text)" }}>
                  {regime.replace("_", " ")}
                </p>
                <div className="mb-1"><SignalBadge value={regime} /></div>
              </div>
              <p className="text-sm text-[var(--text-2)] mt-3 max-w-md leading-relaxed">
                {isRiskOn  && "Macro tailwinds present — low volatility, stable rupee, and supportive commodity prices. Constructive environment for risk assets."}
                {isRiskOff && "Multiple macro headwinds active — VIX elevated, INR weak, or crude rising. Risk assets under pressure. Consider defensive positioning."}
                {!isRiskOn && !isRiskOff && "Balanced macro environment. No strong directional signal from VIX, USD-INR, Gold or Crude. Composite z-score between −1 and +1."}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="label-caps mb-2">Composite Score</p>
              <p style={{ fontSize: "3.5rem", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--text)" }}>
                {currentMacro?.macro_score?.toFixed(2) ?? "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Z-score cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-2">
          {zMetrics.map(m => {
            const z = m.val ?? 0;
            const isHigh = Math.abs(z) > 1;
            return (
              <div key={m.label} className="card p-5 hover-lift">
                <p className="label-caps mb-3">{m.label}</p>
                <p className={`value-lg mb-1 ${isHigh ? "text-[var(--orange)]" : ""}`}>{z.toFixed(2)}</p>
                <p className="text-[10px] text-[var(--text-3)] leading-relaxed">{m.desc}</p>
                <div className="mt-3 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--orange)] transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.abs(z) * 33)}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger-3">
          <div className="card p-6">
            <p className="title-md mb-1">Macro Score (90d)</p>
            <p className="text-xs text-[var(--text-3)] mb-5">Composite z-score trend. Above 0 = risk-on, below 0 = risk-off.</p>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#E8572A" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#E8572A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip {...ct.tooltip} />
                  <ReferenceLine y={0} stroke={ct.grid} strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="score" stroke="#E8572A" strokeWidth={2.5} fill="url(#scoreGrad)" dot={false} name="Macro Score" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-sm text-[var(--text-3)] bg-neutral-50 dark:bg-neutral-900/40 rounded-xl">No data</div>}
          </div>

          <div className="card p-6">
            <p className="title-md mb-1">VIX & USD Z-Scores (90d)</p>
            <p className="text-xs text-[var(--text-3)] mb-5">Fear gauge and currency stress over the last 90 trading days.</p>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip {...ct.tooltip} />
                  <ReferenceLine y={0} stroke={ct.grid} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="vix" stroke="#E8572A" strokeWidth={2} dot={false} name="VIX Z" />
                  <Line type="monotone" dataKey="usd" stroke="#3B82F6" strokeWidth={2} dot={false} name="USD Z" />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-sm text-[var(--text-3)] bg-neutral-50 dark:bg-neutral-900/40 rounded-xl">No data</div>}
          </div>
        </div>

        {/* History log */}
        {history.length > 0 && (
          <div className="card overflow-hidden stagger-4">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <p className="title-md">Regime History Log</p>
              <p className="text-xs text-[var(--text-3)] mt-1">Daily macro regime classifications and z-score components.</p>
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] z-10">
                  <tr>{["Date","Score","Regime","Signal","Phase","VIX Z","USD Z","Gold Z","Crude Z"].map(h => <th key={h} className="th-base">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {history.map(r => (
                    <tr key={r.id} className="tr-base">
                      <td className="td-base"><span className="text-xs font-mono text-[var(--text-3)]">{r.date?.slice(5)}</span></td>
                      <td className="td-base"><span className="text-sm font-bold tabular-nums text-[var(--text)]">{r.health_score?.toFixed(2)}</span></td>
                      <td className="td-base"><SignalBadge value={r.regime} /></td>
                      <td className="td-base"><SignalBadge value={r.signal} /></td>
                      <td className="td-base"><span className="text-[10px] font-bold uppercase text-[var(--text-3)]">{r.market_phase || "—"}</span></td>
                      <td className="td-base text-sm tabular-nums text-[var(--text-2)]">{r.vol_z?.toFixed(2)}</td>
                      <td className="td-base text-sm tabular-nums text-[var(--text-2)]">{r.ret_z?.toFixed(2)}</td>
                      <td className="td-base text-sm tabular-nums text-[var(--text-2)]">{r.momentum_z?.toFixed(2)}</td>
                      <td className="td-base text-sm tabular-nums text-[var(--text-2)]">{r.slope_z?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
