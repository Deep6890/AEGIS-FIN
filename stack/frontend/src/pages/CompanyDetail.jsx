import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Activity, BarChart2, Brain, TrendingUp, Users, ShieldAlert, Info, Building2 } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, CartesianGrid, RadialBarChart, RadialBar
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useChartTheme } from "../hooks/useChartTheme";
import {
  fetchCompanyById, fetchLatestCompanyMetrics, fetchBalanceSheet,
  fetchHoldingMetrics, fetchMlPredictions, fetchTopSectors, fetchFeatureStore
} from "../lib/api";

const TAB_ICONS = { metrics: Activity, balance: BarChart2, holdings: Users, ml: Brain, sectors: TrendingUp, features: ShieldAlert };

function InsightBox({ title, children }) {
  return (
    <div className="flex gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/30">
      <Info size={14} className="text-orange-500 shrink-0 mt-0.5" />
      <div>
        {title && <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-0.5">{title}</p>}
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function ScoreGauge({ score }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const data = [{ value: score, fill: color }, { value: 100 - score, fill: "transparent" }];
  return (
    <div className="relative flex items-center justify-center">
      <RadialBarChart width={120} height={120} cx={60} cy={60} innerRadius={40} outerRadius={55} startAngle={180} endAngle={0} data={[{ value: score }]}>
        <RadialBar dataKey="value" cornerRadius={6} fill={color} background={{ fill: "#1f1f1f" }} />
      </RadialBarChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center mt-4">
        <span className="text-2xl font-bold" style={{ color }}>{score?.toFixed(0)}</span>
        <span className="text-[10px] text-gray-400">/ 100</span>
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

  if (loading) return <PageLayout title="Company Detail"><LoadingSpinner /></PageLayout>;
  if (!company) return <PageLayout title="Company Detail"><EmptyState title="Company not found" /></PageLayout>;

  const latestMl = ml[ml.length - 1];
  const score    = latestMl?.survival_score;
  const scoreColor = score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-red-500";
  const tabs = ["metrics","balance","holdings","ml","sectors","features"];
  const bsCategories = [...new Set(balance.map(r => r.category))].filter(Boolean);
  const latestBs = {};
  balance.forEach(r => { if (!latestBs[r.ratio]) latestBs[r.ratio] = r; });

  return (
    <PageLayout title={company.name}>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link to="/companies" className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 w-fit">
            <ArrowLeft size={13} /> Back to Companies
          </Link>
          <div className="flex-1 card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{company.name}</h2>
              <p className="text-xs text-gray-400 font-mono">{company.ticker} · {company.exchange || "NSE"}</p>
            </div>
            {score != null && (
              <div className="flex items-center gap-3">
                <ScoreGauge score={score} />
                <div>
                  <p className="text-xs text-gray-400">Survival Score</p>
                  <p className={`text-xs font-semibold mt-0.5 ${scoreColor}`}>
                    {score >= 70 ? "Low Risk" : score >= 40 ? "Watch Zone" : "High Distress"}
                  </p>
                  {latestMl?.distress_probability != null && (
                    <p className="text-xs text-red-500 mt-0.5">{latestMl.distress_probability.toFixed(1)}% distress prob.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ML Summary */}
        {latestMl && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="insight-card">
              <p className="insight-label">Survival Score</p>
              <p className={`text-3xl font-bold mt-1 ${scoreColor}`}>{latestMl.survival_score?.toFixed(1)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {score >= 70 ? "Company shows strong financial health across all 9 pipeline layers." :
                 score >= 40 ? "Moderate risk — some financial stress indicators present. Monitor closely." :
                 "High distress signals detected. Balance sheet, holdings or sector correlation under pressure."}
              </p>
            </div>
            <div className="insight-card">
              <p className="insight-label">Distress Probability</p>
              <p className="text-3xl font-bold mt-1 text-red-500">{latestMl.distress_probability?.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                ML model probability of financial distress. Above 60% warrants immediate review.
              </p>
            </div>
            <div className="insight-card">
              <p className="insight-label">Model Version</p>
              <p className="text-3xl font-bold mt-1 text-gray-700 dark:text-gray-300">{latestMl.model_version || "—"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Survival model trained on 8 features: D/E ratio, current ratio, revenue growth, sector correlation, health score, HHI, institutional holding.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-100 dark:border-[#1f1f1f] overflow-x-auto">
          {tabs.map(t => {
            const Icon = TAB_ICONS[t];
            return (
              <button key={t} onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-semibold capitalize whitespace-nowrap border-b-2 transition-all ${
                  tab === t ? "border-orange-500 text-orange-500" : "border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}>
                <Icon size={13} />
                {t === "ml" ? "ML" : t === "balance" ? "Balance Sheet" : t}
              </button>
            );
          })}
        </div>

        {/* METRICS TAB */}
        {tab === "metrics" && (
          <div className="space-y-4">
            <InsightBox title="What are Company Metrics?">
              Daily price-derived signals: returns over 1/5/20 days, 20-day volatility, ATR (average true range),
              drawdown from peak, volume ratio vs average, and momentum (EMA spread). These feed directly into the ML model.
            </InsightBox>
            {metrics.length ? (
              <>
                <div className="card p-4 sm:p-5">
                  <p className="section-title mb-1">Price History</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Closing price over the last 90 trading days.</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={metrics}>
                      <defs>
                        <linearGradient id="closeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={ct.orange} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={ct.orange} stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={50} />
                      <Tooltip {...ct.tooltip} />
                      <Area type="monotone" dataKey="close" stroke={ct.orange} strokeWidth={2} fill="url(#closeGrad)" dot={false} name="Close ₹" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="card p-4 sm:p-5">
                  <p className="section-title mb-1">Returns & Momentum</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">1-day return shows daily price change. Volatility measures risk. Momentum = EMA short minus EMA long.</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={40} />
                      <Tooltip {...ct.tooltip} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="company_return_1d"      stroke={ct.orange}  dot={false} name="Return 1d"  strokeWidth={1.5} />
                      <Line type="monotone" dataKey="company_volatility_20d" stroke={ct.blue}    dot={false} name="Vol 20d"    strokeWidth={1.5} />
                      <Line type="monotone" dataKey="company_momentum"       stroke={ct.emerald} dot={false} name="Momentum"   strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {(() => {
                  const l = metrics[metrics.length - 1];
                  const fields = [
                    ["Return 1d", l.company_return_1d, "%", "Daily price change. Positive = stock gained today."],
                    ["Return 5d", l.company_return_5d, "%", "5-day cumulative return. Shows short-term momentum."],
                    ["Return 20d", l.company_return_20d, "%", "Monthly return. Key input to ML survival model."],
                    ["Volatility 20d", l.company_volatility_20d, "", "Rolling 20-day std dev of returns. Higher = more risk."],
                    ["ATR", l.company_atr, "", "Average True Range — daily price swing magnitude."],
                    ["Drawdown 20d", l.company_drawdown_20d, "%", "Max drop from 20-day peak. Negative = below recent high."],
                    ["Volume Ratio", l.company_volume_ratio, "x", "Today's volume vs 20-day average. >1 = above-average activity."],
                    ["Momentum", l.company_momentum, "", "EMA(20) minus EMA(60). Positive = short-term trend above long-term."],
                    ["Trend", l.company_trend, "", "Upward if EMA(20) > EMA(60), else Downward."],
                  ];
                  return (
                    <div className="card p-4 sm:p-5">
                      <p className="section-title mb-3">Latest Snapshot · {l.date}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {fields.map(([label, val, unit, desc]) => (
                          <div key={label} className="p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-[#2a2a2a]">
                            <p className="stat-label">{label}</p>
                            <p className="text-base font-bold text-gray-900 dark:text-white mt-1">
                              {val != null ? `${typeof val === "number" ? val.toFixed(3) : val}${unit}` : "—"}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 leading-relaxed">{desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : <EmptyState title="No metrics data" />}
          </div>
        )}

        {/* BALANCE SHEET TAB */}
        {tab === "balance" && (
          <div className="space-y-4">
            <InsightBox title="How to Read the Balance Sheet">
              Each ratio is scored against its own 20-quarter history (percentile rank) and adjusted for sector pressure.
              Status: <span className="text-emerald-500 font-semibold">green</span> = healthy,
              <span className="text-amber-500 font-semibold"> amber</span> = caution,
              <span className="text-red-500 font-semibold"> red</span> = critical.
              Adjusted Status applies sector headwind/tailwind on top of the raw status.
            </InsightBox>
            {Object.keys(latestBs).length ? bsCategories.map(cat => {
              const rows = Object.values(latestBs).filter(r => r.category === cat);
              return (
                <div key={cat} className="card p-4 sm:p-5">
                  <p className="section-title mb-3">{cat}</p>
                  <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-[#1f1f1f]">
                          {["Ratio","Value","YoY %","Hist Rank","Status","Trend","Sector Pressure","Adj Status"].map(h => (
                            <th key={h} className="th-base">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(r => (
                          <tr key={r.id} className="tr-base group">
                            <td className="td-base">
                              <div>
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{r.ratio}</p>
                                {r.description && <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5 leading-tight">{r.description}</p>}
                              </div>
                            </td>
                            <td className="td-base text-xs font-mono font-semibold text-gray-900 dark:text-white">{r.value_str || r.value?.toFixed(2) || "—"}</td>
                            <td className="td-base text-xs">
                              {r.yoy_pct != null ? (
                                <span className={r.yoy_pct >= 0 ? "text-emerald-500" : "text-red-500"}>
                                  {r.yoy_pct >= 0 ? "▲" : "▼"} {Math.abs(r.yoy_pct).toFixed(1)}%
                                </span>
                              ) : "—"}
                            </td>
                            <td className="td-base text-xs font-mono text-gray-500 dark:text-gray-400">{r.hist_pct_rank != null ? `${r.hist_pct_rank.toFixed(0)}p` : "—"}</td>
                            <td className="td-base"><SignalBadge value={r.status} /></td>
                            <td className="td-base text-xs text-gray-500 dark:text-gray-400">{r.trend || "—"}</td>
                            <td className="td-base text-xs font-mono text-gray-500 dark:text-gray-400">{r.sector_pressure?.toFixed(2) ?? "—"}</td>
                            <td className="td-base"><SignalBadge value={r.adjusted_status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            }) : <EmptyState title="No balance sheet data" />}
          </div>
        )}

        {/* HOLDINGS TAB */}
        {tab === "holdings" && (
          <div className="space-y-4">
            <InsightBox title="What are Holding Metrics?">
              Shareholder concentration (HHI), institutional holding %, promoter pledge, and FII/DII patterns.
              High HHI = concentrated ownership (risk). High institutional holding = confidence signal.
              Sector signal adjusts these based on current sector health.
            </InsightBox>
            <div className="card p-4 sm:p-5">
              {holdings.length ? (
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-[#1f1f1f]">
                        {["Metric","Value","Status","Trend","Category","Sector Signal","Adj Status"].map(h => (
                          <th key={h} className="th-base">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map(r => (
                        <tr key={r.id} className="tr-base">
                          <td className="td-base">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{r.metric}</p>
                            {r.description && <p className="text-[10px] text-gray-400 mt-0.5">{r.description}</p>}
                          </td>
                          <td className="td-base text-xs font-mono font-semibold text-gray-900 dark:text-white">{r.value?.toFixed(3) ?? "—"}</td>
                          <td className="td-base"><SignalBadge value={r.status} /></td>
                          <td className="td-base text-xs text-gray-500 dark:text-gray-400">{r.trend || "—"}</td>
                          <td className="td-base text-xs text-gray-400">{r.category || "—"}</td>
                          <td className="td-base text-xs text-gray-500 dark:text-gray-400">{r.sector_signal || "—"}</td>
                          <td className="td-base"><SignalBadge value={r.adjusted_status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState title="No holding metrics" />}
            </div>
          </div>
        )}

        {/* ML TAB */}
        {tab === "ml" && (
          <div className="space-y-4">
            <InsightBox title="How the ML Survival Model Works">
              The model uses 8 features: Debt/Equity, Current Ratio, Revenue Growth, Equity Growth,
              60-day sector correlation, sector health score, HHI concentration, and institutional holding %.
              It outputs a 0–100 survival score and a distress probability. Trained on historical SME financial data.
            </InsightBox>
            {ml.length ? (
              <>
                <div className="card p-4 sm:p-5">
                  <p className="section-title mb-1">Survival Score History</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Track how the company's risk profile has evolved over time. Declining trend = deteriorating fundamentals.</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={ml}>
                      <defs>
                        <linearGradient id="survGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={ct.emerald} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={ct.emerald} stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0,100]} tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={28} />
                      <Tooltip {...ct.tooltip} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" dataKey="survival_score"       stroke={ct.emerald} strokeWidth={2} fill="url(#survGrad)" dot={false} name="Survival Score" />
                      <Line type="monotone" dataKey="distress_probability" stroke={ct.red}     strokeWidth={1.5} dot={false} name="Distress %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="card p-4 sm:p-5 overflow-x-auto">
                  <p className="section-title mb-3">Prediction Log</p>
                  <table className="w-full text-sm min-w-[400px]">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-[#1f1f1f]">
                        {["Date","Model","Survival Score","Distress %","Assessment"].map(h => <th key={h} className="th-base">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[...ml].reverse().map(r => (
                        <tr key={r.id} className="tr-base">
                          <td className="td-base text-xs text-gray-500 dark:text-gray-400">{r.date}</td>
                          <td className="td-base text-xs font-mono text-gray-400">{r.model_version}</td>
                          <td className="td-base">
                            <span className={`text-sm font-bold ${r.survival_score >= 70 ? "text-emerald-500" : r.survival_score >= 40 ? "text-amber-500" : "text-red-500"}`}>
                              {r.survival_score?.toFixed(1)}
                            </span>
                          </td>
                          <td className="td-base text-xs text-red-500 font-semibold">{r.distress_probability?.toFixed(1)}%</td>
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
          <div className="space-y-4">
            <InsightBox title="What are Top Correlated Sectors?">
              The pipeline computes rolling 60-day Pearson correlation between this company's returns and each sector index.
              The top-N most correlated sectors are stored here. High correlation means the company moves with that sector —
              useful for understanding macro exposure and risk transmission.
            </InsightBox>
            <div className="card p-4 sm:p-5">
              {topSec.length ? (
                <div className="space-y-2">
                  {topSec.slice(0,10).map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-[#2a2a2a]">
                      <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center justify-center shrink-0">
                        #{r.rank}
                      </span>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">{r.sectors?.name || `Sector ${r.sector_id}`}</span>
                      <span className="text-xs text-gray-400">{r.date}</span>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="No top sectors data" />}
            </div>
          </div>
        )}

        {/* FEATURES TAB */}
        {tab === "features" && (
          <div className="space-y-4">
            <InsightBox title="ML Feature Store — Audit Trail">
              These are the exact 8 input features used by the ML model for each prediction run.
              Stored for reproducibility and model retraining. Debt/Equity and Current Ratio come from balance sheet.
              Sector correlation and health score come from the correlation engine. HHI and institutional holding from the holdings engine.
            </InsightBox>
            <div className="card p-4 sm:p-5 overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#1f1f1f]">
                    {["Date","D/E Ratio","Current Ratio","Rev Growth","Corr 60d","Health Score","HHI","Inst. Holding"].map(h => (
                      <th key={h} className="th-base">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {features.map(r => (
                    <tr key={r.id} className="tr-base">
                      <td className="td-base text-xs text-gray-500 dark:text-gray-400">{r.date}</td>
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
          </div>
        )}

      </div>
    </PageLayout>
  );
}
