import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Users } from "lucide-react";
import { useAegisData } from "../context/AegisDataContext";
import GaugeChart from "../charts/GaugeChart";

// ── Helpers ────────────────────────────────────────────────────────────────

export function renderValue(value, decimals) {
  if (value === null || value === undefined) return "—";
  if (decimals !== undefined) return Number(value).toFixed(decimals);
  return String(value);
}

export function shouldShowSmartMoneyFlight(promoterHistory) {
  if (!promoterHistory || promoterHistory.length < 5) return false;
  const sorted = [...promoterHistory].sort((a, b) => a.period < b.period ? -1 : a.period > b.period ? 1 : 0);
  const mostRecent = sorted[sorted.length - 1].value;
  const fourPeriodsAgo = sorted[sorted.length - 5].value;
  if (mostRecent === null || mostRecent === undefined) return false;
  if (fourPeriodsAgo === null || fourPeriodsAgo === undefined) return false;
  return mostRecent - fourPeriodsAgo < -5;
}

const isPromoterHolding = n => n.includes("promoter");
const isInstitutional   = n => n.includes("institutional");
const isInsiderNetBuy   = n => n.includes("insider") && (n.includes("buy") || n.includes("net buy"));
const isFII             = n => n.includes("fii");
const isDII             = n => n.includes("dii");
const isPublic          = n => n.includes("public float") || (n.includes("public") && !n.includes("insider"));
const isHHI             = n => n.includes("hhi") || n.includes("herfindahl") || n.includes("concentration");

function findLatest(records, matchFn) {
  const matched = (records || []).filter(r => r.holding_metric_definitions && matchFn(r.holding_metric_definitions.name.toLowerCase()));
  return matched.length === 0 ? null : matched[0];
}

function getHistory(records, matchFn) {
  return (records || [])
    .filter(r => r.holding_metric_definitions && matchFn(r.holding_metric_definitions.name.toLowerCase()))
    .slice()
    .sort((a, b) => a.period < b.period ? -1 : a.period > b.period ? 1 : 0);
}

function statusBadgeClass(status) {
  if (!status) return "badge-gray";
  const s = status.toLowerCase();
  if (s.includes("critical") || s.includes("high risk") || s.includes("danger")) return "badge-red";
  if (s.includes("warning") || s.includes("moderate")) return "badge-amber";
  if (s.includes("good") || s.includes("healthy") || s.includes("strong")) return "badge-green";
  return "badge-gray";
}

function sectorPressureStyle(val) {
  if (val === null || val === undefined) return { color: "var(--text-3)" };
  if (val > 0.7) return { color: "#EF4444", fontWeight: 700 };
  if (val >= 0.3) return { color: "var(--orange)", fontWeight: 600 };
  return { color: "var(--text-3)" };
}

