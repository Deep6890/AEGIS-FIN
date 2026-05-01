import React, { useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Building2, TrendingUp, TrendingDown, AlertTriangle, Shield, ChevronRight } from "lucide-react";
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { useAegisData } from "../context/AegisDataContext";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(v, dp = 2) { return v == null ? "—" : Number(v).toFixed(dp); }
function fmtPct(v, dp = 1) { if (v == null) return "—"; const n = Number(v); return `${n >= 0 ? "+" : ""}${n.toFixed(dp)}%`; }
function fmtDate(s) { return s ? s.slice(0, 10) : ""; }

// PALETTE: Only terracotta tones. No red, no green.
const C_CRITICAL = "var(--terra-3)";
const C_WATCH    = "var(--terra)";
const C_HEALTHY  = "var(--terra-2)";
const C_MUTED    = "var(--ink-3)";

function scoreColor(s) {
  if (s == null) return C_MUTED;
  if (s < 40) return C_CRITICAL;
  if (s < 70) return C_WATCH;
  return C_HEALTHY;
}
function classBadge(cls) {
  return "badge badge-orange"; // Using neutral orange/terra badge for all as per 'no extra colors'
}
function statusColor(s) {
  if (!s) return C_MUTED;
  const u = s.toUpperCase();
  if (u === "STRONG" || u === "GOOD") return C_HEALTHY;
  if (u === "WEAK" || u === "POOR" || u === "CRITICAL") return C_CRITICAL;
  return "var(--ink-2)";
}
function statusBadge(s) {
  return "badge badge-orange"; // Neutral badge
}

