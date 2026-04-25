// Legacy compat — wraps new KpiCard
import React from "react";
import { KpiCard } from "./Card";

const COLOR_MAP = {
  orange:  "default",
  emerald: "default",
  red:     "default",
  amber:   "default",
  blue:    "default",
  yellow:  "yellow",
  green:   "green",
  dark:    "dark",
  ink:     "ink",
};

export default function StatCard({ icon, label, value, sub, insight, color = "default", trend }) {
  return (
    <KpiCard
      icon={icon}
      label={label}
      value={value}
      sub={sub || insight}
      trend={trend}
      variant={COLOR_MAP[color] || "default"}
    />
  );
}
