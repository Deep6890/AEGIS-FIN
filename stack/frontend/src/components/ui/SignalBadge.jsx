import React from "react";

const MAP = {
  STRONG: "badge-green",
  NEUTRAL: "badge-gray",
  WATCH:  "badge-amber",
  WEAK:   "badge-red",
  BULL:   "badge-green",
  BEAR:   "badge-red",
  green:  "badge-green",
  amber:  "badge-amber",
  red:    "badge-red",
  gray:   "badge-gray",
  RISK_OFF: "badge-red",
  RISK_ON:  "badge-green",
  INSUFFICIENT_DATA: "badge-gray",
};

export default function SignalBadge({ value }) {
  const cls = MAP[value] || "badge-gray";
  const label = value === "INSUFFICIENT_DATA" ? "Warming Up" : (value || "—");
  return <span className={cls}>{label}</span>;
}
