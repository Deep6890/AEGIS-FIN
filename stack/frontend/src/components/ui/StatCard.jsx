import React from "react";

export default function StatCard({ icon: Icon, label, value, sub, insight, color = "default", trend }) {
  const iconBg = {
    orange:  "bg-brand-orange/10 text-brand-orange",
    emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
    red:     "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400",
    amber:   "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
    blue:    "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
    default: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400",
  }[color] || "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400";

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon size={17} />
          </div>
        )}
      </div>
      <p className="label-caps mb-1">{label}</p>
      <p className="value-lg text-neutral-900 dark:text-neutral-100">{value ?? "—"}</p>
      {(sub || insight) && <p className="text-xs text-neutral-500 mt-1">{sub || insight}</p>}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <span className={`text-xs font-semibold ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
          <span className="text-xs text-neutral-400">vs last period</span>
        </div>
      )}
    </div>
  );
}
