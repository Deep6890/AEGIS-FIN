import React from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  Scatter,
  ReferenceLine,
} from "recharts";

const ct = {
  green: "#E8572A",
  red: "#EF4444",
  grid: "rgba(0,0,0,0.04)",
  tick: "#ABABAB",
  tooltip: {
    contentStyle: {
      background: "#fff",
      border: "1px solid rgba(0,0,0,0.07)",
      borderRadius: 12,
      fontSize: 12,
    },
    labelStyle: { color: "#111", fontWeight: 600 },
  },
};

/**
 * CandlestickChart — OHLCV candlestick using Recharts ComposedChart
 *
 * Props:
 *   data: Array<{ date, open, high, low, close, spike_down? }>
 *   height?: number (default 300)
 *
 * Implementation:
 *   - Bar for high-low range (wick)
 *   - Bar for open-close body
 *   - Scatter for spike_down markers
 */

// Transform raw OHLCV into chart-friendly format
function transformData(data) {
  return (data || []).map((d) => {
    const isUp = d.close >= d.open;
    const bodyLow = Math.min(d.open, d.close);
    const bodyHigh = Math.max(d.open, d.close);
    return {
      date: d.date,
      // Wick: [low, high]
      wickBase: d.low,
      wickHeight: d.high - d.low,
      // Body: [bodyLow, bodyHigh]
      bodyBase: bodyLow,
      bodyHeight: bodyHigh - bodyLow || 0.01, // avoid zero-height
      isUp,
      spike_down: d.spike_down,
      // For scatter spike markers
      spikeY: d.spike_down ? d.low * 0.995 : null,
      // Raw values for tooltip
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    };
  });
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
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
      <p>O: {d.open?.toFixed(2)}</p>
      <p>H: {d.high?.toFixed(2)}</p>
      <p>L: {d.low?.toFixed(2)}</p>
      <p>C: {d.close?.toFixed(2)}</p>
      {d.spike_down && (
        <p style={{ color: ct.red, fontWeight: 600 }}>⚠ Spike Down</p>
      )}
    </div>
  );
};

export default function CandlestickChart({ data, height = 300 }) {
  const chartData = transformData(data);

  if (!chartData.length) {
    return (
      <div
        className="flex items-center justify-center muted"
        style={{ height }}
      >
        No price data available
      </div>
    );
  }

  // Show every Nth label to avoid crowding
  const step = Math.max(1, Math.floor(chartData.length / 8));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={chartData}
        margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="2 6" stroke={ct.grid} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: ct.tick }}
          tickLine={false}
          axisLine={false}
          interval={step - 1}
          tickFormatter={(v) => v?.slice(5)} // MM-DD
        />
        <YAxis
          tick={{ fontSize: 10, fill: ct.tick }}
          tickLine={false}
          axisLine={false}
          width={50}
          tickFormatter={(v) => v?.toFixed(0)}
          domain={["auto", "auto"]}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Wick bar (high-low range) */}
        <Bar dataKey="wickHeight" stackId="wick" fill="transparent" isAnimationActive={false}>
          {chartData.map((_, i) => (
            <Cell
              key={i}
              fill={chartData[i].isUp ? ct.green : ct.red}
              fillOpacity={0.4}
            />
          ))}
        </Bar>

        {/* Body bar (open-close) */}
        <Bar dataKey="bodyHeight" stackId="body" isAnimationActive={false}>
          {chartData.map((_, i) => (
            <Cell
              key={i}
              fill={chartData[i].isUp ? ct.green : ct.red}
              fillOpacity={0.9}
            />
          ))}
        </Bar>

        {/* Spike down scatter markers */}
        <Scatter
          dataKey="spikeY"
          fill={ct.red}
          shape={(props) => {
            const { cx, cy, payload } = props;
            if (!payload.spike_down || cy == null) return null;
            return (
              <circle
                cx={cx}
                cy={cy}
                r={4}
                fill={ct.red}
                stroke="#fff"
                strokeWidth={1}
              />
            );
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
