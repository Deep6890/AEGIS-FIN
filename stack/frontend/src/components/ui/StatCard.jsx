import React from "react";

const VARIANTS = {
  yellow:  { wrap: "bento-yellow", icon: "bg-black/10 text-black", val: "text-black", label: "text-black/60" },
  green:   { wrap: "bento-green",  icon: "bg-white/10 text-white", val: "text-white", label: "text-white/60" },
  black:   { wrap: "bento-black",  icon: "bg-white/10 text-white", val: "text-white", label: "text-white/60" },
  white:   { wrap: "bento-white",  icon: "bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400", val: "text-black dark:text-white", label: "text-gray-400" },
  orange:  { wrap: "bento-white",  icon: "bg-[#FF8A00]/10 text-[#FF8A00]", val: "text-black dark:text-white", label: "text-gray-400" },
  emerald: { wrap: "bento-white",  icon: "bg-[#00B341]/10 text-[#00B341]", val: "text-black dark:text-white", label: "text-gray-400" },
  red:     { wrap: "bento-white",  icon: "bg-red-50 dark:bg-red-950/30 text-red-500", val: "text-black dark:text-white", label: "text-gray-400" },
  amber:   { wrap: "bento-white",  icon: "bg-[#FFC224]/15 text-[#b38a00] dark:text-[#FFC224]", val: "text-black dark:text-white", label: "text-gray-400" },
  blue:    { wrap: "bento-white",  icon: "bg-blue-50 dark:bg-blue-950/30 text-blue-500", val: "text-black dark:text-white", label: "text-gray-400" },
};

export default function StatCard({ icon: Icon, label, value, sub, insight, color = "white", trend }) {
  const v = VARIANTS[color] || VARIANTS.white;
  return (
    <div className={`${v.wrap} flex flex-col gap-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${v.label}`}>{label}</p>
          <p className={`text-2xl font-black leading-none ${v.val}`}>{value ?? "—"}</p>
          {sub && <p className={`text-xs mt-1 ${v.label}`}>{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${v.icon}`}>
            <Icon size={17} />
          </div>
        )}
      </div>
      {insight && (
        <p className={`text-xs leading-relaxed border-t border-black/10 dark:border-white/10 pt-2 ${v.label}`}>{insight}</p>
      )}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 border-t border-black/10 dark:border-white/10 pt-2`}>
          <span className={`text-xs font-bold ${trend >= 0 ? "text-[#00B341]" : "text-red-500"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
          <span className={`text-xs ${v.label}`}>vs last period</span>
        </div>
      )}
    </div>
  );
}
