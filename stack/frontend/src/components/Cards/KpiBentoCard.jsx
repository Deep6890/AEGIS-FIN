import { Building2, Activity, Wind, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const iconMap = {
  companies: { icon: Building2, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  alerts:    { icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  watch:     { icon: Wind, color: 'text-sky-500', bg: 'bg-sky-500/10' },
};

export default function KpiBentoCard({ id, name, tagline, points, delta, sub, tagScore, className }) {
  const entry = iconMap[id] ?? { icon: Activity, color: 'text-slate-500', bg: 'bg-slate-500/10' };
  const Icon = entry.icon;

  const isPositive = delta?.startsWith('+');
  const isNegative = delta?.startsWith('-');

  return (
    <div 
      className={cn(
        "relative group w-full bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden",
        className
      )}
    >
      {/* Soft background glow based on entry color, visible roughly on hover */}
      <div className={cn("absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-40 transition-opacity duration-700", entry.bg)} />

      {/* Header section */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", entry.bg)}>
            <Icon size={18} className={entry.color} />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-slate-800 tracking-tight">{name}</span>
            <span className="text-[12px] font-medium text-slate-500">{tagline}</span>
          </div>
        </div>

        {/* Status Tag */}
        {tagScore && (
          <div className="px-3 py-1 bg-white/80 border border-slate-100 rounded-full text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur-sm">
            {tagScore}
          </div>
        )}
      </div>

      {/* Main Metric section */}
      <div className="relative z-10 flex flex-col gap-1 mt-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-slate-900 tracking-tighter">{points}</span>
          <span className="text-[13px] font-medium text-slate-500 tracking-wide uppercase">Total</span>
        </div>
        
        <div className="flex flex-col gap-1 mt-2">
          <div className="flex items-center gap-1.5">
            <span 
              className={cn(
                "flex items-center gap-0.5 text-[13px] font-bold px-1.5 py-0.5 rounded-lg",
                isPositive && "text-emerald-600 bg-emerald-50",
                isNegative && "text-rose-600 bg-rose-50",
                !isPositive && !isNegative && "text-slate-600 bg-slate-50"
              )}
            >
              {isPositive ? <TrendingUp size={14} /> : isNegative ? <TrendingDown size={14} /> : <Minus size={14} />}
              {delta || '—'}
            </span>
            <span className="text-[12px] text-slate-400 font-medium">{sub}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
