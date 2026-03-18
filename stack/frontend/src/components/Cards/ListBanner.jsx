import { MoreHorizontal, TrendingDown, TrendingUp, Minus } from 'lucide-react';

const trendIcon = (t) => {
  if (t === 'up')   return <TrendingUp  size={14} className="text-sky-500" />;
  if (t === 'down') return <TrendingDown size={14} className="text-indigo-400" />;
  return <Minus size={14} className="text-slate-400" />;
};

const riskLabel = (score) => {
  if (score < 45) return { label: 'High Risk', color: 'bg-indigo-600 text-white' };
  if (score < 70) return { label: 'Moderate',  color: 'bg-slate-200 text-slate-700' };
  return               { label: 'Stable',    color: 'bg-sky-50 text-sky-700 border border-sky-200' };
};

export default function ListBanner({ title = '', subtitle = '', items = [] }) {
  return (
    <div className="flex-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-5">

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>
        </div>
        <MoreHorizontal size={18} className="text-slate-400 cursor-pointer" />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-[13px] font-medium text-slate-500">No signals available</p>
          <p className="text-[11px] text-slate-400 mt-1">Risk indicators will appear once data is processed</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100">
          {items.map((item, i) => {
            const risk = riskLabel(item.score);
            return (
              <div key={i} className="py-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-slate-900">{item.name}</span>
                    <span className="text-[11px] text-slate-400">{item.sector}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] px-2 py-[3px] rounded-md font-medium ${risk.color}`}>{risk.label}</span>
                    <span className="text-[12px] font-semibold text-slate-900">{item.score}</span>
                    {trendIcon(item.trend)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.drivers.map((d, idx) => (
                    <span key={idx} className="text-[10px] px-2.5 py-[4px] rounded-md border border-slate-200 text-slate-500 bg-slate-50">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