function ScoreBar({ label, value, max = 100 }) {
  const w = value != null ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const color = scoreColor(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ flex: 1, fontSize: 12, color: "var(--ink-2)", fontWeight: 500 }}>{label}</span>
      <div style={{ width: 100, height: 5, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${w}%`, height: "100%", background: color, borderRadius: 99, transition: "width .5s ease" }} />
      </div>
      <span style={{ width: 36, textAlign: "right", fontSize: 12, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{fmt(value, 0)}</span>
    </div>
  );
}

function KpiChip({ label, value, accent }) {
  return (
    <div style={{ padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", minWidth: 80 }}>
      <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-.04em", lineHeight: 1, color: accent || "var(--ink)" }}>{value}</p>
    </div>
  );
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
      <p style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}</p>
      ))}
    </div>
  );
}

export default function CompanyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company, insight, insightHistory, ohlcvHealth, sectorHealthDetail, balanceSheet, holdingScores, correlationScores, sectors, loading, errors, setCompanyId } = useAegisData();

  useEffect(() => { if (id) setCompanyId(id); }, [id, setCompanyId]);

  const sectorNameMap = useMemo(() => new Map((sectors || []).map(s => [s.id, s.name])), [sectors]);

  // Latest OHLCV health row
  const latestHealth = useMemo(() => {
    if (!ohlcvHealth?.length) return null;
    return [...ohlcvHealth].sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [ohlcvHealth]);

  // Health trend chart (company vs sector, last 90 days)
  const healthChart = useMemo(() => {
    const map = new Map();
    for (const r of ohlcvHealth ?? []) {
      const d = fmtDate(r.date); if (!d) continue;
      if (!map.has(d)) map.set(d, { date: d });
      map.get(d).company = r.health_score ?? null;
    }
    for (const r of sectorHealthDetail ?? []) {
      const d = fmtDate(r.date); if (!d) continue;
      if (!map.has(d)) map.set(d, { date: d });
      map.get(d).sector = r.health_score ?? null;
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-90);
  }, [ohlcvHealth, sectorHealthDetail]);

  // Balance sheet — latest period per ratio, grouped by category
  const bsGrouped = useMemo(() => {
    const latest = new Map();
    for (const r of balanceSheet ?? []) {
      const key = r.ratio_id;
      if (!latest.has(key) || r.period > latest.get(key).period) latest.set(key, r);
    }
    const groups = {};
    for (const r of latest.values()) {
      const cat = r.ratio_definitions?.category ?? "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(r);
    }
    return groups;
  }, [balanceSheet]);

  // Holdings — latest period per metric
  const holdingsLatest = useMemo(() => {
    const latest = new Map();
    for (const r of holdingScores ?? []) {
      const key = r.metric_id;
      if (!latest.has(key) || r.period > latest.get(key).period) latest.set(key, r);
    }
    return Array.from(latest.values());
  }, [holdingScores]);

  // Top correlated sector
  const topCorr = useMemo(() => {
    if (!correlationScores?.length) return null;
    const latestBySector = new Map();
    for (const r of correlationScores) {
      const sid = r.sector_id;
      if (!latestBySector.has(sid) || r.date > latestBySector.get(sid).date) latestBySector.set(sid, r);
    }
    let best = null;
    for (const r of latestBySector.values()) {
      if (r.corr_100d == null) continue;
      if (!best || Number(r.corr_100d) > Number(best.corr_100d)) best = r;
    }
    return best ? { ...best, sectorName: sectorNameMap.get(best.sector_id) ?? "—" } : null;
  }, [correlationScores, sectorNameMap]);

  // Insight history sparkline
  const insightSpark = useMemo(() =>
    [...(insightHistory ?? [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-30).map(r => ({ date: r.date.slice(5), v: r.final_score })),
    [insightHistory]
  );

  if (loading.company) return (
    <div className="page-wrap animate-fade-in">
      {[90, 200, 280, 200].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 16 }} />)}
    </div>
  );

  if (!insight && !loading.company) return (
    <div className="page-wrap animate-fade-in">
      <div><p className="page-eyebrow">AEGIS-FIN · COMPANY PROFILE</p><h1 className="page-title">{company?.name ?? "Company Profile"}</h1></div>
      <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
        <Building2 size={32} style={{ color: "var(--ink-3)", margin: "0 auto 12px" }} />
        <p className="title-md">No insight data available</p>
        <p className="muted" style={{ marginTop: 6 }}>Run the analysis pipeline to generate NPA scores for this company.</p>
      </div>
    </div>
  );

  const score = insight?.final_score;
  const scoreRisk = score == null ? null : score < 40 ? "CRITICAL" : score < 70 ? "ELEVATED" : "NORMAL";
  const riskBg = score == null ? "var(--surface)" : score < 40 ? "rgba(184,78,40,.06)" : score < 70 ? "rgba(212,97,58,.06)" : "rgba(212,97,58,.04)";
  const riskBorder = score == null ? "var(--border)" : score < 40 ? "rgba(184,78,40,.2)" : score < 70 ? "rgba(212,97,58,.2)" : "rgba(212,97,58,.15)";

  return (
    <div className="page-wrap animate-fade-in">

      {/* ── Header ── */}
      <div>
        <p className="page-eyebrow">AEGIS-FIN · COMPANY RISK PROFILE</p>
        <h1 className="page-title">{company?.name ?? "Company Profile"}</h1>
        {company && <p className="page-subtitle">{company.ticker} · Sector: {sectorNameMap.get(company.sector_id) ?? "—"} · Post-disbursement NPA monitoring</p>}
      </div>

      {errors.company && <div className="warning-strip"><span>⚠</span><span>{errors.company}</span></div>}

      {/* ── 1. NPA VERDICT HERO ── */}
      <div className="card" style={{ padding: "20px 24px", background: riskBg, border: `1px solid ${riskBorder}` }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>

          {/* Score + trend */}
          <div style={{ minWidth: 120 }}>
            <p className="kpi-compact-label">NPA Risk Score</p>
            <p style={{ fontSize: "3.5rem", fontWeight: 900, letterSpacing: "-.06em", lineHeight: 1, color: scoreColor(score) }}>
              {fmt(score, 0)}
            </p>
            <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>0 = highest risk · 100 = safest</p>
            {insightSpark.length > 2 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 8, color: "var(--ink-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>30-day trend</p>
                <ResponsiveContainer width={120} height={32}>
                  <LineChart data={insightSpark} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                    <Line type="monotone" dataKey="v" stroke={scoreColor(score)} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />

          {/* Classification */}
          <div style={{ minWidth: 140 }}>
            <p className="kpi-compact-label">NPA Classification</p>
            <span className={classBadge(insight?.class)} style={{ fontSize: "0.85rem", padding: "6px 16px", marginTop: 4, display: "inline-block" }}>
              {insight?.class ?? "—"}
            </span>
            <p className="muted" style={{ marginTop: 8, fontSize: 11 }}>Risk Level: <strong style={{ color: scoreColor(score) }}>{scoreRisk ?? "—"}</strong></p>
            {latestHealth?.date && <p className="muted" style={{ fontSize: 10, marginTop: 4 }}>Market data as of {fmtDate(latestHealth.date)}</p>}
          </div>

          <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />

          {/* Quick stats */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <p className="kpi-compact-label" style={{ marginBottom: 8 }}>Key Signals</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "1M Return", value: latestHealth?.cum_change_1m != null ? fmtPct(latestHealth.cum_change_1m) : "—", accent: latestHealth?.cum_change_1m >= 0 ? C_HEALTHY : C_CRITICAL },
                { label: "1Y Return", value: latestHealth?.cum_change_1y != null ? fmtPct(latestHealth.cum_change_1y) : "—", accent: latestHealth?.cum_change_1y >= 0 ? C_HEALTHY : C_CRITICAL },
                { label: "Volatility", value: latestHealth?.volatility != null ? fmt(latestHealth.volatility, 3) : "—", accent: "var(--ink)" },
                { label: "Return Z-Score", value: latestHealth?.ret_z != null ? fmt(latestHealth.ret_z, 2) : "—", accent: latestHealth?.ret_z != null && latestHealth.ret_z < -2 ? C_CRITICAL : "var(--ink)" },
              ].map(({ label, value, accent }) => (
                <KpiChip key={label} label={label} value={value} accent={accent} />
              ))}
            </div>
            {(latestHealth?.spike_down || latestHealth?.spike_up) && (
              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                {latestHealth.spike_down && <span className="badge badge-orange" style={{ fontSize: 9 }}>⚡ Price Spike Down</span>}
                {latestHealth.spike_up && <span className="badge badge-orange" style={{ fontSize: 9 }}>⚡ Price Spike Up</span>}
              </div>
            )}
          </div>
        </div>

        {/* Risk Verdict */}
        {insight?.summary && (
          <div className="insight-box" style={{ marginTop: 16 }}>
            <p className="insight-label" style={{ marginBottom: 4 }}>Risk Verdict</p>
            <p style={{ fontSize: "0.8125rem", lineHeight: 1.65 }}>{insight.summary}</p>
          </div>
        )}
      </div>

      {/* ── 2. SCORE BREAKDOWN ── */}
      <div className="grid-2">
        <div className="card" style={{ padding: "16px 18px" }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Score Dimensions</span>
          </div>
          <ScoreBar label="Trend Score" value={insight?.trend_score} />
          <ScoreBar label="Fundamental Score" value={insight?.fundamental_score} />
          <ScoreBar label="Sentiment Score" value={insight?.sentiment_score} />
          <ScoreBar label="Sector Alignment" value={insight?.sector_alignment_score} />
          <ScoreBar label="Momentum" value={insight?.momentum} />
          <ScoreBar label="Strength" value={insight?.strength} />
          <ScoreBar label="Risk Index" value={insight?.risk} />
        </div>

        <div className="card" style={{ padding: "16px 18px" }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="title-sm">Company vs Sector Health</span>
          </div>
          {healthChart.length > 2 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={healthChart} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--ink-3)" }} tickFormatter={v => v?.slice(5)} minTickGap={30} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--ink-3)" }} width={28} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="company" name="Company" stroke="var(--terra)" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="sector" name="Sector" stroke="var(--terra-3)" strokeWidth={1.5} dot={false} connectNulls strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p className="muted">No health history available yet.</p>
            </div>
          )}
          <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
            {[{ label: "Company Health", color: "var(--terra)" }, { label: "Sector Health", color: "var(--terra-3)" }].map(({ label, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 2, background: color, borderRadius: 1 }} />
                <span style={{ fontSize: 9, color: "var(--ink-3)", fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. BALANCE SHEET ── */}
      {Object.keys(bsGrouped).length > 0 && (
        <div className="card" style={{ padding: "16px 18px" }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <span className="title-sm">Balance Sheet Ratios</span>
            <button onClick={() => navigate(`/aegis/company/${id}/solvency`)} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--terra)", background: "none", border: "none", cursor: "pointer" }}>
              Full Analysis <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {Object.entries(bsGrouped).slice(0, 4).map(([cat, rows]) => (
              <div key={cat}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--terra)", marginBottom: 6 }}>{cat}</p>
                {rows.slice(0, 4).map(r => {
                  const name = r.ratio_definitions?.name ?? `Ratio ${r.ratio_id}`;
                  const hib = r.ratio_definitions?.higher_is_better;
                  const adjStatus = r.adjusted_status ?? r.status;
                  return (
                    <div key={r.ratio_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, color: "var(--ink)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                        {r.trend && <p style={{ fontSize: 9, color: "var(--ink-3)" }}>trend: {r.trend}</p>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{fmt(r.value)}</span>
                        {adjStatus && (
                          <span className={`badge ${statusBadge(adjStatus)}`} style={{ fontSize: 8, padding: "2px 6px" }}>{adjStatus}</span>
                        )}
                        {r.sector_pressure != null && (
                          <span style={{ fontSize: 9, color: r.sector_pressure < 0 ? C_CRITICAL : C_HEALTHY, fontWeight: 700 }}>
                            {r.sector_pressure >= 0 ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. OWNERSHIP / HOLDINGS ── */}
      {holdingsLatest.length > 0 && (
        <div className="card" style={{ padding: "16px 18px" }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <span className="title-sm">Ownership & Holding Patterns</span>
            <button onClick={() => navigate(`/aegis/company/${id}/ownership`)} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--terra)", background: "none", border: "none", cursor: "pointer" }}>
              Full Analysis <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
            {holdingsLatest.slice(0, 8).map(r => {
              const name = r.holding_metric_definitions?.name ?? `Metric ${r.metric_id}`;
              const adjStatus = r.adjusted_status ?? r.status;
              return (
                <div key={r.metric_id} style={{ padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                  <p style={{ fontSize: "1.1rem", fontWeight: 800, color: statusColor(adjStatus), letterSpacing: "-.03em", lineHeight: 1 }}>{fmt(r.value)}%</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                    {adjStatus && <span className={`badge ${statusBadge(adjStatus)}`} style={{ fontSize: 8, padding: "2px 6px" }}>{adjStatus}</span>}
                    {r.hist_pct_rank != null && <span style={{ fontSize: 9, color: "var(--ink-3)" }}>pct {fmt(r.hist_pct_rank, 0)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5. SECTOR CORRELATION ── */}
      {topCorr && (
        <div className="card" style={{ padding: "16px 18px" }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <span className="title-sm">Top Sector Correlation (100-day)</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <p className="kpi-compact-label">Most Correlated Sector</p>
              <p className="title-lg" style={{ color: "var(--terra)", marginTop: 4 }}>{topCorr.sectorName}</p>
            </div>
            {[
              { label: "Corr 100d", value: fmt(topCorr.corr_100d, 4) },
              { label: "Outperf 100d", value: topCorr.outperf_100d != null ? fmtPct(topCorr.outperf_100d) : "—" },
              { label: "Down Co-movement", value: topCorr.aligned_dn_pct != null ? fmtPct(topCorr.aligned_dn_pct) : "—" },
              { label: "Avg Sector Health", value: fmt(topCorr.avg_top_health) },
            ].map(({ label, value }) => (
              <KpiChip key={label} label={label} value={value} />
            ))}
          </div>
          <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 10 }}>
            High correlation with a distressed sector is a contagion risk signal. Negative outperformance indicates the stock is underperforming its sector benchmark.
          </p>
        </div>
      )}

      {/* Quick navigation to sub-modules */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {[
          { label: "Solvency & Leverage", path: "solvency" },
          { label: "Cashflow Efficiency", path: "cashflow" },
          { label: "Ownership Tracking", path: "ownership" },
          { label: "Market Volatility", path: "market" },
          { label: "Correlation Analysis", path: "correlation" },
          { label: "NPA Report", path: "report" },
        ].map(({ label, path }) => (
          <button
            key={path}
            className="btn-inactive"
            style={{ fontSize: 11, padding: "7px 14px" }}
            onClick={() => navigate(`/aegis/company/${id}/${path}`)}
          >
            {label} →
          </button>
        ))}
      </div>

    </div>
  );
}
