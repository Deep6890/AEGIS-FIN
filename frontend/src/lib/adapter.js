/**
 * adapter.js
 * ----------
 * Maps real Supabase table columns → UI-expected field shapes.
 *
 * Real table schemas (verified against live DB):
 *
 * ohlcv_health / sector_health:
 *   company_id/sector_id, date, daily_return, cum_change_1m, cum_change_1y,
 *   cum_change_2y, close_z, ret_z, z_change, cum_z_change, spike_up,
 *   spike_down, oc_spark, volatility, composite, health_score
 *   NOTE: NO close, NO signal, NO regime, NO market_phase, NO trend columns
 *
 * correlation_scores:
 *   company_id, sector_id, date, corr_20d, corr_60d, corr_100d, corr_full,
 *   outperf_20d, outperf_60d, outperf_100d, aligned_up_pct, aligned_dn_pct,
 *   avg_top_health, sectors(name)
 *
 * balance_sheet_scores:
 *   company_id, ratio_id, period, value, yoy_pct, hist_pct_rank,
 *   status, adjusted_status, trend, sector_direction, sector_pressure,
 *   sector_narrative, ratio_definitions(name, category, higher_is_better)
 *
 * holding_scores:
 *   company_id, metric_id, period, value, status, adjusted_status, trend,
 *   holding_signal, sector_signal, sector_pressure,
 *   holding_metric_definitions(name, category)
 *
 * No classifier table exists yet — ML scores derived from health_score.
 */

// ── Safe helpers ──────────────────────────────────────────────────────────────

export const safeNumber = (v, fallback = 0) =>
  typeof v === "number" && isFinite(v) ? v : fallback;

export const safeString = (v, fallback = "") =>
  typeof v === "string" ? v : fallback;

// ── Derive signal / regime / trend from real columns ─────────────────────────

function deriveSignal(health_score) {
  const hs = safeNumber(health_score, 50);
  return hs >= 75 ? "STRONG" : hs >= 50 ? "NEUTRAL" : hs >= 25 ? "WATCH" : "WEAK";
}

function deriveRegime(composite) {
  const c = safeNumber(composite, 0);
  return c > 0.5 ? "BULL" : c < -0.5 ? "BEAR" : "NEUTRAL";
}

function deriveTrend(z_change) {
  const z = safeNumber(z_change, 0);
  return z > 0.1 ? "Upward" : z < -0.1 ? "Downward" : "Sideways";
}

// ── adaptInsightRow ───────────────────────────────────────────────────────────
/**
 * Adapts an ohlcv_health row into the shape the UI expects for ML/classifier.
 * health_score (0-100) is used as the composite/survival score.
 */
export function adaptInsightRow(row) {
  if (!row) return null;

  const score = safeNumber(row.health_score, null);
  const hs    = score ?? 0;

  // Derive tier from health_score bands
  const tier  = hs >= 75 ? "TIER_1" : hs >= 55 ? "TIER_2" : hs >= 35 ? "TIER_3" : "TIER_4";
  const grade = hs >= 75 ? "A"      : hs >= 55 ? "B"      : hs >= 35 ? "C"      : hs >= 20 ? "D" : "F";

  return {
    ...row,
    // Canonical score fields UI reads
    composite_score:      score,
    survival_score:       score,
    distress_probability: score != null ? Math.max(0, 100 - score) : null,

    // Tier / grade
    composite_tier:  tier,
    composite_grade: grade,

    // Dimension proxies from available columns
    price_score:       safeNumber(row.health_score),
    fundamental_score: null,
    ownership_score:   null,
    sector_fit_score:  null,

    // Derived fields
    signal:  deriveSignal(row.health_score),
    regime:  deriveRegime(row.composite),
    trend:   deriveTrend(row.z_change),

    summary: null,
    passes_filter: null,
    filter_reasons: [],
  };
}

// ── adaptBalanceSheetRow ──────────────────────────────────────────────────────
/**
 * Maps balance_sheet_scores row → UI-expected shape.
 * ratio_definitions has: name, category, higher_is_better (no description)
 */
export function adaptBalanceSheetRow(row) {
  if (!row) return null;
  const rd = row.ratio_definitions || {};
  return {
    ...row,
    ratio_definitions: {
      name:             safeString(rd.name ?? row.name),
      category:         safeString(rd.category ?? row.category),
      description:      safeString(rd.description ?? ""),
      higher_is_better: rd.higher_is_better ?? true,
    },
    value:            row.value          ?? null,
    yoy_pct:          row.yoy_pct        ?? null,
    hist_pct_rank:    row.hist_pct_rank  ?? null,
    status:           safeString(row.status, "gray"),
    adjusted_status:  safeString(row.adjusted_status ?? row.status, "gray"),
    trend:            safeString(row.trend),
    sector_pressure:  row.sector_pressure  ?? null,
    sector_direction: safeString(row.sector_direction),
    sector_narrative: safeString(row.sector_narrative),
  };
}

// ── adaptHoldingRow ───────────────────────────────────────────────────────────
/**
 * Maps holding_scores row → UI-expected shape.
 * holding_metric_definitions has: name, category (no description)
 */
