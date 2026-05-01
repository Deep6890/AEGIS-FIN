import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Activity, BarChart2, Users, TrendingUp, TrendingDown, ShieldAlert, AlertTriangle, Building2, ArrowUpRight, Shield, GitBranch, ChevronRight, Info } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid, BarChart, Bar, Cell, ReferenceLine } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner, { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchCompanyById, fetchLatestCompanyMetrics, fetchBalanceSheet, fetchHoldingMetrics, fetchMlPredictions, fetchTopSectors, fetchCompanyOHLCVHistory, fetchSectorOHLCVHistory } from "../lib/api";
import { adaptInsightRow, adaptBalanceSheetRow, adaptHoldingRow, adaptCorrelationForTopSecState, adaptOhlcvHealthRow } from "../lib/adapter";

// ── Helpers ───────────────────────────────────────────────────────────────────

function riskColor(score) {
  if (score == null) return "#ABABAB";
  if (score >= 70) return "#22C55E";
  if (score >= 40) return "var(--orange)";
  return "#EF4444";
}
function riskLabel(score) {
  if (score == null) return "No Data";
  if (score >= 70) return "Stable";
  if (score >= 40) return "Warning";
  return "High Risk";
}
function fmt(v, decimals = 2) {
  if (v == null || (typeof v === "number" && !isFinite(v))) return "—";
  if (typeof v === "number") return v.toFixed(decimals);
  return String(v);
}

function deriveSignal(hs) {
  if (hs == null) return null;
  if (hs >= 75) return "STRONG";
  if (hs >= 50) return "NEUTRAL";
  if (hs >= 25) return "WATCH";
  return "WEAK";
}

function RiskStatusBadge({ score }) {
  const label = riskLabel(score);
  const cls =
    score == null ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-500" :
    score >= 70   ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400" :
    score >= 40   ? "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400" :
                    "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor(score) }} />
      {label}
    </span>
  );
}

