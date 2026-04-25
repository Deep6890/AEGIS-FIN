/**
 * Card — core building block.
 * variant: "default" | "yellow" | "green" | "dark" | "ink"
 */
import React from "react";
import { ArrowUpRight } from "lucide-react";

const VARIANTS = {
  default: "card",
  hover:   "card-hover",
  yellow:  "card-yellow",
  green:   "card-green",
  dark:    "card-dark",
  ink:     "card-ink",
};

export function Card({ variant = "default", className = "", children, onClick }) {
  const base = VARIANTS[variant] || VARIANTS.default;
  return (
    <div
      className={`${base} ${className} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ label, title, action, className = "" }) {
  return (
    <div className={`flex items-start justify-between mb-3 ${className}`}>
      <div>
        {label && <p className="label mb-0.5">{label}</p>}
        {title && <p className="title-md">{title}</p>}
      </div>
      {action && (
        <button className="w-7 h-7 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
          <ArrowUpRight size={13} />
        </button>
      )}
    </div>
  );
}

export function CardContent({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ className = "", children }) {
  return (
    <div className={`mt-3 pt-3 border-t border-[#E5E1D8] dark:border-[#1F2128] ${className}`}>
      {children}
    </div>
  );
}

/** KPI card — label + big number + optional trend */
export function KpiCard({ label, value, sub, trend, icon: Icon, variant = "default", className = "" }) {
  const isLight = variant === "yellow";
  const textMuted = isLight ? "text-[#0D0D0D]/60" : "text-[#6B7280]";
  const textMain  = isLight ? "text-[#0D0D0D]"    : "text-[#0D0D0D] dark:text-[#E8E6E0]";

  return (
    <Card variant={variant} className={`p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={`label mb-2 ${textMuted}`}>{label}</p>
          <p className={`value-xl ${textMain}`}>{value ?? "—"}</p>
          {sub && <p className={`text-xs mt-1 ${textMuted}`}>{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isLight ? "bg-black/10" : "bg-[#E8C547]/15"}`}>
            <Icon size={16} className={isLight ? "text-[#0D0D0D]" : "text-[#E8C547]"} />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-black/10 dark:border-white/10">
          <span className={`text-xs font-semibold ${trend >= 0 ? "text-[#52B788]" : "text-red-500"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
          <span className={`text-xs ${textMuted}`}>vs last period</span>
        </div>
      )}
    </Card>
  );
}
