import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Activity, BarChart2, Brain, TrendingUp, Users, ShieldAlert, Info, Building2, ArrowUpRight, Zap, Shield, Target } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, CartesianGrid, RadialBarChart, RadialBar, ReferenceLine
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner, { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useChartTheme } from "../hooks/useChartTheme";
import {
  fetchCompanyById, fetchLatestCompanyMetrics, fetchBalanceSheet,
  fetchHoldingMetrics, fetchMlPredictions, fetchTopSectors, fetchFeatureStore
} from "../lib/api";

const TAB_ICONS = { metrics: Activity, balance: BarChart2, holdings: Users, ml: Brain, sectors: TrendingUp, features: ShieldAlert };

function InsightBox({ title, children }) {
  return (
    <div className="insight-box mt-4">
      {title && <p className="text-xs font-bold text-[#8B6914] dark:text-[#E8C547] mb-1">{title}</p>}
      <p className="text-xs text-[#6B7280] leading-relaxed">{children}</p>
    </div>
  );
}

function ScoreGauge({ score }) {
  const color = score >= 70 ? "#00B341" : score >= 40 ? "#FFC224" : "#FF3B30";
  const data = [{ value: score, fill: color }, { value: 100 - score, fill: "transparent" }];
  return (
    <div className="relative flex items-center justify-center">
      <RadialBarChart width={100} height={100} cx={50} cy={50} innerRadius={35} outerRadius={50} startAngle={180} endAngle={0} data={[{ value: score }]}>
        <RadialBar dataKey="value" cornerRadius={6} fill={color} background={{ fill: "rgba(156, 163, 175, 0.1)" }} />
      </RadialBarChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center mt-3">
        <span className="text-xl font-bold" style={{ color }}>{score?.toFixed(0)}</span>
      </div>
    </div>
  );
}

