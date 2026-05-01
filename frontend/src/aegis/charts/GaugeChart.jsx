import React from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

/**
 * GaugeChart — radial arc gauge using Recharts RadialBarChart
 * Props:
 *   value: number (0-100)
 *   label: string
 *   color?: string (auto-derived from value if omitted)
 *   size?: number (default 160)
 */
function scoreColor(value) {
  if (value == null) return "#ABABAB";
  if (value >= 40) return "#E8572A";
  return "#EF4444";
}

export default function GaugeChart({ value, label, color, size = 160 }) {
  const safeValue = value ?? 0;
  const fillColor = color || scoreColor(safeValue);

  const data = [
    { name: "track", value: 100, fill: "rgba(0,0,0,0.06)" },
    { name: "value", value: safeValue, fill: fillColor },
  ];

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: size }}>
      <div style={{ width: size, height: size * 0.6, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="100%"
            innerRadius="60%"
            outerRadius="100%"
            startAngle={180}
            endAngle={0}
            data={data}
            barSize={12}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              background={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Center value label */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
          }}
        >
          <span
            className="value-md"
            style={{ color: fillColor, fontSize: "1.25rem", fontWeight: 700 }}
          >
            {value != null ? Math.round(safeValue) : "—"}
          </span>
        </div>
      </div>
      {label && (
        <p className="label-caps text-center" style={{ maxWidth: size }}>
          {label}
        </p>
      )}
    </div>
  );
}
