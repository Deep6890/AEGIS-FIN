import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

const MiniSparkline = ({ data, color }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data.map((v, i) => ({ v, i }))}>
      <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      <Tooltip content={() => null} />
    </LineChart>
  </ResponsiveContainer>
);

const SPARK_COLORS = ['#10b981', '#34d399', '#059669', '#6ee7b7'];

export default function PnLSummaryRow({ metrics = [] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, delta, up, spark }, idx) => (
          <div key={label} className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#8fa88f] uppercase tracking-wide">{label}</span>
              {up ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-rose-400" />}
            </div>
            <span className="text-[24px] font-extrabold text-[#0f1f0f] leading-none">{value}</span>
            <div className="h-[40px] w-full">
              <MiniSparkline data={spark} color={SPARK_COLORS[idx % SPARK_COLORS.length]} />
            </div>
            <div className="flex items-center justify-between mt-auto">
              <span className={`text-[11px] font-semibold ${up ? 'text-emerald-500' : 'text-rose-400'}`}>{delta}</span>
              <span className="text-[10px] text-[#8fa88f]">vs last qtr</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 transition-all rounded-xl text-[12px] font-medium text-emerald-700 border border-emerald-200 group">
          Full P&L Statement <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
