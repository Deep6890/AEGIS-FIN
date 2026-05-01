import React, { useMemo, useState } from "react";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { useAegisData } from "../context/AegisDataContext";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(v, dp = 1) {
  if (v == null) return "—";
  return Number(v).toFixed(dp);
}

function fmtPct(v) {
  if (v == null) return "—";
  const p = Number(v).toFixed(1);
  return `${v >= 0 ? "+" : ""}${p}%`;
}

function scoreColor(s) {
  if (s == null) return "var(--text-3)";
  if (s >= 60) return "var(--orange)";
  return "#EF4444";
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skel() {
  return (
    <div className="page-wrap animate-fade-in">
      <div><p className="page-eyebrow">AEGIS-FIN · SECTORS</p><h1 className="page-title">Sector Contagion Watch</h1></div>
      <div className="grid-2">{[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 14 }} />)}</div>
      <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
      <div className="grid-auto">{[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />)}</div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function SectorContagion() {
  const { sectorHealth, sectorHealthHistory, sectorOhlcvAll, loading, errors } = useAegisData();

  // Deduplicate to latest per sector
  const latestBySector = useMemo(() => {
    const map = new Map();
    for (const row of sectorHealth || []) {
      const existing = map.get(row.sector_id);
      if (!existing || row.date > existing.date) map.set(row.sector_id, row);
    }
    return Array.from(map.values());
  }, [sectorHealth]);

  const sorted = useMemo(() =>
    [...latestBySector].sort((a, b) => (b.health_score ?? 0) - (a.health_score ?? 0)),
    [latestBySector]
  );

  const top3    = useMemo(() => sorted.filter(s => s.cum_change_1y != null).slice(0, 3), [sorted]);
  const bottom3 = useMemo(() => [...sorted].filter(s => s.cum_change_1y != null).reverse().slice(0, 3), [sorted]);

  // Sector vs Sector comparison state
  const [sectorA, setSectorA] = useState(null);
  const [sectorB, setSectorB] = useState(null);

  React.useEffect(() => {
    if (sorted.length >= 2 && !sectorA && !sectorB) {
      setSectorA(sorted[0]?.sector_id ?? null);
      setSectorB(sorted[sorted.length - 1]?.sector_id ?? null);
    }
  }, [sorted]);

  // Sparklines: last 60 days composite per sector
  const sparkMap = useMemo(() => {
    const map = new Map();
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    for (const row of sectorHealthHistory || []) {
      if (row.date < cutoffStr) continue;
      if (!map.has(row.sector_id)) map.set(row.sector_id, []);
      map.get(row.sector_id).push({ date: row.date, v: row.composite });
    }
    for (const [, arr] of map) arr.sort((a, b) => a.date < b.date ? -1 : 1);
    return map;
  }, [sectorHealthHistory]);

  // Sector vs Sector comparison chart data
  const comparisonData = useMemo(() => {
    if (!sectorA || !sectorB) return [];
    const aData = (sectorHealthHistory || []).filter(r => r.sector_id === sectorA);
    const bData = (sectorHealthHistory || []).filter(r => r.sector_id === sectorB);
    const aMap = new Map(aData.map(r => [r.date, r.health_score]));
    const bMap = new Map(bData.map(r => [r.date, r.health_score]));
    const dates = Array.from(new Set([...aMap.keys(), ...bMap.keys()])).sort();
    // Sample every 5th point
    return dates.filter((_, i) => i % 5 === 0).map(date => ({
      date,
      sectorA: aMap.get(date) ?? null,
      sectorB: bMap.get(date) ?? null,
    }));
  }, [sectorA, sectorB, sectorHealthHistory]);

  const sectorARecord = useMemo(() => latestBySector.find(s => s.sector_id === sectorA), [sectorA, latestBySector]);
  const sectorBRecord = useMemo(() => latestBySector.find(s => s.sector_id === sectorB), [sectorB, latestBySector]);

  // Best sector OHLCV
  const bestSector = sorted[0] ?? null;
  const bestOhlcv = useMemo(() => {
    if (!bestSector) return [];
    return (sectorOhlcvAll || [])
      .filter(r => r.sector_id === bestSector.sector_id)
      .sort((a, b) => a.date < b.date ? -1 : 1);
  }, [bestSector, sectorOhlcvAll]);

  // Pressure alerts
  const pressureAlerts = useMemo(() =>
    latestBySector.filter(r => r.spike_down === true || (r.ret_z != null && r.ret_z < -2) || (r.cum_change_1y != null && r.cum_change_1y < -10)),
    [latestBySector]
  );

  if (loading.portfolio) return <Skel />;

  return (
    <div className="page-wrap animate-fade-in">

      {/* Header */}
      <div>
        <p className="page-eyebrow">AEGIS-FIN · MACRO INTELLIGENCE</p>
        <h1 className="page-title">Sector Contagion Watch</h1>
        <p className="page-subtitle">{latestBySector.length} sectors monitored · Pressure signals and health pulse</p>
        {errors.portfolio && <span className="badge badge-red" style={{ marginTop: 6, display: "inline-flex" }}>{errors.portfolio}</span>}
      </div>

      {/* Top 3 / Bottom 3 */}
      <div className="grid-2">
        <div className="card" style={{ padding: 14 }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--orange)", marginBottom: 10 }}>▲ Top Performers</p>
          {top3.length === 0 ? <p className="muted" style={{ fontSize: 12 }}>No data</p> : top3.map((r, i) => (
            <div key={r.sector_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < top3.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 3, height: 28, borderRadius: 99, background: "var(--orange)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sectors?.name ?? "—"}</p>
                <p className="muted" style={{ fontSize: 10 }}>Health {fmt(r.health_score)}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--orange)", flexShrink: 0 }}>{fmtPct(r.cum_change_1y)}</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 14 }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#EF4444", marginBottom: 10 }}>▼ Laggards</p>
          {bottom3.length === 0 ? <p className="muted" style={{ fontSize: 12 }}>No data</p> : bottom3.map((r, i) => (
            <div key={r.sector_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < bottom3.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 3, height: 28, borderRadius: 99, background: "#EF4444", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sectors?.name ?? "—"}</p>
                <p className="muted" style={{ fontSize: 10 }}>Health {fmt(r.health_score)}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", flexShrink: 0 }}>{fmtPct(r.cum_change_1y)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Best Sector OHLCV Spotlight */}
      {bestSector && bestOhlcv.length > 2 && (
        <div className="card-accent">
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--orange)", marginBottom: 2 }}>Best Performing Sector</p>
              <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-.02em" }}>{bestSector.sectors?.name ?? "—"}</p>
            </div>
            <div style={{ display: "flex", gap: 16, marginLeft: "auto", flexWrap: "wrap" }}>
              {[
                { l: "Health", v: fmt(bestSector.health_score) },
                { l: "1Y Return", v: fmtPct(bestSector.cum_change_1y) },
                { l: "Volatility", v: bestSector.volatility != null ? Number(bestSector.volatility).toFixed(3) : "—" },
                { l: "Ret Z", v: bestSector.ret_z != null ? Number(bestSector.ret_z).toFixed(2) : "—" },
              ].map(({ l, v }) => (
                <div key={l} style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 2 }}>{l}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--orange)", lineHeight: 1 }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>90-Day Close Price</p>
            {bestOhlcv.length > 0 && (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "var(--text-2)" }}>C: <strong style={{ color: "var(--orange)" }}>{Number(bestOhlcv[bestOhlcv.length - 1].close).toFixed(2)}</strong></span>
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={70}>
            <AreaChart data={bestOhlcv} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
              <defs>
                <linearGradient id="bestGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#E8572A" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#E8572A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, padding: "4px 8px" }} formatter={v => [Number(v).toFixed(2), "Close"]} labelFormatter={l => l} />
              <Area type="monotone" dataKey="close" stroke="var(--orange)" strokeWidth={2} fill="url(#bestGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sector vs Sector Comparison */}
      {sorted.length >= 2 && (
        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <span className="title-sm">Sector vs Sector — Health Score Comparison</span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <p className="kpi-compact-label" style={{ marginBottom: 4 }}>Sector A</p>
              <select
                value={sectorA ?? ""}
                onChange={e => setSectorA(e.target.value)}
                className="input-base"
                style={{ padding: "7px 10px", fontSize: 12 }}
              >
                {sorted.map(s => (
                  <option key={s.sector_id} value={s.sector_id}>{s.sectors?.name ?? s.sector_id}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <p className="kpi-compact-label" style={{ marginBottom: 4 }}>Sector B</p>
              <select
                value={sectorB ?? ""}
                onChange={e => setSectorB(e.target.value)}
                className="input-base"
                style={{ padding: "7px 10px", fontSize: 12 }}
              >
                {sorted.map(s => (
                  <option key={s.sector_id} value={s.sector_id}>{s.sectors?.name ?? s.sector_id}</option>
                ))}
              </select>
            </div>
            {/* KPI comparison */}
            {sectorARecord && sectorBRecord && (
              <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
                {[
                  { l: "Health A", v: fmt(sectorARecord.health_score), c: scoreColor(sectorARecord.health_score) },
                  { l: "Health B", v: fmt(sectorBRecord.health_score), c: scoreColor(sectorBRecord.health_score) },
                  { l: "1Y A", v: fmtPct(sectorARecord.cum_change_1y), c: sectorARecord.cum_change_1y >= 0 ? "var(--orange)" : "#EF4444" },
                  { l: "1Y B", v: fmtPct(sectorBRecord.cum_change_1y), c: sectorBRecord.cum_change_1y >= 0 ? "var(--orange)" : "#EF4444" },
                ].map(({ l, v, c }) => (
                  <div key={l}>
                    <p className="kpi-compact-label">{l}</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {comparisonData.length > 0 ? (
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: "var(--text-3)", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v?.slice(5)} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} width={28} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v, name) => [v != null ? Number(v).toFixed(1) : "—", name]} />
                  <Line type="monotone" dataKey="sectorA" name={sectorARecord?.sectors?.name ?? "Sector A"} stroke="var(--orange)" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="sectorB" name={sectorBRecord?.sectors?.name ?? "Sector B"} stroke="#EF4444" strokeWidth={2} strokeDasharray="4 3" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 12 }}>No history data for selected sectors.</p>
          )}
        </div>
      )}

      {/* Sector Pulse Grid */}
      <div>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 10 }}>Sector Pulse</p>
        {sorted.length === 0 ? (
          <p className="muted" style={{ fontSize: 12 }}>No sector data available.</p>
        ) : (
          <div className="grid-auto">
            {sorted.map(r => {
              const score = r.health_score ?? 0;
              const lc = score >= 60 ? "var(--orange)" : "#EF4444";
              const scoreBg = score >= 60 ? "rgba(232,87,42,0.1)" : "rgba(239,68,68,0.1)";
              const sparkData = sparkMap.get(r.sector_id) ?? [];
              return (
                <div key={r.sector_id} className="card" style={{ padding: 12, height: 120, display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {r.sectors?.name ?? "—"}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: scoreColor(score), background: scoreBg, borderRadius: 6, padding: "2px 6px", flexShrink: 0 }}>
                      {fmt(score)}
                    </span>
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    {sparkData.length > 2 ? (
                      <ResponsiveContainer width="100%" height={40}>
                        <LineChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                          <Line type="monotone" dataKey="v" stroke={lc} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: 40, display: "flex", alignItems: "center" }}>
                        <span className="muted" style={{ fontSize: 9 }}>no history</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex" }}>
                    {[
                      { l: "1Y", v: fmtPct(r.cum_change_1y) },
                      { l: "VOL", v: r.volatility != null ? Number(r.volatility).toFixed(2) : "—" },
                      { l: "Z", v: r.ret_z != null ? Number(r.ret_z).toFixed(1) : "—" },
                    ].map(({ l, v }) => (
                      <div key={l} style={{ flex: 1, textAlign: "center" }}>
                        <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 1 }}>{l}</p>
                        <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text)", lineHeight: 1 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pressure Signals */}
      {pressureAlerts.length > 0 && (
        <div className="card" style={{ padding: 14 }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>Pressure Signals</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {pressureAlerts.map(r => {
              const triggers = [];
              if (r.spike_down) triggers.push("spike↓");
              if (r.ret_z != null && r.ret_z < -2) triggers.push(`z=${Number(r.ret_z).toFixed(1)}`);
              if (r.cum_change_1y != null && r.cum_change_1y < -10) triggers.push(`1Y ${fmtPct(r.cum_change_1y)}`);
              return (
                <div key={r.sector_id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 8, padding: "4px 10px" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{r.sectors?.name ?? r.sector_id}</span>
                  <span style={{ fontSize: 10, color: "#EF4444", fontWeight: 500 }}>{triggers.join(" · ")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
