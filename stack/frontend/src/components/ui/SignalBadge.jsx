import React from "react";

const MAP = {
  STRONG:            "badge-green",
  NEUTRAL:           "badge-gray",
  WATCH:             "badge-amber",
  WEAK:              "badge-red",
  BULL:              "badge-green",
  BEAR:              "badge-red",
  green:             "badge-green",
  amber:             "badge-amber",
  red:               "badge-red",
  gray:              "badge-gray",
  RISK_OFF:          "badge-red",
  RISK_ON:           "badge-green",
  INSUFFICIENT_DATA: "badge-gray",
  TAILWIND:          "badge-green",
  HEADWIND:          "badge-red",
  up:                "badge-green",
  down:              "badge-red",
  TIER_1:            "badge-green",
  TIER_2:            "badge-amber",
  TIER_3:            "badge-orange",
  TIER_4:            "badge-red",
};

const LABEL = {
  INSUFFICIENT_DATA: "Warming Up",
  RISK_OFF:          "Risk Off",
  RISK_ON:           "Risk On",
  TIER_1:            "Tier 1",
  TIER_2:            "Tier 2",
  TIER_3:            "Tier 3",
  TIER_4:            "Tier 4",
};

export default function SignalBadge({ value }) {
  const cls   = MAP[value] || "badge-gray";
  const label = LABEL[value] || value || "—";
  return <span className={cls}>{label}</span>;
}
