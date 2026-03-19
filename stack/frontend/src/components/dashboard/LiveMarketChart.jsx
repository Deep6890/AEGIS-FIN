import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

function DirectionMatrix({ isNse }) {
  return (
    <div className="w-full h-full flex justify-between flex-col bg-[#2d6a4f] rounded-2xl p-6 text-white shadow-sm relative overflow-hidden">
      {/* Decorative premium elements */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#2d6a4f] opacity-20 blur-[70px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-600 opacity-20 blur-[60px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-bold text-white tracking-tight flex items-center gap-2">
            <Activity size={16} className="text-emerald-400" /> Direction Matrix
          </h3>
          <p className="text-[12px] text-[#8fa88f] mt-1 pr-6">{isNse ? 'NSE' : 'BSE'} Market Breadth & Sentiment Analysis</p>
        </div>
        <div className="px-2.5 py-1 bg-white/5 rounded-full text-[10px] uppercase tracking-wider font-semibold text-white/90 border border-white/10 backdrop-blur-md">Live</div>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-3 flex-1 mb-5">
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 backdrop-blur-sm flex flex-col justify-center transition-all hover:bg-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp size={13} className="text-emerald-400" />
            </div>
            <span className="text-[12px] font-medium text-white/70">Advances</span>
          </div>
          <span className="text-3xl font-extrabold text-white tracking-tighter">{isNse ? '1,424' : '2,105'}</span>
        </div>
        
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 backdrop-blur-sm flex flex-col justify-center transition-all hover:bg-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <TrendingDown size={13} className="text-rose-400" />
            </div>
            <span className="text-[12px] font-medium text-white/70">Declines</span>
          </div>
          <span className="text-3xl font-extrabold text-white tracking-tighter">{isNse ? '642' : '1,280'}</span>
        </div>
        
        <div className="bg-white/[0.03] rounded-xl px-4 py-3 border border-white/5 backdrop-blur-sm flex justify-between items-center transition-all hover:bg-white/[0.06]">
          <span className="text-[12px] font-medium text-white/70">52W Highs</span>
          <span className="text-[15px] font-bold text-emerald-400 flex items-center gap-1"><ArrowUpRight size={14} strokeWidth={2.5}/>{isNse ? '84' : '124'}</span>
        </div>
        
        <div className="bg-white/[0.03] rounded-xl px-4 py-3 border border-white/5 backdrop-blur-sm flex justify-between items-center transition-all hover:bg-white/[0.06]">
          <span className="text-[12px] font-medium text-white/70">52W Lows</span>
          <span className="text-[15px] font-bold text-rose-400 flex items-center gap-1"><ArrowDownRight size={14} strokeWidth={2.5}/>{isNse ? '12' : '29'}</span>
        </div>
      </div>
      
      <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
        <span className="text-[12px] font-medium text-[#8fa88f]">Overall Market Sentiment</span>
        <span className="text-[12px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 rounded-lg flex items-center gap-1.5 ">
          Bullish <Activity size={12}/>
        </span>
      </div>
    </div>
  );
}

function getMarketState() {
  const now  = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= 540 && mins < 555)
    return { label: 'Pre-Open',    dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-600',       pulse: false };
  if (mins >= 555 && mins < 930)
    return { label: 'Market Open', dot: 'bg-[#2d6a4f]', badge: 'bg-[#edf7f2] text-[#2d6a4f]',     pulse: true  };
  return       { label: 'Closed',  dot: 'bg-rose-400',  badge: 'bg-rose-50 text-rose-500',          pulse: false };
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1f0f] text-white px-3 py-2 rounded-2xl text-[11px] shadow-xl">
      <p className="text-[#8fa88f] mb-0.5">{label}</p>
      <p className="font-semibold text-white">{payload[0].value?.toLocaleString('en-IN')}</p>
    </div>
  );
};

export default function LiveMarketChart({ nseData, bseData, marketInfo }) {
  const [exchange, setExchange] = useState('NSE');
  const data   = exchange === 'NSE' ? nseData : bseData;
  const info   = marketInfo[exchange] ?? {};
  const state  = getMarketState();
  const isUp   = info.change?.startsWith('+');
  const last   = data[data.length - 1]?.v ?? 0;
  const first  = data[0]?.v ?? 0;
  const domain = [Math.floor(first * 0.998), Math.ceil(last * 1.002)];
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white rounded-3xl shadow-sm p-5 flex flex-col lg:flex-row gap-6">

      {/* 60% Width for Chart */}
      <div className="flex-1 lg:w-[60%] flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[#0f1f0f]">Live Market</span>
              <span className={`flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-0.5 rounded-full ${state.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${state.dot} ${state.pulse ? 'animate-pulse' : ''}`} />
                {state.label} · {timeStr}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[32px] font-bold text-[#0f1f0f] leading-none tracking-tight">
                {last.toLocaleString('en-IN')}
              </span>
              <span className={`text-[13px] font-semibold ${isUp ? 'text-[#2d6a4f]' : 'text-rose-500'}`}>
                {info.changeAbs} ({info.change})
              </span>
            </div>
            <span className="text-[11px] text-[#a0b8a0]">
              {info.label} · Prev close {info.prev?.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex items-center gap-0.5 p-1 bg-[#f3f7f4] rounded-2xl">
            {['NSE', 'BSE'].map(ex => (
              <button
                key={ex}
                onClick={() => setExchange(ex)}
                className={`px-4 py-1.5 rounded-xl text-[11px] font-medium transition-all
                  ${exchange === ex
                    ? 'bg-white text-[#0f1f0f] shadow-sm'
                    : 'text-[#8fa88f] hover:text-[#0f1f0f]'}`}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 12, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mktGradPremium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#2d6a4f" stopOpacity={0.6} />
                <stop offset="40%"  stopColor="#2d6a4f" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#2d6a4f" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke="#f0f4f0" vertical={false} />
            <ReferenceLine y={info.prev} stroke="#d4e8d8" strokeDasharray="4 4" strokeWidth={1} />
            <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#b0c8b0' }} axisLine={false} tickLine={false} interval={3} />
            <YAxis domain={domain} tick={{ fontSize: 9, fill: '#b0c8b0' }} axisLine={false} tickLine={false} tickFormatter={v => v.toLocaleString('en-IN')} width={60} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="v" stroke="#2d6a4f" strokeWidth={3} fill="url(#mktGradPremium)" dot={false} activeDot={{ r: 5, fill: '#2d6a4f', strokeWidth: 2, stroke: '#fff' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 40% Width for Direction Matrix */}
      <div className="w-full lg:w-[40%] flex min-h-[280px]">
         <DirectionMatrix isNse={exchange === 'NSE'} />
      </div>
    </div>
  );
}
