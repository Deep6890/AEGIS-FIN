/**
 * GrossMarginChart — mini bar chart inside the dark green bento card.
 * Shows a highlighted white bar among grey bars.
 */
import React from "react";
import {
  BarChart, Bar, Cell, ResponsiveContainer, YAxis, Tooltip,
} from "recharts";

// Generate 20 bars of mock data
const DATA = Array.from({ length: 20 }, (_, i) => ({
  i,
  value: 10000 + Math.sin(i * 0.6) * 8000 + Math.random() * 5000,
  highlight: i === 12,
}));

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/80 text-white text-xs rounded-lg px-2 py-1">
      ${(payload[0].value / 1000).toFixed(0)}k
    </div>
  );
}

export default function GrossMarginChart({ height = 100 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={DATA} barCategoryGap="15%">
        <YAxis
          domain={[0, 55000]}
          ticks={[0, 10000, 20000, 30000, 40000, 50000]}
          tickFormatter={v => `${v / 1000}k`}
          tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={10}>
          {DATA.map((d) => (
            <Cell
              key={d.i}
              fill={d.highlight ? "#ffffff" : "rgba(255,255,255,0.25)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
