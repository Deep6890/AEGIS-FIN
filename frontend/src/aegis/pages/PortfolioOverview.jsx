import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer,
  Tooltip, LineChart, Line,
} from "recharts";
import { useAegisData } from "../context/AegisDataContext";
import { ChevronRight, Activity, AlertTriangle } from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────
// PALETTE: Only terracotta tones. No red, no green.
const C_CRITICAL = "#B84E28";   // terra-3 — darkest, most urgent
const C_WATCH = "#D4613A";   // terra   — mid
const C_HEALTHY = "#E07450";   // terra-2 — lightest / best
const C_MUTED = "var(--ink-3)";

function scoreColor(s) {
  if (s == null) return C_MUTED;
  if (s < 40) return C_CRITICAL;
  if (s < 70) return C_WATCH;
  return C_HEALTHY;
}

function classBadge(cls) {
  if (!cls) return "badge-gray";
  const c = cls.toUpperCase();
  if (c === "HIGH RISK" || c === "WEAK") return "badge-red";
  if (c === "WATCHLIST" || c === "NEUTRAL") return "badge-amber";
  if (c === "SAFE" || c === "STRONG") return "badge-green";
  return "badge-gray";
}

function fmt(v, dp = 1) { return v == null ? "—" : Number(v).toFixed(dp); }
// cum_change_1y stored as raw % (not 0-1 fraction)
function fmtPct(v) {
  if (v == null) return "—";
  const n = Number(v);
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function MiniSparkline({ data, color }) {
  if (!data || data.length < 3) return <div style={{ width: 52, height: 24 }} />;
  return (
    <ResponsiveContainer width={52} height={24}>
      <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ScoreBar({ value, max = 100 }) {
  const w = value != null ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div style={{ height: 3, background: "var(--border)", borderRadius: 99, width: 56, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: scoreColor(value), borderRadius: 99, transition: "width .4s" }} />
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function Skel() {
  return (
    <div className="page-wrap animate-fade-in">
      <div className="grid-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}</div>
      <div className="grid-2">
        <div className="skeleton" style={{ height: 220, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 220, borderRadius: 16 }} />
      </div>
      <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
    </div>
  );
}

// ── Score Band Bar Chart ───────────────────────────────────────────────────
function ScoreBandChart({ insights }) {
  const bands = useMemo(() => {
    const b = { "0–20": 0, "20–40": 0, "40–60": 0, "60–80": 0, "80–100": 0 };
    for (const i of insights) {
      const s = i.final_score;
      if (s == null) continue;
      if (s < 20) b["0–20"]++;
      else if (s < 40) b["20–40"]++;
      else if (s < 60) b["40–60"]++;
      else if (s < 80) b["60–80"]++;
      else b["80–100"]++;
    }
    return Object.entries(b).map(([name, count]) => ({ name, count }));
  }, [insights]);

  const maxVal = Math.max(...bands.map(b => b.count), 1);

  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={bands} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barSize={28}>
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--ink-3)", fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis hide domain={[0, maxVal + 1]} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,.04)" }}
          contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, padding: "4px 10px" }}
          formatter={v => [v, "companies"]}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {bands.map(({ name }, i) => {
            const mid = parseInt(name);
            const color = mid < 40 ? C_CRITICAL : mid < 70 ? C_WATCH : C_HEALTHY;
            return <Cell key={i} fill={color} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function PortfolioOverview() {
  const navigate = useNavigate();
  const { companies, portfolioInsights, sectorHealth, sectorHealthHistory, loading, errors } = useAegisData();

  const activeCount = (companies || []).length;
  const scoredCount = (portfolioInsights || []).filter(i => i.final_score != null).length;

  const avgScore = useMemo(() => {
    const scores = (portfolioInsights || []).map(i => i.final_score).filter(s => s != null);
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  }, [portfolioInsights]);

  const criticalCount = useMemo(() => (portfolioInsights || []).filter(i => (i.final_score ?? 100) < 40).length, [portfolioInsights]);
  const watchCount = useMemo(() => (portfolioInsights || []).filter(i => { const s = i.final_score; return s != null && s >= 40 && s < 70; }).length, [portfolioInsights]);
  const sectorsCount = (sectorHealth || []).length;

  const companyMap = useMemo(() => new Map((companies || []).map(c => [c.id, c])), [companies]);

  // Top 10 priority (lowest score first)
  const watchlist = useMemo(() =>
    (portfolioInsights || [])
      .filter(i => i.final_score != null)
      .map(i => ({ ...i, co: companyMap.get(i.company_id) ?? null }))
      .sort((a, b) => a.final_score - b.final_score)
      .slice(0, 10),
    [portfolioInsights, companyMap]
  );

  // Verdicts feed
  const verdicts = useMemo(() =>
    (portfolioInsights || [])
      .filter(i => i.summary?.trim() && i.final_score != null)
      .map(i => ({ ...i, co: companyMap.get(i.company_id) ?? null }))
      .sort((a, b) => a.final_score - b.final_score)
      .slice(0, 6),
    [portfolioInsights, companyMap]
  );

  // Sector sparklines (last 30 days)
  const sectorTrendMap = useMemo(() => {
    const map = new Map();
    const cutStr = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    for (const row of sectorHealthHistory || []) {
      if (row.date < cutStr) continue;
      if (!map.has(row.sector_id)) map.set(row.sector_id, []);
      map.get(row.sector_id).push({ v: row.health_score });
    }
    return map;
  }, [sectorHealthHistory]);

  const sortedSectors = useMemo(
    () => [...(sectorHealth || [])].sort((a, b) => (a.health_score ?? 0) - (b.health_score ?? 0)),
    [sectorHealth]
  );

  if (loading.portfolio) return <Skel />;

  return (
    <div className="page-wrap animate-fade-in">

      {/* ── HEADER ── */}
      <div>
        <p className="page-eyebrow">AEGIS-FIN · PORTFOLIO COMMAND CENTER</p>
        <h1 className="page-title">Portfolio Overview</h1>
        <p className="page-subtitle">Post-disbursement NPA early warning across {activeCount} monitored SME loan accounts</p>
      </div>

      {errors.portfolio && (
        <div className="warning-strip"><span>⚠</span><span>{errors.portfolio}</span></div>
      )}

      {/* ── KPI ROW — big numbers ── */}
      <div className="grid-4">

        {/* Universe */}
        <div className="kpi-card">
          <p className="kpi-compact-label">Universe</p>
          <p style={{ fontSize: "3rem", fontWeight: 900, letterSpacing: "-.06em", lineHeight: 1.05, color: "var(--ink)" }}>{activeCount}</p>
          <p className="kpi-compact-sub">companies tracked</p>
        </div>

        {/* Scored */}
        <div className="kpi-card">
          <p className="kpi-compact-label">Scored</p>
          <p style={{ fontSize: "3rem", fontWeight: 900, letterSpacing: "-.06em", lineHeight: 1.05, color: "var(--ink)" }}>{scoredCount}</p>
          <p className="kpi-compact-sub">with NPA scores</p>
        </div>

        {/* Critical Risk */}
        <div className="kpi-card" style={{
          borderTop: criticalCount > 0 ? `3px solid ${C_CRITICAL}` : undefined,
          background: criticalCount > 0 ? `rgba(184,78,40,.06)` : "var(--surface-2)",
        }}>
          <p className="kpi-compact-label" style={{ color: criticalCount > 0 ? C_CRITICAL : undefined }}>
            Critical Risk
          </p>
          <p style={{ fontSize: "3rem", fontWeight: 900, letterSpacing: "-.06em", lineHeight: 1.05, color: criticalCount > 0 ? C_CRITICAL : "var(--ink)" }}>
            {criticalCount}
          </p>
          <p className="kpi-compact-sub" style={{ color: criticalCount > 0 ? C_CRITICAL : undefined }}>
            score &lt; 40 · immediate review
          </p>
        </div>

        {/* Under Watch */}
        <div className="kpi-card" style={{
          borderTop: watchCount > 0 ? `3px solid ${C_WATCH}` : undefined,
        }}>
          <p className="kpi-compact-label">Under Watch</p>
          <p style={{ fontSize: "3rem", fontWeight: 900, letterSpacing: "-.06em", lineHeight: 1.05, color: watchCount > 0 ? C_WATCH : "var(--ink)" }}>
            {watchCount}
          </p>
          <p className="kpi-compact-sub">score 40–70 · monitor closely</p>
        </div>

      </div>

      {/* ── PORTFOLIO HEALTH HERO + SCORE DISTRIBUTION ── */}
      <div className="grid-2">

        {/* Big Health Score card */}
        <div className="card" style={{ padding: "28px 28px 20px" }}>
          <p className="kpi-compact-label">Portfolio Health</p>
          <p style={{ fontSize: "5rem", fontWeight: 900, letterSpacing: "-.07em", lineHeight: 1, color: scoreColor(avgScore), margin: "8px 0" }}>
            {avgScore != null ? fmt(avgScore, 1) : "—"}
          </p>
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 16 }}>avg composite score / 100</p>
          {portfolioInsights.length > 0 && <ScoreBandChart insights={portfolioInsights} />}
        </div>

        {/* Sector distress */}
        <div className="card" style={{ padding: "20px 22px" }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <span className="title-sm">Sector Distress Signals</span>
            <span className="muted" style={{ fontSize: 10, marginLeft: "auto" }}>{sectorsCount} sectors</span>
          </div>
          {sortedSectors.slice(0, 6).map((s, i) => {
            const name = s?.sectors?.name ?? "—";
            const score = s.health_score;
            const color = scoreColor(score);
            const spark = sectorTrendMap.get(s.sector_id) ?? [];
            return (
              <div key={s.sector_id ?? i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 5 ? "1px solid var(--border)" : "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                    {s.cum_change_1y != null && <span style={{ fontSize: 9, fontWeight: 700, color: Number(s.cum_change_1y) >= 0 ? C_HEALTHY : C_CRITICAL }}>{fmtPct(s.cum_change_1y)}</span>}
                    {s.spike_down && <span style={{ fontSize: 8, fontWeight: 700, color: C_CRITICAL, textTransform: "uppercase" }}>↓ spike</span>}
                  </div>
                </div>
                <MiniSparkline data={spark} color={color} />
                <span style={{ fontSize: 14, fontWeight: 800, color, fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }}>{fmt(score)}</span>
              </div>
            );
          })}
        </div>

      </div>

      {/* ── PRIORITY WATCHLIST TABLE ── */}
      {watchlist.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={15} style={{ color: C_CRITICAL, flexShrink: 0 }} />
            <p className="title-sm">Priority NPA Watchlist</p>
            <p className="muted" style={{ fontSize: 10 }}>· lowest score = highest NPA risk</p>
            <button onClick={() => navigate("/aegis/companies")} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--terra)", background: "none", border: "none", cursor: "pointer" }}>
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["#", "Company", "NPA Class", "Score", "Trend", "Fundamental", "Momentum", "Risk", "Strength", "Verdict"].map(h => (
                    <th key={h} className="th-base">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {watchlist.map((row, idx) => {
                  const sc = row.final_score;
                  return (
                    <tr key={row.company_id ?? idx} className="tr-base" style={{ cursor: "pointer" }}
                      onClick={() => row.co?.id && navigate(`/aegis/company/${row.co.id}`)}>
                      <td className="td-base">
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, fontSize: 10, fontWeight: 700, background: sc < 40 ? `rgba(184,78,40,.12)` : "var(--terra-soft)", color: scoreColor(sc) }}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="td-base" style={{ minWidth: 160 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{row.co?.name ?? "—"}</p>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--terra)", background: "var(--terra-soft)", borderRadius: 4, padding: "1px 6px" }}>{row.co?.ticker ?? "—"}</span>
                      </td>
                      <td className="td-base">
                        {row.class ? <span className={`badge ${classBadge(row.class)}`} style={{ fontSize: 9 }}>{row.class}</span> : <span className="muted">—</span>}
                      </td>
                      <td className="td-base">
                        <p style={{ fontSize: 16, fontWeight: 900, color: scoreColor(sc), letterSpacing: "-.04em", fontVariantNumeric: "tabular-nums" }}>{fmt(sc, 0)}</p>
                        <ScoreBar value={sc} />
                      </td>
                      {[row.trend_score, row.fundamental_score, row.momentum, row.risk, row.strength].map((val, vi) => (
                        <td key={vi} className="td-base">
                          <p style={{ fontSize: 13, fontWeight: 700, color: scoreColor(val), fontVariantNumeric: "tabular-nums" }}>{fmt(val, 0)}</p>
                          <ScoreBar value={val} />
                        </td>
                      ))}
                      <td className="td-base" style={{ maxWidth: 180 }}>
                        <span style={{ fontSize: 10, color: "var(--ink-2)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {row.summary ?? "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RISK VERDICTS FEED ── */}
      {verdicts.length > 0 && (
        <div className="card-spotlight">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <Activity size={14} style={{ color: "var(--terra)", flexShrink: 0 }} />
            <span className="title-sm">System Risk Verdicts</span>
            <span className="muted" style={{ fontSize: 10, marginLeft: "auto" }}>highest-risk accounts · auto-generated insights</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {verdicts.map((row, idx) => (
              <div key={row.company_id ?? idx} className="hover-row"
                style={{ display: "flex", gap: 10, padding: "10px 8px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer" }}
                onClick={() => row.co?.id && navigate(`/aegis/company/${row.co.id}`)}>
                <div style={{ width: 6, borderRadius: 3, background: scoreColor(row.final_score), flexShrink: 0, alignSelf: "stretch" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--terra)", background: "var(--terra-soft)", borderRadius: 4, padding: "1px 6px" }}>{row.co?.ticker ?? "—"}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>{row.co?.name ?? "—"}</span>
                    <span style={{ marginLeft: "auto", fontSize: 18, fontWeight: 900, color: scoreColor(row.final_score), letterSpacing: "-.05em" }}>{fmt(row.final_score, 0)}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--ink-2)", lineHeight: 1.55 }}>{row.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {portfolioInsights.length === 0 && activeCount > 0 && (
        <div style={{ background: "var(--terra-soft)", border: "1px solid rgba(212,97,58,.15)", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "var(--ink-2)" }}>
          ⚡ Pipeline not yet run — execute <code style={{ fontSize: 11 }}>scheduler.py --run-now --once</code> to generate NPA scores.
        </div>
      )}

    </div>
  );
}
