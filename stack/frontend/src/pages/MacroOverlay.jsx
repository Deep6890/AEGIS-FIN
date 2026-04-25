import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { Activity, ShieldAlert, ArrowUpRight, TrendingUp } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import { PageSkeleton } from "../components/ui/LoadingSpinner";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchMacroOverlay } from "../lib/api";

const REGIME_COLORS = { RISK_ON: "#00B341", RISK_OFF: "#FF3B30", NEUTRAL: "#FFC224" };

export default function MacroOverlay() {
  const { macro: currentMacro, loading } = useAppData();
  const ct = useChartTheme();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchMacroOverlay(90).then(r => setHistory(r.data || []));
  }, []);

  if (loading) return <PageLayout title="Macro Overlay"><PageSkeleton /></PageLayout>;

  const regime = currentMacro?.macro_regime || "NEUTRAL";
  const rc = REGIME_COLORS[regime];
  const chartData = history.slice().reverse().map(r => ({ date: r.date.slice(5), score: parseFloat(r.health_score?.toFixed(2)||0), vix: parseFloat(r.vol_z?.toFixed(2)||0) }));
  
  const metrics = [
    { label: "VIX Z-Score", val: currentMacro?.vix_z, inv: true },
    { label: "USD-INR Z-Score", val: currentMacro?.usd_z, inv: true },
    { label: "Gold Z-Score", val: currentMacro?.momentum_z, inv: false },
    { label: "Crude Z-Score", val: currentMacro?.slope_z, inv: true }
  ];

  return (
    <PageLayout title="Macro Overlay">
      <div className="space-y-8 pb-12">
        <div className="animate-fade-in">
          <h1 className="page-heading">Macro Overlay</h1>
          <p className="page-subheading">Systemic risk monitoring using VIX, USD-INR, Gold, and Crude Oil z-scores to determine global market regime.</p>
        </div>

        {/* ── Dynamic Hero ──────────────────────────────── */}
        <div className="card-dark relative overflow-hidden p-8 lg:p-12 transition-colors duration-1000 stagger-1" style={{ borderTop: `4px solid ${rc}` }}>
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${rc}, transparent 70%)` }} />
          
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-neutral-900/[0.05] dark:bg-white/[0.05] border border-neutral-900/[0.1] dark:border-white/[0.1] flex items-center justify-center backdrop-blur-xl">
                <Activity size={32} color={rc} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-bold text-neutral-400 mb-2">Current Market Regime</p>
                <p className="value-xl text-neutral-900 dark:text-white tracking-tighter" style={{ color: rc }}>{regime.replace("_", " ")}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-widest font-bold text-neutral-400 mb-2">Composite Score</p>
              <p className="text-6xl font-bold tracking-tighter tabular-nums text-neutral-900 dark:text-white leading-none">{currentMacro?.macro_score?.toFixed(2) ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* ── Component Metrics ─────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 stagger-2">
          {metrics.map(m => {
            const z = m.val || 0;
            const isGood = m.inv ? z <= 0 : z >= 0;
            return (
              <div key={m.label} className="card-glass p-6">
                <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-4">{m.label}</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">{z.toFixed(2)}</p>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${isGood ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                    {z > 1.5 ? "Extreme" : z > 0.5 ? "High" : z < -1.5 ? "Low" : "Normal"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Charts ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-3">
          <div className="card-glass p-8">
            <p className="title-md mb-6">Macro Score (90d)</p>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ct.orange} stopOpacity={0.2} /><stop offset="100%" stopColor={ct.orange} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="2 6" stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip {...ct.tooltip} />
                  <Area type="monotone" dataKey="score" stroke={ct.orange} strokeWidth={2.5} fill="url(#scoreGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-[260px] flex items-center justify-center text-sm text-neutral-500">No data</div>}
          </div>
          
            <div className="card-glass p-8">
              <p className="title-md mb-6">VIX Z-Score (90d)</p>
              {chartData.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="vixGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip {...ct.tooltip} />
                    <Area type="monotone" dataKey="vix" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#vixGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="h-[260px] flex items-center justify-center text-sm text-neutral-500">No data</div>}
            </div>
        </div>

        {/* ── Logs ───────────────────────────────────────── */}
        {history.length > 0 && (
          <div className="card-glass overflow-hidden stagger-4">
            <div className="px-6 py-5 border-b border-neutral-900/[0.08] dark:border-neutral-900/[0.08] dark:border-white/[0.08] bg-neutral-900/[0.02] dark:bg-white/[0.01]">
              <p className="title-md">Regime History Log</p>
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#f0f0f0]/90 dark:bg-[#080808]/90 backdrop-blur-xl border-b border-neutral-900/[0.05] dark:border-neutral-900/[0.05] dark:border-white/[0.05] z-10">
                  <tr>{["Date", "Score", "Regime", "Signal", "Phase", "VIX Z", "USD Z", "Gold Z", "Crude Z"].map(h => <th key={h} className="th-base">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {history.map(r => (
                    <tr key={r.id} className="tr-base">
                      <td className="td-base"><span className="text-xs font-mono text-neutral-500">{r.date?.slice(5)}</span></td>
                      <td className="td-base"><span className="text-sm font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{r.health_score?.toFixed(2)}</span></td>
                      <td className="td-base"><SignalBadge value={r.regime} /></td>
                      <td className="td-base"><SignalBadge value={r.signal} /></td>
                      <td className="td-base"><span className="text-[10px] font-bold uppercase text-neutral-400">{r.market_phase || "—"}</span></td>
                      <td className="td-base text-sm tabular-nums text-neutral-500">{r.vol_z?.toFixed(2)}</td>
                      <td className="td-base text-sm tabular-nums text-neutral-500">{r.ret_z?.toFixed(2)}</td>
                      <td className="td-base text-sm tabular-nums text-neutral-500">{r.momentum_z?.toFixed(2)}</td>
                      <td className="td-base text-sm tabular-nums text-neutral-500">{r.slope_z?.toFixed(2)}</td>
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
