import { Activity, Building2, Wind, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const iconMap = {
  companies: { icon: Building2 },
  alerts: { icon: Activity },
  watch: { icon: Wind },
};

const tagStyle = {
  Monitored: 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]',
  Critical: 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]',
  Caution: 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]',
};

const DeltaIcon = ({ delta }) => {
  if (!delta) return null;
  if (delta.startsWith('+')) return <TrendingUp size={12} className="text-[#16a34a]" />;
  if (delta.startsWith('-')) return <TrendingDown size={12} className="text-[#16a34a]" />;
  return <Minus size={12} className="text-slate-400" />;
};

export default function HighHeaders({ id, name, tagline, points, delta, sub, tagScore }) {
  const entry = iconMap[id] ?? { icon: Activity };
  const Icon = entry.icon;
  const badge = tagStyle[tagScore] ?? 'bg-slate-100 text-slate-500 border-slate-200';

  return (
    <div className="w-full bg-[#2d6a4f] rounded-2xl p-5 flex flex-col gap-4 border border-[#2d6a4f] shadow-sm hover:shadow-md transition-shadow duration-200">

      {/* Top */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
            <Icon size={16} className="text-slate-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-slate-800 leading-tight">{name}</span>
            <span className="text-[11px] text-slate-400 mt-0.5">{tagline}</span>
          </div>
        </div>
        <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full border ${badge}`}>{tagScore}</span>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* Bottom */}
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[36px] font-bold text-slate-900 leading-none tracking-tight">{points}</span>
          <span className="text-[12px] text-slate-400 mb-1">units</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <DeltaIcon delta={delta} />
            <span className="text-[13px] font-semibold text-slate-700">{delta}</span>
          </div>
          <span className="text-[10px] text-slate-400">{sub}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#16a34a] transition-all duration-700"
          style={{ width: `${Math.min(points, 100)}%` }}
        />
      </div>

    </div>
  );
}
