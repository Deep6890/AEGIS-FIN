import { MoreHorizontal, TrendingDown, TrendingUp, CalendarDays } from 'lucide-react';
import BasicArea from '../libAssests/LineChart';
import BasicPie from '../libAssests/PieChart';

// ── VIX Chart Card ──────────────────────────────────────────────────────────
function VixCard({ vixData }) {
  const latest = vixData[vixData.length - 1];
  const prev   = vixData[vixData.length - 2];
  const up     = latest?.v > prev?.v;

  return (
    <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Market Volatility Index</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[28px] font-bold text-slate-900 leading-none">{latest?.v}</span>
            <span className={`flex items-center gap-0.5 text-[12px] font-semibold ${up ? 'text-indigo-500' : 'text-sky-500'}`}>
              {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {up ? 'Rising' : 'Falling'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">India VIX · Monthly trend · {latest?.x}</p>
        </div>
        <MoreHorizontal size={16} className="text-slate-300 cursor-pointer" />
      </div>
      <BasicArea data={vixData} />
    </div>
  );
}

// ── Pie Chart Card ──────────────────────────────────────────────────────────
function RiskPieCard({ riskDistribution }) {
  return (
    <div className="col-span-1 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Risk Distribution</span>
          <p className="text-[13px] font-semibold text-slate-800 mt-1">Sector-wise Exposure</p>
        </div>
        <MoreHorizontal size={16} className="text-slate-300 cursor-pointer" />
      </div>

      <BasicPie data={riskDistribution} />

      <div className="flex flex-col gap-2 mt-1">
        {riskDistribution.map(({ name, color, value }) => (
          <div key={name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[11px] text-slate-500">{name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 w-7 text-right">{value}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sector Trend Calendar ───────────────────────────────────────────────────
const trendStyle = {
  negative: {
    bar:    'bg-indigo-500',
    badge:  'bg-indigo-50 text-indigo-600 border-indigo-200',
    dot:    'bg-indigo-400',
    label:  'Negative Trend',
  },
  positive: {
    bar:    'bg-sky-400',
    badge:  'bg-sky-50 text-sky-600 border-sky-200',
    dot:    'bg-sky-400',
    label:  'Positive Trend',
  },
};

function SectorCalendarCard({ sectorTrendCalendar }) {
  return (
    <div className="col-span-3 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-5 shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-slate-400" />
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Sector Trend Timeline</span>
            <p className="text-[13px] font-semibold text-slate-800 mt-0.5">Negative &amp; Positive Trend Periods by Sector</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />Negative</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />Positive</span>
        </div>
      </div>

      {/* Timeline rows */}
      <div className="flex flex-col gap-3">
        {sectorTrendCalendar.map((item, i) => {
          const s = trendStyle[item.type] ?? trendStyle.negative;
          return (
            <div key={i} className="flex items-center gap-4">

              {/* Sector label */}
              <span className="text-[12px] font-semibold text-slate-700 w-16 shrink-0">{item.sector}</span>

              {/* Date range */}
              <span className="text-[10px] text-slate-400 w-36 shrink-0">{item.from} → {item.to}</span>

              {/* Bar */}
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.bar}`} style={{ width: '100%' }} />
              </div>

              {/* Badge */}
              <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full border shrink-0 ${s.badge}`}>
                {s.label}
              </span>

              {/* Reason */}
              <span className="text-[11px] text-slate-400 truncate max-w-[200px]">{item.reason}</span>

            </div>
          );
        })}
      </div>

    </div>
  );
}

// ── Bento Grid ──────────────────────────────────────────────────────────────
export default function BentoChartGrid({ vixData, riskDistribution, sectorTrendCalendar }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <VixCard vixData={vixData} />
      <RiskPieCard riskDistribution={riskDistribution} />
      <SectorCalendarCard sectorTrendCalendar={sectorTrendCalendar} />
    </div>
  );
}
