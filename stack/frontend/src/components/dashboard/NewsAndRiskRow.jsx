import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowUpRight, Radio } from "lucide-react";

/* ─── THEME ─────────────────────────────────────────────────── */
const T = {
  bg: "#f8faf8",
  white: "#ffffff",
  border: "#ddeedd",
  borderMid: "#c3e0c3",
  borderStrong: "#b8d8b8",
  green: "#2d6a2d",
  greenMid: "#4a8a4a",
  greenPale: "#edf7ed",
  greenDim: "#a0bfa0",
  greenFaint: "#f3f8f3",
  red: "#dc2626",
  redPale: "rgba(220,38,38,0.07)",
  redBorder: "rgba(220,38,38,0.18)",
  amber: "#d97706",
  text: "#1e381e",
  textMid: "#4a6a4a",
  textDim: "#8aaa8a",
  textFaint: "#b0c8b0",
};

/* ─── SENTIMENT CONFIG ───────────────────────────────────────── */
const sentimentCfg = {
  positive: {
    label: "Bullish",
    icon: TrendingUp,
    dot: T.green,
    text: T.green,
    bg: "rgba(45,106,45,0.08)",
    border: "rgba(45,106,45,0.2)",
  },
  negative: {
    label: "Bearish",
    icon: TrendingDown,
    dot: T.red,
    text: "#b94040",
    bg: "rgba(220,38,38,0.07)",
    border: "rgba(220,38,38,0.18)",
  },
  neutral: {
    label: "Neutral",
    icon: Minus,
    dot: "#a0a090",
    text: "#888878",
    bg: "rgba(160,160,144,0.1)",
    border: "rgba(160,160,144,0.2)",
  },
};

function impactColor(v) {
  return v >= 8 ? T.red : v >= 6 ? T.amber : T.green;
}

function scoreColor(v) {
  return v < 45 ? T.red : v < 70 ? T.amber : T.green;
}

/* ─── CUSTOM TOOLTIP ─────────────────────────────────────────── */
const RiskBarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: T.text,
        border: `1px solid ${T.borderStrong}`,
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      }}
    >
      <p style={{ color: "#e8f4e8", fontSize: 11, fontFamily: "Georgia, serif", letterSpacing: "0.06em", margin: 0 }}>
        {d.fullSector}
      </p>
      <p style={{ color: T.greenDim, fontSize: 10, marginTop: 4, fontFamily: "monospace", margin: "4px 0 0" }}>
        Score{" "}
        <span style={{ color: scoreColor(d.avgScore), fontWeight: 700, fontSize: 13 }}>{d.avgScore}</span>
        <span style={{ color: T.greenDim }}>/100</span>
      </p>
    </div>
  );
};

