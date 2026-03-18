import { useState } from 'react';
import { ArrowUpRight, Activity } from 'lucide-react';

export default function MarketPillCard({ onChange, marketMeta = {} }) {
  const [active, setActive] = useState('NSE');

  const markets = [
    { id: 'NSE', label: 'NSE', index: 'Nifty 50' },
    { id: 'BSE', label: 'BSE', index: 'Sensex' },
  ];

  const handleClick = (id) => {
    setActive(id);
    onChange?.(id);
  };

  const meta = marketMeta[active] ?? {};

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">

      {/* Left: market context */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-slate-400" />
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Live Market</span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-[28px] font-bold text-slate-900 leading-none tracking-tight">{meta.value ?? '—'}</span>
          <span className="flex items-center gap-0.5 text-[12px] font-semibold text-indigo-500">
            <ArrowUpRight size={13} />
            {meta.change ?? '—'}
          </span>
        </div>
        <span className="text-[11px] text-slate-400">{meta.index ?? '—'} · {meta.status ?? '—'}</span>
      </div>

      {/* Right: pill switcher */}
      <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl">
        {markets.map(({ id, label, index }) => (
          <button
            key={id}
            onClick={() => handleClick(id)}
            className={`relative flex flex-col items-start px-5 py-2 rounded-lg transition-all duration-200 min-w-[100px]
              ${active === id
                ? 'bg-white border border-slate-200 shadow-sm'
                : 'hover:bg-slate-100 border border-transparent'
              }`}
          >
            <span className={`text-[13px] font-semibold tracking-wide ${active === id ? 'text-slate-900' : 'text-slate-400'}`}>
              {label}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">{index}</span>
            {active === id && (
              <span className="absolute top-2.5 right-3 w-1.5 h-1.5 rounded-full bg-indigo-400" />
            )}
          </button>
        ))}
      </div>

    </div>
  );
}