function HistRankBadge({ rank }) {
  if (rank === null || rank === undefined) return <span className="muted">—</span>;
  const n = Number(rank);
  if (n < 10) return <span className="badge badge-red" style={{ fontSize: 9 }}>{n.toFixed(0)}</span>;
  if (n < 25) return <span className="badge badge-amber" style={{ fontSize: 9 }}>{n.toFixed(0)}</span>;
  return <span className="muted" style={{ fontSize: 11 }}>{n.toFixed(0)}</span>;
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function OwnershipTracking() {
  const { id } = useParams();
  const { holdingScores, company, loading, errors, setCompanyId } = useAegisData();

  React.useEffect(() => { if (id) setCompanyId(id); }, [id, setCompanyId]);

  const latestPromoter      = useMemo(() => findLatest(holdingScores, isPromoterHolding), [holdingScores]);
  const latestInstitutional = useMemo(() => findLatest(holdingScores, isInstitutional),   [holdingScores]);
  const latestInsiderNetBuy = useMemo(() => findLatest(holdingScores, isInsiderNetBuy),   [holdingScores]);
  const latestFII           = useMemo(() => findLatest(holdingScores, isFII),             [holdingScores]);
  const latestDII           = useMemo(() => findLatest(holdingScores, isDII),             [holdingScores]);
  const latestPublic        = useMemo(() => findLatest(holdingScores, isPublic),          [holdingScores]);
  const latestHHI           = useMemo(() => findLatest(holdingScores, isHHI),             [holdingScores]);

  const promoterHistory = useMemo(() => getHistory(holdingScores, isPromoterHolding), [holdingScores]);
  const showSmartMoneyFlight = useMemo(() => shouldShowSmartMoneyFlight(promoterHistory), [promoterHistory]);
  const showNegativeInsider  = useMemo(() => {
    const val = latestInsiderNetBuy?.value;
    return val !== null && val !== undefined && val < 0;
  }, [latestInsiderNetBuy]);

  const stackedAreaData = useMemo(() => {
    const promoterRecs = getHistory(holdingScores, isPromoterHolding);
    const fiiRecs      = getHistory(holdingScores, isFII);
    const diiRecs      = getHistory(holdingScores, isDII);
    const publicRecs   = getHistory(holdingScores, isPublic);
    const periodSet = new Set([
      ...promoterRecs.map(r => r.period),
      ...fiiRecs.map(r => r.period),
      ...diiRecs.map(r => r.period),
      ...publicRecs.map(r => r.period),
    ]);
    const pm = Object.fromEntries(promoterRecs.map(r => [r.period, r.value]));
    const fm = Object.fromEntries(fiiRecs.map(r => [r.period, r.value]));
    const dm = Object.fromEntries(diiRecs.map(r => [r.period, r.value]));
    const pu = Object.fromEntries(publicRecs.map(r => [r.period, r.value]));
    return [...periodSet].sort().map(period => ({
      period,
      Promoters: pm[period] ?? null,
      FII:       fm[period] ?? null,
      DII:       dm[period] ?? null,
      Public:    pu[period] ?? null,
    }));
  }, [holdingScores]);

  const insiderBarData = useMemo(() =>
    getHistory(holdingScores, isInsiderNetBuy).map(r => ({ period: r.period, value: r.value })),
    [holdingScores]
  );

  const allMetricsRows = useMemo(() => {
    const m = new Map();
    for (const r of holdingScores || []) {
      const key = r.metric_id;
      if (key == null) continue;
      if (!m.has(key)) m.set(key, r);
    }
    return Array.from(m.values());
  }, [holdingScores]);

  const metricsByCategory = useMemo(() => {
    const map = new Map();
    for (const row of allMetricsRows) {
      const cat = row.holding_metric_definitions?.category ?? "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(row);
    }
    return map;
  }, [allMetricsRows]);

  const sectorPressureByCategory = useMemo(() => {
    const result = [];
    for (const [cat, rows] of metricsByCategory.entries()) {
      const withPressure = rows.filter(r => r.sector_pressure != null);
      if (withPressure.length === 0) { result.push({ category: cat, avgPressure: null }); continue; }
      const avg = withPressure.reduce((sum, r) => sum + Number(r.sector_pressure), 0) / withPressure.length;
      result.push({ category: cat, avgPressure: avg });
    }
    return result.sort((a, b) => (b.avgPressure ?? -1) - (a.avgPressure ?? -1));
  }, [metricsByCategory]);

  if (loading.company) {
    return (
      <div className="page-wrap animate-fade-in">
        <div><p className="page-eyebrow">AEGIS-FIN · OWNERSHIP</p><h1 className="page-title">Smart Money & Ownership</h1></div>
        <div className="grid-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 14 }} />)}</div>
        <div className="skeleton" style={{ height: 220, borderRadius: 14 }} />
      </div>
    );
  }

  if (!loading.company && (holdingScores || []).length === 0 && !errors.company) {
    return (
      <div className="page-wrap animate-fade-in">
        <div>
          <p className="page-eyebrow">AEGIS-FIN · OWNERSHIP</p>
          <h1 className="page-title">{company ? company.name : "Smart Money & Ownership"}</h1>
          {company && <p className="page-subtitle">{company.ticker} · No ownership data available</p>}
        </div>
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <Users size={32} style={{ color: "var(--text-3)", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>No holding score records found</p>
          <p className="muted" style={{ marginTop: 4 }}>Run the fundamentals pipeline to populate ownership data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap animate-fade-in">

      {/* Header */}
      <div>
        <p className="page-eyebrow">AEGIS-FIN · SMART MONEY TRACKER</p>
        <h1 className="page-title">{company ? company.name : "Smart Money & Ownership"}</h1>
        {company && <p className="page-subtitle">{company.ticker} · Promoter holding, institutional ownership, and insider activity signals</p>}
      </div>

      {errors.company && <div className="warning-strip"><span>⚠</span><span>{errors.company}</span></div>}

      {/* Smart Money Flight Alerts */}
      {showSmartMoneyFlight && (
        <div className="warning-strip">
          <Users size={15} />
          <span>Smart Money Flight: Promoter Holding % has declined by more than 5pp over the last 4 periods — insider confidence deteriorating.</span>
        </div>
      )}
      {showNegativeInsider && (
        <div className="warning-strip" style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)", color: "#92400E" }}>
          <Users size={15} />
          <span>Negative Insider Activity: Insider Net Buy % is negative — net insider selling detected.</span>
        </div>
      )}

      {/* KPI Grid — 2 rows of 3 */}
      <div className="grid-3">
        {[
          { label: "Promoter Holding %",      rec: latestPromoter,      alert: v => v < 30 },
          { label: "Institutional Ownership %", rec: latestInstitutional, alert: () => false },
          { label: "Insider Net Buy %",        rec: latestInsiderNetBuy, alert: v => v < 0 },
          { label: "FII %",                    rec: latestFII,           alert: () => false },
          { label: "DII %",                    rec: latestDII,           alert: () => false },
          { label: "Public Float %",           rec: latestPublic,        alert: () => false },
        ].map(({ label, rec, alert }) => {
          const isDanger = rec?.value != null && alert(rec.value);
          return (
            <div key={label} className={isDanger ? "kpi-card-danger" : "kpi-card"}>
              <p className="kpi-compact-label">{label}</p>
              <p className="kpi-compact-value" style={{ color: isDanger ? "#EF4444" : "var(--text)" }}>
                {renderValue(rec?.value, 2)}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                {rec?.hist_pct_rank != null && <HistRankBadge rank={rec.hist_pct_rank} />}
                {(rec?.adjusted_status || rec?.status) && (
                  <span className={`badge ${statusBadgeClass(rec.adjusted_status || rec.status)}`} style={{ fontSize: 9 }}>
                    {rec.adjusted_status || rec.status}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ownership Distribution + Insider Activity */}
      <div className="grid-2">
        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Ownership Distribution — Trend</span>
          </div>
          {stackedAreaData.length === 0 ? (
            <p className="muted" style={{ fontSize: 12, padding: "20px 0" }}>No ownership distribution data.</p>
          ) : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stackedAreaData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    {[["promotersGrad","#E8572A"],["fiiGrad","#F06A3A"],["diiGrad","#C2410C"],["publicGrad","#9A3412"]].map(([id, color]) => (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={color} stopOpacity={0.65} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="period" tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} width={28} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(val, name) => [val != null ? `${Number(val).toFixed(2)}%` : "—", name]} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Area type="monotone" dataKey="Promoters" stackId="o" stroke="#E8572A" strokeWidth={1.5} fill="url(#promotersGrad)" dot={false} activeDot={{ r: 3 }} />
                  <Area type="monotone" dataKey="FII"       stackId="o" stroke="#F06A3A" strokeWidth={1.5} fill="url(#fiiGrad)"       dot={false} activeDot={{ r: 3 }} />
                  <Area type="monotone" dataKey="DII"       stackId="o" stroke="#C2410C" strokeWidth={1.5} fill="url(#diiGrad)"       dot={false} activeDot={{ r: 3 }} />
                  <Area type="monotone" dataKey="Public"    stackId="o" stroke="#9A3412" strokeWidth={1.5} fill="url(#publicGrad)"    dot={false} activeDot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Insider Net Buy % — Per Period</span>
            <span className="muted" style={{ marginLeft: "auto", fontSize: 10 }}>Red = selling</span>
          </div>
          {insiderBarData.length === 0 ? (
            <p className="muted" style={{ fontSize: 12, padding: "20px 0" }}>No insider activity data.</p>
          ) : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insiderBarData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="period" tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} width={28} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={val => [val != null ? `${Number(val).toFixed(2)}%` : "—", "Insider Net Buy %"]} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {insiderBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.value != null && entry.value < 0 ? "#EF4444" : "#E8572A"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* HHI Gauge + Sector Pressure */}
      <div className="grid-2">
        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Holder Concentration (HHI)</span>
          </div>
          {latestHHI === null ? (
            <p className="muted" style={{ fontSize: 12, padding: "20px 0" }}>No HHI data available.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8 }}>
              <GaugeChart value={latestHHI?.value ?? null} label="HHI Score" size={160} />
              <p className="muted" style={{ fontSize: 11, marginTop: 8, textAlign: "center" }}>
                Higher HHI = greater concentration risk
                {latestHHI?.period && <span> · {latestHHI.period}</span>}
              </p>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <span className="title-sm">Sector Pressure by Category</span>
          </div>
          {sectorPressureByCategory.length === 0 ? (
            <p className="muted" style={{ fontSize: 12 }}>No sector pressure data.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sectorPressureByCategory.map(({ category, avgPressure }) => {
                const spNum = avgPressure != null ? Number(avgPressure) : null;
                const barColor = spNum != null && spNum > 0.7 ? "#EF4444" : spNum != null && spNum >= 0.3 ? "var(--orange)" : "#E8572A";
                return (
                  <div key={category}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{category}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, ...sectorPressureStyle(avgPressure) }}>
                        {spNum != null ? spNum.toFixed(2) : "—"}
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: spNum != null ? `${Math.min(spNum * 100, 100)}%` : "0%", background: barColor }} />
                    </div>
                    <p className="muted" style={{ fontSize: 10, marginTop: 2 }}>avg sector pressure</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* All Metrics Table */}
      {allMetricsRows.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <span className="title-sm">All Ownership Metrics — By Category</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Metric Name</th>
                  <th style={{ textAlign: "right" }}>Value</th>
                  <th style={{ textAlign: "right" }}>Hist Rank</th>
                  <th style={{ textAlign: "right" }}>Sector Pressure</th>
                  <th>Trend</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(metricsByCategory.entries()).map(([category, rows]) => (
                  <React.Fragment key={category}>
                    <tr>
                      <td colSpan={6} style={{ padding: "8px 14px 5px", background: "rgba(232,87,42,0.04)", borderBottom: "1px solid var(--border)" }}>
                        <span className="label-caps" style={{ color: "var(--orange)" }}>{category}</span>
                      </td>
                    </tr>
                    {rows.map(row => {
                      const name = row.holding_metric_definitions?.name ?? "—";
                      const sp = row.sector_pressure;
                      return (
                        <tr key={`${category}-${name}`}>
                          <td style={{ paddingLeft: 22, fontWeight: 500 }}>{name}</td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{renderValue(row.value, 2)}</td>
                          <td style={{ textAlign: "right" }}><HistRankBadge rank={row.hist_pct_rank} /></td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", ...sectorPressureStyle(sp) }}>
                            {sp != null ? Number(sp).toFixed(2) : "—"}
                          </td>
                          <td><span className="muted" style={{ fontSize: 11 }}>{row.trend ?? "—"}</span></td>
                          <td>
                            {(row.adjusted_status || row.status)
                              ? <span className={`badge ${statusBadgeClass(row.adjusted_status || row.status)}`} style={{ fontSize: 9 }}>{row.adjusted_status || row.status}</span>
                              : <span className="muted">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
