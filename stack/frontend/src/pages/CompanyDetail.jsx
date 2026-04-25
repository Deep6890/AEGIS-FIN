import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Activity, BarChart2, Brain, TrendingUp, Users, ShieldAlert, Info, Building2, ArrowUpRight } from "lucide-react";
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
  const score    = latestMl?.survival_score;
  const scoreColor = score >= 70 ? "text-[#00B341]" : score >= 40 ? "text-[#FFC224]" : "text-[#FF3B30]";
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
              <p className="label mb-1">Survival Score</p>
              <p className={`text-4xl font-black ${scoreColor}`}>{latestMl.survival_score?.toFixed(0)}</p>
              <p className="text-xs text-[#9CA3AF] mt-2 leading-relaxed">
                {score >= 70 ? "No immediate distress signals detected. Robust footing." : 
                 score >= 40 ? "Moderate divergence from historical norms. Elevated monitoring." : 
                 "High distress signals detected. Multiple risk thresholds breached."}
              </p>
            </div>
            <div className="card-ink p-5 hover-lift">
              <p className="label text-white/50 mb-1">Distress Probability</p>
              <p className={`text-4xl font-black ${latestMl.distress_probability > 60 ? "text-[#FF3B30]" : "text-white"}`}>
                {latestMl.distress_probability?.toFixed(1)}%
              </p>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Probability of severe financial stress. &gt;60% warrants immediate review.
              </p>
            </div>
            <div className="card p-5 hover-lift">
              <p className="label mb-1">Model Assessment</p>
              <p className="text-lg font-bold text-[#0D0D0D] dark:text-[#E8E6E0] mt-1 truncate">v{latestMl.model_version || "1.0.0"}</p>
              <p className="text-xs text-[#9CA3AF] mt-2">
                Evaluated on 8 features including sector correlation and balance sheet ratios.
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
                        <Area type="monotone" dataKey="close" stroke={ct.yellow} strokeWidth={2} fill="url(#closeGrad)" dot={false} name="Close ₹" />
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
                      <p className="title-md mb-4">Latest Snapshot · {l.date}</p>
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
                                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-brand-orange transition-colors">{r.ratio_definitions?.name}</p>
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
            <div className="card overflow-hidden">
              {holdings.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        {["Metric","Value","Status","Trend","Category","Sector Signal","Adj Status"].map(h => (
                          <th key={h} className="th-base">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map(r => (
                        <tr key={r.id} className="tr-base">
                          <td className="td-base">
                            <p className="text-xs font-semibold text-[#0D0D0D] dark:text-[#E8E6E0]">{r.holding_metric_definitions?.name}</p>
                            {r.holding_metric_definitions?.description && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{r.holding_metric_definitions?.description}</p>}
                          </td>
                          <td className="td-base text-xs font-mono font-semibold tabular-nums">{r.value?.toFixed(3) ?? "—"}</td>
                          <td className="td-base"><SignalBadge value={r.status} /></td>
                          <td className="td-base text-xs text-[#9CA3AF]">{r.trend || "—"}</td>
                          <td className="td-base text-xs text-[#9CA3AF]">{r.holding_metric_definitions?.category || "—"}</td>
                          <td className="td-base text-xs text-[#9CA3AF]">{r.sector_signal || "—"}</td>
                          <td className="td-base"><SignalBadge value={r.adjusted_status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState title="No holding metrics" />}
            </div>
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
                      <Area type="monotone" dataKey="survival_score"       stroke={ct.green} strokeWidth={2} fill="url(#survGrad)" dot={false} name="Survival Score" />
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
                      {[...ml].reverse().map(r => (
                        <tr key={r.id} className="tr-base">
                          <td className="td-base text-xs text-[#9CA3AF]">{r.date}</td>
                          <td className="td-base text-[10px] font-mono text-[#9CA3AF]">v{r.model_version}</td>
                          <td className="td-base">
                            <span className={`text-sm font-bold tabular-nums ${r.survival_score >= 70 ? "text-[#00B341]" : r.survival_score >= 40 ? "text-[#FFC224]" : "text-[#FF3B30]"}`}>
                              {r.survival_score?.toFixed(1)}
                            </span>
                          </td>
                          <td className="td-base text-xs text-red-500 font-semibold tabular-nums">{r.distress_probability?.toFixed(1)}%</td>
                          <td className="td-base">
                            <SignalBadge value={r.survival_score >= 70 ? "green" : r.survival_score >= 40 ? "amber" : "red"} />
                          </td>
                        </tr>
                      ))}
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
              {topSec.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {topSec.slice(0,10).map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-[#F7F5F0] dark:bg-[#111318] rounded-xl border border-[#E5E1D8] dark:border-[#1F2128]">
                      <span className="w-8 h-8 rounded-xl bg-[#0D0D0D] dark:bg-[#E8C547] text-[#E8C547] dark:text-[#0D0D0D] text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
                        #{r.rank}
                      </span>
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-[#0D0D0D] dark:text-[#E8E6E0]">{r.sectors?.name || `Sector ${r.sector_id}`}</span>
                      </div>
                      <span className="text-[10px] text-[#9CA3AF]">{r.date}</span>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="No top sectors data" />}
            </div>
            <InsightBox title="Sector Risk Transmission">
              High correlation drives sector overlays into the balance sheet and holding engines.
            </InsightBox>
          </div>
        )}

        {/* FEATURES TAB */}
        {tab === "features" && (
          <div className="space-y-4 animate-fade-in">
            <div className="card overflow-x-auto">
              <div className="p-4 bg-[#F7F5F0] dark:bg-[#111318] border-b border-[#E5E1D8] dark:border-[#1F2128]">
                <p className="title-md">Feature Store (Audit Trail)</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr>
                    {["Date","D/E Ratio","Current Ratio","Rev Growth","Corr 60d","Health Score","HHI","Inst. Holding"].map(h => (
                      <th key={h} className="th-base whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {features.map(r => (
                    <tr key={r.id} className="tr-base">
                      <td className="td-base text-xs text-[#9CA3AF]">{r.date}</td>
                      <td className="td-base text-xs font-mono">{r.debt_to_equity?.toFixed(2) ?? "—"}</td>
                      <td className="td-base text-xs font-mono">{r.current_ratio?.toFixed(2) ?? "—"}</td>
                      <td className="td-base text-xs font-mono">{r.revenue_growth != null ? `${(r.revenue_growth*100).toFixed(1)}%` : "—"}</td>
                      <td className="td-base text-xs font-mono">{r.sector_correlation_60d?.toFixed(3) ?? "—"}</td>
                      <td className="td-base text-xs font-mono">{r.sector_health_score?.toFixed(1) ?? "—"}</td>
                      <td className="td-base text-xs font-mono">{r.hhi_concentration?.toFixed(3) ?? "—"}</td>
                      <td className="td-base text-xs font-mono">{r.institutional_holding != null ? `${(r.institutional_holding*100).toFixed(1)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!features.length && <EmptyState title="No feature store data" />}
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
