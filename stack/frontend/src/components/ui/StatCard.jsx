import React from "react";

export default function StatCard({ icon: Icon, label, value, sub, color = "orange", trend }) {
  const colors = {
    orange:  { bg: "bg-orange-50",  icon: "text-orange-500",  border: "border-orange-100" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-500", border: "border-emerald-100" },
    red:     { bg: "bg-red-50",     icon: "text-red-500",     border: "border-red-100"     },
    amber:   { bg: "bg-amber-50",   icon: "text-amber-500",   border: "border-amber-100"   },
    blue:    { bg: "bg-blue-50",    icon: "text-blue-500",    border: "border-blue-100"    },
  };
  const c = colors[color] || colors.orange;

  return (
    <div className={`card p-5 border ${c.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
            <Icon size={20} className={c.icon} />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <span className={`text-xs font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
          <span className="text-xs text-gray-400 ml-1">vs last period</span>
        </div>
      )}
    </div>
  );
}