export default function CompanyDetail() {
  const { id } = useParams();
  const ct = useChartTheme();
  const [company, setCompany]   = useState(null);
  const [metrics, setMetrics]   = useState([]);
  const [balance, setBalance]   = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [ml, setMl]             = useState([]);
  const [topSec, setTopSec]     = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("metrics");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchCompanyById(id), fetchLatestCompanyMetrics(id), fetchBalanceSheet(id),
      fetchHoldingMetrics(id), fetchMlPredictions(id), fetchTopSectors(id), fetchFeatureStore(id),
    ]).then(([c, m, b, h, ml_, ts, fs]) => {
      setCompany(c.data);
      setMetrics((m.data || []).reverse());
      setBalance(b.data || []);
      setHoldings(h.data || []);
      setMl((ml_.data || []).reverse());
      setTopSec(ts.data || []);
      setFeatures((fs.data || []).reverse());
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLayout title="Company Detail"><PageSkeleton /></PageLayout>;
  if (!company) return <PageLayout title="Company Detail"><EmptyState title="Company not found" /></PageLayout>;

  const latestMl = ml[ml.length - 1];
  // Use composite_score as canonical � survival_score is an alias
  const score    = latestMl?.composite_score ?? latestMl?.survival_score ?? null;
  const distress = latestMl ? Math.max(0, 100 - (score ?? 0)) : null;
  const tier     = latestMl?.composite_tier || null;
  const grade    = latestMl?.composite_grade || null;
  const scoreColor = score != null ? (score >= 70 ? "text-[#00B341]" : score >= 40 ? "text-[#FFC224]" : "text-[#FF3B30]") : "text-[var(--text-3)]";
  const tabs = ["metrics","balance","holdings","ml","sectors","features"];
  const bsCategories = [...new Set(balance.map(r => r.ratio_definitions?.category || "Other"))].filter(Boolean);
  const latestBs = {};
  balance.forEach(r => { const name = r.ratio_definitions?.name || "Ratio"; if (!latestBs[name]) latestBs[name] = r; });

  return (
    <PageLayout title={company.name}>
      <div className="space-y-5">

        {/* Header */}
        <div>
          <Link to="/companies" className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#E8C547] w-fit mb-3 transition-colors">
            <ArrowLeft size={13} /> Back to Companies
          </Link>
          <div className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8C547]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-[#0D0D0D] dark:bg-[#E8C547] flex items-center justify-center shrink-0 shadow-card-lg">
                <Building2 size={24} className="text-[#E8C547] dark:text-[#0D0D0D]" />
              </div>
              <div>
                <h2 className="title-xl tracking-tight text-[#0D0D0D] dark:text-[#E8E6E0]">{company.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-[#E8C547] bg-[#E8C547]/10 px-1.5 py-0.5 rounded">{company.ticker}</span>
                  <span className="text-xs text-[#9CA3AF]">{company.exchange || "NSE"}</span>
                </div>
              </div>
            </div>

            {score != null && (
              <div className="flex items-center gap-4 bg-[#F7F5F0] dark:bg-[#111318] p-3 rounded-2xl border border-[#E5E1D8] dark:border-[#1F2128]">
                <ScoreGauge score={score} />
                <div className="pr-2">
                  <p className="label">Survival Score</p>
                  <p className={`text-sm font-bold mt-0.5 ${scoreColor}`}>
                    {score >= 70 ? "Low Risk" : score >= 40 ? "Watch Zone" : "High Distress"}
                  </p>
                  {latestMl?.distress_probability != null && (
                    <p className="text-[10px] text-red-500 mt-1 font-semibold tabular-nums">{latestMl.distress_probability.toFixed(1)}% distress</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ML Summary */}
        {latestMl && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5 hover-lift">
              <p className="label-caps mb-2">Survival Score</p>
              {score != null ? (
                <>
                  <p className={`text-5xl font-black tabular-nums ${scoreColor}`}>{score.toFixed(0)}</p>
                  <div className="mt-3 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${score}%`, background: score >= 70 ? "#00B341" : score >= 40 ? "#FFC224" : "#FF3B30" }} />
                  </div>
                  <p className="text-xs text-[var(--text-3)] mt-2 leading-relaxed">
                    {score >= 70 ? "No immediate distress signals. Robust footing across all dimensions."
                     : score >= 40 ? "Moderate divergence from historical norms. Elevated monitoring advised."
                     : "High distress signals detected. Multiple risk thresholds breached."}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--text-3)] mt-2">Run the pipeline to generate scores.</p>
              )}
            </div>
            <div className="card p-5 hover-lift" style={{ background: "var(--surface-dark, #0D0D0D)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Distress Probability</p>
              {distress != null ? (
                <>
                  <p className={`text-5xl font-black tabular-nums ${distress > 60 ? "text-[#FF3B30]" : distress > 40 ? "text-[#FFC224]" : "text-[#00B341]"}`}>
                    {distress.toFixed(1)}%
                  </p>
                  <p className="text-xs text-white/40 mt-3 leading-relaxed">
                    Probability of severe financial stress. &gt;60% warrants immediate review.
                  </p>
                </>
              ) : (
                <p className="text-sm text-white/40 mt-2">No data yet.</p>
              )}
            </div>
            <div className="card p-5 hover-lift">
              <p className="label-caps mb-2">Model Assessment</p>
              <div className="flex items-center gap-2 mt-1">
                {tier && (
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    tier === "TIER_1" ? "bg-[#00B341]/10 text-[#00B341]"
                    : tier === "TIER_2" ? "bg-[var(--orange)]/10 text-[var(--orange)]"
                    : tier === "TIER_3" ? "bg-[#FFC224]/10 text-[#FFC224]"
                    : "bg-neutral-100 dark:bg-neutral-800 text-[var(--text-3)]"
                  }`}>{tier}</span>
                )}
                {grade && (
                  <span className="text-2xl font-black text-[var(--text)]">{grade}</span>
                )}
              </div>
              <p className="text-xs text-[var(--text-3)] mt-3 leading-relaxed">
                Composite score across price health, fundamentals, ownership, and sector fit.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#E5E1D8] dark:border-[#1F2128] overflow-x-auto pb-2">
          {tabs.map(t => {
            const Icon = TAB_ICONS[t];
            return (
              <button key={t} onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl capitalize whitespace-nowrap transition-all duration-200 ${
                  tab === t ? "btn-active" : "btn-inactive"
                }`}>
                <Icon size={14} />
                {t === "ml" ? "ML" : t === "balance" ? "Balance Sheet" : t}
              </button>
            );
          })}
        </div>

        {/* METRICS TAB */}
        {tab === "metrics" && (
          <div className="space-y-4 animate-fade-in">
            {metrics.length ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="card p-5">
                    <p className="title-md mb-1">Price History</p>
                    <p className="text-xs text-[#9CA3AF] mb-4">Closing price (90d)</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={metrics}>
                        <defs>
                          <linearGradient id="closeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={ct.yellow} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={ct.yellow} stopOpacity={0}   />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={40} />
                        <Tooltip {...ct.tooltip} />
                        <Area type="monotone" dataKey="close" stroke={ct.yellow} strokeWidth={2} fill="url(#closeGrad)" dot={false} name="Close (INR)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="card p-5">
                    <p className="title-md mb-1">Returns & Momentum</p>
                    <p className="text-xs text-[#9CA3AF] mb-4">Returns, volatility, momentum (90d)</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={metrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={30} />
                        <Tooltip {...ct.tooltip} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <ReferenceLine y={0} stroke={ct.grid} strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="daily_return" stroke={ct.blue}  dot={false} name="Return 1d"  strokeWidth={1.5} />
                        <Line type="monotone" dataKey="vol_z"        stroke={ct.red}    dot={false} name="Vol Z"      strokeWidth={1.5} />
                        <Line type="monotone" dataKey="momentum_z"   stroke={ct.green} dot={false} name="Momentum Z" strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {(() => {
                  const l = metrics[metrics.length - 1];
                  const fields = [
                    ["Return 1d", l.daily_return != null ? l.daily_return * 100 : null, "%", "Daily price change"],
                    ["Vol Z", l.vol_z, "", "Rolling Volatility Z-Score"],
                    ["Momentum Z", l.momentum_z, "", "Momentum Z-Score"],
                    ["Trend", l.trend, "", "Direction indicator"],
                    ["Signal", l.signal, "", "Current Signal"],
                    ["Regime", l.regime, "", "Current Regime"],
                    ["Health Score", l.health_score, "", "Overall Health"],
                    ["Composite", l.composite, "", "Composite Indicator"],
                  ];
                  return (
                    <div className="card p-5">
                      <p className="title-md mb-4">Latest Snapshot � {l.date}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {fields.map(([label, val, unit, desc]) => (
                          <div key={label} className="p-3 bg-[#F7F5F0] dark:bg-[#111318] rounded-xl border border-[#E5E1D8] dark:border-[#1F2128]">
                            <p className="label">{label}</p>
                            <p className="text-base font-bold text-[#0D0D0D] dark:text-[#E8E6E0] mt-1 tabular-nums">
                              {val != null ? `${typeof val === "number" ? val.toFixed(3) : val}${unit}` : "—"}
                            </p>
                            <p className="text-[10px] text-[#9CA3AF] mt-1">{desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                <InsightBox title="Company Metrics Overview">
                  Daily price-derived signals feed directly into the ML model to understand short-term market sentiment and risk.
                </InsightBox>
              </>
            ) : <EmptyState title="No metrics data" />}
          </div>
        )}

        {/* BALANCE SHEET TAB */}
        {tab === "balance" && (
          <div className="space-y-4 animate-fade-in">
            {Object.keys(latestBs).length ? bsCategories.map(cat => {
              const rows = Object.values(latestBs).filter(r => (r.ratio_definitions?.category || "Other") === cat);
              return (
                <div key={cat} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900 dark:text-neutral-100">{cat}</h3>
                    <div className="h-px flex-1 bg-neutral-900/[0.05] dark:bg-white/[0.05]" />
                  </div>
                  <div className="card overflow-hidden border-neutral-900/[0.04] dark:border-white/[0.04] shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-neutral-900/[0.02] dark:bg-white/[0.01]">
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Ratio</th>
                            <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Value</th>
                            <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">YoY %</th>
                            <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Hist Rank</th>
                            <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Status</th>
                            <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Trend</th>
                            <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Sec. Press.</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Adj Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900/[0.04] dark:divide-white/[0.04]">
                          {rows.map(r => (
                            <tr key={r.id} className="hover:bg-neutral-900/[0.01] dark:hover:bg-white/[0.01] transition-colors group">
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-[var(--orange)] transition-colors">{r.ratio_definitions?.name}</p>
                                <p className="text-[10px] text-neutral-400 mt-0.5 truncate max-w-[140px]">{r.ratio_definitions?.description}</p>
                              </td>
                              <td className="px-4 py-4 text-sm font-mono font-bold text-neutral-900 dark:text-neutral-100">{r.value != null ? r.value.toFixed(2) : "—"}</td>
                              <td className="px-4 py-4">
                                <span className={`text-xs font-bold tabular-nums ${r.yoy_pct > 0 ? "text-[#00B341]" : r.yoy_pct < 0 ? "text-[#FF3B30]" : "text-neutral-400"}`}>
                                  {r.yoy_pct != null ? `${r.yoy_pct > 0 ? "▲" : "▼"} ${Math.abs(r.yoy_pct).toFixed(1)}%` : "—"}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-[10px] font-bold text-neutral-500 uppercase">{r.hist_pct_rank != null ? `${(r.hist_pct_rank * 100).toFixed(0)}p` : "—"}</td>
                              <td className="px-4 py-4"><SignalBadge value={r.status} /></td>
                              <td className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{r.trend || "—"}</td>
                              <td className="px-4 py-4 text-[10px] font-mono font-bold text-neutral-400">{r.sector_pressure != null ? r.sector_pressure.toFixed(2) : "—"}</td>
                              <td className="px-6 py-4"><SignalBadge value={r.adjusted_status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            }) : <EmptyState title="No balance sheet data" />}
             <InsightBox title="Reading the Balance Sheet">
              Ratios are scored organically against the company's own 20-quarter history. A sector pressure overlay adjusts the final status.
            </InsightBox>
          </div>
        )}

        {/* HOLDINGS TAB */}
        {tab === "holdings" && (
          <div className="space-y-4 animate-fade-in">
            {holdings.length ? (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {holdings.map(r => {
                    const name = r.holding_metric_definitions?.name || r.Metric || "Metric";
                    const val  = r.value ?? r.Value;
                    const status = r.status || r.Status || "gray";
                    const adjStatus = r.adjusted_status || r.AdjustedStatus || status;
                    const trend = r.trend || r.Trend || "";
                    const desc  = r.holding_metric_definitions?.description || "";
                    const isPercent = name.includes("%");
                    const displayVal = val != null
                      ? isPercent ? `${(val * (val <= 1 ? 100 : 1)).toFixed(1)}%`
                      : name.includes("HHI") ? val.toFixed(4)
                      : val.toFixed(2)
                      : "—";
                    const statusColor = adjStatus === "green" ? "text-[#00B341]"
                      : adjStatus === "red" ? "text-[#FF3B30]"
                      : adjStatus === "amber" ? "text-[#FFC224]"
                      : "text-[var(--text-3)]";
                    return (
                      <div key={r.id || name} className="card p-5 hover-lift">
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] leading-tight max-w-[140px]">{name}</p>
                          <SignalBadge value={adjStatus} />
                        </div>
                        <p className={`text-2xl font-bold tabular-nums ${statusColor}`}>{displayVal}</p>
                        {trend && (
                          <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${trend === "up" ? "text-[var(--orange)]" : "text-[var(--text-3)]"}`}>
                            {trend === "up" ? "↑" : "↓"} {trend}
                          </p>
                        )}
                        {desc && <p className="text-[10px] text-[var(--text-3)] mt-2 leading-relaxed">{desc}</p>}
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

                {/* Holding signal summary */}
                {(() => {
                  const instRow = holdings.find(r => (r.holding_metric_definitions?.name || "").includes("Institutional"));
                  const hhiRow  = holdings.find(r => (r.holding_metric_definitions?.name || "").includes("HHI"));
                  const insiderRow = holdings.find(r => (r.holding_metric_definitions?.name || "").includes("Insider Ownership"));
                  return (
                    <div className="card p-5">
                      <p className="title-md mb-4">Ownership Pattern Analysis</p>
                      <div className="space-y-3">
                        {instRow && (
                          <div className="flex items-center gap-3">
                            <div className="w-32 shrink-0">
                              <p className="text-xs font-semibold text-[var(--text-2)]">Institutional</p>
                              <p className="text-[10px] text-[var(--text-3)]">% held by institutions</p>
                            </div>
                            <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-[var(--orange)]"
                                style={{ width: `${Math.min(100, (instRow.value ?? 0) * (instRow.value <= 1 ? 100 : 1))}%` }} />
                            </div>
                            <span className="text-sm font-bold tabular-nums text-[var(--text)] w-12 text-right">
                              {instRow.value != null ? `${(instRow.value * (instRow.value <= 1 ? 100 : 1)).toFixed(1)}%` : "—"}
                            </span>
                          </div>
                        )}
                        {insiderRow && (
                          <div className="flex items-center gap-3">
                            <div className="w-32 shrink-0">
                              <p className="text-xs font-semibold text-[var(--text-2)]">Insider/Promoter</p>
                              <p className="text-[10px] text-[var(--text-3)]">% held by insiders</p>
                            </div>
                            <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-neutral-400 dark:bg-neutral-600"
                                style={{ width: `${Math.min(100, (insiderRow.value ?? 0) * (insiderRow.value <= 1 ? 100 : 1))}%` }} />
                            </div>
                            <span className="text-sm font-bold tabular-nums text-[var(--text)] w-12 text-right">
                              {insiderRow.value != null ? `${(insiderRow.value * (insiderRow.value <= 1 ? 100 : 1)).toFixed(1)}%` : "—"}
                            </span>
                          </div>
                        )}
                        {hhiRow && (
                          <div className="flex items-center gap-3">
                            <div className="w-32 shrink-0">
                              <p className="text-xs font-semibold text-[var(--text-2)]">Concentration (HHI)</p>
                              <p className="text-[10px] text-[var(--text-3)]">0 = diversified, 1 = concentrated</p>
                            </div>
                            <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ 
                                  width: `${Math.min(100, (hhiRow.value ?? 0) * 100)}%`,
                                  background: (hhiRow.value ?? 0) > 0.25 ? "#FF3B30" : (hhiRow.value ?? 0) > 0.15 ? "#FFC224" : "#00B341"
                                }} />
                            </div>
                            <span className="text-sm font-bold tabular-nums text-[var(--text)] w-12 text-right">
                              {hhiRow.value?.toFixed(4) ?? "—"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <EmptyState title="No holding metrics" sub="Run the pipeline to populate shareholding data." />
            )}
            <InsightBox title="Holdings Diagnostics">
              Shareholder mapping identifies concentration risk (HHI) and tracks institutional confidence alongside promoter pledge levels.
            </InsightBox>
          </div>
        )}

        {/* ML TAB */}
        {tab === "ml" && (
          <div className="space-y-4 animate-fade-in">
            {ml.length ? (
              <>
                <div className="card p-5">
                  <p className="title-md mb-1">Survival Score Evolution</p>
                  <p className="text-xs text-[#9CA3AF] mb-4">Historical ML predictions</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={ml}>
                      <defs>
                        <linearGradient id="survGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={ct.green} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={ct.green} stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0,100]} tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                      <Tooltip {...ct.tooltip} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" dataKey="composite_score" stroke={ct.green} strokeWidth={2} fill="url(#survGrad)" dot={false} name="Survival Score" />
                      <Line type="monotone" dataKey="distress_probability" stroke={ct.red}     strokeWidth={1.5} dot={false} name="Distress %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="card overflow-hidden">
                  <div className="p-4 bg-[#F7F5F0] dark:bg-[#111318] border-b border-[#E5E1D8] dark:border-[#1F2128]">
                    <p className="title-md">Prediction Log</p>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr>
                        {["Date","Model","Survival Score","Distress %","Assessment"].map(h => <th key={h} className="th-base">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[...ml].reverse().map((r, i) => {
                        const s = r.composite_score ?? r.survival_score ?? null;
                        const d = s != null ? Math.max(0, 100 - s) : null;
                        return (
                          <tr key={i} className="tr-base">
                            <td className="td-base text-xs text-[var(--text-3)]">{r.date}</td>
                            <td className="td-base text-[10px] font-mono text-[var(--text-3)]">{r.composite_tier || r.model_version || "v2"}</td>
                            <td className="td-base">
                              <span className={`text-sm font-bold tabular-nums ${s >= 70 ? "text-[#00B341]" : s >= 40 ? "text-[#FFC224]" : "text-[#FF3B30]"}`}>
                                {s?.toFixed(1) ?? "—"}
                              </span>
                            </td>
                            <td className="td-base text-xs text-red-500 font-semibold tabular-nums">{d?.toFixed(1) ?? "—"}%</td>
                            <td className="td-base">
                              <SignalBadge value={s >= 70 ? "green" : s >= 40 ? "amber" : "red"} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <EmptyState title="No ML predictions" sub="Run the ML pipeline to generate survival scores." />}
          </div>
        )}

        {/* SECTORS TAB */}
        {tab === "sectors" && (
          <div className="space-y-4 animate-fade-in">
            <div className="card p-5">
              <p className="title-md mb-4">Top Correlated Sectors (60d)</p>
              {topSec.length ? (() => {
                // topSec is from correlation table — extract top_sectors JSONB
                const latest = topSec[0];
                const topSectors = latest?.top_sectors || [];
                return topSectors.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {topSectors.slice(0, 10).map((s, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-[var(--border)]">
                        <span className="w-8 h-8 rounded-xl bg-[var(--orange)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                          #{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text)] truncate">{s.sector || s.name || "Unknown"}</p>
                          {s.corr_60d != null && (
                            <p className="text-[10px] text-[var(--text-3)]">Correlation: {s.corr_60d.toFixed(3)}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--text-3)]">{latest.date}</span>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState title="No top sectors in correlation data" />;
              })() : <EmptyState title="No sector correlation data" sub="Run the pipeline to compute sector correlations." />}
            </div>
            <InsightBox title="Sector Risk Transmission">
              High correlation drives sector overlays into the balance sheet and holding engines.
            </InsightBox>
          </div>
        )}

        {/* FEATURES TAB */}
        {tab === "features" && (
          <div className="space-y-4 animate-fade-in">
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-[var(--border)]">
                <p className="title-md">Feature Store (Audit Trail)</p>
                <p className="text-xs text-[var(--text-3)] mt-0.5">Exact ML input features used per run — for auditability and model interpretability.</p>
              </div>
              {features.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        {["Date", "Price Score", "Fundamental", "Ownership", "Sector Fit", "Composite", "Tier", "Grade"].map(h => (
                          <th key={h} className="th-base whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((r, i) => {
                        const dims = r.dimensions || {};
                        const comp = r.composite || {};
                        return (
                          <tr key={i} className="tr-base">
                            <td className="td-base text-xs text-[var(--text-3)]">{r.date}</td>
                            <td className="td-base text-xs font-mono font-bold">{dims.price_health?.score?.toFixed(1) ?? "—"}</td>
                            <td className="td-base text-xs font-mono font-bold">{dims.fundamental?.score?.toFixed(1) ?? "—"}</td>
                            <td className="td-base text-xs font-mono font-bold">{dims.ownership?.score?.toFixed(1) ?? "—"}</td>
                            <td className="td-base text-xs font-mono font-bold">{dims.sector_fit?.score?.toFixed(1) ?? "—"}</td>
                            <td className="td-base">
                              <span className="text-sm font-bold tabular-nums text-[var(--orange)]">
                                {comp.score?.toFixed(1) ?? r.composite_score?.toFixed(1) ?? "—"}
                              </span>
                            </td>
                            <td className="td-base">
                              <span className={`text-xs font-bold ${
                                comp.tier === "TIER_1" ? "text-[#00B341]"
                                : comp.tier === "TIER_2" ? "text-[var(--orange)]"
                                : "text-[var(--text-3)]"
                              }`}>{comp.tier ?? "—"}</span>
                            </td>
                            <td className="td-base text-sm font-black text-[var(--text)]">{comp.grade ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState title="No feature store data" sub="Run the pipeline to generate ML features." />}
            </div>
            <InsightBox title="Model Interpretability">
              Snapshot of exact features fed into the ML model on any given day for auditability.
            </InsightBox>
          </div>
        )}

      </div>
    </PageLayout>
  );
}


