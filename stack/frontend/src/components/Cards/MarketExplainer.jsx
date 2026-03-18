import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const stateStyle = (s) => {
  const l = s.toLowerCase();
  if (l.includes('stable'))  return { dot: 'bg-sky-400',    badge: 'bg-sky-50 text-sky-700 border-sky-200' };
  if (l.includes('stress'))  return { dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  return                            { dot: 'bg-slate-400',  badge: 'bg-slate-50 text-slate-600 border-slate-200' };
};

export default function MarketExplainer({
  state = 'Moderately Stable',
  signals = [],
  leaders = [],
  laggards = [],
  volatility = 'Normal',
}) {
  const style = stateStyle(state);
  const total   = leaders.length + laggards.length;
  const balance = total === 0 ? 50 : (leaders.length / total) * 100;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm">

      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between bg-white border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <Activity size={15} className="text-slate-400" />
          <span className="text-[14px] font-semibold text-slate-800 tracking-tight">Market Intelligence</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${style.dot}`} />
          <span className={`text-[11px] font-medium px-3 py-1 rounded-full border ${style.badge}`}>{state}</span>
        </div>
      </div>

      <div className="bg-white px-6 py-5 flex flex-col gap-6">

        {/* Micro Indicators */}
        <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-100">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-widest text-slate-400">Market Volatility</span>
            <span className="text-[13px] font-semibold text-slate-800">{volatility}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-widest text-slate-400">Sector Leaders</span>
            <span className="text-[13px] font-semibold text-slate-800">{leaders.length}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-widest text-slate-400">Weak Sectors</span>
            <span className="text-[13px] font-semibold text-slate-800">{laggards.length}</span>
          </div>
        </div>

        {/* Balance Bar */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-400">Sector Strength Balance</span>
          <div className="w-full h-[6px] bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${balance}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Weak</span><span>Strong</span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-3 divide-x divide-slate-100">

          <div className="flex flex-col gap-3 pr-6">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Primary Signals</p>
            <div className="flex flex-col gap-2.5">
              {signals.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Minus size={10} className="text-slate-300 mt-[3px] shrink-0" />
                  <span className="text-[12px] text-slate-600 leading-snug">{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 px-6">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Sector Leaders</p>
            <div className="flex flex-wrap gap-1.5">
              {leaders.map((s, i) => (
                <span key={i} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-medium">
                  <TrendingUp size={10} />{s}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 pl-6">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Weak Sectors</p>
            <div className="flex flex-wrap gap-1.5">
              {laggards.map((s, i) => (
                <span key={i} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  <TrendingDown size={10} />{s}
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* Insight */}
        <div className="border-t border-slate-100 pt-4">
          <span className="text-[10px] uppercase tracking-widest text-slate-400">Market Insight</span>
          <p className="text-[12px] text-slate-500 leading-relaxed mt-1">
            Market exhibiting selective strength. Capital appears to be rotating toward defensive sectors while cyclical industries face moderate pressure.
          </p>
        </div>

      </div>
    </div>
  );
}
