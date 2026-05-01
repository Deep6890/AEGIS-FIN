import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { useAegisData } from "../context/AegisDataContext";

// ── Helpers ────────────────────────────────────────────────────────────────

export function renderValue(value, decimals) {
  if (value === null || value === undefined) return "—";
  if (decimals !== undefined) return Number(value).toFixed(decimals);
  return String(value);
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

const isCfoNetIncome    = n => n === "cfo/net income" || (n.includes("cfo") && n.includes("net"));
const isFcfMargin       = n => n === "fcf margin %" || (n.includes("fcf") && n.includes("margin"));
const isAssetTurnover   = n => n === "asset turnover" || (n.includes("asset") && n.includes("turnover") && !n.includes("inventory") && !n.includes("receivable"));
const isGrossMargin     = n => n === "gross margin %" || (n.includes("gross") && n.includes("margin"));
const isEbitdaMargin    = n => n === "ebitda margin %" || (n.includes("ebitda") && n.includes("margin"));
const isNetProfitMargin = n => n === "net profit margin %" || (n.includes("net") && n.includes("profit") && n.includes("margin")) || (n.includes("net") && n.includes("margin") && !n.includes("fcf") && !n.includes("ebitda") && !n.includes("gross"));
const isRoe             = n => n === "roe %" || n === "roe" || (n.includes("roe") && !n.includes("revenue") && !n.includes("ratio"));

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

function MarginTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-2)", fontSize: 11 }}>{label}</p>
      {payload.map(e => (
        <p key={e.dataKey} style={{ color: e.color, margin: "2px 0", fontWeight: 600 }}>
          {e.name}: {e.value != null ? `${Number(e.value).toFixed(2)}%` : "—"}
        </p>
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function CashflowEfficiency() {
  const { id } = useParams();
  const { balanceSheet, company, loading, errors, setCompanyId } = useAegisData();

  React.useEffect(() => { if (id) setCompanyId(id); }, [id, setCompanyId]);

  const cpeRecords = useMemo(() =>
    (balanceSheet || []).filter(r => r.ratio_definitions &&
      (r.ratio_definitions.category === "CashFlow" ||
       r.ratio_definitions.category === "Profitability" ||
       r.ratio_definitions.category === "Efficiency")),
    [balanceSheet]
  );

  const latestCfo = useMemo(() => findLatestRecord(cpeRecords, isCfoNetIncome),  [cpeRecords]);
  const latestFcf = useMemo(() => findLatestRecord(cpeRecords, isFcfMargin),     [cpeRecords]);
  const latestAT  = useMemo(() => findLatestRecord(cpeRecords, isAssetTurnover), [cpeRecords]);

  const grossHistory  = useMemo(() => getMetricHistory(cpeRecords, isGrossMargin),      [cpeRecords]);
  const ebitdaHistory = useMemo(() => getMetricHistory(cpeRecords, isEbitdaMargin),     [cpeRecords]);
  const netHistory    = useMemo(() => getMetricHistory(cpeRecords, isNetProfitMargin),  [cpeRecords]);

  const marginChartData = useMemo(() => {
    const periodSet = new Set([
      ...(grossHistory || []).map(r => r.period),
      ...(ebitdaHistory || []).map(r => r.period),
      ...(netHistory || []).map(r => r.period),
    ]);
    const sorted = Array.from(periodSet).sort().slice(-8);
    const gm = new Map((grossHistory || []).map(r => [r.period, r.value]));
    const em = new Map((ebitdaHistory || []).map(r => [r.period, r.value]));
    const nm = new Map((netHistory || []).map(r => [r.period, r.value]));
    return sorted.map(period => ({
      period,
      grossMargin:     gm.get(period) ?? null,
      ebitdaMargin:    em.get(period) ?? null,
      netProfitMargin: nm.get(period) ?? null,
    }));
  }, [grossHistory, ebitdaHistory, netHistory]);

  const roeHistory = useMemo(() =>
    getMetricHistory(cpeRecords, isRoe).map(r => ({ period: r.period, hist_pct_rank: r.hist_pct_rank })),
    [cpeRecords]
  );

  const allMetricsRows = useMemo(() => {
    const m = new Map();
    for (const r of cpeRecords) {
      const name = r.ratio_definitions?.name;
      if (!name) continue;
      if (!m.has(name)) m.set(name, r);
    }
    return Array.from(m.values());
  }, [cpeRecords]);

  const metricsByCategory = useMemo(() => {
    const map = new Map();
    for (const row of allMetricsRows) {
      const cat = row.ratio_definitions?.category ?? "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(row);
    }
    return map;
  }, [allMetricsRows]);

  const top5SectorPressure = useMemo(() =>
    [...allMetricsRows]
      .filter(r => r.sector_pressure != null)
      .sort((a, b) => (b.sector_pressure ?? 0) - (a.sector_pressure ?? 0))
      .slice(0, 5),
    [allMetricsRows]
  );

  if (loading.company) {
    return (
      <div className="page-wrap animate-fade-in">
        <div><p className="page-eyebrow">AEGIS-FIN · CASHFLOW</p><h1 className="page-title">Cashflow & Efficiency</h1></div>
        <div className="grid-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 14 }} />)}</div>
        <div className="skeleton" style={{ height: 220, borderRadius: 14 }} />
        <div className="grid-2">{[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />)}</div>
      </div>
    );
  }

  if (!loading.company && cpeRecords.length === 0 && !errors.company) {
    return (
      <div className="page-wrap animate-fade-in">
        <div>
          <p className="page-eyebrow">AEGIS-FIN · CASHFLOW</p>
          <h1 className="page-title">{company ? company.name : "Cashflow & Efficiency"}</h1>
          {company && <p className="page-subtitle">{company.ticker} · No cashflow data available</p>}
        </div>
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>No CashFlow, Profitability, or Efficiency records found</p>
          <p className="muted" style={{ marginTop: 4 }}>Run the fundamentals pipeline to populate balance sheet data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap animate-fade-in">

      {/* Header */}
      <div>
        <p className="page-eyebrow">AEGIS-FIN · CASHFLOW & EFFICIENCY</p>
        <h1 className="page-title">{company ? company.name : "Cashflow & Operational Efficiency"}</h1>
        {company && <p className="page-subtitle">{company.ticker} · Margin quality, cashflow ratios, and efficiency signals</p>}
      </div>

      {errors.company && <div className="warning-strip"><span>⚠</span><span>{errors.company}</span></div>}

      {/* KPI Row */}
      <div className="grid-3">
        {[
          { label: "CFO / Net Income", rec: latestCfo },
          { label: "FCF Margin %",     rec: latestFcf },
          { label: "Asset Turnover",   rec: latestAT  },
        ].map(({ label, rec }) => (
          <div key={label} className="kpi-card">
            <p className="kpi-compact-label">{label}</p>
            <p className="kpi-compact-value">{renderValue(rec?.value, 2)}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
              {rec?.yoy_pct != null && (
                <span style={{ fontSize: 11, fontWeight: 600, color: rec.yoy_pct >= 0 ? "var(--orange)" : "#EF4444" }}>
                  {rec.yoy_pct >= 0 ? "+" : ""}{Number(rec.yoy_pct).toFixed(1)}% YoY
                </span>
              )}
              {rec?.hist_pct_rank != null && <HistRankBadge rank={rec.hist_pct_rank} />}
              {(rec?.adjusted_status || rec?.status) && (
                <span className={`badge ${statusBadgeClass(rec.adjusted_status || rec.status)}`} style={{ fontSize: 9 }}>
                  {rec.adjusted_status || rec.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Margin Trend Chart */}
      {marginChartData.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <span className="title-sm">Margin Trend — Last 8 Periods</span>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marginChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%" barGap={2}>
                <XAxis dataKey="period" tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} width={32} tickFormatter={v => `${v}%`} />
                <Tooltip content={<MarginTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} iconType="square" iconSize={8} />
                <Bar dataKey="grossMargin"     name="Gross Margin %"      fill="#E8572A" radius={[3, 3, 0, 0]} />
                <Bar dataKey="ebitdaMargin"    name="EBITDA Margin %"     fill="#F06A3A" radius={[3, 3, 0, 0]} />
                <Bar dataKey="netProfitMargin" name="Net Profit Margin %"  fill="#C2410C" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ROE Rank + Sector Pressure */}
      <div className="grid-2">
        {roeHistory.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div className="section-header" style={{ marginBottom: 10 }}>
              <span className="title-sm">ROE Historical Rank</span>
              <span className="muted" style={{ marginLeft: "auto", fontSize: 10 }}>0–100 percentile</span>
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={roeHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="period" tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} width={28} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={v => [v != null ? Number(v).toFixed(1) : "—", "ROE Rank"]} />
                  <Line type="monotone" dataKey="hist_pct_rank" name="ROE % Hist. Rank" stroke="#E8572A" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {top5SectorPressure.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <span className="title-sm">Top Sector Pressure</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {top5SectorPressure.map(row => {
                const name = row.ratio_definitions?.name ?? "—";
                const sp = row.sector_pressure;
                const spNum = sp != null ? Number(sp) : null;
                const barColor = spNum != null && spNum > 0.7 ? "#EF4444" : spNum != null && spNum >= 0.3 ? "var(--orange)" : "#E8572A";
                return (
                  <div key={name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text)" }}>{name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, ...sectorPressureStyle(sp) }}>{spNum != null ? spNum.toFixed(2) : "—"}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: spNum != null ? `${Math.min(spNum * 100, 100)}%` : "0%", background: barColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* All Metrics Table */}
      {allMetricsRows.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <span className="title-sm">All Metrics — CashFlow, Profitability & Efficiency</span>
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
                  <th>Trend</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(metricsByCategory.entries()).map(([category, rows]) => (
                  <React.Fragment key={category}>
                    <tr>
                      <td colSpan={7} style={{ padding: "8px 14px 5px", background: "rgba(232,87,42,0.04)", borderBottom: "1px solid var(--border)" }}>
                        <span className="label-caps" style={{ color: "var(--orange)" }}>{category}</span>
                      </td>
                    </tr>
                    {rows.map(row => {
                      const name = row.ratio_definitions?.name ?? "—";
                      const sp = row.sector_pressure;
                      return (
                        <tr key={name}>
                          <td style={{ paddingLeft: 22, fontWeight: 500 }}>{name}</td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{renderValue(row.value, 2)}</td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: row.yoy_pct == null ? "var(--text-3)" : row.yoy_pct >= 0 ? "var(--orange)" : "#EF4444", fontWeight: row.yoy_pct != null ? 600 : 400 }}>
                            {row.yoy_pct != null ? `${row.yoy_pct >= 0 ? "+" : ""}${Number(row.yoy_pct).toFixed(2)}%` : "—"}
                          </td>
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
