import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Cell, LabelList,
  ResponsiveContainer, Tooltip, LineChart, Line,
} from "recharts";
import { useAegisData } from "../context/AegisDataContext";

// ── Helpers ────────────────────────────────────────────────────────────────

export function scoreColor(s) {
  if (s == null) return "var(--text-3)";
  if (s < 40)   return "#EF4444";
  if (s < 65)   return "var(--orange-2)";
  return "var(--orange)";
}

export function classBadge(cls) {
  if (!cls) return "badge-gray";
  const c = cls.toLowerCase();
  if (c.includes("high") || c.includes("distress")) return "badge-red";
  if (c.includes("weak") || c.includes("watch"))    return "badge-amber";
  if (c.includes("neutral"))                         return "badge-gray";
  return "badge-orange";
}

function fmt(v, dp = 1) {
  if (v == null) return "—";
  return Number(v).toFixed(dp);
}

// ── Health Ring ────────────────────────────────────────────────────────────

function HealthRing({ score, size = 64 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score != null ? Math.min(Math.max(score, 0), 100) : 0;
  const offset = circ - (pct / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.34,1.56,.64,1)" }} />
    </svg>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skel() {
  return (
    <div className="page-wrap animate-fade-in">
      <div className="grid-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />)}</div>
      <div className="grid-2">{[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />)}</div>
      <div className="skeleton" style={{ height: 130, borderRadius: 14 }} />
      <div className="grid-auto">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />)}</div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function PortfolioOverview() {
  const navigate = useNavigate();
  const { companies, portfolioInsights, sectorHealth, sectorHealthHistory, loading, errors } = useAegisData();

  const activeCount = (companies || []).length;

  const avgScore = useMemo(() => {
    const scores = (portfolioInsights || []).map(i => i.final_score).filter(s => s != null);
    if (!scores.length) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [portfolioInsights]);

  const highRiskCount = useMemo(() =>
    (portfolioInsights || []).filter(i => {
      const c = (i.class || "").toLowerCase();
      return c.includes("high") || c.includes("distress");
    }).length,
    [portfolioInsights]
  );

  // Risk matrix data
  const riskMatrix = useMemo(() => {
    let critical = 0, watch = 0, safe = 0;
    for (const i of portfolioInsights || []) {
      const s = i.final_score;
      if (s == null) continue;
      if (s < 40) critical++;
      else if (s < 65) watch++;
      else safe++;
    }
    return [
      { name: "Critical", count: critical, fill: "#EF4444" },
      { name: "Watch",    count: watch,    fill: "#F06A3A" },
      { name: "Safe",     count: safe,     fill: "rgba(232,87,42,0.5)" },
    ];
  }, [portfolioInsights]);

  // Bottom 5 by score
  const bottom5 = useMemo(() => {
    const companyMap = new Map((companies || []).map(c => [c.id, c]));
    return (portfolioInsights || [])
      .filter(i => i.final_score != null)
      .map(i => ({ ...i, company: companyMap.get(i.company_id) ?? null }))
      .sort((a, b) => a.final_score - b.final_score)
      .slice(0, 5);
  }, [portfolioInsights, companies]);

  // Risk verdicts feed
  const verdicts = useMemo(() => {
    const companyMap = new Map((companies || []).map(c => [c.id, c]));
    return (portfolioInsights || [])
      .filter(i => i.summary?.trim())
      .map(i => ({ ...i, company: companyMap.get(i.company_id) ?? null }))
      .sort((a, b) => (a.final_score ?? 999) - (b.final_score ?? 999));
  }, [portfolioInsights, companies]);

  // Sector health sorted
  const sortedSectors = useMemo(() =>
    [...(sectorHealth || [])].sort((a, b) => (b.health_score ?? 0) - (a.health_score ?? 0)),
    [sectorHealth]
  );

  // Sector sparklines (last 30 days)
  const sparkMap = useMemo(() => {
    const map = new Map();
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    for (const row of sectorHealthHistory || []) {
      if (row.date < cutoffStr) continue;
      if (!map.has(row.sector_id)) map.set(row.sector_id, []);
      map.get(row.sector_id).push({ v: row.health_score });
    }
    return map;
  }, [sectorHealthHistory]);

  if (loading.portfolio) return <Skel />;

  return (
    <div className="page-wrap animate-fade-in">

      {/* Header */}
      <div>
        <p className="page-eyebrow">AEGIS-FIN · PORTFOLIO COMMAND</p>
        <h1 className="page-title">Portfolio Overview</h1>
        <p className="page-subtitle">Real-time NPA risk intelligence across {activeCount} monitored companies</p>
      </div>

      {errors.portfolio && <div className="warning-strip"><span>⚠</span><span>{errors.portfolio}</span></div>}

      {/* KPI Row */}
      <div className="grid-4">

        {/* Health Ring KPI */}
        <div className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <HealthRing score={avgScore} size={60} />
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: scoreColor(avgScore),
            }}>
              {avgScore != null ? Math.round(avgScore) : "—"}
            </div>
          </div>
          <div>
            <p className="kpi-compact-label">Health Index</p>
            <p style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5 }}>Portfolio avg<br />risk score</p>
          </div>
        </div>

        <div className="kpi-card">
          <p className="kpi-compact-label">Active Companies</p>
          <p className="kpi-compact-value">{activeCount}</p>
          <p className="kpi-compact-sub">monitored</p>
        </div>

        <div className={highRiskCount > 0 ? "kpi-card-danger" : "kpi-card"}>
          <p className="kpi-compact-label">Critical Alerts</p>
          <p className="kpi-compact-value" style={{ color: highRiskCount > 0 ? "#EF4444" : "var(--text)" }}>
            {highRiskCount}
          </p>
          <p className="kpi-compact-sub">high risk companies</p>
        </div>

        <div className="kpi-card">
          <p className="kpi-compact-label">Sectors Tracked</p>
          <p className="kpi-compact-value">{sortedSectors.length}</p>
          <p className="kpi-compact-sub">active sectors</p>
        </div>

      </div>

      {/* Risk Matrix + Priority Risks */}
      <div className="grid-2">

        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Risk Priority Matrix</span>
          </div>
          {portfolioInsights.length === 0 ? (
            <p className="muted" style={{ fontSize: 12, padding: "16px 0" }}>Run the pipeline to generate scores.</p>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={riskMatrix} layout="vertical" margin={{ top: 4, right: 36, left: 0, bottom: 4 }} barSize={18}>
                <XAxis type="number" domain={[0, Math.max(...riskMatrix.map(d => d.count), 1) + 1]}
                  tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--text-2)", fontWeight: 600 }}
                  axisLine={false} tickLine={false} width={50} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }}
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, padding: "5px 10px" }}
                  formatter={v => [v, "companies"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {riskMatrix.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11, fontWeight: 700, fill: "var(--text)" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Top 5 Priority Risks</span>
          </div>
          {bottom5.length === 0 ? (
            <p className="muted" style={{ fontSize: 12, padding: "16px 0" }}>No score data available.</p>
          ) : (
            <div>
              {bottom5.map((row, idx) => (
                <div key={row.company_id ?? idx}
                  onClick={() => row.company?.id && navigate(`/aegis/company/${row.company.id}`)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 4px", cursor: "pointer",
                    borderBottom: idx < bottom5.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(232,87,42,0.03)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    background: row.final_score < 40 ? "rgba(239,68,68,0.1)" : "rgba(232,87,42,0.1)",
                    color: row.final_score < 40 ? "#EF4444" : "var(--orange)",
                  }}>{idx + 1}</span>
                  <span className="ticker-chip">{row.company?.ticker ?? "—"}</span>
                  <span style={{ flex: 1, fontSize: 11, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.company?.name ?? "—"}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                    color: row.final_score < 40 ? "#EF4444" : "var(--orange)",
                  }}>{fmt(row.final_score)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Risk Verdicts Feed */}
      {verdicts.length > 0 && (
        <div className="card-spotlight">
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Risk Verdicts</span>
            <span className="muted" style={{ fontSize: 10, marginLeft: "auto" }}>{verdicts.length} companies</span>
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto", scrollbarWidth: "thin" }}>
            {verdicts.map((row, idx) => (
              <div key={row.company_id ?? idx}
                onClick={() => row.company?.id && navigate(`/aegis/company/${row.company.id}`)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "7px 4px", cursor: "pointer",
                  borderBottom: idx < verdicts.length - 1 ? "1px solid var(--border)" : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(232,87,42,0.03)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: scoreColor(row.final_score), marginTop: 5, flexShrink: 0 }} />
                <span className="ticker-chip" style={{ flexShrink: 0, marginTop: 1 }}>{row.company?.ticker ?? "—"}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", marginRight: 6 }}>{row.company?.name ?? "—"}</span>
                  <span style={{ fontSize: 11, color: "var(--text-2)", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {row.summary}
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(row.final_score), flexShrink: 0, marginTop: 1 }}>
                  {fmt(row.final_score)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sector Health Pulse Grid */}
      {sortedSectors.length > 0 && (
        <div>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Sector Health Pulse</span>
            <span className="muted" style={{ fontSize: 10, marginLeft: "auto" }}>{sortedSectors.length} sectors</span>
          </div>
          <div className="grid-auto">
            {sortedSectors.map(sector => {
              const score = sector.health_score ?? 0;
              const isHealthy = score >= 60;
              const borderColor = isHealthy ? "var(--orange)" : "#EF4444";
              const cum1y = sector.cum_change_1y;
              const sparkData = sparkMap.get(sector.sector_id) ?? [];
              return (
                <div key={sector.sector_id} className="card" style={{ borderLeft: `3px solid ${borderColor}`, padding: "12px 14px" }}>
                  <p className="kpi-compact-label" style={{ marginBottom: 4 }}>
                    {sector?.sectors?.name ?? "—"}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-.04em", color: scoreColor(score), lineHeight: 1 }}>
                      {fmt(score)}
                    </span>
                    {cum1y != null && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: cum1y >= 0 ? "var(--orange)" : "#EF4444" }}>
                        {cum1y >= 0 ? "+" : ""}{fmt(cum1y, 1)}%
                      </span>
                    )}
                  </div>
                  {sparkData.length > 2 && (
                    <ResponsiveContainer width="100%" height={26}>
                      <LineChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Line type="monotone" dataKey="v" stroke={isHealthy ? "var(--orange)" : "#EF4444"} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    {sector.volatility != null && <span className="muted" style={{ fontSize: 9 }}>vol {Number(sector.volatility).toFixed(3)}</span>}
                    {sector.ret_z != null && <span className="muted" style={{ fontSize: 9 }}>z {Number(sector.ret_z).toFixed(1)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {portfolioInsights.length === 0 && activeCount > 0 && (
        <div style={{ background: "rgba(232,87,42,0.05)", border: "1px solid rgba(232,87,42,0.12)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "var(--text-2)" }}>
          ⚡ Insight pipeline not yet run — run <code style={{ fontSize: 11 }}>scheduler.py --run-now --once</code> to generate scores.
        </div>
      )}

    </div>
  );
}
