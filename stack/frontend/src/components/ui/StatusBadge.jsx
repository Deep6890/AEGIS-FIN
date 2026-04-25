import React from "react";

const MAP = {
  healthy:  { cls: "badge-green",  dot: "bg-green-500",  label: "Healthy",  pulse: false },
  watch:    { cls: "badge-amber",  dot: "bg-amber-500",  label: "Watch",    pulse: false },
  distress: { cls: "badge-red",    dot: "bg-red-500",    label: "Distress", pulse: true  },
  green:    { cls: "badge-green",  dot: "bg-green-500",  label: "Healthy",  pulse: false },
  amber:    { cls: "badge-amber",  dot: "bg-amber-500",  label: "Watch",    pulse: false },
  red:      { cls: "badge-red",    dot: "bg-red-500",    label: "Distress", pulse: true  },
  gray:     { cls: "badge-gray",   dot: "bg-neutral-400",label: "—",        pulse: false },
  STRONG:   { cls: "badge-green",  dot: "bg-green-500",  label: "Strong",   pulse: false },
  NEUTRAL:  { cls: "badge-gray",   dot: "bg-neutral-400",label: "Neutral",  pulse: false },
  WATCH:    { cls: "badge-amber",  dot: "bg-amber-500",  label: "Watch",    pulse: false },
  WEAK:     { cls: "badge-red",    dot: "bg-red-500",    label: "Weak",     pulse: true  },
  BULL:     { cls: "badge-green",  dot: "bg-green-500",  label: "Bull",     pulse: false },
  BEAR:     { cls: "badge-red",    dot: "bg-red-500",    label: "Bear",     pulse: false },
  RANGE:    { cls: "badge-gray",   dot: "bg-neutral-400",label: "Range",    pulse: false },
  RISK_ON:  { cls: "badge-green",  dot: "bg-green-500",  label: "Risk On",  pulse: false },
  RISK_OFF: { cls: "badge-red",    dot: "bg-red-500",    label: "Risk Off", pulse: true  },
  INSUFFICIENT_DATA: { cls: "badge-gray", dot: "bg-neutral-400", label: "Warming Up", pulse: false },
  TIER_1:   { cls: "badge-green",  dot: "bg-green-500",  label: "Tier 1",   pulse: false },
  TIER_2:   { cls: "badge-yellow", dot: "bg-yellow-500", label: "Tier 2",   pulse: false },
  TIER_3:   { cls: "badge-amber",  dot: "bg-amber-500",  label: "Tier 3",   pulse: false },
  TIER_4:   { cls: "badge-red",    dot: "bg-red-500",    label: "Tier 4",   pulse: true  },
};

export default function StatusBadge({ status, score }) {
  const cfg = MAP[status] || MAP.gray;
  return (
    <span className={cfg.cls}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${cfg.pulse ? "animate-pulse" : ""}`} />
      {cfg.label}{score != null ? ` · ${score}` : ""}
    </span>
  );
}
