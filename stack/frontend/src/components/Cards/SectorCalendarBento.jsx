import { CalendarDays } from 'lucide-react';

const trendStyle = {
  negative: {
    bar:    'bg-rose-500',
    badge:  'bg-rose-50 text-rose-600 border-rose-200',
    label:  'Negative Trend',
  },
  positive: {
    bar:    'bg-indigo-400',
    badge:  'bg-indigo-50 text-indigo-600 border-indigo-200',
    label:  'Positive Trend',
  },
};

export default function SectorCalendarBento({ sectorTrendCalendar }) {
  return (
    <div className="relative w-full bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 flex flex-col gap-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
            <CalendarDays size={18} className="text-slate-500" />
          </div>
          <div>
            <span className="block text-[14px] font-bold text-slate-800 tracking-tight">Sector Trend Timeline</span>
            <span className="block text-[12px] font-medium text-slate-500 mt-0.5">Negative & Positive Trend Periods</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500">
          <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-md bg-rose-400 shadow-sm" />Negative</span>
          <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-md bg-indigo-400 shadow-sm" />Positive</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-2 h-full justify-center">
        {sectorTrendCalendar.map((item, i) => {
          const s = trendStyle[item.type] ?? trendStyle.negative;
          return (
            <div key={i} className="flex items-center gap-5 group">
              <span className="text-[13px] font-black text-slate-800 w-20 shrink-0 tracking-tight group-hover:text-indigo-600 transition-colors">
                {item.sector}
              </span>

              <span className="text-[11px] font-bold text-slate-400 w-36 shrink-0 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 uppercase tracking-widest text-center">
                {item.from} <span className="text-slate-300 mx-1">&rarr;</span> {item.to}
              </span>

              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div className={`h-full rounded-full ${s.bar} transition-all duration-1000`} style={{ width: '100%' }} />
              </div>

              <span className={`text-[11px] font-bold px-3 py-1 rounded-full border shrink-0 ${s.badge}`}>
                {s.label}
              </span>

              <span className="text-[12px] font-medium text-slate-500 truncate max-w-[200px] leading-tight">
                {item.reason}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