/* ─── NEWS ITEM ──────────────────────────────────────────────── */
function NewsItem({ item, rank }) {
  const [hov, setHov] = useState(false);
  const s = sentimentCfg[item.sentiment] ?? sentimentCfg.neutral;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        gap: 12,
        padding: "14px 0",
        borderBottom: `1px solid ${T.border}`,
        cursor: "pointer",
        transition: "all 0.18s",
      }}
    >
      {/* Rank */}
      <span
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 13,
          color: T.greenDim,
          width: 22,
          flexShrink: 0,
          paddingTop: 1,
        }}
      >
        {String(rank).padStart(2, "0")}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
        <p
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 13,
            color: hov ? T.green : T.text,
            lineHeight: 1.55,
            margin: 0,
            transition: "color 0.18s",
          }}
        >
          {item.headline}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Sentiment pill */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 9,
              padding: "2.5px 7px",
              borderRadius: 20,
              background: s.bg,
              border: `1px solid ${s.border}`,
              color: s.text,
              fontFamily: "monospace",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: s.dot,
                flexShrink: 0,
              }}
            />
            {s.label}
          </span>

          <span style={{ fontSize: 9.5, color: T.textFaint, fontFamily: "monospace" }}>{item.time}</span>
          <span style={{ fontSize: 9.5, color: T.textDim, fontFamily: "monospace" }}>
            Impact{" "}
            <span style={{ fontWeight: 500, color: impactColor(item.impact) }}>{item.impact}</span>
            <span style={{ color: T.textFaint }}>/10</span>
          </span>
        </div>

        {item.companies?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {item.companies.map((c) => (
              <span
                key={c}
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 4,
                  background: T.greenPale,
                  border: `1px solid ${T.borderMid}`,
                  color: T.green,
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                }}
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      <ArrowUpRight
        size={13}
        style={{ color: hov ? T.green : T.textFaint, flexShrink: 0, marginTop: 2, transition: "color 0.18s" }}
      />
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
export default function NewsAndRiskRow({ newsFeed = [], sectorCompanyList = [] }) {
  const sorted = [...newsFeed].sort((a, b) => b.impact - a.impact);
  const counts = {
    positive: sorted.filter((n) => n.sentiment === "positive").length,
    negative: sorted.filter((n) => n.sentiment === "negative").length,
    neutral: sorted.filter((n) => n.sentiment === "neutral").length,
  };

  const barData = sectorCompanyList.map((g) => ({
    sector: g.sector.slice(0, 6),
    fullSector: g.sector,
    avgScore: Math.round(g.companies.reduce((a, c) => a + c.score, 0) / g.companies.length),
  }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        .aegis-feed::-webkit-scrollbar{width:3px}
        .aegis-feed::-webkit-scrollbar-thumb{background:${T.borderMid};border-radius:99px}
        .aegis-feed::-webkit-scrollbar-track{background:transparent}
        @keyframes aegis-pulse{0%,100%{opacity:1}50%{opacity:0.35}}
      `}</style>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>

        {/* ── LEFT: News ──────────────────────────────────────── */}
        <div
          style={{
            flex: "1 1 340px",
            background: T.white,
            borderRadius: 16,
            border: `1px solid ${T.border}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 17,
                    color: T.text,
                    letterSpacing: "0.03em",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 5,
                  }}
                >
                  <Radio size={12} style={{ color: T.green }} />
                  Market Intelligence
                </div>
                <p style={{ fontSize: 9.5, color: T.textFaint, margin: 0, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  High-impact signals · sorted by relevance
                </p>
              </div>
              <button
                style={{
                  fontSize: 9.5,
                  color: T.green,
                  background: T.greenPale,
                  border: `1px solid ${T.borderMid}`,
                  borderRadius: 5,
                  padding: "5px 10px",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  letterSpacing: "0.06em",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  textTransform: "uppercase",
                }}
              >
                View all <ArrowUpRight size={9} />
              </button>
            </div>

            {/* Sentiment badges */}
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              {[
                { label: `▲ ${counts.positive} bullish`, bg: T.greenPale, color: T.green, border: T.borderMid },
                { label: `▼ ${counts.negative} bearish`, bg: "#fdf2f2", color: "#b94040", border: "#f0cccc" },
                { label: `● ${counts.neutral} neutral`, bg: "#f6f6f3", color: "#888878", border: "#e0e0d8" },
              ].map((b) => (
                <span
                  key={b.label}
                  style={{
                    fontSize: 9.5,
                    padding: "3px 10px",
                    borderRadius: 4,
                    border: `1px solid ${b.border}`,
                    color: b.color,
                    background: b.bg,
                    fontFamily: "monospace",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          {/* Feed */}
          <div
            className="aegis-feed"
            style={{ flex: 1, overflowY: "auto", padding: "0 20px", maxHeight: 370 }}
          >
            {sorted.map((item, i) => (
              <NewsItem key={item.id} item={item} rank={i + 1} />
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "10px 20px",
              borderTop: `1px solid ${T.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 9.5, color: T.textFaint, fontFamily: "monospace", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Last refresh · just now
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: T.green,
                  display: "inline-block",
                  animation: "aegis-pulse 2s ease-in-out infinite",
                }}
              />
              <span style={{ fontSize: 9.5, color: T.green, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Live
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Sector Risk ──────────────────────────────── */}
        <div
          style={{
            flex: "1 1 280px",
            background: T.white,
            borderRadius: 16,
            border: `1.5px solid ${T.borderStrong}`,
            padding: "22px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Green accent line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "12%",
              right: "12%",
              height: 2,
              background: `linear-gradient(90deg, transparent, ${T.green}, transparent)`,
              opacity: 0.4,
            }}
          />

          {/* Header */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 17,
                    color: T.text,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <AlertTriangle size={14} style={{ color: T.green }} />
                  Sector Risk Matrix
                </div>
                <p style={{ fontSize: 9.5, color: T.textFaint, margin: 0, fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Composite risk score · all sectors
                </p>
              </div>
              <span
                style={{
                  fontSize: 9,
                  padding: "4px 10px",
                  border: `1px solid ${T.borderMid}`,
                  borderRadius: 4,
                  color: T.green,
                  background: T.greenPale,
                  fontFamily: "monospace",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Live
              </span>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
            {[
              { label: "Low risk", color: T.green },
              { label: "Moderate", color: T.amber },
              { label: "High risk", color: T.red },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                <span style={{ fontSize: 9.5, color: T.textDim, fontFamily: "monospace" }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ flex: 1, minHeight: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
                barCategoryGap="32%"
              >
                <XAxis
                  dataKey="sector"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9.5, fill: T.textDim, fontFamily: "monospace", letterSpacing: "0.05em" }}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  cursor={{ fill: "rgba(45,106,45,0.05)" }}
                  content={<RiskBarTooltip />}
                />
                <Bar
                  dataKey="avgScore"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                  background={{ fill: T.greenFaint, radius: [4, 4, 0, 0] }}
                >
                  {barData.map((d, i) => (
                    <Cell key={i} fill={scoreColor(d.avgScore)} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scale */}
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              background: T.greenFaint,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 9, color: T.textFaint, fontFamily: "monospace", letterSpacing: "0.05em" }}>0 — High risk</span>
              <span style={{ fontSize: 9, color: T.textFaint, fontFamily: "monospace", letterSpacing: "0.05em" }}>100 — Low risk</span>
            </div>
            <div
              style={{
                height: 3,
                borderRadius: 99,
                background: `linear-gradient(to right, ${T.red}, ${T.amber} 50%, ${T.green})`,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}