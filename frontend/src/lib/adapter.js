/**
 * adapter.js
 * ----------
 * Maps new backend company_insights + context output → UI-expected field shapes.
 * UI components are never touched. All field aliasing happens here.
 */

// ── Safe helpers ──────────────────────────────────────────────────────────────

export const safeNumber = (v, fallback = 0) =>
  typeof v === "number" && isFinite(v) ? v : fallback;

export const safeString = (v, fallback = "") =>
  typeof v === "string" ? v : fallback;

// ── Class → tier/grade mapping ────────────────────────────────────────────────
// UI uses composite_tier (TIER_1/2/3/4) and composite_grade (A/B/C/D/F)

const CLASS_TO_TIER = {
  STRONG:    "TIER_1",
  POSITIVE:  "TIER_2",
  NEUTRAL:   "TIER_3",
  WEAK:      "TIER_4",
  DISTRESSED:"TIER_4",
};

const CLASS_TO_GRADE = {
  STRONG:    "A",
  POSITIVE:  "B",
  NEUTRAL:   "C",
  WEAK:      "D",
  DISTRESSED:"F",
};

// ── Main adapter ──────────────────────────────────────────────────────────────

/**
 * Adapts a company_insights row (from Supabase) into the shape
 * the UI expects for latestMl entries.
 *
 * UI reads: composite_score, survival_score, distress_probability,
 *           composite_tier, composite_grade, company_id, date
 */
export function adaptInsightRow(row) {
  if (!row) return null;

  const score = safeNumber(row.final_score ?? row.insight_score, null);

  return {
    // Raw passthrough
    ...row,

    // Canonical score fields UI reads
    composite_score:      score,
    survival_score:       score,                                          // alias
    distress_probability: score != null ? Math.max(0, 100 - score) : null,

    // Tier / grade derived from class
    composite_tier:  CLASS_TO_TIER[row.class]  ?? "TIER_3",
    composite_grade: CLASS_TO_GRADE[row.class] ?? "C",

    // Insight signals (flat — for any page that reads them directly)
    momentum: safeNumber(row.momentum),
    risk:     safeNumber(row.risk),
    strength: safeNumber(row.strength),
    summary:  safeString(row.summary),
  };
}

/**
 * Adapts a balance_sheet_scores row (new schema) into the shape
 * the UI expects from balance_sheet_ratios (old schema).
 *
 * UI reads: ratio_definitions.name, ratio_definitions.category,
 *           value, yoy_pct, hist_pct_rank, status, adjusted_status,
 *           trend, sector_pressure
 */
export function adaptBalanceSheetRow(row) {
  if (!row) return null;
  const rd = row.ratio_definitions || {};
  return {
    ...row,
    // Ensure ratio_definitions shape UI expects
    ratio_definitions: {
      name:             safeString(rd.name ?? row.name),
      category:         safeString(rd.category ?? row.category),
      description:      safeString(rd.description),
      higher_is_better: rd.higher_is_better ?? true,
    },
    value:           row.value   ?? null,
    yoy_pct:         row.yoy_pct ?? null,
    hist_pct_rank:   row.hist_pct_rank != null ? row.hist_pct_rank / 100 : null, // normalize 0-100 → 0-1 for UI display
    status:          safeString(row.status, "gray"),
    adjusted_status: safeString(row.adjusted_status ?? row.status, "gray"),
    trend:           safeString(row.trend),
    sector_pressure: row.sector_pressure ?? null,
  };
}

/**
 * Adapts a holding_scores row (new schema) into the shape
 * the UI expects from stock_holding (old schema).
 *
 * UI reads: holding_metric_definitions.name, holding_metric_definitions.description,
 *           value, status, adjusted_status, trend, sector_signal
 */
export function adaptHoldingRow(row) {
  if (!row) return null;
  const md = row.holding_metric_definitions || {};
  return {
    ...row,
    holding_metric_definitions: {
      name:        safeString(md.name ?? row.name),
      category:    safeString(md.category ?? row.category),
      description: safeString(md.description),
    },
    value:           row.value ?? null,
    status:          safeString(row.status, "gray"),
    adjusted_status: safeString(row.adjusted_status ?? row.status, "gray"),
    trend:           safeString(row.trend),
    sector_signal:   safeString(row.sector_signal),
  };
}

