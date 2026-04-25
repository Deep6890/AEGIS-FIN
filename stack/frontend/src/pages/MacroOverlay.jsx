import React, { useEffect, useState } from "react";
import { Globe, TrendingUp, TrendingDown, Zap, DollarSign, Flame } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine, CartesianGrid
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import StatCard from "../components/ui/StatCard";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { fetchMacroOverlay } from "../lib/api";

export default function MacroOverlay() {
  const { macro, loading } = useAppData();
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    fetchMacroOverlay(120).then(r => {
      setHistory(r.data || []);
      setHistLoading(false);
    });
  }, []);

  const regimeColor = {
    RISK_OFF: "red", RISK_ON: "emerald", NEUTRAL: "amber"
  }[macro?.macro_regime] || "orange";

  const chartData = history.map(r => ({
    date:    r.date?.slice(5),
    score:   r.macro_score,
    vix_z:   r.vix_z,
    usd_z:   r.usd_z,
    gold_z:  r.gold_z,
    crude_z: r.crude_z,
  }));

  // Regime distribution
  const regimeDist = React.useMemo(() => {
    const counts = { RISK_OFF: 0, RISK_ON: 0, NEUTRAL: 0 };
    history.forEach(r => { if (counts[r.macro_regime] !== undefined) counts[r.macro_regime]++; });
    return counts;
  }, [history]);

  // Determine current macro card style
  const isRiskOff = macro?.macro_regime === "RISK_OFF";
  const isRiskOn  = macro?.macro_regime === "RISK_ON";

  if (loading || histLoading) return <PageLayout title="Macro Overlay"><LoadingSpinner /></PageLayout>;

  return (
    <PageLayout title="Macro Overlay">
      <div className="space-y-5">

        {/* Current Macro State */}
        {macro && (
          <div className={`rounded-2xl p-6 ${
            isRiskOff
              ? "bg-black dark:bg-[#111] text-white"
              : isRiskOn
              ? "bg-[#1a3a1a] text-white"
              : "card"
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`stat-label ${isRiskOff || isRiskOn ? "text-white/60" : ""}`}>Current Macro Regime</p>
                <p className={`text-3xl font-black mt-1 ${
                  isRiskOff ? "text-red-400" : isRiskOn ? "text-[#00B341]" : "text-gray-900 dark:text-white"
                }`}>
                  {macro.macro_regime?.replace("_"," ")}
                </p>
                {macro.macro_narrative && (
                  <p className={`text-sm mt-2 max-w-xl ${isRiskOff || isRiskOn ? "text-white/70" : "text-gray-500"}`}>
                    {macro.macro_narrative}
                  </p>
                )}
              </div>
              <SignalBadge value={macro.macro_regime} />
            </div>
            <div className="grid grid-cols-4 gap-4 mt-5">
              {[
                { label: "Macro Score", value: macro.macro_score?.toFixed(2), icon: Zap },
                { label: "VIX Z-Score", value: macro.vix_z?.toFixed(2),       icon: TrendingUp },
                { label: "USD Z-Score", value: macro.usd_z?.toFixed(2),       icon: DollarSign },
                { label: "Gold Z-Score",value: macro.gold_z?.toFixed(2),      icon: Globe },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className={`rounded-2xl p-3 ${
                  isRiskOff || isRiskOn
                    ? "bg-white/10"
                    : "bg-[#FFC224]/10 border border-[#FFC224]/20"
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={13} className={isRiskOff ? "text-red-400" : isRiskOn ? "text-[#00B341]" : "text-[#FF8A00]"} />
                    <p className={`stat-label ${isRiskOff || isRiskOn ? "text-white/60" : ""}`}>{label}</p>
                  </div>
                  <p className={`text-xl font-black ${isRiskOff || isRiskOn ? "text-white" : "text-gray-900 dark:text-white"}`}>{value ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bento-white text-center">
            <p className="text-2xl font-black text-red-500">{regimeDist.RISK_OFF}</p>
            <p className="stat-label mt-1">Risk-Off Days</p>
          </div>
          <div className="bento-white text-center">
            <p className="text-2xl font-black text-[#FFC224]">{regimeDist.NEUTRAL}</p>
            <p className="stat-label mt-1">Neutral Days</p>
          </div>
          <div className="bento-white text-center">
            <p className="text-2xl font-black text-[#00B341]">{regimeDist.RISK_ON}</p>
            <p className="stat-label mt-1">Risk-On Days</p>
          </div>
        </div>

        {/* Macro Score Chart */}
        {chartData.length ? (
          <>
            <div className="card p-5">
              <p className="section-title mb-4">Macro Composite Score (120d)</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="macroGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#FF8A00" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#FF8A00" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f9fafb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                  <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="score" stroke="#FF8A00" strokeWidth={2} fill="url(#macroGrad2)" dot={false} name="Macro Score" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <p className="section-title mb-4">Z-Score Components (120d)</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f9fafb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="vix_z"   stroke="#ef4444" dot={false} strokeWidth={1.5} name="VIX Z"   />
                  <Line type="monotone" dataKey="usd_z"   stroke="#3b82f6" dot={false} strokeWidth={1.5} name="USD Z"   />
                  <Line type="monotone" dataKey="gold_z"  stroke="#FFC224" dot={false} strokeWidth={1.5} name="Gold Z"  />
                  <Line type="monotone" dataKey="crude_z" stroke="#00B341" dot={false} strokeWidth={1.5} name="Crude Z" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* History Table */}
            <div className="card p-5">
              <p className="section-title mb-3">Macro Regime Log</p>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-[#111]">
                    <tr className="border-b border-gray-100 dark:border-[#1f1f1f]">
                      {["Date","Regime","Score","VIX Z","USD Z","Gold Z","Crude Z"].map(h => (
                        <th key={h} className="th-base">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map(r => (
                      <tr key={r.id} className="tr-base">
                        <td className="td-base text-xs text-gray-600 dark:text-gray-400">{r.date}</td>
                        <td className="td-base"><SignalBadge value={r.macro_regime} /></td>
                        <td className="td-base text-xs font-mono font-bold">{r.macro_score?.toFixed(2)}</td>
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
