import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';

const DonutTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f2318] text-white px-3 py-2 rounded-xl text-[11px] shadow-2xl border border-[#1e4030]">
      <p className="font-bold text-[#8dd4aa]">{payload[0].name}</p>
      <p className="text-[#52a374] mt-0.5">{payload[0].value} high-risk co.</p>
    </div>
  );
};

const VixTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f2318] text-white px-2.5 py-1.5 rounded-lg text-[10px] shadow-2xl border border-[#1e4030]">
      <p className="text-[#52a374]">{label}</p>
      <p className="font-black text-[#8dd4aa]">{payload[0].value}</p>
    </div>
  );
};

function vixLabel(v) {
  if (v < 15) return { text: 'Low Volatility',  cls: 'bg-[#eaf5ee] text-[#0f2318] border-[#b5d8c5]' };
  if (v < 20) return { text: 'Moderate',         cls: 'bg-amber-50 text-amber-700 border-amber-200'  };
  if (v < 25) return { text: 'Elevated',          cls: 'bg-orange-50 text-orange-700 border-orange-200' };
  return             { text: 'High Volatility',   cls: 'bg-rose-50 text-rose-600 border-rose-200'    };
}

function SectorDonut({ data }) {
  const total     = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map(d => ({ name: d.sector, value: d.count, color: d.color }));

  return (
    <div className="flex-1 min-w-0 bg-[#0f2318] rounded-2xl border border-[#1e4030] p-5 flex flex-col gap-4">

      {/* Header */}
      <div>
        <span className="text-[12px] font-bold text-white tracking-tight">Sector Risk Distribution</span>
        <p className="text-[11px] text-[#52a374] mt-0.5 font-medium">High-risk companies by sector</p>
      </div>

      {/* Donut + legend */}
      <div className="flex items-center gap-5">

        {/* Donut */}
        <div className="relative shrink-0 w-[180px] h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%" cy="50%"
                innerRadius={56} outerRadius={82}
                paddingAngle={3} cornerRadius={4}
                dataKey="value" strokeWidth={0}
              >
                {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[28px] font-black text-white leading-none tracking-[-0.03em]">{total}</span>
            <span className="text-[9px] text-[#52a374] font-bold uppercase tracking-[0.1em] mt-0.5">High Risk</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 flex-1 min-w-0">
          {chartData.map(({ name, value, color }) => (
            <div key={name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[11px] text-[#a8c8b8] font-medium truncate">{name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-1 bg-[#1e4030] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(value / total) * 100}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-[11px] font-bold text-white w-4 text-right tabular-nums">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VixWidget({ current, sparkline }) {
  const lbl  = vixLabel(current);
  const prev = sparkline[sparkline.length - 2]?.v ?? current;
  const isUp = current > prev;

  return (
    <div className="flex-1 min-w-0 bg-[#0f2318] rounded-2xl border border-[#1e4030] p-5 flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[12px] font-bold text-white tracking-tight">India VIX</span>
          <p className="text-[11px] text-[#52a374] mt-0.5 font-medium">Volatility index</p>
        </div>
        <button className="w-7 h-7 rounded-full border border-[#2a5c44] flex items-center justify-center text-[#52a374] hover:text-white hover:border-white transition-colors text-[12px]">
          ↗
        </button>
      </div>

      {/* Big number */}
      <div className="flex items-baseline gap-2">
        <span className="text-[40px] font-black text-white leading-none tracking-[-0.03em]">
          {current}
        </span>
        <span className={`text-[12px] font-bold ${isUp ? 'text-rose-400' : 'text-[#52a374]'}`}>
          {isUp ? '▲' : '▼'} {Math.abs(current - prev).toFixed(1)}
        </span>
      </div>

      {/* Badge */}
      <span className={`self-start inline-flex text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${lbl.cls}`}>
        {lbl.text}
      </span>

      {/* Sparkline */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-[#52a374] uppercase tracking-[0.1em]">7-day trend</span>
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={sparkline} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="vixSpkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#2d6a4f" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#2d6a4f" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="d"
              tick={{ fontSize: 9, fill: '#3a7a58', fontWeight: 500 }}
              axisLine={false} tickLine={false}
            />
            <Area
              type="monotone" dataKey="v"
              stroke="#2d6a4f" strokeWidth={2}
              fill="url(#vixSpkGrad)" dot={false}
              activeDot={{ r: 3, fill: '#8dd4aa', strokeWidth: 0 }}
            />
            <Tooltip content={<VixTooltip />} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 7d Low / High */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#1e4030]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-[#3a7a58] uppercase tracking-[0.1em] font-bold">7d Low</span>
          <span className="text-[15px] font-black text-white tracking-tight">
            {Math.min(...sparkline.map(d => d.v))}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-[#3a7a58] uppercase tracking-[0.1em] font-bold">7d High</span>
          <span className="text-[15px] font-black text-white tracking-tight">
            {Math.max(...sparkline.map(d => d.v))}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RiskDistributionRow({ sectorRiskDonut, vixCurrent, vixSparkline }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <SectorDonut data={sectorRiskDonut} />
      <VixWidget current={vixCurrent} sparkline={vixSparkline} />
    </div>
  );
}
