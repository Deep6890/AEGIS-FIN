import { useState } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TOTAL_MONTHS = 12;

// bar type → color tokens
const barStyle = {
  risk:   { bar: 'bg-indigo-500',  text: 'text-white',       tooltip: 'bg-indigo-600' },
  watch:  { bar: 'bg-sky-400',     text: 'text-white',       tooltip: 'bg-sky-500' },
  stable: { bar: 'bg-slate-300',   text: 'text-slate-700',   tooltip: 'bg-slate-600' },
};

const scoreColor = (s) => {
  if (s >= 70) return 'text-sky-600 bg-sky-50 border-sky-200';
  if (s >= 50) return 'text-slate-600 bg-slate-100 border-slate-200';
  return 'text-indigo-600 bg-indigo-50 border-indigo-200';
};

// ── Single Gantt Bar ────────────────────────────────────────────────────────
function GanttBar({ bar }) {
  const [hovered, setHovered] = useState(false);
  const s = barStyle[bar.type] ?? barStyle.stable;
  const left  = (bar.startMonth / TOTAL_MONTHS) * 100;
  const width = ((bar.endMonth - bar.startMonth + 1) / TOTAL_MONTHS) * 100;

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 h-6 rounded-md flex items-center px-2 cursor-pointer transition-opacity duration-150 hover:opacity-90 group"
      style={{ left: `${left}%`, width: `${width}%`, minWidth: 32 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`absolute inset-0 rounded-md ${s.bar} opacity-90`} />
      <span className={`relative z-10 text-[10px] font-semibold truncate ${s.text}`}>{bar.label}</span>

      {/* Tooltip */}
      {hovered && (
        <div className={`absolute bottom-full left-0 mb-2 z-50 ${s.tooltip} text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none`}>
          <p className="font-semibold">{bar.label}</p>
          <p className="opacity-80 mt-0.5">{bar.note}</p>
          <p className="opacity-60 mt-0.5">{MONTHS[bar.startMonth]} → {MONTHS[bar.endMonth]}</p>
        </div>
      )}
    </div>
  );
}

// ── Single Row ──────────────────────────────────────────────────────────────
function GanttRow({ item, isLast }) {
  const sc = scoreColor(item.score);
  return (
    <div className={`flex items-center gap-0 ${!isLast ? 'border-b border-slate-100' : ''}`}>

      {/* Row label */}
      <div className="w-36 shrink-0 flex items-center gap-2.5 py-3 pr-4">
        <div className="flex flex-col min-w-0">
          <span className="text-[12px] font-semibold text-slate-800 truncate">{item.name}</span>
          <span className="text-[10px] text-slate-400">{item.sector}</span>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${sc}`}>{item.score}</span>
      </div>

      {/* Gantt track */}
      <div className="flex-1 relative h-10">
        {/* Month grid lines */}
        {MONTHS.map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-slate-100"
            style={{ left: `${(i / TOTAL_MONTHS) * 100}%` }}
          />
        ))}
        {/* Bars */}
        {item.bars.map((bar, i) => <GanttBar key={i} bar={bar} />)}
      </div>

    </div>
  );
}

// ── Month Header ────────────────────────────────────────────────────────────
function MonthHeader() {
  return (
    <div className="flex items-center gap-0 border-b border-slate-200 pb-2 mb-1">
      <div className="w-36 shrink-0" />
      <div className="flex-1 flex">
        {MONTHS.map((m) => (
          <div key={m} className="flex-1 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {m}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Legend ──────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="flex items-center gap-4">
      {[
        { type: 'risk',   label: 'High Risk',  color: 'bg-indigo-500' },
        { type: 'watch',  label: 'Watch Zone', color: 'bg-sky-400' },
        { type: 'stable', label: 'Stable',     color: 'bg-slate-300' },
      ].map(({ label, color }) => (
        <span key={label} className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function RiskTimelineGrid({ sectorTimeline, companyTimeline }) {
  const [tab, setTab] = useState('sector');
  const items = tab === 'sector' ? sectorTimeline : companyTimeline;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Risk Timeline · 2025</span>
          <p className="text-[14px] font-semibold text-slate-900 mt-0.5">Sector &amp; Company Trend Calendar</p>
        </div>
        <div className="flex items-center gap-3">
          <Legend />
          {/* Tab switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl ml-4">
            {['sector', 'company'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150
                  ${tab === t ? 'bg-white border border-slate-200 shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
              >
                {t === 'sector' ? 'Sectors' : 'Companies'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt body */}
      <div className="px-5 py-4 overflow-x-auto">
        <MonthHeader />
        <div className="flex flex-col">
          {items.map((item, i) => (
            <GanttRow key={item.name} item={item} isLast={i === items.length - 1} />
          ))}
        </div>
      </div>

    </div>
  );
}
