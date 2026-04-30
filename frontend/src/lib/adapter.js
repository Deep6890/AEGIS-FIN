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
 * adaptInsightRow
 * Adapts a classifier row (actual schema) into the shape the UI expects.
 *
 * Classifier table has: composite_score, composite_tier, composite_grade,
 *   price_score, fundamental_score, ownership_score, sector_fit_score,
 *   dimensions (JSONB), composite (JSONB), filter (JSONB), summary
 */
export function adaptInsightRow(row) {
  if (!row) return null;

  const score = safeNumber(row.composite_score, null);
  const comp  = row.composite || {};
  const filt  = row.filter    || {};

  return {
    // Raw passthrough
    ...row,

    // Canonical score fields UI reads
    composite_score:      score,
    survival_score:       score,                                          // alias
    distress_probability: score != null ? Math.max(0, 100 - score) : null,

    // Tier / grade — already correct in classifier table
    composite_tier:  row.composite_tier  ?? comp.tier  ?? "TIER_3",
    composite_grade: row.composite_grade ?? comp.grade ?? "C",

    // Dimension scores (flat — for any page that reads them directly)
    price_score:       safeNumber(row.price_score),
    fundamental_score: safeNumber(row.fundamental_score),
    ownership_score:   safeNumber(row.ownership_score),
    sector_fit_score:  safeNumber(row.sector_fit_score),

    // Filter result
    passes_filter: filt.passes ?? null,
    filter_reasons: filt.reasons ?? [],

    // Summary
    summary: safeString(row.summary),
  };
}

/**
 * adaptBalanceSheetRow
 * Maps balance_sheet_ratios row → UI-expected shape.
 * Real schema: ratio_definitions(name, category, description, higher_is_better),
 *   value, yoy_pct, hist_pct_rank (0-100), status, adjusted_status, trend,
 *   sector_direction, sector_pressure, sector_narrative
 */
export function adaptBalanceSheetRow(row) {
  if (!row) return null;
  const rd = row.ratio_definitions || {};
  return {
    ...row,
    ratio_definitions: {
      name:             safeString(rd.name ?? row.name),
      category:         safeString(rd.category ?? row.category),
      description:      safeString(rd.description),
      higher_is_better: rd.higher_is_better ?? true,
    },
    value:           row.value   ?? null,
    yoy_pct:         row.yoy_pct ?? null,
    // hist_pct_rank is stored as 0-100 in the DB — pass through as-is
    hist_pct_rank:   row.hist_pct_rank ?? null,
    status:          safeString(row.status, "gray"),
    adjusted_status: safeString(row.adjusted_status ?? row.status, "gray"),
    trend:           safeString(row.trend),
    sector_pressure: row.sector_pressure ?? null,
    sector_direction: safeString(row.sector_direction),
    sector_narrative: safeString(row.sector_narrative),
  };
}

/**
 * adaptHoldingRow
 * Maps stock_holding row → UI-expected shape.
 * Real schema: holding_metric_definitions(name, category, description),
 *   value, status, adjusted_status, trend, holding_signal, sector_signal, sector_pressure
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
    holding_signal:  safeString(row.holding_signal),
    sector_signal:   safeString(row.sector_signal),
    sector_pressure: row.sector_pressure ?? null,
  };
}

/**
 * adaptCorrelationToTopSectors
 * Extracts top_sectors array from a correlation JSONB row.
 * Real schema: correlation.top_sectors is already a JSONB array of
 *   { rank, sector, corr_100d, corr_full }
 */
export function adaptCorrelationToTopSectors(corrRows) {
  if (!corrRows?.length) return [];
  // corrRows is an array of correlation table rows; take the latest
  const latest = corrRows[0];
  const topSectors = latest?.top_sectors;
  if (!Array.isArray(topSectors) || !topSectors.length) return [];
  return topSectors.map((s, i) => ({
    ...s,
    rank:      s.rank     ?? i + 1,
    sector:    s.sector   ?? s.name ?? "",
    name:      s.sector   ?? s.name ?? "",
    corr_60d:  safeNumber(s.corr_60d  ?? s["corr_60d"]),
    corr_20d:  safeNumber(s.corr_20d  ?? s["corr_20d"]),
    corr_100d: safeNumber(s.corr_100d ?? s["corr_100d"]),
    corr_full: safeNumber(s.corr_full ?? s["corr_full"]),
  }));
}

/**
 * adaptCorrelationForTopSecState
 * Used by CompanyDetail sectors tab — wraps the correlation row so
 * the existing topSec[0].top_sectors pattern still works.
 */
export function adaptCorrelationForTopSecState(corrRows) {
  if (!corrRows?.length) return [];
  const latest = corrRows[0];
  if (!latest) return [];
  return [{
    ...latest,
    top_sectors: adaptCorrelationToTopSectors(corrRows),
    date: latest.date,
  }];
}

/**
 * adaptCorrelationMatrix
 * Builds the company_vs_sectors matrix from a correlation JSONB row.
 * Real schema: correlation.company_vs_sectors is already a JSONB object
 *   { sectorName: { full, 20d, 60d, 100d } }
 */
export function adaptCorrelationMatrix(corrRow) {
  if (!corrRow) return {};
  return corrRow.company_vs_sectors || {};
}

/**
 * adaptRelativeGrowth
 * Extracts relative_growth from a correlation JSONB row.
 */
export function adaptRelativeGrowth(corrRow) {
  if (!corrRow) return {};
  return corrRow.relative_growth || {};
}

/**
 * adaptCorrelationInsights
 * Extracts insights array from a correlation JSONB row.
 */
export function adaptCorrelationInsights(corrRow) {
  if (!corrRow) return [];
  return corrRow.insights || [];
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