export function adaptHoldingRow(row) {
  if (!row) return null;
  const md = row.holding_metric_definitions || {};
  return {
    ...row,
    holding_metric_definitions: {
      name:        safeString(md.name ?? row.name),
      category:    safeString(md.category ?? row.category),
      description: safeString(md.description ?? ""),
    },
    value:           row.value          ?? null,
    status:          safeString(row.status, "gray"),
    adjusted_status: safeString(row.adjusted_status ?? row.status, "gray"),
    trend:           safeString(row.trend),
    holding_signal:  safeString(row.holding_signal),
    sector_signal:   safeString(row.sector_signal),
    sector_pressure: row.sector_pressure ?? null,
  };
}

// ── adaptCorrelationToTopSectors ──────────────────────────────────────────────
/**
 * Adapts correlation_scores flat rows → top_sectors array the UI expects.
 * Takes the latest date's rows, sorts by corr_60d descending.
 */
export function adaptCorrelationToTopSectors(corrRows) {
  if (!corrRows?.length) return [];
  // Find the latest date
  const latestDate = corrRows.reduce((max, r) => r.date > max ? r.date : max, "");
  const latest = corrRows.filter(r => r.date === latestDate);
  return latest
    .sort((a, b) => safeNumber(b.corr_60d) - safeNumber(a.corr_60d))
    .map((r, i) => ({
      ...r,
      rank:      i + 1,
      sector:    r.sectors?.name ?? r.sector_name ?? "",
      name:      r.sectors?.name ?? r.sector_name ?? "",
      corr_60d:  safeNumber(r.corr_60d),
      corr_20d:  safeNumber(r.corr_20d),
      corr_100d: safeNumber(r.corr_100d),
      corr_full: safeNumber(r.corr_full),
      outperf_60d:    r.outperf_60d    ?? null,
      avg_top_health: r.avg_top_health ?? null,
      aligned_up_pct: r.aligned_up_pct ?? null,
      aligned_dn_pct: r.aligned_dn_pct ?? null,
    }));
}

/**
 * adaptCorrelationForTopSecState
 * Wraps correlation_scores rows so CompanyDetail sectors tab works:
 * topSec[0].top_sectors is the ranked array.
 */
export function adaptCorrelationForTopSecState(corrRows) {
  if (!corrRows?.length) return [];
  const topSectors = adaptCorrelationToTopSectors(corrRows);
  const latestDate = corrRows.reduce((max, r) => r.date > max ? r.date : max, "");
  return [{ top_sectors: topSectors, date: latestDate }];
}

/**
 * adaptCorrelationMatrix
 * Builds the company_vs_sectors matrix from flat correlation_scores rows.
 * Returns { sectorName: { "20d": val, "60d": val, "100d": val, "full": val } }
 */
export function adaptCorrelationMatrix(corrRows) {
  if (!corrRows?.length) return {};
  const latestDate = corrRows.reduce((max, r) => r.date > max ? r.date : max, "");
  const latest = corrRows.filter(r => r.date === latestDate);
  const cvs = {};
  latest.forEach(r => {
    const name = r.sectors?.name || r.sector_id;
    if (!name) return;
    cvs[name] = {
      "20d":  r.corr_20d  ?? null,
      "60d":  r.corr_60d  ?? null,
      "100d": r.corr_100d ?? null,
      "full": r.corr_full ?? null,
    };
  });
  return cvs;
}

// ── adaptSectorHealthRow ──────────────────────────────────────────────────────
/**
 * Maps sector_health row → fields UI expects.
 * Real columns: health_score, composite, ret_z, z_change, cum_z_change,
 *   volatility, spike_up, spike_down, daily_return, cum_change_1m/1y/2y
 * Derived: signal, regime, trend, vol_z, momentum_z, slope_z
 * Missing: close (not in table)
 */
export function adaptSectorHealthRow(row) {
  if (!row) return null;
  const hs     = safeNumber(row.health_score, 50);
  const comp   = safeNumber(row.composite, 0);
  const zChange = safeNumber(row.z_change, 0);

  return {
    ...row,
    signal:       deriveSignal(hs),
    regime:       deriveRegime(comp),
    trend:        deriveTrend(zChange),
    market_phase: null,
    close:        null,
    // Field aliases for legacy UI code
    vol_z:      safeNumber(row.volatility),
    momentum_z: safeNumber(row.cum_z_change),
    slope_z:    safeNumber(row.z_change),
    health_score: hs,
    composite:    comp,
    ret_z:        safeNumber(row.ret_z),
  };
}

// ── adaptOhlcvHealthRow ───────────────────────────────────────────────────────
/**
 * Maps ohlcv_health row → fields UI expects.
 * Same real columns as sector_health.
 */
export function adaptOhlcvHealthRow(row) {
  if (!row) return null;
  const hs      = safeNumber(row.health_score, 50);
  const comp    = safeNumber(row.composite, 0);
  const zChange = safeNumber(row.z_change, 0);

  return {
    ...row,
    signal:       deriveSignal(hs),
    regime:       deriveRegime(comp),
    trend:        deriveTrend(zChange),
    market_phase: null,
    close:        null,
    vol_z:      safeNumber(row.volatility),
    momentum_z: safeNumber(row.cum_z_change),
    slope_z:    safeNumber(row.z_change),
    health_score: hs,
    composite:    comp,
    ret_z:        safeNumber(row.ret_z),
  };
}
