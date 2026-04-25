/**
 * Sector Intelligence Engine
 * Ranks sectors, classifies trends, generates insights
 */

/**
 * Classify sector trend based on health score + momentum
 */
export function classifyTrend(healthScore, momentumZ, retZ) {
  if (healthScore == null) return "Unknown";
  if (healthScore >= 70 && (momentumZ ?? 0) > 0.3) return "Bullish";
  if (healthScore >= 55) return "Improving";
  if (healthScore >= 35 && (momentumZ ?? 0) < -0.3) return "Weakening";
  if (healthScore < 35) return "Bearish";
  return "Sideways";
}

/**
 * Classify sector role based on rank and trend
 */
export function classifyRole(rank, total, trend) {
  const pct = rank / total;
  if (pct <= 0.2) return "Leading";
  if (pct <= 0.45) return "Improving";
  if (pct <= 0.7) return "Weakening";
  return "Lagging";
}

/**
 * Generate a natural language insight for a sector
 */
export function generateInsight(sector) {
  const { name, trend, role, healthScore, retZ, momentumZ, signal, regime } = sector;
  const parts = [];

  if (role === "Leading") {
    parts.push(`${name} is leading the market`);
  } else if (role === "Lagging") {
    parts.push(`${name} is lagging behind peers`);
  } else {
    parts.push(`${name} is ${role.toLowerCase()}`);
  }

  if (trend === "Bullish") parts.push("with strong bullish momentum");
  else if (trend === "Bearish") parts.push("under bearish pressure");
  else if (trend === "Improving") parts.push("showing signs of recovery");
  else if (trend === "Weakening") parts.push("showing signs of weakness");

  if (healthScore != null) {
    parts.push(`(health: ${healthScore.toFixed(0)}/100)`);
  }

  if (signal === "STRONG") parts.push("— signal is STRONG");
  else if (signal === "WEAK") parts.push("— signal is WEAK, caution advised");

  return parts.join(" ") + ".";
}

/**
 * Rank and classify all sectors
 * Returns sorted array with rank, trend, role, insight
 */
export function rankSectors(latestSectorHealth, sectors) {
  if (!latestSectorHealth.length) return [];

  // Only rank actual sectors (not macro)
  const sectorMap = {};
  sectors.forEach(s => { sectorMap[s.id] = s; });

  const ranked = latestSectorHealth
    .filter(h => {
      const s = sectorMap[h.sector_id];
      return s && s.sector_type === "sector";
    })
    .map(h => ({
      sector_id:   h.sector_id,
      name:        sectorMap[h.sector_id]?.name || "Unknown",
      yf_ticker:   sectorMap[h.sector_id]?.yf_ticker,
      healthScore: h.health_score,
      composite:   h.composite,
      retZ:        h.ret_z,
      volZ:        h.vol_z,
      momentumZ:   h.momentum_z,
      signal:      h.signal,
      regime:      h.regime,
      trend:       h.trend,
      marketPhase: h.market_phase,
      spikeUp:     h.spike_up,
      spikeDown:   h.spike_down,
      date:        h.date,
    }))
    .sort((a, b) => (b.healthScore ?? 0) - (a.healthScore ?? 0));

  const total = ranked.length;

  return ranked.map((s, i) => {
    const trend = classifyTrend(s.healthScore, s.momentumZ, s.retZ);
    const role  = classifyRole(i + 1, total, trend);
    return {
      ...s,
      rank:    i + 1,
      trend,
      role,
      insight: generateInsight({ ...s, trend, role }),
    };
  });
}

/**
 * Get top N leaders and bottom N laggards
 */
export function getLeadersAndLaggards(rankedSectors, n = 3) {
  const leaders  = rankedSectors.slice(0, n);
  const laggards = rankedSectors.slice(-n).reverse();
  return { leaders, laggards };
}

/**
 * Get relative strength vs Nifty (if available)
 */
export function getRelativeStrength(sectorHistory, niftyHistory) {
  if (!sectorHistory.length || !niftyHistory.length) return null;
  const sectorLatest = sectorHistory[sectorHistory.length - 1];
  const niftyLatest  = niftyHistory[niftyHistory.length - 1];
  if (!sectorLatest?.daily_return || !niftyLatest?.daily_return) return null;
  return (sectorLatest.daily_return - niftyLatest.daily_return) * 100;
}

export const TREND_COLORS = {
  Bullish:   "#E8572A",
  Improving: "#F59E0B",
  Sideways:  "#6B7280",
  Weakening: "#9CA3AF",
  Bearish:   "#374151",
  Unknown:   "#D1D5DB",
};

export const ROLE_COLORS = {
  Leading:   "#E8572A",
  Improving: "#F59E0B",
  Weakening: "#9CA3AF",
  Lagging:   "#6B7280",
};
