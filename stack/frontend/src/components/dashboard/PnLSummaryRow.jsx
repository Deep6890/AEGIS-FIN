import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

/* ─── THEME (matches NewsAndRiskRow + TotalAssetsRow) ────────── */
const T = {
  white: '#ffffff',
  bg: '#f8faf8',
  border: '#ddeedd',
  borderMid: '#c3e0c3',
  borderStrong: '#b8d8b8',
  green: '#2d6a2d',
  greenPale: '#edf7ed',
  greenFaint: '#f3f8f3',
  greenDim: '#a0bfa0',
  red: '#b94040',
  redPale: '#fdf2f2',
  redBorder: '#f0cccc',
  text: '#1a3d1a',
  textFaint: '#a0bfa0',
  textMuted: '#b0c8b0',
};

/* ─── SPARKLINE ──────────────────────────────────────────────── */
const MiniSparkline = ({ data, up }) => {
  const color = up ? T.green : T.red;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data.map((v, i) => ({ v, i }))}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.8}
          dot={false}
          activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
        />
        <Tooltip content={() => null} />
      </LineChart>
    </ResponsiveContainer>
  );
};

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
export default function PnLSummaryRow({ metrics = [] }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        .aegis-pnl-card:hover { box-shadow: 0 4px 24px rgba(45,106,45,0.09) !important; }
        .aegis-cta:hover { background: #daeeda !important; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Grid of metric cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
          }}
        >
          {metrics.map(({ label, value, delta, up, spark }, idx) => (
            <div
              key={label}
              className="aegis-pnl-card"
              style={{
                background: T.white,
                borderRadius: 14,
                border: `1px solid ${T.border}`,
                padding: '18px 18px 14px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                transition: 'box-shadow 0.18s',
              }}
            >
              {/* Top accent line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '10%',
                  right: '10%',
                  height: 2,
                  background: `linear-gradient(90deg, transparent, ${T.green}, transparent)`,
                  opacity: 0.3,
                }}
              />

              {/* Label + trend icon */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span
                  style={{
                    fontSize: 9,
                    color: T.textFaint,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontFamily: 'monospace',
                  }}
                >
                  {label}
                </span>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: up ? T.greenPale : T.redPale,
                    border: `1px solid ${up ? T.borderMid : T.redBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {up
                    ? <TrendingUp size={12} style={{ color: T.green }} />
                    : <TrendingDown size={12} style={{ color: T.red }} />}
                </div>
              </div>

              {/* Value */}
              <div
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 26,
                  color: T.text,
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                  marginBottom: 10,
                }}
              >
                {value}
              </div>

              {/* Sparkline */}
              <div style={{ height: 38, width: '100%', marginBottom: 10 }}>
                <MiniSparkline data={spark} up={up} />
              </div>

              {/* Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: `1px solid ${T.border}`,
                  paddingTop: 8,
                  marginTop: 'auto',
                }}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    color: up ? T.green : T.red,
                    fontWeight: 500,
                    background: up ? T.greenPale : T.redPale,
                    border: `1px solid ${up ? T.borderMid : T.redBorder}`,
                    padding: '2px 7px',
                    borderRadius: 3,
                    fontFamily: 'monospace',
                  }}
                >
                  {delta}
                </span>
                <span style={{ fontSize: 9.5, color: T.textMuted, fontFamily: 'monospace' }}>
                  vs last qtr
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="aegis-cta"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: T.green,
              background: T.greenPale,
              border: `1px solid ${T.borderMid}`,
              borderRadius: 8,
              padding: '7px 14px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
              transition: 'background 0.15s',
            }}
          >
            Full P&L Statement <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </>
  );
} 