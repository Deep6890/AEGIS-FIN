import React from "react";

const MAP = {
  STRONG:            "badge-green",
  NEUTRAL:           "badge-gray",
  WATCH:             "badge-amber",
  WEAK:              "badge-gray",
  BULL:              "badge-green",
  BEAR:              "badge-gray",
  RANGE:             "badge-gray",
  green:             "badge-green",
  amber:             "badge-amber",
  red:               "badge-red",
  gray:              "badge-gray",
  RISK_OFF:          "badge-gray",
  RISK_ON:           "badge-orange",
  NEUTRAL_REGIME:    "badge-gray",
  INSUFFICIENT_DATA: "badge-gray",
  TIER_1:            "badge-green",
  TIER_2:            "badge-green",
  TIER_3:            "badge-amber",
  TIER_4:            "badge-gray",
};

const LABELS = {
  INSUFFICIENT_DATA: "Warming Up",
  NEUTRAL_REGIME:    "Neutral",
  RISK_OFF:          "Risk Off",
  RISK_ON:           "Risk On",
  TIER_1: "Tier 1", TIER_2: "Tier 2", TIER_3: "Tier 3", TIER_4: "Tier 4",
};

export default function SignalBadge({ value }) {
  if (!value) return <span className="badge badge-gray">—</span>;
  const cls   = MAP[value] || "badge-gray";
  const label = LABELS[value] || value;
  return <span className={cls}>{label}</span>;
}
