import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, Banknote, RefreshCw } from 'lucide-react';

/* ─── THEME (shared across AEGIS components) ─────────────────── */
const T = {
  white: '#ffffff',
  border: '#ddeedd',
  borderMid: '#c3e0c3',
  borderStrong: '#b8d8b8',
  green: '#2d6a2d',
  greenPale: '#edf7ed',
  greenFaint: '#f3f8f3',
  greenLight: '#c3e0c3',
  greenDim: '#a0bfa0',
  red: '#b94040',
  text: '#1a3d1a',
  textFaint: '#a0bfa0',
};

const summaryIcons = [RefreshCw, ArrowUpRight, ArrowDownLeft, Banknote];

/* ─── CUSTOM TOOLTIP ─────────────────────────────────────────── */
const CashTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: T.white,
        border: `1px solid ${T.borderMid}`,
        borderRadius: 10,
        padding: '10px 14px',
        boxShadow: '0 4px 20px rgba(45,106,45,0.1)',
      }}
    >
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: T.green, letterSpacing: '0.06em', margin: '0 0 4px' }}>
        {label}
      </p>
      {payload.map(p => (
        <p key={p.name} style={{ fontSize: 11, color: p.name === 'inflow' ? T.green : T.greenDim, fontFamily: 'monospace', margin: '2px 0 0' }}>
          {p.name === 'inflow' ? '↑' : '↓'} ₹{p.value} Cr
        </p>
      ))}
    </div>
  );
};

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
export default function CashFlowRow({ data = {} }) {
  const { quarterly = [], summary = [] } = data;

  const cardBase = {
    background: T.white,
    borderRadius: 14,
    border: `1px solid ${T.border}`,
    position: 'relative',
    overflow: 'hidden',
  };

  const accentLine = (
    <div style={{
      position: 'absolute', top: 0, left: '10%', right: '10%', height: 2,
      background: `linear-gradient(90deg, transparent, ${T.green}, transparent)`,
      opacity: 0.32,
    }} />
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        .aegis-cf-summary:hover { box-shadow: 0 4px 18px rgba(45,106,45,0.08) !important; }
      `}</style>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

        {/* ── LEFT: Bar chart ──────────────────────────────── */}
        <div style={{ ...cardBase, flex: '1 1 340px', padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', minHeight: 260 }}>
          {accentLine}

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: T.text, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.03em' }}>
                <Banknote size={14} style={{ color: T.green }} />
                Cash Flow
              </div>
              <p style={{ fontSize: 9.5, color: T.textFaint, margin: '5px 0 0', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Quarterly inflow vs outflow
              </p>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {[
                { label: 'Inflow', color: T.green },
                { label: 'Outflow', color: T.greenLight },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 9.5, color: T.greenDim, fontFamily: 'monospace' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div style={{ flex: 1, minHeight: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={quarterly}
                barCategoryGap="30%"
                barGap={4}
                margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
              >
                <XAxis
                  dataKey="qtr"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9.5, fill: T.greenDim, fontFamily: 'monospace' }}
                />
                <YAxis hide />
                <Tooltip content={<CashTooltip />} cursor={{ fill: 'rgba(45,106,45,0.04)' }} />
                <Bar dataKey="inflow" name="inflow" fill={T.green} fillOpacity={0.85} radius={[4, 4, 0, 0]} barSize={22} />
                <Bar dataKey="outflow" name="outflow" fill={T.greenLight} radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── RIGHT: Summary tiles ─────────────────────────── */}
        <div
          style={{
            flex: '1 1 240px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            alignContent: 'start',
          }}
        >
          {summary.map(({ label, value, up }, i) => {
            const Icon = summaryIcons[i] ?? Banknote;
            return (
              <div
                key={label}
                className="aegis-cf-summary"
                style={{
                  ...cardBase,
                  padding: '15px 15px 13px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'box-shadow 0.18s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, left: '8%', right: '8%', height: 2,
                  background: `linear-gradient(90deg, transparent, ${T.green}, transparent)`,
                  opacity: 0.28,
                }} />

                {/* Icon */}
                <div
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: T.greenPale, border: `1px solid ${T.borderMid}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Icon size={13} style={{ color: T.green }} />
                </div>

                {/* Label */}
                <span style={{ fontSize: 9, color: T.textFaint, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                  {label}
                </span>

                {/* Value */}
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 19, color: up ? T.text : T.red, lineHeight: 1 }}>
                  {value}
                </span>
              </div>
            );
          })}
        </div>

      </div>
    </>
  );
}