import React from "react";

const COLORS = {
  orange:  { bg: "bg-orange-50 dark:bg-orange-950/40",  icon: "text-orange-500",  border: "border-orange-100 dark:border-orange-900/50",  val: "text-orange-600 dark:text-orange-400" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/40",icon: "text-emerald-500", border: "border-emerald-100 dark:border-emerald-900/50", val: "text-emerald-600 dark:text-emerald-400" },
  red:     { bg: "bg-red-50 dark:bg-red-950/40",        icon: "text-red-500",     border: "border-red-100 dark:border-red-900/50",         val: "text-red-600 dark:text-red-400" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-950/40",    icon: "text-amber-500",   border: "border-amber-100 dark:border-amber-900/50",     val: "text-amber-600 dark:text-amber-400" },
  blue:    { bg: "bg-blue-50 dark:bg-blue-950/40",      icon: "text-blue-500",    border: "border-blue-100 dark:border-blue-900/50",       val: "text-blue-600 dark:text-blue-400" },
};

export default function StatCard({ icon: Icon, label, value, sub, insight, color = "orange", trend }) {
  const c = COLORS[color] || COLORS.orange;
  return (
    <div className={`card p-4 sm:p-5 border ${c.border} flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="stat-label truncate">{label}</p>
          <p className={`text-xl sm:text-2xl font-bold mt-1 ${c.val}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
            <Icon size={18} className={c.icon} />
          </div>
        )}
      </div>
      {insight && (
        <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed border-t border-gray-50 dark:border-[#1a1a1a] pt-2">{insight}</p>
      )}
      {trend !== undefined && (
        <div className="flex items-center gap-1 border-t border-gray-50 dark:border-[#1a1a1a] pt-2">
          <span className={`text-xs font-semibold ${trend >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
          <span className="text-xs text-gray-400">vs last period</span>
        </div>
      )}
    </div>
  );
}