/**
 * Adapts correlation_scores rows into the shape the UI expects
 * for top_sectors (old schema had top_sectors as JSONB array).
 *
 * UI reads: top_sectors[].sector, top_sectors[].name,
 *           top_sectors[].corr_60d, top_sectors[].rank
 */
export function adaptCorrelationToTopSectors(corrRows) {
  if (!corrRows?.length) return [];
  return corrRows
    .sort((a, b) => safeNumber(b.corr_60d) - safeNumber(a.corr_60d))
    .map((r, i) => ({
      ...r,
      rank:     i + 1,
      sector:   r.sectors?.name ?? r.sector_name ?? "",
      name:     r.sectors?.name ?? r.sector_name ?? "",
      corr_60d: safeNumber(r.corr_60d),
      corr_20d: safeNumber(r.corr_20d),
      corr_100d:safeNumber(r.corr_100d),
    }));
}

/**
 * adaptSectorHealthRow
 * Maps new sector_health schema → fields UI expects.
 * New schema has: health_score, composite, ret_z, z_change, volatility,
 *                 spike_up, spike_down, daily_return, cum_change_1m etc.
 * UI expects:     signal, regime, market_phase, trend, vol_z, momentum_z,
 *                 slope_z, close
 */
export function adaptSectorHealthRow(row) {
  if (!row) return null;
  const hs = safeNumber(row.health_score, 50);
  const comp = safeNumber(row.composite, 0);
  const rz = safeNumber(row.ret_z, 0);

  // Derive signal from health_score
  const signal = hs >= 75 ? "STRONG" : hs >= 50 ? "NEUTRAL" : hs >= 25 ? "WATCH" : "WEAK";

  // Derive regime from composite z-score
  const regime = comp > 0.5 ? "BULL" : comp < -0.5 ? "BEAR" : "NEUTRAL";

  // Derive trend from z_change direction
  const zChange = safeNumber(row.z_change, 0);
  const trend = zChange > 0.1 ? "Upward" : zChange < -0.1 ? "Downward" : "Sideways";

  return {
    ...row,
    // Derived fields UI expects
    signal,
    regime,
    trend,
    market_phase: null,
    // Field aliases
    vol_z:      safeNumber(row.volatility),   // volatility → vol_z
    momentum_z: safeNumber(row.cum_z_change), // cum_z_change → momentum_z
    slope_z:    safeNumber(row.z_change),     // z_change → slope_z
    close:      row.close ?? null,
    // Keep originals
    health_score: hs,
    composite:    comp,
    ret_z:        rz,
  };
}

/**
 * adaptOhlcvHealthRow
 * Maps new ohlcv_health schema → fields UI expects.
 * Same derivation logic as sector health.
 */
export function adaptOhlcvHealthRow(row) {
  if (!row) return null;
  const hs = safeNumber(row.health_score, 50);
  const comp = safeNumber(row.composite, 0);
  const zChange = safeNumber(row.z_change, 0);

  const signal = hs >= 75 ? "STRONG" : hs >= 50 ? "NEUTRAL" : hs >= 25 ? "WATCH" : "WEAK";
  const regime = comp > 0.5 ? "BULL" : comp < -0.5 ? "BEAR" : "NEUTRAL";
  const trend  = zChange > 0.1 ? "Upward" : zChange < -0.1 ? "Downward" : "Sideways";

  return {
    ...row,
    signal,
    regime,
    trend,
    vol_z:      safeNumber(row.volatility),
    momentum_z: safeNumber(row.cum_z_change),
    slope_z:    safeNumber(row.z_change),
    close:      row.close ?? null,
    health_score: hs,
    composite:    comp,
  };
}
  const topSectors = adaptCorrelationToTopSectors(corrRows);
  if (!topSectors.length) return [];
  return [{ top_sectors: topSectors, date: corrRows[0]?.date }];
}
