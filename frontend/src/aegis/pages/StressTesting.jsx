import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { Zap } from "lucide-react";
import { useAegisData } from "../context/AegisDataContext";
import HeatmapMatrix from "../charts/HeatmapMatrix";
import { Skeleton } from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(value, decimals) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(decimals);
}

/** Merge two arrays by date */
function mergeByDate(companyArr, sectorArr, companyKey, sectorKey, outCompanyKey, outSectorKey) {
  const map = new Map();
  for (const r of companyArr || []) {
    map.set(r.date, { date: r.date, [outCompanyKey]: r[companyKey] ?? null, [outSectorKey]: null });
  }
  for (const r of sectorArr || []) {
    if (map.has(r.date)) {
      map.get(r.date)[outSectorKey] = r[sectorKey] ?? null;
    } else {
      map.set(r.date, { date: r.date, [outCompanyKey]: null, [outSectorKey]: r[sectorKey] ?? null });
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Build heatmap data from balanceSheet + holdingScores */
export function buildHeatmapData(balanceSheet, holdingScores) {
  const rows = [];
  for (const r of balanceSheet || []) {
    if (r.sector_pressure == null) continue;
    const name = r.ratio_definitions?.name;
    if (!name) continue;
    rows.push({ metric: name, period: r.period, value: r.sector_pressure });
  }
  for (const r of holdingScores || []) {
    if (r.sector_pressure == null) continue;
    const name = r.holding_metric_definitions?.name;
    if (!name) continue;
    rows.push({ metric: name, period: r.period, value: r.sector_pressure });
  }
  return rows;
}

/** Top 3 metrics by highest sector_pressure */
export function getTop3Metrics(balanceSheet, holdingScores) {
  const best = new Map();
  for (const r of balanceSheet || []) {
    if (r.sector_pressure == null) continue;
    const name = r.ratio_definitions?.name;
    const category = r.ratio_definitions?.category ?? "—";
    if (!name) continue;
    const existing = best.get(name);
    if (!existing || r.sector_pressure > existing.sector_pressure) {
      best.set(name, { sector_pressure: r.sector_pressure, category });
    }
  }
  for (const r of holdingScores || []) {
    if (r.sector_pressure == null) continue;
    const name = r.holding_metric_definitions?.name;
    const category = r.holding_metric_definitions?.category ?? "—";
    if (!name) continue;
    const existing = best.get(name);
    if (!existing || r.sector_pressure > existing.sector_pressure) {
      best.set(name, { sector_pressure: r.sector_pressure, category });
    }
  }
  return Array.from(best.entries())
    .map(([name, { sector_pressure, category }]) => ({ name, sector_pressure, category }))
    .sort((a, b) => b.sector_pressure - a.sector_pressure)
    .slice(0, 3);
}

/** Red flags: hist_pct_rank < 10 OR yoy_pct < -20, deduplicated to most recent per metric */
export function buildRedFlags(balanceSheet, holdingScores) {
  const latestByName = new Map();

  for (const r of balanceSheet || []) {
    const name = r.ratio_definitions?.name;
    if (!name) continue;
    const existing = latestByName.get(name);
    if (!existing || r.period > existing.period) {
      latestByName.set(name, {
        metric: name,
        category: r.ratio_definitions?.category ?? "—",
        value: r.value,
        hist_pct_rank: r.hist_pct_rank,
        yoy_pct: r.yoy_pct,
        period: r.period,
      });
    }
  }

  for (const r of holdingScores || []) {
    const name = r.holding_metric_definitions?.name;
    if (!name) continue;
    const existing = latestByName.get(name);
    if (!existing || r.period > existing.period) {
      latestByName.set(name, {
        metric: name,
        category: r.holding_metric_definitions?.category ?? "—",
        value: r.value,
        hist_pct_rank: r.hist_pct_rank,
        yoy_pct: r.yoy_pct,
        period: r.period,
      });
    }
  }

  return Array.from(latestByName.values()).filter(
    (r) => (r.hist_pct_rank != null && r.hist_pct_rank < 10) ||
            (r.yoy_pct != null && r.yoy_pct < -20)
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function StressTestingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

// ── Top Metric Card ────────────────────────────────────────────────────────

function TopMetricCard({ rank, name, sectorPressure, category }) {
  const isHigh = sectorPressure != null && sectorPressure > 0.7;
  const isMid  = sectorPressure != null && sectorPressure > 0.3;
  const badgeCls = isHigh ? "badge badge-red" : isMid ? "badge badge-amber" : "badge badge-green";
  const badgeLabel = sectorPressure == null ? "—" : isHigh ? "High" : isMid ? "Medium" : "Low";
  const barColor = isHigh ? "#EF4444" : isMid ? "#C2410C" : "#E8572A";
  const barPct = sectorPressure != null ? Math.min(sectorPressure * 100, 100) : 0;

  return (
    <div className="card p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="label-caps">#{rank} Top Pressure</span>
        <span className={badgeCls} style={{ fontSize: "0.7rem", padding: "2px 8px" }}>{badgeLabel}</span>
      </div>
      <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }} title={name}>
        {name ?? "—"}
      </p>
      <p className="muted">{category ?? "—"}</p>
      <div className="flex items-center gap-3">
        <div className="progress-track" style={{ flex: 1 }}>
          <div className="progress-fill" style={{ width: `${barPct}%`, background: barColor }} />
        </div>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: barColor, fontVariantNumeric: "tabular-nums" }}>
          {sectorPressure != null ? sectorPressure.toFixed(2) : "—"}
        </span>
      </div>
    </div>
  );
}

// ── Shared tooltip ─────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "8px 12px", fontSize: 12,
    }}>
      <p style={{ color: "var(--text-2)", marginBottom: 4 }}>{label}</p>
      {payload.map((e) => (
        <p key={e.dataKey} style={{ color: e.color, margin: "2px 0" }}>
          {e.name}: {e.value != null ? Number(e.value).toFixed(4) : "—"}
        </p>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function StressTesting() {
  const { id } = useParams();
  const {
    balanceSheet,
    holdingScores,
    ohlcvHealth,
    sectorHealthDetail,
    company,
    loading,
    errors,
    setCompanyId,
  } = useAegisData();

  React.useEffect(() => {
    if (id) setCompanyId(id);
  }, [id, setCompanyId]);

  // ── Derived data ───────────────────────────────────────────────────────
  const heatmapData = useMemo(
    () => buildHeatmapData(balanceSheet, holdingScores),
    [balanceSheet, holdingScores]
  );

  const top3Metrics = useMemo(
    () => getTop3Metrics(balanceSheet, holdingScores),
    [balanceSheet, holdingScores]
  );

  const redFlags = useMemo(
    () => buildRedFlags(balanceSheet, holdingScores),
    [balanceSheet, holdingScores]
  );

  // ── Company vs Sector Health Score ────────────────────────────────────
  const healthScoreData = useMemo(
    () => mergeByDate(ohlcvHealth, sectorHealthDetail, "health_score", "health_score", "companyHealth", "sectorHealth"),
    [ohlcvHealth, sectorHealthDetail]
  );

  // ── Volatility stress signals ──────────────────────────────────────────
  const volatilityStressData = useMemo(() => {
    return (ohlcvHealth || [])
      .map((r) => ({
        date: r.date,
        volatility:   r.volatility   ?? null,
        ret_z:        r.ret_z        ?? null,
        z_change:     r.z_change     ?? null,
        cum_z_change: r.cum_z_change ?? null,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [ohlcvHealth]);

  const tickInterval = useMemo(
    () => Math.max(1, Math.floor(volatilityStressData.length / 8)) - 1,
    [volatilityStressData.length]
  );

  const hasData = heatmapData.length > 0;

  // ── Guards ─────────────────────────────────────────────────────────────
  if (loading.company) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <p className="label-caps mb-1">AEGIS-FIN</p>
          <h1 className="page-heading">Stress Testing &amp; Sector Pressure</h1>
          <p className="page-subheading">Macro headwinds and sector pressure across financial metrics</p>
        </div>
        <StressTestingSkeleton />
      </div>
    );
  }

  if (!loading.company && !hasData && !errors.company) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <p className="label-caps mb-1">AEGIS-FIN</p>
          <h1 className="page-heading">
            {company ? `${company.name} (${company.ticker})` : "Stress Testing & Sector Pressure"}
          </h1>
          <p className="page-subheading">Macro headwinds and sector pressure across financial metrics</p>
        </div>
        <EmptyState
          title="No sector pressure data available"
          sub="No sector_pressure values found for this company's balance sheet or holding scores."
          icon={Zap}
        />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="page-wrap animate-fade-in">

      {/* Header */}
      <div>
        <p className="label-caps mb-1">AEGIS-FIN</p>
        <h1 className="page-heading">
          {company ? `${company.name} (${company.ticker})` : "Stress Testing & Sector Pressure"}
        </h1>
        <p className="page-subheading">Macro headwinds and sector pressure across financial metrics</p>
      </div>

      {errors.company && (
        <div className="badge badge-red" style={{ padding: "10px 16px", fontSize: "0.85rem" }}>
          Data unavailable: {errors.company}
        </div>
      )}

      {/* ── 1. Top 3 Metrics Under Sector Pressure ────────────────────── */}
      <div>
        <p className="label-caps mb-3">Top 3 Metrics Under Sector Pressure</p>
        {top3Metrics.length === 0 ? (
          <EmptyState title="No top metrics" sub="No metrics with sector pressure data found." icon={Zap} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {top3Metrics.map((m, i) => (
              <TopMetricCard
                key={m.name}
                rank={i + 1}
                name={m.name}
                sectorPressure={m.sector_pressure}
                category={m.category}
              />
            ))}
            {top3Metrics.length < 3 &&
              Array.from({ length: 3 - top3Metrics.length }).map((_, i) => (
                <div key={`empty-${i}`} className="card p-5 flex items-center justify-center" style={{ minHeight: 112 }}>
                  <span className="muted">No data</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── 2. Sector Pressure Heatmap ────────────────────────────────── */}
      <div className="card p-5">
        <p className="label-caps mb-1">Sector Pressure Heatmap — All Metrics × Periods</p>
        <p className="muted mb-4">Cell color encodes sector_pressure (0–1). Red cells (&gt; 0.7) indicate high macro drag.</p>
        <HeatmapMatrix data={heatmapData} />
      </div>

      {/* ── 3. Red Flags Table ────────────────────────────────────────── */}
      <div className="card p-5">
        <p className="label-caps mb-4">Red Flags — Hist Rank &lt; 10 or YoY &lt; −20%</p>
        {redFlags.length === 0 ? (
          <EmptyState title="No red flags" sub="No metrics with hist_pct_rank < 10 or yoy_pct < −20% found." icon={Zap} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="th-base">Metric</th>
                  <th className="th-base">Category</th>
                  <th className="th-base" style={{ textAlign: "right" }}>Value</th>
                  <th className="th-base" style={{ textAlign: "right" }}>Hist Rank</th>
                  <th className="th-base" style={{ textAlign: "right" }}>YoY %</th>
                  <th className="th-base">Trigger</th>
                </tr>
              </thead>
              <tbody>
                {redFlags.map((row) => {
                  const triggers = [];
                  if (row.hist_pct_rank != null && row.hist_pct_rank < 10) triggers.push("Low Hist Rank");
                  if (row.yoy_pct != null && row.yoy_pct < -20) triggers.push("YoY < −20%");
                  return (
                    <tr key={row.metric} className="tr-base">
                      <td className="td-base" style={{ fontWeight: 500, fontSize: 13 }}>{row.metric}</td>
                      <td className="td-base">
                        <span className="muted">{row.category}</span>
                      </td>
                      <td className="td-base" style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
                        {fmt(row.value, 2)}
                      </td>
                      <td className="td-base" style={{ textAlign: "right" }}>
                        {row.hist_pct_rank != null ? (
                          <span className="badge badge-red">{Number(row.hist_pct_rank).toFixed(0)}</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="td-base" style={{
                        textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13,
                        color: row.yoy_pct != null && row.yoy_pct < -20 ? "#B91C1C" : "var(--text-2)",
                        fontWeight: row.yoy_pct != null && row.yoy_pct < -20 ? 600 : 400,
                      }}>
                        {row.yoy_pct != null
                          ? `${row.yoy_pct >= 0 ? "+" : ""}${Number(row.yoy_pct).toFixed(2)}%`
                          : "—"}
                      </td>
                      <td className="td-base">
                        <div className="flex gap-1 flex-wrap">
                          {triggers.map((t) => (
                            <span key={t} className="badge badge-red" style={{ fontSize: "0.65rem" }}>{t}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. Company Health vs Sector Health ────────────────────────── */}
      <div className="card p-5">
        <p className="label-caps mb-4">Company Health vs. Sector Health</p>
        {healthScoreData.length === 0 ? (
          <EmptyState title="No health data" sub="No health score records found." icon={Zap} />
        ) : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthScoreData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 6" stroke="rgba(0,0,0,0.04)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--text-3)", fontSize: 10 }}
                  tickLine={false} axisLine={false}
                  interval={Math.max(1, Math.floor(healthScoreData.length / 8)) - 1}
                  tickFormatter={(v) => v?.slice(5)}
                />
                <YAxis
                  tick={{ fill: "var(--text-3)", fontSize: 10 }}
                  tickLine={false} axisLine={false} width={40}
                  tickFormatter={(v) => Number(v).toFixed(1)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="line" iconSize={14} />
                <Line
                  type="monotone" dataKey="companyHealth" name="Company"
                  stroke="#E8572A" strokeWidth={2} dot={false} connectNulls isAnimationActive={false}
                />
                <Line
                  type="monotone" dataKey="sectorHealth" name="Sector"
                  stroke="#EF4444" strokeWidth={2} strokeDasharray="5 3"
                  dot={false} connectNulls isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── 5. Volatility Stress Indicator ────────────────────────────── */}
      <div className="card p-5">
        <p className="label-caps mb-4">Volatility Stress Indicator — 4 Signals</p>
        {volatilityStressData.length === 0 ? (
          <EmptyState title="No volatility stress data" sub="No ohlcv_health records found." icon={Zap} />
        ) : (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volatilityStressData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 6" stroke="rgba(0,0,0,0.04)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--text-3)", fontSize: 10 }}
                  tickLine={false} axisLine={false}
                  interval={tickInterval}
                  tickFormatter={(v) => v?.slice(5)}
                />
                <YAxis
                  tick={{ fill: "var(--text-3)", fontSize: 10 }}
                  tickLine={false} axisLine={false} width={50}
                  tickFormatter={(v) => Number(v).toFixed(2)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="line" iconSize={14} />
                <Line type="monotone" dataKey="volatility"   name="Volatility"    stroke="#E8572A" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="ret_z"        name="Ret Z-Score"   stroke="#F06A3A" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="z_change"     name="Z Change"      stroke="#C2410C" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="cum_z_change" name="Cum Z Change"  stroke="#9A3412" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
}
