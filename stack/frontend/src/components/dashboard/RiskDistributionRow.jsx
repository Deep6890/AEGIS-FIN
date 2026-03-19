import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis } from 'recharts';

const DonutTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1f0f] text-white px-3 py-2 rounded-xl text-[11px] shadow-xl border border-white/10 backdrop-blur-md">
      <p className="font-semibold text-white/90">{payload[0].name}</p>
      <p className="text-[#8fa88f] mt-0.5"><span className="text-emerald-400 font-bold">{payload[0].value}</span> high-risk</p>
    </div>
  );
};

const VixTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1f0f] text-white px-3 py-2 rounded-xl text-[11px] shadow-xl border border-[#2d6a4f]/30">
      <p className="text-[#8fa88f] mb-0.5">{label}</p>
      <p className="font-bold text-white tracking-tight">{payload[0].value}</p>
    </div>
  );
};

function vixLabel(v) {
  if (v < 15) return { text: 'Low Volatility', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  if (v < 20) return { text: 'Moderate',        cls: 'bg-amber-50 text-amber-600 border-amber-100'   };
  if (v < 25) return { text: 'Elevated',         cls: 'bg-orange-50 text-orange-600 border-orange-100' };
  return             { text: 'High Volatility',  cls: 'bg-rose-50 text-rose-500 border-rose-100'    };
}

const CALM_GREENS = [
  '#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7', '#d8f3dc', '#1b4332'
];

function SectorDonut({ data }) {
  const total     = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map((d, i) => ({ 
    name: d.sector, 
    value: d.count, 
    color: CALM_GREENS[i % CALM_GREENS.length] 
  }));

  return (
    <div className="w-full h-full bg-[#2d6a4f] rounded-3xl shadow-sm p-6 flex flex-col relative overflow-hidden">
      <div className="absolute -top-16 -left-16 w-56 h-56 bg-[#2d6a4f] opacity-20 blur-[70px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-600 opacity-20 blur-[60px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 mb-5">
        <h3 className="text-[15px] font-bold text-white tracking-tight">Sector Risk Dist.</h3>
        <p className="text-[12px] text-[#8fa88f] mt-1">High-risk companies overview</p>
      </div>

      <div className="relative z-10 flex flex-col xl:flex-row items-center gap-6 flex-1 justify-center">
        {/* Donut */}
        <div className="relative shrink-0 w-[140px] h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%" cy="50%"
                innerRadius={48} outerRadius={70}
                paddingAngle={4} cornerRadius={6}
                dataKey="value" strokeWidth={0}
              >
                {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[28px] font-bold text-white leading-none tracking-tight">{total}</span>
            <span className="text-[10px] uppercase tracking-wider text-white/50 mt-1">Risks</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3 w-full xl:flex-1 min-w-0">
          {chartData.map(({ name, value, color }) => (
            <div key={name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                <span className="text-[11.5px] font-medium text-white/80 truncate">{name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(value / total) * 100}%`, backgroundColor: color }} />
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
    <div className="w-full h-full min-w-0 bg-white rounded-3xl shadow-sm p-6 flex flex-col justify-between">

      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-[14px] font-bold text-[#0f1f0f] tracking-tight">India VIX</span>
          <p className="text-[12px] text-[#a0b8a0] mt-0.5">Market Volatility Index</p>
        </div>
        <span className={`text-[11px] font-semibold px-3 border py-1 rounded-full ${lbl.cls}`}>
          {lbl.text}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[44px] font-extrabold text-[#0f1f0f] leading-none tracking-tight">
          {current}
        </span>
        <span className={`text-[13px] font-semibold ${isUp ? 'text-rose-500' : 'text-[#2d6a4f]'}`}>
          {isUp ? '▲' : '▼'} {Math.abs(current - prev).toFixed(1)}
        </span>
      </div>

      {/* Sparkline */}
      <div className="flex flex-col gap-2 flex-1 mt-2">
        <span className="text-[11px] font-medium text-[#a0b8a0]">7-day statistical trend</span>
        <ResponsiveContainer width="100%" height="100%" minHeight={120}>
          <AreaChart data={sparkline} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="vixGradPremium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#2d6a4f" stopOpacity={0.6} />
                <stop offset="40%"  stopColor="#2d6a4f" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#2d6a4f" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="d" tick={{ fontSize: 9, fill: '#b0c8b0' }} axisLine={false} tickLine={false} />
            <Area type="monotone" dataKey="v" stroke="#2d6a4f" strokeWidth={3} fill="url(#vixGradPremium)" dot={false} activeDot={{ r: 5, fill: '#2d6a4f', strokeWidth: 2, stroke: '#fff' }} />
            <Tooltip content={<VixTooltip />} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Low / High */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#f0f4f0] mt-3">
        <div>
          <span className="text-[10px] text-[#a0b8a0] font-medium uppercase tracking-wider">7d Low</span>
          <p className="text-[16px] font-bold text-[#0f1f0f] mt-1">{Math.min(...sparkline.map(d => d.v))}</p>
        </div>
        <div>
          <span className="text-[10px] text-[#a0b8a0] font-medium uppercase tracking-wider">7d High</span>
          <p className="text-[16px] font-bold text-[#0f1f0f] mt-1">{Math.max(...sparkline.map(d => d.v))}</p>
        </div>
      </div>
    </div>
  );
}

export default function RiskDistributionRow({ sectorRiskDonut, vixCurrent, vixSparkline }) {
  return (
    <div className="flex flex-col lg:flex-row gap-5">
      <div className="w-full lg:w-[40%] flex min-h-[300px]">
        <SectorDonut data={sectorRiskDonut} />
      </div>
      <div className="w-full lg:w-[60%] flex min-h-[300px]">
        <VixWidget current={vixCurrent} sparkline={vixSparkline} />
      </div>
    </div>
  );
}
