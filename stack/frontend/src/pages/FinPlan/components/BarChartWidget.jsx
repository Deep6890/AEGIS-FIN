/**
 * BarChartWidget — Revenue / COGS / Gross Margin grouped bar chart.
 * Matches the mobile dashboard design exactly.
 */
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

const DATA = [
  { month: "May",  revenue: 38000, cogs: 22000, grossMargin: 16000 },
  { month: "Jun",  revenue: 42000, cogs: 25000, grossMargin: 17000 },
  { month: "July", revenue: 58000, cogs: 32000, grossMargin: 26000 },
  { month: "Aug",  revenue: 45000, cogs: 27000, grossMargin: 18000 },
];

// Custom tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a] rounded-xl p-3 shadow-lg text-xs">
      <p className="font-bold text-gray-800 dark:text-white mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-gray-500 dark:text-gray-400 capitalize">{p.name}:</span>
          <span className="font-semibold text-gray-800 dark:text-white">
            ${(p.value / 1000).toFixed(0)}k
          </span>
        </div>
      ))}
    </div>
  );
}

// Legend item
function LegendItem({ color, label, striped }) {
  return (
    <div className="flex items-center gap-1.5">
      {striped ? (
        <svg width="16" height="10">
          <rect width="16" height="10" fill={color} opacity="0.15" rx="2" />
          {[0, 3, 6, 9, 12].map(x => (
            <line key={x} x1={x} y1="0" x2={x} y2="10" stroke={color} strokeWidth="1.5" />
          ))}
        </svg>
      ) : (
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      )}
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}

export default function BarChartWidget({ height = 220 }) {
  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <LegendItem color="#FFC224" label="Revenue" />
        <LegendItem color="#4a7c4a" label="COGS" striped />
        <LegendItem color="#FF8A00" label="Gross Margin" />
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={DATA} barCategoryGap="20%" barGap={2}>
          <CartesianGrid vertical={false} stroke="#f0f0f0" strokeDasharray="0" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />

          {/* Revenue — solid yellow */}
          <Bar dataKey="revenue" name="Revenue" fill="#FFC224" radius={[4, 4, 0, 0]} maxBarSize={18} />

          {/* COGS — striped green (rendered as semi-transparent with pattern) */}
          <Bar dataKey="cogs" name="COGS" fill="#4a7c4a" fillOpacity={0.35} radius={[4, 4, 0, 0]} maxBarSize={18} />

          {/* Gross Margin — solid orange */}
          <Bar dataKey="grossMargin" name="Gross Margin" fill="#FF8A00" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
