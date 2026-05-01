import React, { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useAegisData } from "../context/AegisDataContext";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const fmt1  = v => v != null ? Number(v).toFixed(1) : "—";
const fmt2  = v => v != null ? Number(v).toFixed(2) : "—";
const fmtPct = v => {
  if (v == null) return "—";
  const n = (Number(v) * 100).toFixed(1);
  return `${Number(n) >= 0 ? "+" : ""}${n}%`;
};

/** Returns the accent color for a health score using the project's terracotta palette */
const scoreColor = s => {
  if (s == null) return "var(--ink-3)";
  if (s >= 65)  return "var(--terra-2)";
  if (s >= 45)  return "var(--terra)";
  return "var(--terra-3)";
};

const scoreBg = s => {
  if (s == null) return "rgba(0,0,0,0.04)";
  if (s >= 65)  return "rgba(212,97,58,0.06)";
  if (s >= 45)  return "rgba(212,97,58,0.10)";
  return "rgba(184,78,40,0.10)";
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--r-sm)",
      padding: "6px 10px",
      boxShadow: "var(--shadow-md)",
      fontSize: 11,
    }}>
      <p style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 3 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="page-wrap" style={{ gap: 14 }}>
      <div className="skeleton" style={{ height: 52, width: "45%", borderRadius: "var(--r)" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 82, borderRadius: "var(--r)" }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div className="skeleton" style={{ height: 140, borderRadius: "var(--r)" }} />
        <div className="skeleton" style={{ height: 140, borderRadius: "var(--r)" }} />
      </div>
      <div className="skeleton" style={{ height: 160, borderRadius: "var(--r)" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 8 }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 150, borderRadius: "var(--r)" }} />
        ))}
      </div>
    </div>
  );
}

// ─── Mini sparkline (no axes, no grid) ───────────────────────────────────────

