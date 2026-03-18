import { TrendingDown, TrendingUp } from 'lucide-react';
import BasicArea from '../libAssests/LineChart';

export default function VixBento({ vixData }) {
  const latest = vixData[vixData.length - 1];
  const prev   = vixData[vixData.length - 2];
  const up     = latest?.v > prev?.v;

  // min/max for context
  const vals   = vixData.map(d => d.v);
  const max    = Math.max(...vals);
  const min    = Math.min(...vals);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4 h-full">

      {/* header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">India VIX</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[34px] font-black text-slate-900 leading-none tracking-tighter">{latest?.v}</span>
            <span className={`flex items-center gap-0.5 text-[12px] font-bold px-2 py-0.5 rounded-lg border
              ${up ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'text-sky-600 bg-sky-50 border-sky-100'}`}>
              {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {up ? 'Rising' : 'Falling'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Volatility Index · Monthly · {latest?.x}</p>
        </div>

        {/* range pills */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider">52w H</span>
            <span className="text-[11px] font-bold text-slate-700">{max}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider">52w L</span>
            <span className="text-[11px] font-bold text-slate-700">{min}</span>
          </div>
        </div>
      </div>

      {/* chart */}
      <div className="flex-1 -mx-1">
        <BasicArea data={vixData} />
      </div>

    </div>
  );
}
