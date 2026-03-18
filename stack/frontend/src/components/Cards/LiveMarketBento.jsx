import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Radio } from 'lucide-react';

// Minimal sparkline SVG — no library needed
function Sparkline({ isUp }) {
  const upPath  = 'M0,38 C20,32 35,20 55,22 S85,10 110,8 S145,14 180,4';
  const downPath= 'M0,8  C20,14 35,26 55,24 S85,36 110,38 S145,30 180,42';
  const color   = isUp ? '#818cf8' : '#94a3b8';
  return (
    <svg viewBox="0 0 180 50" className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path d={isUp ? upPath : downPath} fill="none" stroke="url(#spkGrad)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function LiveMarketBento({ onChange, marketMeta = {} }) {
  const [active, setActive] = useState('NSE');
  const markets = [
    { id: 'NSE', label: 'NSE', sub: 'Nifty 50' },
    { id: 'BSE', label: 'BSE', sub: 'Sensex' },
  ];

  const handleClick = (id) => { setActive(id); onChange?.(id); };
  const meta = marketMeta[active] ?? {};
  const isUp = meta.change?.startsWith('+');

  return (
    <div className="relative w-full bg-[#0f1117] rounded-2xl p-5 flex flex-col justify-between overflow-hidden border border-slate-800 min-h-[200px]">

      {/* glow */}
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-indigo-600 rounded-full blur-[80px] opacity-15 pointer-events-none" />

      {/* live dot + label */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
          </span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Live Market</span>
        </div>
        <Radio size={13} className="text-slate-600" />
      </div>

      {/* value */}
      <div className="relative z-10 flex flex-col gap-1 mt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-[32px] font-black text-white tracking-tighter leading-none">{meta.value ?? '—'}</span>
          <span className={`flex items-center gap-0.5 text-[13px] font-bold ${isUp ? 'text-indigo-400' : 'text-slate-400'}`}>
            {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {meta.change ?? '—'}
          </span>
        </div>
        <span className="text-[11px] text-slate-500">{meta.index} · {meta.status}</span>
      </div>

      {/* sparkline */}
      <div className="relative z-10 mt-3 opacity-60">
        <Sparkline isUp={isUp} />
      </div>

      {/* switcher */}
      <div className="relative z-10 flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mt-3 w-fit">
        {markets.map(({ id, label, sub }) => (
          <button
            key={id}
            onClick={() => handleClick(id)}
            className={`flex flex-col items-start px-4 py-1.5 rounded-lg transition-all duration-200 min-w-[80px]
              ${active === id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span className="text-[12px] font-bold">{label}</span>
            <span className="text-[9px] text-slate-600">{sub}</span>
          </button>
        ))}
      </div>

    </div>
  );
}
