import { ArrowRight, ShieldCheck, Activity, Scale, CreditCard } from 'lucide-react';

/* ─── THEME (shared across AEGIS components) ─────────────────── */
const T = {
  white: '#ffffff',
  border: '#ddeedd',
  borderMid: '#c3e0c3',
  borderStrong: '#b8d8b8',
  green: '#2d6a2d',
  greenMid: '#4a8a4a',
  greenPale: '#edf7ed',
  greenFaint: '#f3f8f3',
  greenLight: '#c3e0c3',
  greenDim: '#a0bfa0',
  text: '#1a3d1a',
  textBody: '#1e381e',
  textFaint: '#a0bfa0',
};

const ratioIcons = [Scale, ShieldCheck, Activity, CreditCard];

const DEBT_COLORS = ['#2d6a2d', '#7ab87a', '#c3e0c3'];

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
export default function RatiosDebtRow({ data = {} }) {
  const { ratios = [], totalDebt = '', debtDelta = '', breakdown = [] } = data;

  const accentLine = (
    <div style={{
      position: 'absolute', top: 0, left: '10%', right: '10%', height: 2,
      background: `linear-gradient(90deg, transparent, ${T.green}, transparent)`,
      opacity: 0.32,
    }} />
  );

  const ctaBtn = (label) => (
    <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
      <button
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: T.green, background: T.greenPale,
          border: `1px solid ${T.borderMid}`, borderRadius: 8,
          padding: '7px 14px', cursor: 'pointer',
          fontFamily: 'monospace', letterSpacing: '0.05em', transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#daeeda'}
        onMouseLeave={e => e.currentTarget.style.background = T.greenPale}
      >
        {label} <ArrowRight size={12} />
      </button>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        @keyframes aegis-fill { from { width: 0% } }
        .aegis-fill { animation: aegis-fill 0.65s ease forwards; }
      `}</style>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

        {/* ── LEFT: Ratios ─────────────────────────────────── */}
        <div
          style={{
            flex: '1 1 340px', background: T.white,
            borderRadius: 14, border: `1px solid ${T.border}`,
            padding: '20px 20px 16px', display: 'flex', flexDirection: 'column',
            minHeight: 260, position: 'relative', overflow: 'hidden',
          }}
        >
          {accentLine}

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: T.text, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.03em' }}>
                <Activity size={14} style={{ color: T.green }} />
                Key Financial Ratios
              </div>
              <p style={{ fontSize: 9.5, color: T.textFaint, margin: '5px 0 0', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Health indicators from balance sheet
              </p>
            </div>
            <span style={{ fontSize: 9, padding: '4px 10px', border: `1px solid ${T.borderMid}`, borderRadius: 4, color: T.green, background: T.greenPale, fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              FY 2024
            </span>
          </div>

          {/* Ratio list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, justifyContent: 'center' }}>
            {ratios.map(({ label, value, status, bar }, i) => {
              const Icon = ratioIcons[i] ?? Activity;
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Icon */}
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: T.greenPale, border: `1px solid ${T.borderMid}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={13} style={{ color: T.green }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: T.textBody }}>{label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: T.text }}>{value}</span>
                        <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: T.greenPale, border: `1px solid ${T.borderMid}`, color: T.green, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                          {status}
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ width: '100%', height: 4, background: T.greenFaint, borderRadius: 99, overflow: 'hidden' }}>
                      <div
                        className="aegis-fill"
                        style={{ height: '100%', width: `${bar}%`, borderRadius: 99, background: `linear-gradient(to right, ${T.greenMid}, ${T.green})` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {ctaBtn('Detailed Ratios')}
        </div>

        {/* ── RIGHT: Debt Overview ──────────────────────────── */}
        <div
          style={{
            flex: '1 1 260px', background: T.white,
            borderRadius: 14, border: `1.5px solid ${T.borderStrong}`,
            padding: '20px 20px 16px', display: 'flex', flexDirection: 'column',
            minHeight: 260, position: 'relative', overflow: 'hidden',
          }}
        >
          {accentLine}

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: T.text, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.03em' }}>
                <CreditCard size={14} style={{ color: T.green }} />
                Debt Overview
              </div>
              <p style={{ fontSize: 9.5, color: T.textFaint, margin: '5px 0 0', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Total liabilities breakdown
              </p>
            </div>
          </div>

          {/* Hero total */}
          <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', margin: '0 0 5px' }}>Total Debt</p>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 32, color: T.text, lineHeight: 1, letterSpacing: '-0.01em', marginBottom: 6 }}>
            {totalDebt}
          </div>
          <span style={{ fontSize: 11, color: T.green, background: T.greenPale, border: `1px solid ${T.borderMid}`, padding: '2px 8px', borderRadius: 3, fontFamily: 'monospace', display: 'inline-block', marginBottom: 14 }}>
            {debtDelta}
          </span>

          {/* Stacked bar */}
          <div style={{ width: '100%', height: 10, borderRadius: 99, overflow: 'hidden', display: 'flex', marginBottom: 14 }}>
            {breakdown.map((d, i) => (
              <div
                key={i}
                style={{ width: `${d.pct}%`, height: '100%', background: DEBT_COLORS[i] ?? T.greenLight, transition: 'width 0.6s ease' }}
              />
            ))}
          </div>

          {/* Breakdown list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'center' }}>
            {breakdown.map(({ label, value, pct }, i) => (
              <div
                key={label}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 13px', background: T.greenFaint,
                  borderRadius: 9, border: `1px solid ${T.border}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: DEBT_COLORS[i] ?? T.greenLight, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 12.5, color: T.textBody }}>{label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: T.text }}>{value}</span>
                  <span style={{ fontSize: 9.5, color: T.green, background: T.greenPale, border: `1px solid ${T.borderMid}`, padding: '2px 6px', borderRadius: 3, fontFamily: 'monospace' }}>
                    {pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {ctaBtn('Debt Schedule')}
        </div>

      </div>
    </>
  );
}