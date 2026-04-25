import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, CartesianGrid
} from "recharts";
import SignalBadge from "../ui/SignalBadge";

export function MacroChart({ macroChartData, macroRegime, ct }) {
  return (
    <div className="card-feature p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="title-md">Macro Score · 30d</p>
          <p className="muted mt-1">Composite z-score · VIX · USD-INR · Gold · Crude Oil</p>
        </div>
        {macroRegime && <SignalBadge value={macroRegime} />}
      </div>
      {macroChartData.length ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={macroChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="macroGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ct.orange} stopOpacity={0.2} />
                <stop offset="100%" stopColor={ct.orange} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke={ct.grid} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Geist Mono" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Geist Mono" }} tickLine={false} axisLine={false} width={32} />
            <Tooltip {...ct.tooltip} />
            <Area type="monotone" dataKey="score" stroke={ct.orange} strokeWidth={2} fill="url(#macroGrad)" dot={false} name="Macro Score" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-sm text-neutral-400">
          No macro data — run the pipeline
        </div>
      )}
    </div>
  );
}

export function SectorReturnsChart({ sectorReturnData, ct }) {
  return (
    <div className="card-feature p-6">
      <div className="mb-5">
        <p className="title-md">Sector Returns · 1d</p>
        <p className="muted mt-1">Today's performance across NSE sector indices</p>
      </div>
      {sectorReturnData.length ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sectorReturnData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: ct.tick, fontFamily: "Geist Mono" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={54} />
            <Tooltip {...ct.tooltip} formatter={v => [`${v}%`, "Return"]} />
            <Bar dataKey="ret" radius={[0, 4, 4, 0]} maxBarSize={12}>
              {sectorReturnData.map((e, i) => <Cell key={i} fill={e.ret >= 0 ? ct.green : ct.red} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-sm text-neutral-400">
          No sector data — run the pipeline
        </div>
      )}
    </div>
  );
}
