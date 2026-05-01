import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { GitBranch } from "lucide-react";
import { useAegisData } from "../context/AegisDataContext";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(value, decimals) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(decimals);
}

function corrColor(v) {
  if (v === null || v === undefined) return "var(--text-3)";
  if (v > 0.7) return "var(--orange)";
  if (v < 0)   return "#EF4444";
  return "var(--text-2)";
}

export function buildDualAxisData(ohlcvRaw, sectorOhlcv) {
  const map = new Map();
  for (const r of ohlcvRaw || []) {
    map.set(r.date, { date: r.date, companyClose: r.close ?? null, sectorClose: null });
  }
  for (const r of sectorOhlcv || []) {
    if (map.has(r.date)) {
      map.get(r.date).sectorClose = r.close ?? null;
    } else {
      map.set(r.date, { date: r.date, companyClose: null, sectorClose: r.close ?? null });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
}

export function dedupeByLatestSector(correlationScores) {
  const map = new Map();
  for (const r of correlationScores || []) {
    const existing = map.get(r.sector_id);
    if (!existing || r.date > existing.date) map.set(r.sector_id, r);
  }
  return Array.from(map.values());
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <p style={{ color: "var(--text-2)", marginBottom: 3, fontSize: 11 }}>{label}</p>
      {payload.map(e => (
        <p key={e.dataKey} style={{ color: e.color, margin: "2px 0", fontWeight: 600 }}>
          {e.name}: {e.value != null ? Number(e.value).toFixed(4) : "—"}
        </p>
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function CorrelationAnalysis() {
  const { id } = useParams();
  const { correlationScores, ohlcvRaw, sectorOhlcv, sectors, company, loading, errors, setCompanyId } = useAegisData();

  React.useEffect(() => { if (id) setCompanyId(id); }, [id, setCompanyId]);

  const sectorNameMap = useMemo(() => {
    const m = new Map();
    for (const s of sectors || []) m.set(s.id, s.name);
    return m;
  }, [sectors]);

  const enrichedCorrelation = useMemo(() =>
    (correlationScores || []).map(r => ({
      ...r,
      sectors: { name: sectorNameMap.get(r.sector_id) ?? r.sector_id ?? "—" },
    })),
    [correlationScores, sectorNameMap]
  );

  const latestCorr = useMemo(() => {
    if (!enrichedCorrelation?.length) return null;
    return [...enrichedCorrelation].sort((a, b) => a.date > b.date ? -1 : 1)[0];
  }, [enrichedCorrelation]);

  const sectorTableRows = useMemo(() => {
    const deduped = dedupeByLatestSector(enrichedCorrelation);
    return [...deduped].sort((a, b) => (b.corr_100d ?? -Infinity) - (a.corr_100d ?? -Infinity));
  }, [enrichedCorrelation]);

  // Use top correlated sector for history chart
  const corrHistoryData = useMemo(() => {
    const sectorId = sectorTableRows[0]?.sector_id;
    const filtered = sectorId
      ? (enrichedCorrelation || []).filter(r => r.sector_id === sectorId)
      : enrichedCorrelation || [];
    // Sample every 3rd point to avoid overcrowding
    return [...filtered]
      .sort((a, b) => a.date < b.date ? -1 : 1)
      .filter((_, i) => i % 3 === 0);
  }, [enrichedCorrelation, sectorTableRows]);

  const outperfBarData = useMemo(() => {
    if (!latestCorr) return [];
    return [
      { metric: "20d",  value: latestCorr.outperf_20d  ?? null },
      { metric: "60d",  value: latestCorr.outperf_60d  ?? null },
      { metric: "100d", value: latestCorr.outperf_100d ?? null },
    ];
  }, [latestCorr]);

  const dualAxisData = useMemo(() => {
    const data = buildDualAxisData(ohlcvRaw, sectorOhlcv);
    // Sample every 5th point
    return data.filter((_, i) => i % 5 === 0);
  }, [ohlcvRaw, sectorOhlcv]);

  const donutData = useMemo(() => {
    const up = latestCorr?.aligned_up_pct ?? 0;
    const dn = latestCorr?.aligned_dn_pct ?? 0;
    return [
      { name: "Aligned Up",   value: up },
      { name: "Aligned Down", value: dn },
    ];
  }, [latestCorr]);

  if (loading.company) {
    return (
      <div className="page-wrap animate-fade-in">
        <div><p className="page-eyebrow">AEGIS-FIN · CORRELATION</p><h1 className="page-title">Sector Correlation</h1></div>
        <div className="grid-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 14 }} />)}</div>
        <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
        <div className="grid-2">{[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />)}</div>
      </div>
    );
  }

  if (!loading.company && !enrichedCorrelation?.length && !errors.company) {
    return (
      <div className="page-wrap animate-fade-in">
        <div>
          <p className="page-eyebrow">AEGIS-FIN · CORRELATION</p>
          <h1 className="page-title">{company ? company.name : "Sector Correlation"}</h1>
          {company && <p className="page-subtitle">{company.ticker} · No correlation data available</p>}
        </div>
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <GitBranch size={32} style={{ color: "var(--text-3)", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>No correlation_scores records found</p>
          <p className="muted" style={{ marginTop: 4 }}>Run the correlation pipeline to populate this data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap animate-fade-in">

      {/* Header */}
      <div>
        <p className="page-eyebrow">AEGIS-FIN · SECTOR CORRELATION</p>
        <h1 className="page-title">{company ? company.name : "Company vs. Sector Correlation"}</h1>
        {company && <p className="page-subtitle">{company.ticker} · Price performance, outperformance metrics, and downside alignment</p>}
      </div>

      {errors.company && <div className="warning-strip"><span>⚠</span><span>{errors.company}</span></div>}

      {/* KPI Row */}
      <div className="grid-3">
        {[
          { label: "100d Correlation",    value: latestCorr?.corr_100d,      decimals: 4, suffix: "" },
          { label: "100d Outperformance", value: latestCorr?.outperf_100d,   decimals: 2, suffix: "%" },
          { label: "Downside Alignment",  value: latestCorr?.aligned_dn_pct, decimals: 2, suffix: "%" },
        ].map(({ label, value, decimals, suffix }) => (
          <div key={label} className="kpi-card">
            <p className="kpi-compact-label">{label}</p>
            <p className="kpi-compact-value" style={{ color: value != null && value < 0 ? "#EF4444" : "var(--text)" }}>
              {fmt(value, decimals)}{value != null && value !== undefined ? suffix : ""}
            </p>
          </div>
        ))}
      </div>

      {/* All Sectors Table */}
      {sectorTableRows.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <span className="title-sm">All Sectors — Correlation Summary</span>
            <span className="muted" style={{ marginLeft: "auto", fontSize: 10 }}>Sorted by 100d correlation</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Sector</th>
                  <th style={{ textAlign: "right" }}>Corr 20d</th>
                  <th style={{ textAlign: "right" }}>Corr 60d</th>
                  <th style={{ textAlign: "right" }}>Corr 100d</th>
                  <th style={{ textAlign: "right" }}>Corr Full</th>
                  <th style={{ textAlign: "right" }}>Outperf 100d</th>
                  <th style={{ textAlign: "right" }}>Aligned Down %</th>
                  <th style={{ textAlign: "right" }}>Avg Health</th>
                </tr>
              </thead>
              <tbody>
                {sectorTableRows.map(row => (
                  <tr key={`${row.sector_id}-${row.date}`}>
                    <td style={{ fontWeight: 600 }}>{row.sectors?.name ?? "—"}</td>
                    {[row.corr_20d, row.corr_60d, row.corr_100d, row.corr_full].map((v, i) => (
                      <td key={i} style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: corrColor(v), fontWeight: v != null ? 600 : 400 }}>
                        {fmt(v, 4)}
                      </td>
                    ))}
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: row.outperf_100d != null && row.outperf_100d >= 0 ? "var(--orange)" : "#EF4444", fontWeight: row.outperf_100d != null ? 600 : 400 }}>
                      {row.outperf_100d != null ? `${row.outperf_100d >= 0 ? "+" : ""}${fmt(row.outperf_100d, 2)}%` : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(row.aligned_dn_pct, 2)}{row.aligned_dn_pct != null ? "%" : ""}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(row.avg_top_health, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Correlation History */}
      {corrHistoryData.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Correlation History — 20d / 60d / 100d</span>
            {sectorTableRows[0] && (
              <span className="ticker-chip" style={{ marginLeft: "auto" }}>{sectorTableRows[0].sectors?.name}</span>
            )}
          </div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={corrHistoryData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: "var(--text-3)", fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" tickFormatter={v => v?.slice(5)} />
                <YAxis domain={[-1, 1]} tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} width={28} tickFormatter={v => v.toFixed(1)} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} iconType="line" iconSize={12} />
                <Line type="monotone" dataKey="corr_20d"  name="Corr 20d"  stroke="#E8572A" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="corr_60d"  name="Corr 60d"  stroke="#F06A3A" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="corr_100d" name="Corr 100d" stroke="#C2410C" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Outperformance + Alignment Donut */}
      <div className="grid-2">
        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Outperformance vs. Sector</span>
          </div>
          {outperfBarData.length === 0 ? (
            <p className="muted" style={{ fontSize: 12 }}>No outperformance data.</p>
          ) : (
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outperfBarData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="metric" tick={{ fill: "var(--text-3)", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} width={36} tickFormatter={v => `${Number(v).toFixed(1)}%`} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={val => [val != null ? `${Number(val).toFixed(2)}%` : "—", "Outperformance"]} />
                  <Bar dataKey="value" name="Outperformance" radius={[4, 4, 0, 0]}>
                    {outperfBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.value == null ? "var(--border)" : entry.value >= 0 ? "#E8572A" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Aligned Up vs. Down</span>
          </div>
          {latestCorr === null ? (
            <p className="muted" style={{ fontSize: 12 }}>No alignment data.</p>
          ) : (
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2} dataKey="value" nameKey="name">
                    <Cell fill="#E8572A" />
                    <Cell fill="#EF4444" />
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={val => [`${fmt(val, 2)}%`, ""]} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-2)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Company vs Sector Close Price */}
      {dualAxisData.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Company vs. Sector Close Price</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontSize: 11, color: "var(--text-3)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 12, height: 2, background: "#E8572A", display: "inline-block" }} /> Company
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 12, height: 2, background: "#EF4444", display: "inline-block" }} /> Sector
              </span>
            </div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dualAxisData} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: "var(--text-3)", fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" tickFormatter={v => v?.slice(5)} />
                <YAxis yAxisId="company" orientation="left"  tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} width={48} tickFormatter={v => Number(v).toFixed(0)} />
                <YAxis yAxisId="sector"  orientation="right" tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} width={48} tickFormatter={v => Number(v).toFixed(0)} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(val, name) => [val != null ? Number(val).toFixed(2) : "—", name]} />
                <Line yAxisId="company" type="monotone" dataKey="companyClose" name="Company Close" stroke="#E8572A" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls />
                <Line yAxisId="sector"  type="monotone" dataKey="sectorClose"  name="Sector Close"  stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
