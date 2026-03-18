import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from 'recharts';

function getMarketState() {
  const now  = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= 540 && mins < 555)
    return { label: 'Pre-Open',     dot: 'bg-amber-400',    badge: 'bg-amber-50 text-amber-700 border border-amber-200',          pulse: false };
  if (mins >= 555 && mins < 930)
    return { label: 'Market Open',  dot: 'bg-[#2d6a4f]',    badge: 'bg-[#eaf5ee] text-[#0f2318] border border-[#b5d8c5]',         pulse: true  };
  return       { label: 'Market Closed', dot: 'bg-rose-400', badge: 'bg-rose-50 text-rose-600 border border-rose-200',             pulse: false };
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f2318] text-white px-3 py-2 rounded-xl text-[11px] shadow-2xl border border-[#1e4030]">
      <p className="text-[#52a374] mb-0.5 font-medium">{label}</p>
      <p className="font-black text-[#8dd4aa] text-[13px]">{payload[0].value?.toLocaleString('en-IN')}</p>
    </div>
  );
};

export default function LiveMarketChart({ nseData, bseData, marketInfo }) {
  const [exchange, setExchange] = useState('NSE');
  const data  = exchange === 'NSE' ? nseData : bseData;
  const info  = marketInfo[exchange] ?? {};
  const state = getMarketState();
  const isUp  = info.change?.startsWith('+');
  const last  = data[data.length - 1]?.v ?? 0;
  const first = data[0]?.v ?? 0;
  const domain = [Math.floor(first * 0.998), Math.ceil(last * 1.002)];
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white rounded-2xl border border-[#e6ece6] p-4 flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-[#0f1f0f] tracking-tight">Live Market</span>
            <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${state.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${state.dot} ${state.pulse ? 'animate-pulse' : ''}`} />
              {state.label} · {timeStr}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-[32px] font-black text-[#0f1f0f] leading-none tracking-[-0.03em]">
              {last.toLocaleString('en-IN')}
            </span>
            <span className={`text-[12px] font-bold ${isUp ? 'text-[#1a5c38]' : 'text-rose-500'}`}>
              {info.changeAbs} ({info.change})
            </span>
          </div>
          <span className="text-[10px] text-[#a0b8a0] font-medium">
            {info.label} · Prev close {info.prev?.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 bg-[#f2f4f2] border border-[#e6ece6] rounded-xl">
            {['NSE', 'BSE'].map(ex => (
              <button
                key={ex}
                onClick={() => setExchange(ex)}
                className={`px-3.5 py-1.5 rounded-[10px] text-[11px] font-bold transition-all duration-150
                  ${exchange === ex
                    ? 'bg-[#0f2318] text-white shadow-sm'
                    : 'text-[#7a9a7a] hover:text-[#0f2318]'}`}
              >
                {ex}
              </button>
            ))}
          </div>
          <button className="w-7 h-7 rounded-full border border-[#e6ece6] flex items-center justify-center text-[#b0b8b0] hover:text-[#0f2318] hover:border-[#0f2318] transition-colors text-[12px]">
            ↗
          </button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={185}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="mktGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#2d6a4f" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#2d6a4f" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#f0f2f0" vertical={false} />
          <ReferenceLine y={info.prev} stroke="#c8d8c8" strokeDasharray="4 3" strokeWidth={1} />
          <XAxis
            dataKey="t"
            tick={{ fontSize: 9, fill: '#a0b8a0', fontWeight: 500 }}
            axisLine={false} tickLine={false} interval={3}
          />
          <YAxis
            domain={domain}
            tick={{ fontSize: 9, fill: '#a0b8a0', fontWeight: 500 }}
            axisLine={false} tickLine={false}
            tickFormatter={v => v.toLocaleString('en-IN')}
            width={62}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone" dataKey="v"
            stroke="#1a5c38" strokeWidth={2}
            fill="url(#mktGrad)" dot={false}
            activeDot={{ r: 4, fill: '#0f2318', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
