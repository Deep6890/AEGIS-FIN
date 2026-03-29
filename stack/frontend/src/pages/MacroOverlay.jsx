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

  if (loading || histLoading) return <PageLayout title="Macro Overlay"><LoadingSpinner /></PageLayout>;

  return (
    <PageLayout title="Macro Overlay">
      <div className="space-y-5">

        {/* Current Macro State */}
        {macro && (
          <div className="card p-6 border-l-4 border-orange-400">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Current Macro Regime</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{macro.macro_regime?.replace("_"," ")}</p>
                {macro.macro_narrative && (
                  <p className="text-sm text-gray-500 mt-2 max-w-xl">{macro.macro_narrative}</p>
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
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={13} className="text-orange-400" />
                    <p className="stat-label">{label}</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{value ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{regimeDist.RISK_OFF}</p>
            <p className="text-xs text-gray-500 mt-1">Risk-Off Days</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-500">{regimeDist.NEUTRAL}</p>
            <p className="text-xs text-gray-500 mt-1">Neutral Days</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">{regimeDist.RISK_ON}</p>
            <p className="text-xs text-gray-500 mt-1">Risk-On Days</p>
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
                      <stop offset="5%"  stopColor="#f97316" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f9fafb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="score" stroke="#f97316" strokeWidth={2} fill="url(#macroGrad2)" dot={false} name="Macro Score" />
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
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="vix_z"   stroke="#ef4444" dot={false} strokeWidth={1.5} name="VIX Z"   />
                  <Line type="monotone" dataKey="usd_z"   stroke="#6366f1" dot={false} strokeWidth={1.5} name="USD Z"   />
                  <Line type="monotone" dataKey="gold_z"  stroke="#f59e0b" dot={false} strokeWidth={1.5} name="Gold Z"  />
                  <Line type="monotone" dataKey="crude_z" stroke="#10b981" dot={false} strokeWidth={1.5} name="Crude Z" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* History Table */}
            <div className="card p-5">
              <p className="section-title mb-3">Macro Regime Log</p>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-100">
                      {["Date","Regime","Score","VIX Z","USD Z","Gold Z","Crude Z"].map(h => (
                        <th key={h} className="text-left py-2 px-3 stat-label">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map(r => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-orange-50/20">
                        <td className="py-2 px-3 text-xs text-gray-600">{r.date}</td>
                        <td className="py-2 px-3"><SignalBadge value={r.macro_regime} /></td>
                        <td className="py-2 px-3 text-xs font-mono">{r.macro_score?.toFixed(2)}</td>
                        <td className="py-2 px-3 text-xs">{r.vix_z?.toFixed(2)}</td>
                        <td className="py-2 px-3 text-xs">{r.usd_z?.toFixed(2)}</td>
                        <td className="py-2 px-3 text-xs">{r.gold_z?.toFixed(2)}</td>
                        <td className="py-2 px-3 text-xs">{r.crude_z?.toFixed(2)}</td>
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
