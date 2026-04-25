/**
 * Card — core building block for the bento grid system.
 * variant: "default" | "hover" | "interactive" | "yellow" | "green" | "dark" | "ink" | "glass"
 */
import React from "react";
import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";

const VARIANTS = {
  default:     "card",
  hover:       "card-hover",
  interactive: "card-interactive",
  yellow:      "card-yellow",
  green:       "card-green",
  dark:        "card-dark",
  ink:         "card-ink",
  glass:       "card-glass",
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

export function CardHeader({ label, title, action, actionIcon: ActionIcon = ArrowUpRight, className = "" }) {
  return (
    <div className={`flex items-start justify-between mb-3 ${className}`}>
      <div>
        {label && <p className="label mb-1">{label}</p>}
        {title && <p className="title-md">{title}</p>}
      </div>
      {action && (
        <button
          onClick={action}
          className="w-7 h-7 rounded-lg bg-[#F7F5F0] dark:bg-[#22252E]
                     flex items-center justify-center
                     hover:bg-[#E8C547]/15 dark:hover:bg-[#E8C547]/10
                     transition-colors duration-200"
        >
          <ActionIcon size={13} className="text-[#6B7280]" />
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
    <div className={`mt-4 pt-3 border-t border-[#E5E1D8]/60 dark:border-[#1F2128]/60 ${className}`}>
      {children}
    </div>
  );
}

/** KPI card — label + big number + optional trend + icon */
export function KpiCard({ label, value, sub, trend, icon: Icon, variant = "default", className = "" }) {
  const isLight = variant === "yellow";
  const isDark  = variant === "ink" || variant === "dark" || variant === "green";

  const textMuted = isLight
    ? "text-[#0D0D0D]/50"
    : isDark
      ? "text-white/50"
      : "text-[#9CA3AF]";

  const textMain = isLight
    ? "text-[#0D0D0D]"
    : isDark
      ? "text-white"
      : "text-[#0D0D0D] dark:text-[#E8E6E0]";

  return (
    <Card variant={variant} className={`p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={`label mb-2 ${textMuted}`}>{label}</p>
          <p className={`value-xl ${textMain}`}>{value ?? "—"}</p>
          {sub && <p className={`text-xs mt-1.5 ${textMuted}`}>{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
            ${isLight
              ? "bg-[#0D0D0D]/8"
              : isDark
                ? "bg-white/10"
                : "bg-[#E8C547]/10"
            }`}
          >
            <Icon size={18} className={
              isLight ? "text-[#0D0D0D]/60" : isDark ? "text-white/70" : "text-[#E8C547]"
            } />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1.5 mt-3 pt-3 border-t
          ${isLight ? "border-[#0D0D0D]/10" : isDark ? "border-white/10" : "border-[#E5E1D8]/60 dark:border-[#1F2128]/60"}`}
        >
          {trend >= 0 ? (
            <TrendingUp size={12} className="text-[#52B788]" />
          ) : (
            <TrendingDown size={12} className="text-red-400" />
          )}
          <span className={`text-xs font-semibold ${trend >= 0 ? "text-[#52B788]" : "text-red-400"}`}>
            {trend >= 0 ? "+" : ""}{Math.abs(trend).toFixed(1)}%
          </span>
          <span className={`text-xs ${textMuted}`}>vs last period</span>
        </div>
      )}
    </Card>
  );
}
