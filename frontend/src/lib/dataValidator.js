/**
 * dataValidator.js — Data Quality Engine for AEGIS-FIN
 * -------------------------------------------------------
 * Validates data before rendering or passing to ML.
 * Rules:
 *   - No NULL critical features
 *   - No NaN values
 *   - No outdated data (>30 days)
 *   - Feature completeness threshold: 70%
 */

const STALE_DAYS = 30;

/**
 * Check if a date string is stale (older than STALE_DAYS days)
 */
export function isStale(dateStr) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  const diffMs = Date.now() - d.getTime();
  return diffMs > STALE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Check if a value is valid (not null, undefined, NaN, or "—")
 */
export function isValid(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "number" && isNaN(v)) return false;
  if (v === "—" || v === "" || v === "undefined") return false;
  return true;
}

/**
 * Safe number formatter — returns null if invalid
 */
export function safeNum(v, decimals = 2) {
  if (!isValid(v)) return null;
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  return parseFloat(n.toFixed(decimals));
}

/**
 * Safe display formatter — returns null (hide) if invalid
 */
export function safeDisplay(v, decimals = 2, suffix = "") {
  const n = safeNum(v, decimals);
  if (n === null) return null;
  return `${n}${suffix}`;
}

/**
 * Validate ML/classifier result — returns { valid, reason, score }
 * Only shows score if all 3 core dimensions exist
 */
export function validateClassifier(row) {
  if (!row) return { valid: false, reason: "No classifier data", score: null };

  const score = row.composite_score ?? row.survival_score;
  if (score === null || score === undefined) {
    return { valid: false, reason: "Score unavailable due to incomplete data", score: null };
  }

  // Check dimensions
  const dims = row.dimensions || {};
  const dimKeys = ["price_health", "fundamental", "ownership", "sector_fit"];
  const presentDims = dimKeys.filter(k => dims[k]?.score != null);
  const completeness = presentDims.length / dimKeys.length;

  if (completeness < 0.5) {
    return {
      valid: false,
      reason: `Score unavailable due to incomplete data (${presentDims.length}/${dimKeys.length} dimensions)`,
      score: null,
    };
  }

  // Check staleness
  if (isStale(row.date)) {
    return {
      valid: false,
      reason: "Score data is stale (>30 days old)",
      score: null,
    };
  }

  return { valid: true, reason: null, score, completeness };
}

/**
 * Validate balance sheet ratio row
 */
export function validateRatio(r) {
  if (!r) return false;
  if (!isValid(r.value)) return false;
  return true;
}

/**
 * Compute status from percentile rank (deterministic, rule-based)
 * top 25% → green, mid 50% → amber, bottom 25% → red
 * null rank → gray (truly missing)
 */
export function statusFromRank(histPctRank, higherIsBetter = true) {
  if (histPctRank === null || histPctRank === undefined) return "gray";
  const rank = higherIsBetter ? histPctRank : (1 - histPctRank);
  if (rank >= 0.75) return "green";
  if (rank >= 0.25) return "amber";
  return "red";
}

/**
 * Validate correlation data
 */
export function validateCorrelation(row) {
  if (!row) return { valid: false, reason: "No correlation data available" };
  const cvs = row.company_vs_sectors;
  if (!cvs || typeof cvs !== "object" || Object.keys(cvs).length === 0) {
    return { valid: false, reason: "No correlation data available" };
  }
  return { valid: true };
}

/**
 * Get feature completeness % for a classifier row
 */
export function getFeatureCompleteness(row) {
  if (!row) return 0;
  const dims = row.dimensions || {};
  const keys = ["price_health", "fundamental", "ownership", "sector_fit"];
  const present = keys.filter(k => dims[k]?.score != null).length;
  return (present / keys.length) * 100;
}

/**
 * Format a score with color class
 */
export function scoreColorClass(score) {
  if (score == null) return "text-[var(--text-3)]";
  if (score >= 70) return "text-[#00B341]";
  if (score >= 40) return "text-[#FFC224]";
  return "text-[#FF3B30]";
}

/**
 * Status color class (green/amber/red/gray)
 */
export function statusColorClass(status) {
  if (status === "green") return "text-[#00B341]";
  if (status === "amber") return "text-[#FFC224]";
  if (status === "red")   return "text-[#FF3B30]";
  return "text-[var(--text-3)]";
}

/**
 * Status bg class for inline indicators
 */
export function statusBgClass(status) {
  if (status === "green") return "bg-[#00B341]";
  if (status === "amber") return "bg-[#FFC224]";
  if (status === "red")   return "bg-[#FF3B30]";
  return "bg-[var(--text-3)]";
}

/**
 * safeValue — global guard used across all render paths.
 * Returns null for any value that should NOT be rendered.
 * Components must check for null and hide/show placeholder accordingly.
 */
export const safeValue = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === "number" && (isNaN(val) || !isFinite(val))) return null;
  if (val === "—" || val === "" || val === "undefined" || val === "null") return null;
  return val;
};
