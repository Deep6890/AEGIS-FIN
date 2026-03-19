import { ArrowRight, ShieldCheck, Activity, Scale, CreditCard } from 'lucide-react';

const ratioIcons = [Scale, ShieldCheck, Activity, CreditCard];
const statusColor = { Healthy: 'text-emerald-500 bg-emerald-50', Strong: 'text-emerald-600 bg-emerald-50', Good: 'text-emerald-500 bg-emerald-50', Safe: 'text-emerald-500 bg-emerald-50' };

export default function RatiosDebtRow({ data = {} }) {
  const { ratios = [], totalDebt = '', debtDelta = '', breakdown = [] } = data;
  return (
    <div className="flex flex-col lg:flex-row gap-5">
      <div className="w-full lg:w-[60%] bg-white rounded-3xl shadow-sm border border-emerald-100 p-6 flex flex-col min-h-[260px]">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-[15px] font-bold text-[#0f1f0f] tracking-tight flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" /> Key Financial Ratios
            </h3>
            <p className="text-[12px] text-emerald-400 mt-1">Health indicators from balance sheet</p>
          </div>
          <div className="px-2.5 py-1 bg-emerald-50 rounded-full text-[10px] uppercase font-semibold text-emerald-600 border border-emerald-200">FY 2024</div>
        </div>
        <div className="flex flex-col gap-4 flex-1 justify-center">
          {ratios.map(({ label, value, status, bar }, i) => {
            const Icon = ratioIcons[i] ?? Activity;
            return (
              <div key={label} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-emerald-600" />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#0f1f0f]">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-extrabold text-[#0f1f0f]">{value}</span>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${statusColor[status] ?? 'text-[#8fa88f] bg-[#f3f7f4]'}`}>{status}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-emerald-50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${bar}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-auto pt-4 border-t border-emerald-100 flex justify-end">
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 transition-all rounded-xl text-[12px] font-medium text-emerald-700 border border-emerald-200 group">
            Detailed Ratios <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <div className="w-full lg:w-[40%] bg-white rounded-3xl shadow-sm border border-emerald-100 p-6 flex flex-col min-h-[260px]">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-[15px] font-bold text-[#0f1f0f] tracking-tight flex items-center gap-2">
              <CreditCard size={16} className="text-emerald-500" /> Debt Overview
            </h3>
            <p className="text-[12px] text-emerald-400 mt-1">Total liabilities breakdown</p>
          </div>
        </div>
        <div className="flex flex-col gap-1 mb-4">
          <span className="text-[11px] text-[#8fa88f] uppercase font-medium tracking-wide">Total Debt</span>
          <span className="text-[32px] font-extrabold text-[#0f1f0f] leading-none">{totalDebt}</span>
          <span className="text-[11px] text-emerald-500 font-semibold mt-1">{debtDelta}</span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden flex mb-4">
          {breakdown.map((d, i) => (
            <div key={i} className={`h-full transition-all ${i === 0 ? 'bg-emerald-500' : 'bg-emerald-200'}`} style={{ width: `${d.pct}%` }} />
          ))}
        </div>
        <div className="flex flex-col gap-3 flex-1 justify-center">
          {breakdown.map(({ label, value, pct }, i) => (
            <div key={label} className="flex items-center justify-between p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-emerald-200'}`} />
                <span className="text-[12px] font-semibold text-[#0f1f0f]">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-[#0f1f0f]">{value}</span>
                <span className="text-[10px] text-emerald-500 font-semibold">{pct}%</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto pt-4 border-t border-emerald-100 flex justify-end">
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 transition-all rounded-xl text-[12px] font-medium text-emerald-700 border border-emerald-200 group">
            Debt Schedule <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
