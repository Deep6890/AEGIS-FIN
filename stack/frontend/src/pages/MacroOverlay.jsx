import React, { useEffect, useState } from "react";
import { Zap, DollarSign, Globe, TrendingUp } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine, CartesianGrid
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchMacroOverlay } from "../lib/api";

export default function MacroOverlay() {
  const { macro, loading } = useAppData();
  const ct = useChartTheme();
  const [history, setHistory]       = useState([]);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    fetchMacroOverlay(120).then(r => { setHistory(r.data || []); setHistLoading(false); });
  }, []);

  const chartData = history.map(r => ({
    date:    r.date?.slice(5),
    score:   r.macro_score,
    vix_z:   r.vix_z,
    usd_z:   r.usd_z,
    gold_z:  r.gold_z,
    crude_z: r.crude_z,
  }));

  const regimeDist = React.useMemo(() => {
    const c = { RISK_OFF: 0, RISK_ON: 0, NEUTRAL: 0 };
    history.forEach(r => { if (c[r.macro_regime] !== undefined) c[r.macro_regime]++; });
    return c;
  }, [history]);

  const regime = macro?.macro_regime;
  const cardVariant = regime === "RISK_OFF" ? "card-ink" : regime === "RISK_ON" ? "card-green" : "card";

  if (loading || histLoading) return <PageLayout title="Macro Overlay"><LoadingSpinner /></PageLayout>;

  return (
    <PageLayout title="Macro Overlay">
      <div className="space-y-4">

        {/* Current state */}
        {macro && (
          <div className={`${cardVariant} rounded-2xl p-5`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="label mb-1 opacity-60">Current Macro Regime</p>
                <p className="text-2xl font-black">{regime?.replace("_", " ") || "—"}</p>
                {macro.macro_narrative && (
                  <p className="text-xs mt-2 opacity-70 max-w-xl leading-relaxed">{macro.macro_narrative}</p>
                )}
              </div>
              <SignalBadge value={regime} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Macro Score", value: macro.macro_score?.toFixed(2), icon: Zap },
                { label: "VIX Z",       value: macro.vix_z?.toFixed(2),       icon: TrendingUp },
                { label: "USD Z",       value: macro.usd_z?.toFixed(2),       icon: DollarSign },
                { label: "Gold Z",      value: macro.gold_z?.toFixed(2),      icon: Globe },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white/10 dark:bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={12} className="opacity-60" />
                    <p className="label opacity-60">{label}</p>
                  </div>
                  <p className="text-xl font-black">{value ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regime distribution */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card-ink rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-red-400">{regimeDist.RISK_OFF}</p>
            <p className="label mt-1 text-white/50">Risk-Off Days</p>
          </div>
          <div className="card rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-[#E8C547]">{regimeDist.NEUTRAL}</p>
            <p className="label mt-1">Neutral Days</p>
          </div>
          <div className="card-green rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-white">{regimeDist.RISK_ON}</p>
            <p className="label mt-1 text-white/60">Risk-On Days</p>
          </div>
        </div>

        {chartData.length ? (
          <>
            <div className="card p-5">
              <p className="title-md mb-4">Macro Composite Score (120d)</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="macroG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={ct.yellow} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={ct.yellow} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip {...ct.tooltip} />
                  <ReferenceLine y={0} stroke={ct.grid} strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="score" stroke={ct.yellow} strokeWidth={2} fill="url(#macroG)" dot={false} name="Macro Score" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <p className="title-md mb-4">Z-Score Components (120d)</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip {...ct.tooltip} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke={ct.grid} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="vix_z"   stroke={ct.red}    dot={false} strokeWidth={1.5} name="VIX Z"   />
                  <Line type="monotone" dataKey="usd_z"   stroke={ct.blue}   dot={false} strokeWidth={1.5} name="USD Z"   />
                  <Line type="monotone" dataKey="gold_z"  stroke={ct.yellow} dot={false} strokeWidth={1.5} name="Gold Z"  />
                  <Line type="monotone" dataKey="crude_z" stroke={ct.green}  dot={false} strokeWidth={1.5} name="Crude Z" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <p className="title-md mb-3">Macro Regime Log</p>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white dark:bg-[#1A1C23]">
                    <tr className="border-b border-[#E5E1D8] dark:border-[#1F2128]">
                      {["Date","Regime","Score","VIX Z","USD Z","Gold Z","Crude Z"].map(h => (
                        <th key={h} className="th-base">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map(r => (
                      <tr key={r.id} className="tr-base">
                        <td className="td-base text-xs text-[#6B7280]">{r.date}</td>
                        <td className="td-base"><SignalBadge value={r.macro_regime} /></td>
                        <td className="td-base text-xs font-mono">{r.macro_score?.toFixed(2)}</td>
                        <td className="td-base text-xs">{r.vix_z?.toFixed(2)}</td>
                        <td className="td-base text-xs">{r.usd_z?.toFixed(2)}</td>
                        <td className="td-base text-xs">{r.gold_z?.toFixed(2)}</td>
                        <td className="td-base text-xs">{r.crude_z?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : <EmptyState title="No macro data" sub="Run the pipeline to populate macro overlay." />}
      </div>
    </PageLayout>
  );
}
