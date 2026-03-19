import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, TrendingUp, Landmark, Wallet, BarChart3, ArrowUpRight } from 'lucide-react';

const breakdownIcons = [Landmark, Wallet, BarChart3];

const AssetsTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white text-[#0f1f0f] px-3 py-2 rounded-xl text-[11px] shadow-xl border border-emerald-100">
      <p className="font-semibold text-emerald-600">{payload[0].payload.month}</p>
      <p className="text-[#4a6a4a] mt-0.5">₹{payload[0].value} Cr</p>
    </div>
  );
};

export default function TotalAssetsRow({ data = {} }) {
  const { total = '₹7,780 Cr', delta = '+14.2%', deltaLabel = 'vs last year', trend = [], breakdown = [], netWorth = '₹3,210 Cr' } = data;
  return (
    <div className="flex flex-col lg:flex-row gap-5">

      {/* LEFT: Total Assets Trend */}
      <div className="w-full lg:w-[55%] flex min-h-[280px]">
        <div className="w-full h-full bg-white rounded-3xl shadow-sm p-6 flex flex-col border border-emerald-100">

          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-[15px] font-bold text-[#0f1f0f] tracking-tight flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" /> Total Assets
              </h3>
              <p className="text-[12px] text-emerald-400 mt-1">Balance sheet asset growth trend</p>
            </div>
            <div className="px-2.5 py-1 bg-emerald-50 rounded-full text-[10px] uppercase font-semibold text-emerald-600 border border-emerald-200">
              FY 2024
            </div>
          </div>

          <div className="mb-3">
            <span className="text-[36px] font-extrabold text-[#0f1f0f] leading-none tracking-tight">{total}</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[12px] font-semibold text-emerald-500">{delta}</span>
              <span className="text-[12px] text-[#8fa88f]">{deltaLabel}</span>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="assetsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8fa88f', fontWeight: 500 }} />
                <YAxis hide />
                <Tooltip content={<AssetsTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#assetsGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-auto pt-4 border-t border-emerald-100 flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 transition-all rounded-xl text-[12px] font-medium text-emerald-700 border border-emerald-200 group">
              View Balance Sheet <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Balance Sheet Breakdown */}
      <div className="w-full lg:w-[45%] flex min-h-[280px]">
        <div className="w-full h-full bg-white rounded-3xl shadow-sm p-6 flex flex-col border border-emerald-100">

          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-[15px] font-bold text-[#0f1f0f] tracking-tight flex items-center gap-2">
                <Landmark size={16} className="text-emerald-500" /> Asset Breakdown
              </h3>
              <p className="text-[12px] text-emerald-400 mt-1">Balance sheet composition</p>
            </div>
            <div className="px-2.5 py-1 bg-emerald-50 rounded-full text-[10px] uppercase font-semibold text-emerald-600 border border-emerald-200">
              Q4 FY24
            </div>
          </div>

          <div className="flex flex-col gap-4 flex-1 justify-center">
            {breakdown.map(({ label, value, share }, i) => {
              const Icon = breakdownIcons[i] ?? Landmark;
                return (
              <div key={label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <Icon size={13} className="text-emerald-600" />
                    </div>
                    <span className="text-[12px] font-semibold text-[#0f1f0f]">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-[#0f1f0f]">{value}</span>
                    <span className="text-[10px] text-emerald-500 font-semibold">{share}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-emerald-50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${share}%` }} />
                </div>
              </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-emerald-500 uppercase font-semibold tracking-wide">Net Worth / Equity</p>
              <p className="text-[16px] font-extrabold text-[#0f1f0f] mt-0.5">{netWorth}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-white border border-emerald-200 flex items-center justify-center shadow-sm">
              <ArrowUpRight size={15} className="text-emerald-600" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-emerald-100 flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 transition-all rounded-xl text-[12px] font-medium text-emerald-700 border border-emerald-200 group">
              Full Report <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
