import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";

const ct = {
  orange: "#E8572A",
  green: "#E8572A",
  red: "#EF4444",
  grid: "rgba(0,0,0,0.04)",
  tick: "#ABABAB",
};

/**
 * WaterfallChart — score waterfall using Recharts BarChart
 *
 * Props:
 *   base: number          — starting base score
 *   adjustments: Array<{ label: string, value: number }>
 *   final: number         — resulting final_score
 */
export default function WaterfallChart({ base, adjustments = [], final }) {
  // Build waterfall data
  // Each bar = invisible base (transparent) + visible delta
  let running = base ?? 0;
  const data = [];

  // Base bar
  data.push({
    label: "Base",
    base: 0,
    delta: running,
    isBase: true,
    isFinal: false,
    value: running,
  });

  // Adjustment bars
  for (const adj of adjustments) {
    const delta = adj.value ?? 0;
    data.push({
      label: adj.label,
      base: delta >= 0 ? running : running + delta,
      delta: Math.abs(delta),
      isPositive: delta >= 0,
      isBase: false,
      isFinal: false,
      value: running + delta,
      rawDelta: delta,
    });
    running += delta;
  }

  // Final bar
  data.push({
    label: "Final Score",
    base: 0,
    delta: final ?? running,
    isBase: false,
    isFinal: true,
    value: final ?? running,
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.07)",
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 12,
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
        {d.rawDelta != null && (
          <p style={{ color: d.isPositive ? ct.green : ct.red }}>
            {d.isPositive ? "+" : ""}{d.rawDelta?.toFixed(2)}
          </p>
        )}
        <p>Score: {d.value?.toFixed(2)}</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="2 6" stroke={ct.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: ct.tick }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: ct.tick }}
          tickLine={false}
          axisLine={false}
          width={36}
          domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Invisible base (spacer) */}
        <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />

        {/* Visible delta */}
        <Bar dataKey="delta" stackId="waterfall" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((entry, i) => {
            let fill = ct.green;
            if (entry.isBase) fill = "#6B6B6B";
            else if (entry.isFinal) fill = ct.orange;
            else if (!entry.isPositive) fill = ct.red;
            return <Cell key={i} fill={fill} fillOpacity={0.9} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
