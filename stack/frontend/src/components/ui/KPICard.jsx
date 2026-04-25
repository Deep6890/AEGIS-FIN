import React, { useEffect, useState } from "react";

const VARIANTS = {
  default:  { card: "card", icon: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400", value: "text-neutral-900 dark:text-neutral-100" },
  healthy:  { card: "card", icon: "bg-green-50  dark:bg-green-950/30  text-green-600  dark:text-green-400",  value: "score-healthy" },
  watch:    { card: "card", icon: "bg-amber-50  dark:bg-amber-950/30  text-amber-600  dark:text-amber-400",  value: "score-watch"   },
  distress: { card: "card", icon: "bg-red-50    dark:bg-red-950/30    text-red-600    dark:text-red-400",    value: "score-distress"},
  dark:     { card: "card-dark text-white", icon: "bg-white/10 text-yellow-400", value: "text-yellow-400" },
};

function useCountUp(target, duration = 600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const n = parseFloat(target);
    if (isNaN(n)) { setVal(target); return; }
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(n * eased * 10) / 10);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

export default function KPICard({ label, value, trend, icon: Icon, variant = "default", subtitle }) {
  const v   = VARIANTS[variant] || VARIANTS.default;
  const num = useCountUp(value);
  const display = typeof value === "number" ? num : value;

  return (
    <div className={`${v.card} p-5 transition-all duration-150 hover:shadow-card-md hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between">
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${v.icon}`}>
            <Icon size={16} />
          </div>
        )}
        {trend !== undefined && (
          <span className={`text-xs font-medium tabular-nums ${trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="label-caps mt-3 mb-1">{label}</p>
      <p className={`number-display tabular-nums ${v.value}`}>{display ?? "—"}</p>
      {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
    </div>
  );
}
