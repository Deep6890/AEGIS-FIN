import { useState } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, TrendingUp, Landmark, Wallet, BarChart3, ArrowUpRight } from "lucide-react";

/* ─── THEME (matches NewsAndRiskRow) ─────────────────────────── */
const T = {
  white: "#ffffff",
  bg: "#f8faf8",
  border: "#ddeedd",
  borderMid: "#c3e0c3",
  borderStrong: "#b8d8b8",
  green: "#2d6a2d",
  greenMid: "#4a8a4a",
  greenPale: "#edf7ed",
  greenFaint: "#f3f8f3",
  greenDim: "#a0bfa0",
  text: "#1a3d1a",
  textMid: "#4a6a4a",
  textDim: "#7a9e7a",
  textFaint: "#a0bfa0",
};

const breakdownIcons = [Landmark, Wallet, BarChart3];

/* ─── CUSTOM TOOLTIP ─────────────────────────────────────────── */
const AssetsTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: T.white,
        border: `1px solid ${T.borderMid}`,
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 4px 20px rgba(45,106,45,0.1)",
      }}
    >
      <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: T.green, letterSpacing: "0.06em", margin: 0 }}>
        {payload[0].payload.month}
      </p>
      <p style={{ fontSize: 12, color: T.textMid, marginTop: 3, fontFamily: "monospace", margin: "3px 0 0" }}>
        ₹<span style={{ fontWeight: 600, color: T.text }}>{payload[0].value}</span> Cr
      </p>
    </div>
  );
};

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
export default function TotalAssetsRow({ data = {} }) {
  const {
    total = '',
    delta = '',
    deltaLabel = '',
    trend = [],
    breakdown = [],
    netWorth = '',
  } = data;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        @keyframes aegis-fill { from { width: 0% } }
        .aegis-fill { animation: aegis-fill 0.7s ease forwards; }
        .aegis-cta:hover { background: #daeeda !important; }
      `}</style>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>

        {/* ── LEFT: Total Assets Trend ─────────────────────── */}
        <div
          style={{
            flex: "1 1 340px",
            background: T.white,
            borderRadius: 16,
            border: `1px solid ${T.border}`,
            padding: "22px",
            display: "flex",
            flexDirection: "column",
            minHeight: 300,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Green top accent */}
          <div style={{ position: "absolute", top: 0, left: "12%", right: "12%", height: 2, background: `linear-gradient(90deg,transparent,${T.green},transparent)`, opacity: 0.35 }} />

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 16, color: T.text, display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.03em" }}>
                <TrendingUp size={14} style={{ color: T.green }} />
                Total Assets
              </div>
              <p style={{ fontSize: 9.5, color: T.textFaint, margin: "5px 0 0", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Balance sheet asset growth trend
              </p>
            </div>
            <span style={{ fontSize: 9, padding: "4px 10px", border: `1px solid ${T.borderMid}`, borderRadius: 4, color: T.green, background: T.greenPale, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              FY 2024
            </span>
          </div>

          {/* Hero number */}
          <div style={{ fontFamily: "Georgia, serif", fontSize: 38, color: T.text, lineHeight: 1, letterSpacing: "-0.01em", marginBottom: 8 }}>
            {total}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: T.green, fontWeight: 500, background: T.greenPale, border: `1px solid ${T.borderMid}`, padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>
              ▲ {delta}
            </span>
            <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "monospace" }}>{deltaLabel}</span>
          </div>

          {/* Area chart */}
          <div style={{ flex: 1, minHeight: 110 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="assetsGradWG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.green} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={T.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9.5, fill: T.textDim, fontFamily: "monospace" }}
                />
                <YAxis hide />
                <Tooltip content={<AssetsTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={T.green}
                  strokeWidth={2}
                  fill="url(#assetsGradWG)"
                  dot={false}
                  activeDot={{ r: 4, fill: T.green, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* CTA */}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
            <button
              className="aegis-cta"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: T.green,
                background: T.greenPale,
                border: `1px solid ${T.borderMid}`,
                borderRadius: 8,
                padding: "7px 14px",
                cursor: "pointer",
                fontFamily: "monospace",
                letterSpacing: "0.05em",
                transition: "background 0.15s",
              }}
            >
              View Balance Sheet <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ── RIGHT: Asset Breakdown ────────────────────────── */}
        <div
          style={{
            flex: "1 1 280px",
            background: T.white,
            borderRadius: 16,
            border: `1.5px solid ${T.borderStrong}`,
            padding: "22px",
            display: "flex",
            flexDirection: "column",
            minHeight: 300,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Green top accent */}
          <div style={{ position: "absolute", top: 0, left: "12%", right: "12%", height: 2, background: `linear-gradient(90deg,transparent,${T.green},transparent)`, opacity: 0.4 }} />

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 16, color: T.text, display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.03em" }}>
                <Landmark size={14} style={{ color: T.green }} />
                Asset Breakdown
              </div>
              <p style={{ fontSize: 9.5, color: T.textFaint, margin: "5px 0 0", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Balance sheet composition
              </p>
            </div>
            <span style={{ fontSize: 9, padding: "4px 10px", border: `1px solid ${T.borderMid}`, borderRadius: 4, color: T.green, background: T.greenPale, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              Q4 FY24
            </span>
          </div>

          {/* Breakdown items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "center" }}>
            {breakdown.map(({ label, value, share }, i) => {
              const Icon = breakdownIcons[i] ?? Landmark;
              return (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: T.greenPale,
                          border: `1px solid ${T.borderMid}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={13} style={{ color: T.green }} />
                      </div>
                      <span style={{ fontFamily: "Georgia, serif", fontSize: 13, color: T.text }}>{label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "Georgia, serif", fontSize: 13, color: T.text }}>{value}</span>
                      <span style={{ fontSize: 9.5, color: T.green, background: T.greenPale, border: `1px solid ${T.borderMid}`, padding: "2px 6px", borderRadius: 3, fontFamily: "monospace" }}>
                        {share}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ width: "100%", height: 4, background: T.greenFaint, borderRadius: 99, overflow: "hidden" }}>
                    <div
                      className="aegis-fill"
                      style={{
                        height: "100%",
                        width: `${share}%`,
                        borderRadius: 99,
                        background: `linear-gradient(to right, ${T.greenMid}, ${T.green})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Net Worth box */}
          <div
            style={{
              background: T.greenFaint,
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              padding: "12px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 14,
            }}
          >
            <div>
              <p style={{ fontSize: 9, color: T.textDim, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", margin: "0 0 4px" }}>
                Net Worth / Equity
              </p>
              <p style={{ fontFamily: "Georgia, serif", fontSize: 18, color: T.text, margin: 0 }}>{netWorth}</p>
            </div>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: T.white,
                border: `1px solid ${T.borderMid}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ArrowUpRight size={14} style={{ color: T.green }} />
            </div>
          </div>

          {/* CTA */}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <button
              className="aegis-cta"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: T.green,
                background: T.greenPale,
                border: `1px solid ${T.borderMid}`,
                borderRadius: 8,
                padding: "7px 14px",
                cursor: "pointer",
                fontFamily: "monospace",
                letterSpacing: "0.05em",
                transition: "background 0.15s",
              }}
            >
              Full Report <ArrowRight size={12} />
            </button>
          </div>
        </div>

      </div>
    </>
  );
}