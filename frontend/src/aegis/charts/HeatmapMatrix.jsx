import React, { useState } from "react";

/**
 * HeatmapMatrix — CSS grid heatmap for sector_pressure values
 *
 * Props:
 *   data: Array<{ metric: string, period: string, value: number }>
 *         value is sector_pressure 0-1
 */

function interpolateColor(value) {
  if (value == null) return "#E5E7EB"; // neutral gray for missing
  const v = Math.max(0, Math.min(1, value));
  if (v < 0.5) {
    // orange light → orange: 0 to 0.5
    const t = v / 0.5;
    const r = Math.round(232 + (232 - 232) * t);
    const g = Math.round(180 - (180 - 87) * t);
    const b = Math.round(100 - (100 - 42) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    // orange → red: 0.5 to 1.0
    const t = (v - 0.5) / 0.5;
    const r = Math.round(232 + (239 - 232) * t);
    const g = Math.round(87 - (87 - 68) * t);
    const b = Math.round(42 + (68 - 42) * t);
    return `rgb(${r},${g},${b})`;
  }
}

export default function HeatmapMatrix({ data }) {
  const [tooltip, setTooltip] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center muted py-8">
        No sector pressure data available
      </div>
    );
  }

  // Build unique sorted metrics and periods
  const metrics = [...new Set(data.map((d) => d.metric))].sort();
  const periods = [...new Set(data.map((d) => d.period))].sort();

  // Build lookup map
  const lookup = new Map();
  for (const d of data) {
    lookup.set(`${d.metric}||${d.period}`, d.value);
  }

  return (
    <div style={{ overflowX: "auto", position: "relative" }}>
      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y - 8,
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 12,
            zIndex: 9999,
            pointerEvents: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 2 }}>{tooltip.metric}</p>
          <p style={{ color: "#6B6B6B" }}>Period: {tooltip.period}</p>
          <p>
            Pressure:{" "}
            <strong>
              {tooltip.value != null ? tooltip.value.toFixed(3) : "No data"}
            </strong>
          </p>
          {tooltip.value > 0.7 && (
            <p style={{ color: "#EF4444", fontWeight: 600 }}>⚠ High Macro Drag</p>
          )}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `140px repeat(${periods.length}, minmax(48px, 1fr))`,
          gap: 2,
          minWidth: 140 + periods.length * 50,
        }}
      >
        {/* Header row */}
        <div
          style={{
            padding: "4px 8px",
            fontSize: 10,
            fontWeight: 600,
            color: "#ABABAB",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Metric
        </div>
        {periods.map((p) => (
          <div
            key={p}
            style={{
              padding: "4px 4px",
              fontSize: 9,
              fontWeight: 600,
              color: "#ABABAB",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {p}
          </div>
        ))}

        {/* Data rows */}
        {metrics.map((metric) => (
          <React.Fragment key={metric}>
            {/* Metric label */}
            <div
              style={{
                padding: "4px 8px",
                fontSize: 11,
                color: "#111",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={metric}
            >
              {metric}
            </div>
            {/* Cells */}
            {periods.map((period) => {
              const val = lookup.get(`${metric}||${period}`);
              const bg = interpolateColor(val);
              return (
                <div
                  key={period}
                  style={{
                    height: 32,
                    borderRadius: 4,
                    background: bg,
                    cursor: "default",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    setTooltip({
                      metric,
                      period,
                      value: val,
                      x: e.clientX,
                      y: e.clientY,
                    })
                  }
                  onMouseMove={(e) =>
                    setTooltip((prev) =>
                      prev ? { ...prev, x: e.clientX, y: e.clientY } : prev
                    )
                  }
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3">
        <span className="label-caps">Pressure:</span>
        <div className="flex items-center gap-1">
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "#E8572A" }} />
          <span className="muted">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "#F06A3A" }} />
          <span className="muted">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "#EF4444" }} />
          <span className="muted">High</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "#E5E7EB" }} />
          <span className="muted">No data</span>
        </div>
      </div>
    </div>
  );
}
