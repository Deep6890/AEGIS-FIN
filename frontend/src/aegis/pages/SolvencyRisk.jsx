import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  AreaChart, Area, LineChart, Line, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { ShieldAlert } from "lucide-react";
import { useAegisData } from "../context/AegisDataContext";

// ── Helpers ────────────────────────────────────────────────────────────────

export function renderValue(value, decimals) {
  if (value === null || value === undefined) return "—";
  if (decimals !== undefined) return Number(value).toFixed(decimals);
  return String(value);
}

export function shouldShowDefaultWarning(v) {
  if (v === null || v === undefined) return false;
  return v < 1.5;
}

export function findLatestRecord(records, matchFn) {
  const matched = (records || []).filter(r => r.ratio_definitions && matchFn(r.ratio_definitions.name.toLowerCase()));
  return matched.length === 0 ? null : matched[0];
}

export function getMetricHistory(records, matchFn) {
  return (records || [])
    .filter(r => r.ratio_definitions && matchFn(r.ratio_definitions.name.toLowerCase()))
    .slice()
    .sort((a, b) => a.period < b.period ? -1 : a.period > b.period ? 1 : 0);
}

export function getYoyDropRows(records) {
  const latestByName = new Map();
  for (const r of records || []) {
    const name = r.ratio_definitions?.name;
    if (!name) continue;
    if (!latestByName.has(name)) latestByName.set(name, r);
  }
  return Array.from(latestByName.values()).filter(r => r.yoy_pct !== null && r.yoy_pct !== undefined && r.yoy_pct < -20);
}

const isDebtEquity   = n => n === "debt/equity" || (n.includes("debt") && n.includes("equity") && !n.includes("asset"));
const isDebtAssets   = n => n === "debt/assets" || (n.includes("debt") && (n.includes("asset") || n.includes("assets")) && !n.includes("equity"));
const isInterestCov  = n => n.includes("interest") && n.includes("coverage");
const isCurrentRatio = n => n === "current ratio" || (n.includes("current") && n.includes("ratio"));

function statusBadgeClass(status) {
  return "badge-orange"; // Using monolithic terracotta theme
}

function sectorPressureStyle(val) {
  if (val === null || val === undefined) return { color: "var(--ink-3)" };
  if (val > 0.7) return { color: "var(--terra-3)", fontWeight: 700 };
  if (val >= 0.3) return { color: "var(--terra)", fontWeight: 600 };
  return { color: "var(--ink-3)" };
}

function HistRankBadge({ rank }) {
  if (rank === null || rank === undefined) return <span className="muted">—</span>;
  const n = Number(rank);
  if (n < 10) return <span className="badge badge-orange" style={{ fontSize: 9 }}>{n.toFixed(0)}</span>;
  if (n < 25) return <span className="badge badge-orange" style={{ fontSize: 9 }}>{n.toFixed(0)}</span>;
  return <span className="muted" style={{ fontSize: 11 }}>{n.toFixed(0)}</span>;
}

function ChartTooltip({ active, payload, label, metricName }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <p style={{ fontWeight: 600, marginBottom: 3, color: "var(--ink-2)", fontSize: 11 }}>{label}</p>
      <p style={{ color: "var(--terra)", fontWeight: 700 }}>{metricName}: {renderValue(payload[0]?.value, 2)}</p>
    </div>
  );
}

function HealthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <p style={{ fontWeight: 600, marginBottom: 3, color: "var(--ink-2)", fontSize: 11 }}>{label}</p>
      {payload.map(entry => (
        <p key={entry.dataKey} style={{ color: entry.color, margin: "2px 0", fontWeight: 600 }}>
          {entry.name}: {entry.value != null ? Number(entry.value).toFixed(1) : "—"}
        </p>
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function SolvencyRisk() {
  const { id } = useParams();
  const { balanceSheet, ohlcvHealth, sectorHealthDetail, company, loading, errors, setCompanyId } = useAegisData();

  React.useEffect(() => { if (id) setCompanyId(id); }, [id, setCompanyId]);

  const llRecords = useMemo(() =>
    (balanceSheet || []).filter(r => r.ratio_definitions &&
      (r.ratio_definitions.category === "Leverage" || r.ratio_definitions.category === "Liquidity")),
    [balanceSheet]
  );

  const latestDE = useMemo(() => findLatestRecord(llRecords, isDebtEquity),   [llRecords]);
  const latestDA = useMemo(() => findLatestRecord(llRecords, isDebtAssets),   [llRecords]);
  const latestIC = useMemo(() => findLatestRecord(llRecords, isInterestCov),  [llRecords]);
  const latestCR = useMemo(() => findLatestRecord(llRecords, isCurrentRatio), [llRecords]);

  const deHistory = useMemo(() => getMetricHistory(llRecords, isDebtEquity).map(r => ({ period: r.period, value: r.value })), [llRecords]);
  const icHistory = useMemo(() => getMetricHistory(llRecords, isInterestCov).map(r => ({ period: r.period, value: r.value })), [llRecords]);

  const sectorPressureRows = useMemo(() => {
    const m = new Map();
    for (const r of llRecords) {
      const name = r.ratio_definitions?.name;
      if (!name) continue;
      if (!m.has(name)) m.set(name, r);
    }
    return Array.from(m.values());
  }, [llRecords]);

  const healthChartData = useMemo(() => {
    const cm = new Map((ohlcvHealth || []).map(r => [r.date, r.health_score]));
    const sm = new Map((sectorHealthDetail || []).map(r => [r.date, r.health_score]));
    const dates = Array.from(new Set([...cm.keys(), ...sm.keys()])).sort();
    // Sample every 5th point to avoid overcrowding
    return dates.filter((_, i) => i % 5 === 0).map(date => ({ date, company: cm.get(date) ?? null, sector: sm.get(date) ?? null }));
  }, [ohlcvHealth, sectorHealthDetail]);

  const showDefaultWarning = useMemo(() => shouldShowDefaultWarning(latestIC?.value), [latestIC]);
  const yoyDropRows = useMemo(() => getYoyDropRows(llRecords), [llRecords]);

  if (loading.company) {
    return (
      <div className="page-wrap animate-fade-in">
        <div><p className="page-eyebrow">AEGIS-FIN · SOLVENCY</p><h1 className="page-title">Solvency & Leverage Risk</h1></div>
        <div className="grid-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 14 }} />)}</div>
        <div className="grid-2">{[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />)}</div>
        <div className="skeleton" style={{ height: 160, borderRadius: 14 }} />
      </div>
    );
  }

  if (!loading.company && llRecords.length === 0 && !errors.company) {
    return (
      <div className="page-wrap animate-fade-in">
        <div>
          <p className="page-eyebrow">AEGIS-FIN · SOLVENCY</p>
          <h1 className="page-title">{company ? company.name : "Solvency & Leverage Risk"}</h1>
          {company && <p className="page-subtitle">{company.ticker} · No balance sheet data available</p>}
        </div>
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <ShieldAlert size={32} style={{ color: "var(--ink-3)", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-2)" }}>No Leverage or Liquidity records found</p>
          <p className="muted" style={{ marginTop: 4 }}>Run the fundamentals pipeline to populate balance sheet data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap animate-fade-in">

      {/* Header */}
      <div>
        <p className="page-eyebrow">AEGIS-FIN · SOLVENCY MONITOR</p>
        <h1 className="page-title">{company ? company.name : "Solvency & Leverage Risk"}</h1>
        {company && <p className="page-subtitle">{company.ticker} · Debt levels, coverage ratios, and default signals</p>}
      </div>

      {errors.company && (
        <div className="warning-strip"><span>⚠</span><span>{errors.company}</span></div>
      )}

      {/* Default Warning */}
      {showDefaultWarning && (
        <div className="warning-strip" style={{ borderColor: "var(--terra-3)", background: "rgba(184,78,40,.06)" }}>
          <ShieldAlert size={15} style={{ color: "var(--terra-3)" }} />
          <span style={{ color: "var(--terra-3)" }}>Default Warning: Interest Coverage {renderValue(latestIC?.value, 2)} — below 1.5 threshold. Imminent default risk.</span>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid-4">
        {[
          { label: "Debt / Equity",     rec: latestDE, danger: v => v > 2 },
          { label: "Debt / Assets",     rec: latestDA, danger: v => v > 0.6 },
          { label: "Interest Coverage", rec: latestIC, danger: v => v < 1.5 },
          { label: "Current Ratio",     rec: latestCR, danger: v => v < 1 },
        ].map(({ label, rec, danger }) => {
          const isDanger = rec?.value != null && danger(rec.value);
          return (
            <div key={label} className="kpi-card">
              <p className="kpi-compact-label" style={{ marginBottom: 8 }}>{label}</p>
              <p style={{ fontSize: "3rem", fontWeight: 900, letterSpacing: "-.06em", lineHeight: 1.05, color: isDanger ? "var(--terra-3)" : "var(--ink)" }}>
                {renderValue(rec?.value, 2)}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                {rec?.yoy_pct != null && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: rec.yoy_pct >= 0 ? "var(--terra)" : "var(--terra-3)" }}>
                    {rec.yoy_pct >= 0 ? "+" : ""}{Number(rec.yoy_pct).toFixed(1)}% YoY
                  </span>
                )}
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

      {/* Charts */}
      <div className="grid-2">
        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Debt / Equity — Trend</span>
          </div>
          {deHistory.length === 0 ? (
            <p className="muted" style={{ fontSize: 12, padding: "20px 0" }}>No Debt/Equity history available.</p>
          ) : (
            <div style={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={deHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="deGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--terra)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--terra)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="period" tick={{ fill: "var(--ink-3)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--ink-3)", fontSize: 10 }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip content={<ChartTooltip metricName="Debt/Equity" />} />
                  <Area type="monotone" dataKey="value" stroke="var(--terra)" strokeWidth={2} fill="url(#deGrad)" dot={false} activeDot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Interest Coverage</span>
            <span className="muted" style={{ marginLeft: "auto", fontSize: 10 }}>Red line = 1.5 threshold</span>
          </div>
          {icHistory.length === 0 ? (
            <p className="muted" style={{ fontSize: 12, padding: "20px 0" }}>No Interest Coverage history available.</p>
          ) : (
            <div style={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={icHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="period" tick={{ fill: "var(--ink-3)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--ink-3)", fontSize: 10 }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip content={<ChartTooltip metricName="Interest Coverage" />} />
                  <ReferenceLine y={1.5} stroke="var(--terra-3)" strokeDasharray="4 3" label={{ value: "1.5", fill: "var(--terra-3)", fontSize: 10, position: "insideTopRight" }} />
                  <Line type="monotone" dataKey="value" stroke="var(--terra)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Company vs Sector Health */}
      {healthChartData.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Company vs Sector Health Score</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontSize: 11, color: "var(--ink-3)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 12, height: 2, background: "var(--terra)", display: "inline-block" }} /> Company
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 12, height: 2, background: "var(--terra-3)", display: "inline-block" }} /> Sector
              </span>
            </div>
          </div>
          <div style={{ height: 150 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: "var(--ink-3)", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v?.slice(5)} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "var(--ink-3)", fontSize: 10 }} tickLine={false} axisLine={false} width={28} domain={[0, 100]} />
                <Tooltip content={<HealthTooltip />} />
                <Line type="monotone" dataKey="company" name="Company" stroke="var(--terra)" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="sector" name="Sector" stroke="var(--terra-3)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sector Pressure Table */}
      {sectorPressureRows.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <span className="title-sm">Leverage & Liquidity — Sector Pressure</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th style={{ textAlign: "right" }}>Value</th>
                  <th style={{ textAlign: "right" }}>YoY %</th>
                  <th style={{ textAlign: "right" }}>Hist Rank</th>
                  <th style={{ textAlign: "right" }}>Sector Pressure</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sectorPressureRows.map(row => {
                  const name = row.ratio_definitions?.name ?? "—";
                  const sp = row.sector_pressure;
                  return (
                    <tr key={name}>
                      <td style={{ fontWeight: 500 }}>{name}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{renderValue(row.value, 2)}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: row.yoy_pct == null ? "var(--ink-3)" : row.yoy_pct >= 0 ? "var(--terra)" : "var(--terra-3)", fontWeight: row.yoy_pct != null ? 600 : 400 }}>
                        {row.yoy_pct != null ? `${row.yoy_pct >= 0 ? "+" : ""}${Number(row.yoy_pct).toFixed(2)}%` : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}><HistRankBadge rank={row.hist_pct_rank} /></td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", ...sectorPressureStyle(sp) }}>
                        {sp != null ? Number(sp).toFixed(2) : "—"}
                      </td>
                      <td>
                        {(row.adjusted_status || row.status)
                          ? <span className={`badge ${statusBadgeClass(row.adjusted_status || row.status)}`} style={{ fontSize: 9 }}>{row.adjusted_status || row.status}</span>
                          : <span className="muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* YoY Drop Alert */}
      {yoyDropRows.length > 0 && (
        <div className="card" style={{ background: "rgba(184,78,40,.04)", border: "1px solid var(--terra-3)" }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm" style={{ color: "var(--terra-3)" }}>YoY Drop Alert — Metrics Below −20%</span>
          </div>
          {yoyDropRows.map((row, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: idx < yoyDropRows.length - 1 ? "1px solid var(--border)" : "none" }}>
              <span className="ticker-chip">{row.ratio_definitions?.category ?? "—"}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>{row.ratio_definitions?.name ?? "—"}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--terra-3)" }}>{row.yoy_pct != null ? `${Number(row.yoy_pct).toFixed(2)}%` : "—"}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