const TABS = [
  { key: "overview",      label: "Overview",      Icon: Shield },
  { key: "market",        label: "Market",         Icon: Activity },
  { key: "fundamentals",  label: "Fundamentals",   Icon: BarChart2 },
  { key: "ownership",     label: "Ownership",      Icon: Users },
  { key: "correlation",   label: "Correlation",    Icon: GitBranch },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function CompanyDetail() {
  const { id } = useParams();
  const ct = useChartTheme();

  const [company,        setCompany]        = useState(null);
  const [metrics,        setMetrics]        = useState([]);
  const [balance,        setBalance]        = useState([]);
  const [holdings,       setHoldings]       = useState([]);
  const [ml,             setMl]             = useState([]);
  const [topSec,         setTopSec]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [tab,            setTab]            = useState("overview");
  const [overlayData,    setOverlayData]    = useState([]);
  const [overlayLoading, setOverlayLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchCompanyById(id),
      fetchLatestCompanyMetrics(id),
      fetchBalanceSheet(id),
      fetchHoldingMetrics(id),
      fetchMlPredictions(id),
      fetchTopSectors(id),
    ]).then(([c, m, b, h, ml_, ts]) => {
      setCompany(c.data);
      setMetrics((m.data || []).map(adaptOhlcvHealthRow).reverse());
      setBalance((b.data || []).map(adaptBalanceSheetRow));
      setHoldings((h.data || []).map(adaptHoldingRow));
      setMl((ml_.data || []).map(adaptInsightRow).reverse());
      setTopSec(adaptCorrelationForTopSecState(ts.data || []));
    }).finally(() => setLoading(false));
  }, [id]);

  // Overlay chart: load when correlation tab opens
  useEffect(() => {
    if (tab !== "correlation" || !id) return;
    const topList = topSec[0]?.top_sectors || [];
    const topSectorName = topList[0]?.sector || topList[0]?.name;
    if (!topSectorName) return;
    setOverlayLoading(true);
    Promise.all([
      fetchCompanyOHLCVHistory(id, 90),
      fetchSectorOHLCVHistory(topSectorName, 90),
    ]).then(([compRes, secRes]) => {
      const secMap = {};
      (secRes.data || []).forEach(r => { secMap[r.date] = r; });
      const merged = (compRes.data || []).map(r => ({
        date:           r.date?.slice(5),
        company_health: r.health_score ?? null,
        sector_health:  secMap[r.date]?.health_score ?? null,
      })).filter(r => r.company_health != null || r.sector_health != null);
      setOverlayData(merged);
    }).finally(() => setOverlayLoading(false));
  }, [tab, id, topSec]);

  if (loading) return <PageLayout title="Company Detail"><PageSkeleton /></PageLayout>;
  if (!company) return <PageLayout title="Company Detail"><EmptyState title="Company not found" sub="Check the URL or return to the companies list." /></PageLayout>;

  const latest     = metrics.length ? metrics[metrics.length - 1] : null;
  const score      = latest?.health_score ?? null;
  const distress   = score != null ? Math.max(0, 100 - score) : null;
  const signal     = deriveSignal(score);

  // Balance sheet grouped by category
  const bsLatest = useMemo(() => {
    const map = {};
    balance.forEach(r => {
      const name = r.ratio_definitions?.name || "Ratio";
      if (!map[name]) map[name] = r;
    });
    return Object.values(map);
  }, [balance]);
  const bsCategories = useMemo(() =>
    [...new Set(bsLatest.map(r => r.ratio_definitions?.category || "Other"))],
    [bsLatest]);

  // Holding signal
  const holdingSignal = holdings.find(r => r.holding_signal)?.holding_signal || null;

  // Top sectors list
  const topSectors = topSec[0]?.top_sectors || [];

  return (
    <PageLayout title={company.name}>
      <div className="space-y-5 pb-10">

        {/* ── Back link ── */}
        <Link to="/companies" className="flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--orange)] w-fit transition-colors animate-fade-in">
          <ArrowLeft size={13} /> Back to Companies
        </Link>

        {/* ── Company Header Card ── */}
        <div className="card p-6 relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--orange)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--orange)]/10 flex items-center justify-center shrink-0">
                <Building2 size={22} className="text-[var(--orange)]" />
              </div>
              <div>
                <h1 className="title-xl text-[var(--text)] tracking-tight">{company.name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {company.ticker && (
                    <span className="text-xs font-mono text-[var(--orange)] bg-[var(--orange)]/10 px-1.5 py-0.5 rounded">
                      {company.ticker}
                    </span>
                  )}
                  <span className="text-xs text-[var(--text-3)]">{company.exchange || "NSE"}</span>
                  {latest?.date && (
                    <span className="text-[10px] text-[var(--text-3)]">Updated {latest.date}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-neutral-50 dark:bg-neutral-900/60 px-5 py-4 rounded-2xl border border-[var(--border)] shrink-0">
              <div className="text-center">
                <p className="label-caps mb-1">Risk Score</p>
                <p className="text-4xl font-black tabular-nums" style={{ color: riskColor(score) }}>
                  {score != null ? score.toFixed(0) : "—"}
                </p>
                <div className="mt-2 h-1.5 w-24 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${score ?? 0}%`, background: riskColor(score) }} />
                </div>
              </div>
              <div className="border-l border-[var(--border)] pl-4 space-y-2">
                <RiskStatusBadge score={score} />
                {distress != null && (
                  <p className="text-[10px] text-[var(--text-3)] font-semibold tabular-nums">
                    {distress.toFixed(1)}% distress prob.
                  </p>
                )}
                {signal && <SignalBadge value={signal} />}
              </div>
            </div>
          </div>
        </div>

        {/* ── Risk Summary Bar ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-1">
          {/* Market Risk */}
          <div className="card p-5">
            <p className="label-caps mb-2">Market Risk</p>
            <p className="text-3xl font-black tabular-nums" style={{ color: riskColor(score) }}>
              {score != null ? score.toFixed(0) : "—"}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <SignalBadge value={signal} />
              <span className="text-[10px] text-[var(--text-3)]">health score</span>
            </div>
          </div>
          {/* Volatility */}
          <div className="card p-5">
            <p className="label-caps mb-2">Volatility</p>
            <p className="text-3xl font-black tabular-nums text-[var(--text)]">
              {latest?.volatility != null ? `${fmt(latest.volatility)}%` : "Data unavailable"}
            </p>
            <div className="flex items-center gap-3 mt-2">
              {latest?.spike_up && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400">
                  <TrendingUp size={11} /> Spike Up
                </span>
              )}
              {latest?.spike_down && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                  <TrendingDown size={11} /> Spike Down
                </span>
              )}
              {!latest?.spike_up && !latest?.spike_down && (
                <span className="text-[10px] text-[var(--text-3)]">No spikes detected</span>
              )}
            </div>
          </div>
          {/* Momentum */}
          <div className="card p-5">
            <p className="label-caps mb-2">Momentum</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black tabular-nums text-[var(--text)]">
                {latest?.z_change != null ? fmt(latest.z_change, 3) : "—"}
              </p>
              <span className="text-[10px] text-[var(--text-3)]">z-change</span>
            </div>
            <p className="text-xs text-[var(--text-3)] mt-1 tabular-nums">
              Cum Z: {latest?.cum_z_change != null ? fmt(latest.cum_z_change, 3) : "—"}
            </p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1.5 border-b border-[var(--border)] overflow-x-auto pb-2 stagger-2">
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all duration-200 ${tab === key ? "btn-active" : "btn-inactive"}`}>
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            OVERVIEW TAB
        ══════════════════════════════════════════════════════════════════ */}
        {tab === "overview" && (
          <div className="space-y-4 animate-fade-in">
            {metrics.length ? (
              <>
                {/* Risk Score Trend */}
                <div className="card p-5">
                  <p className="title-md mb-1">Risk Score Trend</p>
                  <p className="text-xs text-[var(--text-3)] mb-4">Health score over 90 days</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={metrics}>
                      <defs>
                        <linearGradient id="hsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={ct.green} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={ct.green} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={32} />
                      <Tooltip {...ct.tooltip} />
                      <ReferenceLine y={70} stroke={ct.green}  strokeDasharray="4 4" strokeOpacity={0.5} />
                      <ReferenceLine y={40} stroke={ct.red}    strokeDasharray="4 4" strokeOpacity={0.5} />
                      <Area type="monotone" dataKey="health_score" stroke={ct.green} strokeWidth={2} fill="url(#hsGrad)" dot={false} name="Health Score" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Key Risk Indicators */}
                <div className="card p-5">
                  <p className="title-md mb-4">Key Risk Indicators</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: "Health Score",    value: latest?.health_score,  unit: "",  decimals: 1 },
                      { label: "Daily Return",     value: latest?.daily_return != null ? latest.daily_return * 100 : null, unit: "%", decimals: 2 },
                      { label: "Volatility",       value: latest?.volatility,   unit: "%", decimals: 2 },
                      { label: "Return Z-Score",   value: latest?.ret_z,        unit: "",  decimals: 3 },
                      { label: "Z-Change",         value: latest?.z_change,     unit: "",  decimals: 3 },
                      { label: "Spikes",           value: null, custom: true },
                    ].map(({ label, value, unit, decimals, custom }) => (
                      <div key={label} className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-[var(--border)]">
                        <p className="label-caps mb-1">{label}</p>
                        {custom ? (
                          <div className="flex gap-2 mt-1">
                            <span className={`text-[10px] font-bold ${latest?.spike_up ? "text-green-600 dark:text-green-400" : "text-[var(--text-3)]"}`}>
                              Up: {latest?.spike_up ? "Yes" : "No"}
                            </span>
                            <span className={`text-[10px] font-bold ${latest?.spike_down ? "text-red-500" : "text-[var(--text-3)]"}`}>
                              Down: {latest?.spike_down ? "Yes" : "No"}
                            </span>
                          </div>
                        ) : (
                          <p className="text-lg font-bold tabular-nums text-[var(--text)]">
                            {value != null ? `${fmt(value, decimals)}${unit}` : "Data unavailable"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className="insight-box">
                  <div className="flex items-start gap-2">
                    <Info size={14} className="text-[var(--orange)] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-[var(--orange)] mb-1">Risk Assessment</p>
                      <p className="text-xs text-[var(--text-3)] leading-relaxed">
                        {score == null
                          ? "No risk data available. Run the pipeline to generate risk scores."
                          : score >= 70
                          ? "Company shows stable financial health. No immediate credit risk signals."
                          : score >= 40
                          ? "Moderate risk indicators present. Elevated monitoring recommended."
                          : "High distress signals detected. Immediate credit review warranted."}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState title="No risk data available" sub="Run pipeline to generate risk data." icon={ShieldAlert} />
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MARKET TAB
        ══════════════════════════════════════════════════════════════════ */}
        {tab === "market" && (
          <div className="space-y-4 animate-fade-in">
            {metrics.length ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Health + Composite */}
                  <div className="card p-5">
                    <p className="title-md mb-1">Health Score &amp; Composite</p>
                    <p className="text-xs text-[var(--text-3)] mb-4">Dual signal — 90 days</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={metrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={32} />
                        <Tooltip {...ct.tooltip} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="health_score" stroke={ct.green}  dot={false} strokeWidth={2} name="Health Score" />
                        <Line type="monotone" dataKey="composite"    stroke={ct.orange} dot={false} strokeWidth={1.5} name="Composite" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Daily Return + Volatility */}
                  <div className="card p-5">
                    <p className="title-md mb-1">Daily Return &amp; Volatility</p>
                    <p className="text-xs text-[var(--text-3)] mb-4">Return % and volatility — 90 days</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={metrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={32} />
                        <Tooltip {...ct.tooltip} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <ReferenceLine y={0} stroke={ct.grid} strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="daily_return" stroke={ct.blue} dot={false} strokeWidth={1.5} name="Daily Return" />
                        <Line type="monotone" dataKey="volatility"   stroke={ct.red}  dot={false} strokeWidth={1.5} name="Volatility" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Latest snapshot table */}
                <div className="card overflow-hidden">
                  <div className="px-5 py-4 border-b border-[var(--border)]">
                    <p className="title-md">Latest Snapshot</p>
                    <p className="text-xs text-[var(--text-3)] mt-0.5">Most recent 10 rows</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          {["Date","Health","Composite","Ret Z","Z-Change","Cum Z","Volatility","Spike Up","Spike Dn"].map(h => (
                            <th key={h} className="th-base">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...metrics].reverse().slice(0, 10).map((r, i) => (
                          <tr key={i} className="tr-base">
                            <td className="td-base text-xs font-mono text-[var(--text-2)]">{r.date}</td>
                            <td className="td-base">
                              <span className="text-xs font-bold tabular-nums" style={{ color: riskColor(r.health_score) }}>
                                {fmt(r.health_score, 1)}
                              </span>
                            </td>
                            <td className="td-base text-xs tabular-nums text-[var(--text-2)]">{fmt(r.composite, 3)}</td>
                            <td className="td-base text-xs tabular-nums text-[var(--text-2)]">{fmt(r.ret_z, 3)}</td>
                            <td className="td-base text-xs tabular-nums text-[var(--text-2)]">{fmt(r.z_change, 3)}</td>
                            <td className="td-base text-xs tabular-nums text-[var(--text-2)]">{fmt(r.cum_z_change, 3)}</td>
                            <td className="td-base text-xs tabular-nums text-[var(--text-2)]">{fmt(r.volatility, 2)}</td>
                            <td className="td-base">
                              <span className={`text-[10px] font-bold ${r.spike_up ? "text-green-600 dark:text-green-400" : "text-[var(--text-3)]"}`}>
                                {r.spike_up ? "Yes" : "No"}
                              </span>
                            </td>
                            <td className="td-base">
                              <span className={`text-[10px] font-bold ${r.spike_down ? "text-red-500" : "text-[var(--text-3)]"}`}>
                                {r.spike_down ? "Yes" : "No"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState title="No market data" sub="Run the OHLCV pipeline to populate market metrics." icon={Activity} />
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            FUNDAMENTALS TAB
        ══════════════════════════════════════════════════════════════════ */}
        {tab === "fundamentals" && (
          <div className="space-y-5 animate-fade-in">
            {bsLatest.length ? (
              bsCategories.map(cat => {
                const rows = bsLatest.filter(r => (r.ratio_definitions?.category || "Other") === cat);
                return (
                  <div key={cat} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text)]">{cat}</h3>
                      <div className="h-px flex-1 bg-[var(--border)]" />
                    </div>
                    <div className="card overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr>
                              {["Ratio","Value","YoY %","Hist Rank","Status","Adj Status","Sector Pressure"].map(h => (
                                <th key={h} className="th-base">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, i) => {
                              const sp = r.sector_pressure;
                              return (
                                <tr key={i} className="tr-base">
                                  <td className="td-base">
                                    <p className="text-xs font-semibold text-[var(--text)]">{r.ratio_definitions?.name || "—"}</p>
                                  </td>
                                  <td className="td-base text-xs font-mono font-bold text-[var(--text)] tabular-nums">
                                    {fmt(r.value, 2)}
                                  </td>
                                  <td className="td-base">
                                    {r.yoy_pct != null ? (
                                      <span className={`text-xs font-bold tabular-nums ${r.yoy_pct > 0 ? "text-green-600 dark:text-green-400" : r.yoy_pct < 0 ? "text-red-500" : "text-[var(--text-3)]"}`}>
                                        {r.yoy_pct > 0 ? "+" : ""}{fmt(r.yoy_pct, 1)}%
                                      </span>
                                    ) : <span className="text-xs text-[var(--text-3)]">—</span>}
                                  </td>
                                  <td className="td-base text-xs font-bold text-[var(--text-2)] tabular-nums">
                                    {r.hist_pct_rank != null ? `${fmt(r.hist_pct_rank, 0)}p` : "—"}
                                  </td>
                                  <td className="td-base"><SignalBadge value={r.status} /></td>
                                  <td className="td-base"><SignalBadge value={r.adjusted_status} /></td>
                                  <td className="td-base">
                                    {sp != null ? (
                                      <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                          <div className="h-full rounded-full bg-[var(--orange)]"
                                            style={{ width: `${Math.min(100, Math.max(0, sp))}%` }} />
                                        </div>
                                        <span className="text-[10px] font-mono text-[var(--text-3)] tabular-nums">{fmt(sp, 0)}</span>
                                      </div>
                                    ) : <span className="text-xs text-[var(--text-3)]">—</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState title="Balance sheet data unavailable" sub="Run pipeline to populate fundamentals." icon={BarChart2} />
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            OWNERSHIP TAB
        ══════════════════════════════════════════════════════════════════ */}
        {tab === "ownership" && (
          <div className="space-y-4 animate-fade-in">
            {holdings.length ? (
              <>
                {/* Holding signal */}
                {holdingSignal && (
                  <div className="flex items-center gap-3 card px-5 py-3">
                    <p className="label-caps">Holding Signal</p>
                    <SignalBadge value={holdingSignal} />
                    <span className="text-xs text-[var(--text-3)]">
                      {holdingSignal === "ACCUMULATING" ? "Institutional buying detected"
                        : holdingSignal === "DISTRIBUTING" ? "Selling pressure observed"
                        : holdingSignal === "WATCH" ? "Mixed signals — monitor closely"
                        : "Stable ownership pattern"}
                    </span>
                  </div>
                )}

                {/* Metric cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {holdings.map((r, i) => {
                    const name = r.holding_metric_definitions?.name || "Metric";
                    const isPercent = name.includes("%");
                    const rawVal = r.value;
                    const displayVal = rawVal != null
                      ? isPercent
                        ? `${(rawVal <= 1 ? rawVal * 100 : rawVal).toFixed(1)}%`
                        : fmt(rawVal, 4)
                      : "Data unavailable";
                    const statusColor =
                      r.adjusted_status === "green" ? "text-green-600 dark:text-green-400" :
                      r.adjusted_status === "red"   ? "text-red-500" :
                      r.adjusted_status === "amber" ? "text-[var(--orange)]" :
                      "text-[var(--text)]";
                    return (
                      <div key={i} className="card p-5">
                        <div className="flex items-start justify-between mb-3">
                          <p className="label-caps leading-tight max-w-[140px]">{name}</p>
                          <SignalBadge value={r.adjusted_status} />
                        </div>
                        <p className={`text-2xl font-bold tabular-nums ${statusColor}`}>{displayVal}</p>
                        {r.trend && (
                          <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${r.trend === "up" ? "text-green-600 dark:text-green-400" : r.trend === "down" ? "text-red-500" : "text-[var(--text-3)]"}`}>
                            {r.trend === "up" ? <TrendingUp size={11} /> : r.trend === "down" ? <TrendingDown size={11} /> : null}
                            {r.trend}
                          </div>
                        )}
                        {r.sector_signal && (
                          <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase text-[var(--text-3)]">Sector</span>
                            <SignalBadge value={r.sector_signal} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Ownership bars */}
                {(() => {
                  const instRow    = holdings.find(r => (r.holding_metric_definitions?.name || "").toLowerCase().includes("institutional"));
                  const insiderRow = holdings.find(r => (r.holding_metric_definitions?.name || "").toLowerCase().includes("insider") || (r.holding_metric_definitions?.name || "").toLowerCase().includes("promoter"));
                  const floatRow   = holdings.find(r => (r.holding_metric_definitions?.name || "").toLowerCase().includes("float") || (r.holding_metric_definitions?.name || "").toLowerCase().includes("public"));
                  const bars = [
                    { label: "Institutional",    row: instRow,    color: ct.orange },
                    { label: "Insider/Promoter", row: insiderRow, color: ct.blue },
                    { label: "Public Float",     row: floatRow,   color: ct.green },
                  ].filter(b => b.row);
                  if (!bars.length) return null;
                  return (
                    <div className="card p-5">
                      <p className="title-md mb-4">Ownership Breakdown</p>
                      <div className="space-y-3">
                        {bars.map(({ label, row, color }) => {
                          const v = row.value;
                          const pct = v != null ? (v <= 1 ? v * 100 : v) : 0;
                          return (
                            <div key={label} className="flex items-center gap-3">
                              <p className="text-xs font-semibold text-[var(--text-2)] w-36 shrink-0">{label}</p>
                              <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${Math.min(100, pct)}%`, background: color }} />
                              </div>
                              <span className="text-xs font-bold tabular-nums text-[var(--text)] w-12 text-right">
                                {v != null ? `${pct.toFixed(1)}%` : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <EmptyState title="Shareholding data unavailable" sub="Run the fundamental pipeline to populate ownership data." icon={Users} />
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            CORRELATION TAB
        ══════════════════════════════════════════════════════════════════ */}
        {tab === "correlation" && (
          <div className="space-y-4 animate-fade-in">
            {topSectors.length ? (
              <>
                {/* Outperformance metric */}
                {topSectors[0]?.outperf_60d != null && (
                  <div className="card px-5 py-4 flex items-center gap-4">
                    <ArrowUpRight size={18} className="text-[var(--orange)] shrink-0" />
                    <div>
                      <p className="label-caps">60d Outperformance vs Top Sector</p>
                      <p className={`text-xl font-bold tabular-nums mt-0.5 ${topSectors[0].outperf_60d >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                        {topSectors[0].outperf_60d >= 0 ? "+" : ""}{fmt(topSectors[0].outperf_60d, 2)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Top correlated sectors list */}
                <div className="card overflow-hidden">
                  <div className="px-5 py-4 border-b border-[var(--border)]">
                    <p className="title-md">Top Correlated Sectors</p>
                    <p className="text-xs text-[var(--text-3)] mt-0.5">Ranked by 60-day correlation</p>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {topSectors.slice(0, 8).map((sec, i) => (
                      <div key={i} className="px-5 py-4 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors">
                        <span className="w-6 h-6 rounded-lg bg-[var(--orange)]/10 text-[var(--orange)] text-[10px] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-sm font-semibold text-[var(--text)] flex-1 truncate">{sec.name || sec.sector || "—"}</p>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-24 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[var(--orange)]"
                              style={{ width: `${Math.min(100, Math.max(0, Math.abs(sec.corr_60d || 0) * 100))}%` }} />
                          </div>
                          <div className="flex gap-3 text-[10px] font-mono text-[var(--text-3)] tabular-nums">
                            <span title="20d">{fmt(sec.corr_20d, 2)}</span>
                            <span title="60d" className="font-bold text-[var(--text)]">{fmt(sec.corr_60d, 2)}</span>
                            <span title="100d">{fmt(sec.corr_100d, 2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-2 border-t border-[var(--border)]">
                    <p className="text-[9px] text-[var(--text-3)]">Columns: 20d · 60d · 100d correlation</p>
                  </div>
                </div>

                {/* Overlay chart */}
                <div className="card p-5">
                  <p className="title-md mb-1">Company vs Top Sector Health</p>
                  <p className="text-xs text-[var(--text-3)] mb-4">
                    {topSectors[0]?.name || topSectors[0]?.sector || "Top sector"} — 90 day overlay
                  </p>
                  {overlayLoading ? (
                    <div className="h-[200px] flex items-center justify-center">
                      <p className="text-xs text-[var(--text-3)]">Loading overlay...</p>
                    </div>
                  ) : overlayData.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={overlayData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={32} />
                        <Tooltip {...ct.tooltip} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="company_health" stroke={ct.orange} dot={false} strokeWidth={2} name={company.ticker || "Company"} />
                        <Line type="monotone" dataKey="sector_health"  stroke={ct.blue}   dot={false} strokeWidth={1.5} name={topSectors[0]?.name || "Sector"} strokeDasharray="4 4" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center">
                      <p className="text-xs text-[var(--text-3)]">Overlay data unavailable</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <EmptyState title="Correlation data unavailable" sub="Run the correlation pipeline to populate sector relationships." icon={GitBranch} />
            )}
          </div>
        )}

      </div>
    </PageLayout>
  );
}
