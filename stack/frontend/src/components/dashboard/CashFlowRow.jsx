import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowRight, ArrowDownLeft, ArrowUpRight, Banknote, RefreshCw } from 'lucide-react';

const summaryIcons = [RefreshCw, ArrowUpRight, ArrowDownLeft, Banknote];

const CashTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-xl text-[11px] shadow-xl border border-emerald-100">
      <p className="font-semibold text-[#0f1f0f] mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name === 'inflow' ? '↑' : '↓'} ₹{p.value} Cr
        </p>
      ))}
    </div>
  );
};

export default function CashFlowRow({ data = {} }) {
  const { quarterly = [], summary = [] } = data;
  return (
    <div className="flex flex-col lg:flex-row gap-5">
      <div className="w-full lg:w-[55%] bg-white rounded-3xl shadow-sm border border-emerald-100 p-6 flex flex-col min-h-[260px]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-[#0f1f0f] tracking-tight flex items-center gap-2">
              <Banknote size={16} className="text-emerald-500" /> Cash Flow
            </h3>
            <p className="text-[12px] text-emerald-400 mt-1">Quarterly inflow vs outflow</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold">
            <span className="flex items-center gap-1 text-emerald-500"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" /> Inflow</span>
            <span className="flex items-center gap-1 text-[#8fa88f]"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 inline-block" /> Outflow</span>
          </div>
        </div>
        <div className="flex-1 min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={quarterly} barCategoryGap="30%" barGap={4} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <XAxis dataKey="qtr" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8fa88f', fontWeight: 600 }} />
              <YAxis hide />
              <Tooltip content={<CashTooltip />} cursor={{ fill: 'rgba(16,185,129,0.04)' }} />
              <Bar dataKey="inflow"  fill="#10b981" radius={[5, 5, 0, 0]} barSize={22} />
              <Bar dataKey="outflow" fill="#d1fae5" radius={[5, 5, 0, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="w-full lg:w-[45%] grid grid-cols-2 gap-4 content-start">
        {summary.map(({ label, value, up }, i) => {
          const Icon = summaryIcons[i] ?? Banknote;
          return (
            <div key={label} className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-4 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Icon size={14} className="text-emerald-600" />
              </div>
              <span className="text-[11px] text-[#8fa88f] font-medium">{label}</span>
              <span className={`text-[18px] font-extrabold leading-none ${up ? 'text-[#0f1f0f]' : 'text-rose-500'}`}>{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