function Sparkline({ data, color = "var(--terra)" }) {
  if (!data || data.length < 3) {
    return (
      <div style={{ height: 44, display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: 9, color: "var(--ink-3)", fontStyle: "italic" }}>no history</span>
      </div>
    );
  }
  const gradId = `spk-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone" dataKey="v"
          stroke={color} strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false} isAnimationActive={false}
        />
        <Tooltip content={<ChartTooltip />} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Portfolio KPI row ────────────────────────────────────────────────────────

function SectorKPIs({ records }) {
  const active    = records.length;
  const avgHealth = active > 0
    ? (records.reduce((s, r) => s + (r.health_score ?? 0), 0) / active)
    : null;
  const healthy    = records.filter(r => (r.health_score ?? 0) >= 65).length;
  const distressed = records.filter(r => (r.health_score ?? 0) < 45).length;
  const spiking    = records.filter(r => r.spike_down === true).length;

  const tiles = [
    { label: "Sectors Monitored", value: active,                       sub: "active in portfolio" },
    { label: "Avg Health Score",  value: fmt1(avgHealth),              sub: "cross-sector average", highlight: true },
    { label: "Healthy Sectors",   value: healthy,                      sub: "score ≥ 65" },
    { label: "Distress Signals",  value: distressed + spiking,         sub: "spike or low score", danger: distressed + spiking > 0 },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
      {tiles.map(({ label, value, sub, highlight, danger }) => (
        <div
          key={label}
          className="kpi-card"
          style={{ borderTopColor: danger ? "var(--terra-3)" : highlight ? "var(--terra)" : "var(--border)" }}
        >
          <p className="stat-label" style={{ marginBottom: 6 }}>{label}</p>
          <p
            className="value-md"
            style={{ color: danger ? "var(--terra-3)" : highlight ? "var(--terra)" : "var(--ink)" }}
          >
            {value}
          </p>
          <p className="muted" style={{ marginTop: 4 }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Top / Bottom performers ──────────────────────────────────────────────────

function PerformerBlock({ title, records, isTop }) {
  const accent = isTop ? "var(--terra)" : "var(--terra-3)";
  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 3, height: 16, borderRadius: 99, background: accent, flexShrink: 0 }} />
        <p className="section-title" style={{ fontSize: 11 }}>{title}</p>
      </div>

      {records.length === 0 ? (
        <p className="muted">No data</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {records.map((r, i) => {
            const name  = r.sectors?.name ?? "—";
            const isLast = i === records.length - 1;
            return (
              <div
                key={r.sector_id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: isLast ? "none" : "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                  <span
                    className="rank-badge"
                    style={{ background: isTop ? "rgba(212,97,58,0.08)" : "rgba(184,78,40,0.08)", color: accent }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {name}
                    </p>
                    <p className="muted" style={{ fontSize: 9 }}>
                      Health&nbsp;{fmt1(r.health_score)} · Vol&nbsp;{fmt2(r.volatility)}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: accent, fontVariantNumeric: "tabular-nums" }}>
                    {fmtPct(r.cum_change_1y)}
                  </p>
                  <p className="muted" style={{ fontSize: 9 }}>1Y return</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Best Sector OHLCV Spotlight ─────────────────────────────────────────────

function BestSectorSpotlight({ record, ohlcvData }) {
  if (!record) return null;

  const name   = record.sectors?.name ?? "—";
  const latest = ohlcvData.length > 0 ? ohlcvData[ohlcvData.length - 1] : null;
  const prev   = ohlcvData.length > 1 ? ohlcvData[ohlcvData.length - 2] : null;
  const dayPct = latest && prev && prev.close
    ? ((latest.close - prev.close) / prev.close * 100)
    : null;

  return (
    <div className="card-spotlight" style={{ padding: "18px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <p className="page-eyebrow" style={{ marginBottom: 3 }}>Best Performing Sector</p>
          <p style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", letterSpacing: "-.04em", lineHeight: 1 }}>
            {name}
          </p>
        </div>

        {/* KPI chips */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          {[
            { l: "Health Score", v: fmt1(record.health_score),    highlight: true },
            { l: "1Y Return",    v: fmtPct(record.cum_change_1y), highlight: record.cum_change_1y != null && record.cum_change_1y >= 0 },
            { l: "Volatility",   v: fmt2(record.volatility),      highlight: false },
            { l: "Ret Z-Score",  v: fmt2(record.ret_z),           highlight: false },
          ].map(({ l, v, highlight }) => (
            <div key={l} className="kpi-compact" style={{ minWidth: 80, padding: "10px 14px" }}>
              <p className="kpi-compact-label">{l}</p>
              <p className="kpi-compact-value" style={{ fontSize: "1.25rem", color: highlight ? "var(--terra)" : "var(--ink)" }}>
                {v}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* OHLCV area chart */}
      {ohlcvData.length > 2 ? (
        <>
          {/* OHLC bar row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p className="label-caps">90-Day Close Price</p>
            {latest && (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {[
                  { l: "O", v: Number(latest.open ?? 0).toFixed(2) },
                  { l: "H", v: Number(latest.high ?? 0).toFixed(2) },
                  { l: "L", v: Number(latest.low  ?? 0).toFixed(2) },
                  { l: "C", v: Number(latest.close ?? 0).toFixed(2) },
                ].map(({ l, v }) => (
                  <span key={l} style={{ fontSize: 10, color: "var(--ink-2)", fontFamily: "'DM Mono', monospace" }}>
                    <span style={{ color: "var(--ink-3)", fontWeight: 600 }}>{l}&nbsp;</span>
                    <strong style={{ color: l === "C" ? "var(--terra)" : "var(--ink)" }}>{v}</strong>
                  </span>
                ))}
                {dayPct != null && (
                  <span
                    className="score-pill-orange"
                    style={{
                      display: "inline-flex", alignItems: "center",
                      padding: "2px 8px", borderRadius: 99,
                      fontSize: 10, fontWeight: 700,
                      background: dayPct >= 0 ? "rgba(212,97,58,0.10)" : "rgba(184,78,40,0.10)",
                      color: dayPct >= 0 ? "var(--terra)" : "var(--terra-3)",
                    }}
                  >
                    {dayPct >= 0 ? "+" : ""}{dayPct.toFixed(2)}%
                  </span>
                )}
              </div>
            )}
          </div>

          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={ohlcvData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="bestGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--terra)" stopOpacity={0.20} />
                  <stop offset="100%" stopColor="var(--terra)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<ChartTooltip />} formatter={v => [Number(v).toFixed(2), "Close"]} />
              <Area
                type="monotone" dataKey="close"
                stroke="var(--terra)" strokeWidth={2}
                fill="url(#bestGrad)"
                dot={false} isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </>
      ) : (
        <p className="data-unavailable">⏳ OHLCV data not loaded for this sector.</p>
      )}
    </div>
  );
}

// ─── Sector Pulse Card ────────────────────────────────────────────────────────

function SectorPulseCard({ record, spark, rank }) {
  const name  = record.sectors?.name ?? "—";
  const score = record.health_score;
  const color = scoreColor(score);
  const bg    = scoreBg(score);

  return (
    <div
      className="card hover-lift"
      style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, borderTop: `3px solid ${color}` }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span
              className="rank-badge"
              style={{ width: 18, height: 18, fontSize: 8, borderRadius: 5, background: bg, color }}
            >
              {rank}
            </span>
            {record.spike_down && (
              <span style={{ fontSize: 8, fontWeight: 700, color: "var(--terra-3)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                ↓ Spike
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </p>
        </div>
        {/* Score badge */}
        <div style={{ background: bg, borderRadius: 8, padding: "3px 8px", textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color, letterSpacing: "-.03em", lineHeight: 1 }}>
            {fmt1(score)}
          </p>
          <p style={{ fontSize: 7, fontWeight: 700, color, opacity: 0.7, textTransform: "uppercase", letterSpacing: ".07em" }}>score</p>
        </div>
      </div>

      {/* 60-day sparkline */}
      <Sparkline data={spark} color={color} />

      {/* Stat footer */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid var(--border)", paddingTop: 7, gap: 0 }}>
        {[
          { l: "1Y",  v: fmtPct(record.cum_change_1y), neg: record.cum_change_1y != null && record.cum_change_1y < 0 },
          { l: "VOL", v: fmt2(record.volatility) },
          { l: "Z",   v: fmt1(record.ret_z),           neg: record.ret_z != null && record.ret_z < -2 },
        ].map(({ l, v, neg }) => (
          <div key={l} style={{ textAlign: "center" }}>
            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 1 }}>
              {l}
            </p>
            <p style={{ fontSize: 10, fontWeight: 700, color: neg ? "var(--terra-3)" : "var(--ink)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {v}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pressure signal strip ────────────────────────────────────────────────────

function PressureSignals({ records }) {
  const alerts = useMemo(() =>
    records.filter(r =>
      r.spike_down === true ||
      (r.ret_z != null && r.ret_z < -2) ||
      (r.cum_change_1y != null && r.cum_change_1y < -0.1)
    ), [records]);

  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: alerts.length > 0 ? 10 : 0 }}>
        {alerts.length > 0 && <div className="pulse-dot" style={{ background: "var(--terra-3)" }} />}
        <p className="section-title" style={{ fontSize: 12 }}>
          {alerts.length > 0 ? "Active Pressure Signals" : "Pressure Signals"}
        </p>
        {alerts.length > 0 ? (
          <span className="badge badge-orange" style={{ marginLeft: "auto" }}>
            {alerts.length} sector{alerts.length > 1 ? "s" : ""}
          </span>
        ) : (
          <p className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>No active signals</p>
        )}
      </div>

      {alerts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {alerts.map(r => {
            const triggers = [];
            if (r.spike_down)                                        triggers.push("Price Spike ↓");
            if (r.ret_z != null && r.ret_z < -2)                   triggers.push(`Z ${fmt1(r.ret_z)}`);
            if (r.cum_change_1y != null && r.cum_change_1y < -0.1) triggers.push(`1Y ${fmtPct(r.cum_change_1y)}`);
            return (
              <div
                key={r.sector_id}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  background: "rgba(184,78,40,0.05)",
                  border: "1px solid rgba(184,78,40,0.18)",
                  borderRadius: "var(--r-sm)", padding: "5px 12px",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>
                  {r.sectors?.name ?? "Unknown"}
                </span>
                <span style={{ width: 1, height: 10, background: "rgba(184,78,40,0.25)" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--terra-3)" }}>
                  {triggers.join(" · ")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sector comparison bar chart ──────────────────────────────────────────────

function SectorHealthBarChart({ records }) {
  const data = useMemo(() =>
    [...records]
      .sort((a, b) => (b.health_score ?? 0) - (a.health_score ?? 0))
      .map(r => ({
        name: (r.sectors?.name ?? "—").replace(" Sector", ""),
        score: r.health_score != null ? Number(r.health_score.toFixed(1)) : null,
        vol:   r.volatility  != null ? Number(r.volatility.toFixed(2))  : null,
      }))
      .filter(d => d.score != null)
  , [records]);

  if (data.length === 0) return null;

  return (
    <div className="chart-container">
      <div className="section-header" style={{ marginBottom: 12 }}>
        <p className="section-title">Health Score Comparison</p>
        <span className="badge badge-orange" style={{ marginLeft: "auto" }}>all sectors</span>
      </div>
      <ResponsiveContainer width="100%" height={data.length * 34 + 20}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 40, left: 70, bottom: 0 }}
          barSize={10}
        >
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--ink)", fontWeight: 600 }} width={65} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="score" name="Health Score" radius={[0, 5, 5, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={scoreColor(d.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Composite trend mini-lines (one per sector, last 60d) ────────────────────

function SectorTrendGrid({ latestRecords, sparkMap }) {
  return (
    <div>
      <div className="section-header" style={{ marginBottom: 10 }}>
        <p className="section-title">Sector Pulse Grid</p>
        <span className="badge badge-gray" style={{ marginLeft: "auto" }}>60-day sparklines</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: 8,
        }}
      >
        {latestRecords.map((r, i) => (
          <SectorPulseCard
            key={r.sector_id}
            record={r}
            rank={i + 1}
            spark={sparkMap.get(r.sector_id) ?? []}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function SectorContagion() {
  const { sectorHealth, sectorHealthHistory, sectorOhlcvAll, loading, errors } = useAegisData();

  // Deduplicate to latest record per sector
  const latestBySector = useMemo(() => {
    const map = new Map();
    for (const r of sectorHealth ?? []) {
      const prev = map.get(r.sector_id);
      if (!prev || r.date > prev.date) map.set(r.sector_id, r);
    }
    return Array.from(map.values());
  }, [sectorHealth]);

  // Sort by health score descending for pulse grid
  const sorted = useMemo(
    () => [...latestBySector].sort((a, b) => (b.health_score ?? 0) - (a.health_score ?? 0)),
    [latestBySector]
  );

  // Top 3 / Bottom 3 by 1Y return
  const top3 = useMemo(
    () => [...latestBySector]
      .filter(r => r.cum_change_1y != null)
      .sort((a, b) => b.cum_change_1y - a.cum_change_1y)
      .slice(0, 3),
    [latestBySector]
  );
  const bottom3 = useMemo(
    () => [...latestBySector]
      .filter(r => r.cum_change_1y != null)
      .sort((a, b) => a.cum_change_1y - b.cum_change_1y)
      .slice(0, 3),
    [latestBySector]
  );

  // Best sector for OHLCV spotlight
  const bestSector = sorted[0] ?? null;

  const bestSectorOhlcv = useMemo(() => {
    if (!bestSector) return [];
    return (sectorOhlcvAll ?? [])
      .filter(r => r.sector_id === bestSector.sector_id)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [bestSector, sectorOhlcvAll]);

  // 60-day sparklines per sector from sectorHealthHistory
  const sparkMap = useMemo(() => {
    const map = new Map();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutStr = cutoff.toISOString().split("T")[0];
    for (const row of sectorHealthHistory ?? []) {
      if (row.date < cutStr || row.composite == null) continue;
      if (!map.has(row.sector_id)) map.set(row.sector_id, []);
      map.get(row.sector_id).push({ date: row.date, v: Number(row.composite) });
    }
    for (const arr of map.values()) arr.sort((a, b) => (a.date < b.date ? -1 : 1));
    return map;
  }, [sectorHealthHistory]);

  // ── Guards ───────────────────────────────────────────────────────────────

  if (loading.portfolio) return <PageSkeleton />;

  if (latestBySector.length === 0) {
    return (
      <div className="page-wrap" style={{ gap: 14 }}>
        <div>
          <p className="page-eyebrow">AEGIS-FIN · MACRO INTELLIGENCE</p>
          <h1 className="page-title">Sector Contagion Watch</h1>
        </div>
        {errors.portfolio
          ? <div className="warning-strip">{errors.portfolio}</div>
          : <p className="muted" style={{ fontSize: 13 }}>No sector health records found in the database.</p>
        }
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="page-wrap animate-fade-in" style={{ gap: 14 }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <p className="page-eyebrow">AEGIS-FIN · MACRO INTELLIGENCE</p>
        <h1 className="page-title">Sector Contagion Watch</h1>
        <p className="page-subtitle">
          {latestBySector.length} sectors monitored&nbsp;·&nbsp;
          Price pressure, health scores &amp; contagion signals
        </p>
        {errors.portfolio && (
          <div className="warning-strip" style={{ marginTop: 8 }}>{errors.portfolio}</div>
        )}
      </div>

      {/* ── Row 1: KPI summary ──────────────────────────────────────────── */}
      <SectorKPIs records={latestBySector} />

      {/* ── Row 2: Top 3 / Bottom 3 performers ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <PerformerBlock title="Top Performers · 1Y Return" records={top3}    isTop />
        <PerformerBlock title="Laggards · 1Y Return"       records={bottom3} isTop={false} />
      </div>

      {/* ── Row 3: Best sector OHLCV spotlight ─────────────────────────── */}
      <BestSectorSpotlight record={bestSector} ohlcvData={bestSectorOhlcv} />

      {/* ── Row 4: Health bar chart + pulse grid side by side ──────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 12, alignItems: "start" }}>
        <SectorHealthBarChart records={latestBySector} />
        <SectorTrendGrid latestRecords={sorted} sparkMap={sparkMap} />
      </div>

      {/* ── Row 5: Pressure signals ─────────────────────────────────────── */}
      <PressureSignals records={latestBySector} />

    </div>
  );
}