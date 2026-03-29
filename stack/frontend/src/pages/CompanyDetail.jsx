import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Activity, BarChart2, Building2, Brain,
  TrendingUp, Users, ShieldAlert
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LineChart, Line, Legend
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import {
  fetchCompanyById, fetchLatestCompanyMetrics, fetchBalanceSheet,
  fetchHoldingMetrics, fetchMlPredictions, fetchTopSectors, fetchFeatureStore
} from "../lib/api";

const TAB_ICONS = {
  metrics: Activity, balance: BarChart2, holdings: Users,
  ml: Brain, sectors: TrendingUp, features: ShieldAlert
};

export default function CompanyDetail() {
  const { id } = useParams();
  const [company, setCompany]     = useState(null);
  const [metrics, setMetrics]     = useState([]);
  const [balance, setBalance]     = useState([]);
  const [holdings, setHoldings]   = useState([]);
  const [ml, setMl]               = useState([]);
  const [topSec, setTopSec]       = useState([]);
  const [features, setFeatures]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState("metrics");

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
      fetchFeatureStore(id),
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
  const score = latestMl?.survival_score;
  const scoreColor = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600";

  const tabs = ["metrics","balance","holdings","ml","sectors","features"];

  // Balance sheet by category
  const bsCategories = [...new Set(balance.map(r => r.category))].filter(Boolean);
  const latestBs = {};
  balance.forEach(r => { if (!latestBs[r.ratio]) latestBs[r.ratio] = r; });

  return (
    <PageLayout title={company.name}>
      <div className="space-y-5">

        {/* Back + Header */}
        <div className="flex items-start gap-4">
          <Link to="/companies" className="flex items-center gap-1 text-sm text-gray-400 hover:text-orange-500 mt-1">
            <ArrowLeft size={15} /> Back
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Building2 size={20} className="text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{company.name}</h2>
                <p className="text-xs text-gray-400">{company.ticker} · {company.exchange || "NSE"}</p>
              </div>
              {score != null && (
                <div className="ml-auto text-right">
                  <p className={`text-3xl font-bold ${scoreColor}`}>{score.toFixed(0)}</p>
                  <p className="text-xs text-gray-400">Survival Score</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ML Summary Cards */}
        {latestMl && (
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 border-l-4 border-orange-400">
              <p className="stat-label">Survival Score</p>
              <p className={`text-2xl font-bold mt-1 ${scoreColor}`}>{latestMl.survival_score?.toFixed(1)}</p>
            </div>
            <div className="card p-4 border-l-4 border-red-300">
              <p className="stat-label">Distress Probability</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{latestMl.distress_probability?.toFixed(1)}%</p>
            </div>
            <div className="card p-4 border-l-4 border-blue-300">
              <p className="stat-label">Model Version</p>
              <p className="text-2xl font-bold mt-1 text-gray-700">{latestMl.model_version || "—"}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-100 overflow-x-auto">
          {tabs.map(t => {
            const Icon = TAB_ICONS[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium capitalize whitespace-nowrap border-b-2 transition-all ${
                  tab === t ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={13} /> {t === "ml" ? "ML Predictions" : t === "balance" ? "Balance Sheet" : t}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {tab === "metrics" && (
          <div className="space-y-4">
            {metrics.length ? (
              <>
                <div className="card p-5">
                  <p className="section-title mb-4">Price History (Close)</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={metrics}>
                      <defs>
                        <linearGradient id="closeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#f97316" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="close" stroke="#f97316" strokeWidth={2} fill="url(#closeGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="card p-5">
                  <p className="section-title mb-4">Returns & Volatility</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={metrics}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="company_return_1d"      stroke="#f97316" dot={false} name="Return 1d"  />
                      <Line type="monotone" dataKey="company_volatility_20d" stroke="#6366f1" dot={false} name="Vol 20d"    />
                      <Line type="monotone" dataKey="company_momentum"       stroke="#10b981" dot={false} name="Momentum"   />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Latest metrics table */}
                {metrics.length > 0 && (() => {
                  const latest = metrics[metrics.length - 1];
                  const fields = [
                    ["Return 1d",    latest.company_return_1d,      "%"],
                    ["Return 5d",    latest.company_return_5d,      "%"],
                    ["Return 20d",   latest.company_return_20d,     "%"],
                    ["Volatility",   latest.company_volatility_20d, ""],
                    ["ATR",          latest.company_atr,            ""],
                    ["Drawdown 20d", latest.company_drawdown_20d,   "%"],
                    ["Volume Ratio", latest.company_volume_ratio,   "x"],
                    ["Momentum",     latest.company_momentum,       ""],
                    ["Trend",        latest.company_trend,          ""],
                  ];
                  return (
                    <div className="card p-5">
                      <p className="section-title mb-4">Latest Snapshot · {latest.date}</p>
                      <div className="grid grid-cols-3 gap-3">
                        {fields.map(([label, val, unit]) => (
                          <div key={label} className="bg-gray-50 rounded-xl p-3">
                            <p className="stat-label">{label}</p>
                            <p className="text-base font-semibold text-gray-900 mt-1">
                              {val != null ? `${typeof val === "number" ? val.toFixed(3) : val}${unit}` : "—"}
                            </p>
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

        {tab === "balance" && (
          <div className="space-y-4">
            {Object.keys(latestBs).length ? (
              bsCategories.map(cat => {
                const rows = Object.values(latestBs).filter(r => r.category === cat);
                return (
                  <div key={cat} className="card p-5">
                    <p className="section-title mb-3">{cat}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {["Ratio","Value","YoY %","Hist Rank","Status","Trend","Sector Pressure","Adj Status"].map(h => (
                              <th key={h} className="text-left py-2 px-3 stat-label">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(r => (
                            <tr key={r.id} className="border-b border-gray-50 hover:bg-orange-50/20">
                              <td className="py-2 px-3 font-medium text-gray-800 text-xs">{r.ratio}</td>
                              <td className="py-2 px-3 text-xs">{r.value_str || r.value?.toFixed(2) || "—"}</td>
                              <td className="py-2 px-3 text-xs">{r.yoy_pct != null ? `${r.yoy_pct.toFixed(1)}%` : "—"}</td>
                              <td className="py-2 px-3 text-xs">{r.hist_pct_rank != null ? `${r.hist_pct_rank.toFixed(0)}p` : "—"}</td>
                              <td className="py-2 px-3"><SignalBadge value={r.status} /></td>
                              <td className="py-2 px-3 text-xs">{r.trend || "—"}</td>
                              <td className="py-2 px-3 text-xs">{r.sector_pressure?.toFixed(2) ?? "—"}</td>
                              <td className="py-2 px-3"><SignalBadge value={r.adjusted_status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            ) : <EmptyState title="No balance sheet data" />}
          </div>
        )}

        {tab === "holdings" && (
          <div className="card p-5">
            {holdings.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Metric","Value","Status","Trend","Category","Sector Signal","Adj Status"].map(h => (
                        <th key={h} className="text-left py-2 px-3 stat-label">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map(r => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-orange-50/20">
                        <td className="py-2.5 px-3 font-medium text-gray-800 text-xs">{r.metric}</td>
                        <td className="py-2.5 px-3 text-xs">{r.value?.toFixed(3) ?? "—"}</td>
                        <td className="py-2.5 px-3"><SignalBadge value={r.status} /></td>
                        <td className="py-2.5 px-3 text-xs">{r.trend || "—"}</td>
                        <td className="py-2.5 px-3 text-xs text-gray-500">{r.category || "—"}</td>
                        <td className="py-2.5 px-3 text-xs">{r.sector_signal || "—"}</td>
                        <td className="py-2.5 px-3"><SignalBadge value={r.adjusted_status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState title="No holding metrics" />}
          </div>
        )}

        {tab === "ml" && (
          <div className="space-y-4">
            {ml.length ? (
              <>
                <div className="card p-5">
                  <p className="section-title mb-4">Survival Score History</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={ml}>
                      <defs>
                        <linearGradient id="survGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="survival_score"       stroke="#10b981" strokeWidth={2} fill="url(#survGrad)" dot={false} name="Survival" />
                      <Area type="monotone" dataKey="distress_probability" stroke="#ef4444" strokeWidth={1.5} fill="none" dot={false} name="Distress %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="card p-5">
                  <p className="section-title mb-3">Prediction Log</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {["Date","Model","Survival Score","Distress %"].map(h => (
                            <th key={h} className="text-left py-2 px-3 stat-label">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...ml].reverse().map(r => (
                          <tr key={r.id} className="border-b border-gray-50 hover:bg-orange-50/20">
                            <td className="py-2 px-3 text-xs text-gray-600">{r.date}</td>
                            <td className="py-2 px-3 text-xs font-mono">{r.model_version}</td>
                            <td className="py-2 px-3">
                              <span className={`text-sm font-bold ${r.survival_score >= 70 ? "text-emerald-600" : r.survival_score >= 40 ? "text-amber-600" : "text-red-600"}`}>
                                {r.survival_score?.toFixed(1)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-xs text-red-500">{r.distress_probability?.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : <EmptyState title="No ML predictions" sub="Run the ML pipeline to generate survival scores." />}
          </div>
        )}

        {tab === "sectors" && (
          <div className="card p-5">
            <p className="section-title mb-4">Top Correlated Sectors</p>
            {topSec.length ? (
              <div className="space-y-2">
                {topSec.slice(0, 10).map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">
                      {r.rank}
                    </span>
                    <span className="text-sm font-medium text-gray-800">{r.sectors?.name || `Sector ${r.sector_id}`}</span>
                    <span className="ml-auto text-xs text-gray-400">{r.date}</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="No top sectors data" />}
          </div>
        )}

        {tab === "features" && (
          <div className="card p-5">
            <p className="section-title mb-4">ML Feature Store</p>
            {features.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Date","D/E Ratio","Current Ratio","Rev Growth","Corr 60d","Health Score","HHI","Inst. Holding"].map(h => (
                        <th key={h} className="text-left py-2 px-3 stat-label">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {features.map(r => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-orange-50/20">
                        <td className="py-2 px-3 text-xs text-gray-600">{r.date}</td>
                        <td className="py-2 px-3 text-xs">{r.debt_to_equity?.toFixed(2) ?? "—"}</td>
                        <td className="py-2 px-3 text-xs">{r.current_ratio?.toFixed(2) ?? "—"}</td>
                        <td className="py-2 px-3 text-xs">{r.revenue_growth != null ? `${(r.revenue_growth*100).toFixed(1)}%` : "—"}</td>
                        <td className="py-2 px-3 text-xs">{r.sector_correlation_60d?.toFixed(3) ?? "—"}</td>
                        <td className="py-2 px-3 text-xs">{r.sector_health_score?.toFixed(1) ?? "—"}</td>
                        <td className="py-2 px-3 text-xs">{r.hhi_concentration?.toFixed(3) ?? "—"}</td>
                        <td className="py-2 px-3 text-xs">{r.institutional_holding != null ? `${(r.institutional_holding*100).toFixed(1)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState title="No feature store data" />}
          </div>
        )}

      </div>
    </PageLayout>
  );
}
