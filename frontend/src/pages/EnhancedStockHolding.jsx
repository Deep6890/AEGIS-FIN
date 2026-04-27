import React, { useEffect, useState, useMemo } from "react";
import { Search, Building2, Users, TrendingUp, PieChart as PieChartIcon, BarChart3, Filter, Eye, Target } from "lucide-react";
import { PieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { fetchHoldingMetrics } from "../lib/api";

const COLORS = ['#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#118AB2', '#073B4C', '#8B5CF6', '#EF4444'];

function OwnershipPieChart({ data, title }) {
  if (!data || data.length === 0) return null;
  
  return (
    <div className="card p-5">
      <h4 className="text-sm font-semibold mb-4 text-[var(--text)]">{title}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value}%`, 'Holding']} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricCard({ metric, enhanced = false }) {
  const name = metric.holding_metric_definitions?.name || metric.Metric || "Metric";
  const val = metric.value ?? metric.Value;
  const status = metric.adjusted_status || metric.status || metric.Status || "gray";
  const trend = metric.trend || metric.Trend || "";
  const desc = metric.holding_metric_definitions?.description || "";
  const insight = metric.Insight || "";
  const severity = metric.InsightSeverity || "neutral";
  
  const isPercent = name.includes("%");
  const displayVal = val != null
    ? isPercent ? `${(val * (val <= 1 ? 100 : 1)).toFixed(1)}%`
    : name.includes("HHI") ? val.toFixed(4)
    : val.toFixed(2)
    : "—";
    
  const statusColor = status === "green" ? "text-green-500"
    : status === "red" ? "text-red-500"
    : status === "amber" ? "text-yellow-500"
    : "text-[var(--text-3)]";
    
  const severityColor = severity === "positive" ? "text-green-600"
    : severity === "negative" ? "text-red-600"
    : severity === "warning" ? "text-yellow-600"
    : "text-[var(--text-3)]";

  return (
    <div className="card p-5 hover-lift">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] leading-tight max-w-[140px]">{name}</p>
        <SignalBadge value={status} />
      </div>
      <p className={`text-2xl font-bold tabular-nums ${statusColor}`}>{displayVal}</p>
      {trend && (
        <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${trend === "up" ? "text-[var(--orange)]" : "text-[var(--text-3)]"}`}>
          {trend === "up" ? "↑" : "↓"} {trend}
        </p>
      )}
      {desc && <p className="text-[10px] text-[var(--text-3)] mt-2 leading-relaxed">{desc}</p>}
      
      {enhanced && insight && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <p className={`text-xs ${severityColor} leading-relaxed`}>{insight}</p>
        </div>
      )}
      
      {metric.sector_signal && (
        <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase text-[var(--text-3)]">Sector</span>
          <SignalBadge value={metric.sector_signal} />
        </div>
      )}
    </div>
  );
}

function ITCorrelationCard({ correlation }) {
  if (!correlation || !correlation.correlation_score) return null;
  
  return (
    <div className="card p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Target size={20} className="text-blue-500" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--text)]">IT Sector Correlation</h4>
          <p className="text-xs text-[var(--text-3)]">Comparative analysis with IT sector</p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-lg font-bold text-blue-500">{correlation.correlation_score}%</p>
          <p className="text-xs text-[var(--text-3)]">Correlation</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--text)]">{correlation.comparative_strength}</p>
          <p className="text-xs text-[var(--text-3)]">Strength</p>
        </div>
        <div className="text-center">
          <SignalBadge value={correlation.signal_alignment?.toLowerCase()} />
          <p className="text-xs text-[var(--text-3)] mt-1">Alignment</p>
        </div>
      </div>
    </div>
  );
}

function InsightsList({ insights, title, type = "info" }) {
  if (!insights || insights.length === 0) return null;
  
  const bgColor = type === "strength" ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    : type === "risk" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    
  const iconColor = type === "strength" ? "text-green-500"
    : type === "risk" ? "text-red-500"
    : "text-blue-500";
  
  return (
    <div className={`card p-4 ${bgColor}`}>
      <h4 className={`text-sm font-semibold mb-3 ${iconColor}`}>{title}</h4>
      <ul className="space-y-2">
        {insights.map((insight, idx) => (
          <li key={idx} className="text-xs text-[var(--text-2)] flex items-start gap-2">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${type === "strength" ? "bg-green-500" : type === "risk" ? "bg-red-500" : "bg-blue-500"}`} />
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function EnhancedStockHolding() {
  const { companies } = useAppData();
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [filterCategory, setFilterCategory] = useState("all");

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.ticker || "").toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selectedCompany) return;
    setLoading(true);
    fetchHoldingMetrics(selectedCompany).then(res => {
      setData(res.data || null);
    }).finally(() => setLoading(false));
  }, [selectedCompany]);

  const selectedComp = companies.find(c => c.id === selectedCompany);
  
  const holdings = data?.holdings || [];
  const breakdown = data?.breakdown || {};
  const insights = data?.enhanced_insights || {};
  const itCorrelation = data?.it_sector_correlation || {};

  const categories = [...new Set(holdings.map(h => h.holding_metric_definitions?.category || h.Category || "Other"))];
  
  const filteredHoldings = useMemo(() => {
    if (filterCategory === "all") return holdings;
    return holdings.filter(h => (h.holding_metric_definitions?.category || h.Category) === filterCategory);
  }, [holdings, filterCategory]);

  return (
    <PageLayout title="Enhanced Stock Holding Analytics">
      <div className="space-y-5 pb-10">
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Enhanced Analytics</p>
          <h1 className="page-heading">Stock Holding Intelligence</h1>
          <p className="page-subheading">Comprehensive shareholding analysis with ownership patterns, pie charts, and IT sector correlations.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 animate-fade-in">
          {/* Company picker */}
          <div className="space-y-3">
            <p className="title-md">Select Company</p>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company…" className="input-base pl-10" />
            </div>
            <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {filtered.slice(0, 100).map(c => (
                <button key={c.id} onClick={() => setSelectedCompany(c.id)}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border ${
                    selectedCompany === c.id
                      ? "bg-[var(--surface)] border-[var(--orange)]/30 shadow-sm"
                      : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--orange)]/20"
                  }`}>
                  <p className="text-sm font-semibold text-[var(--text)] truncate">{c.name}</p>
                  <p className="text-[11px] font-mono text-[var(--text-3)] mt-0.5">{c.ticker}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3 space-y-5">
            {!selectedCompany ? (
              <div className="card flex flex-col items-center justify-center text-center p-16 h-[calc(100vh-260px)] min-h-[500px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[var(--orange)]/5 blur-[80px] pointer-events-none" />
                <div className="w-20 h-20 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] flex items-center justify-center mb-6 animate-float">
                  <Users size={36} className="text-[var(--text-3)]" />
                </div>
                <h3 className="title-lg mb-2">Enhanced Shareholding Analytics</h3>
                <p className="text-sm text-[var(--text-3)] max-w-md leading-relaxed mb-6">
                  Select a company to view comprehensive stock holding analysis with ownership patterns, pie charts, and sector correlations.
                </p>
              </div>
            ) : loading ? (
              <div className="h-64 flex items-center justify-center"><LoadingSpinner /></div>
            ) : (
              <>
                {/* Company header */}
                <div className="card-glass p-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-[var(--orange)]/6 blur-[50px] pointer-events-none" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="title-lg mb-1">{selectedComp?.name}</p>
                      <p className="text-xs font-mono text-[var(--text-3)]">{selectedComp?.ticker} · Shareholding Analytics</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[var(--orange)]/10 flex items-center justify-center">
                      <Users size={22} className="text-[var(--orange)]" />
                    </div>
                  </div>
                </div>

                {/* Navigation tabs */}
                <div className="flex gap-2 border-b border-[var(--border)] overflow-x-auto pb-2">
                  {[
                    { id: "overview", label: "Overview", icon: Eye },
                    { id: "charts", label: "Ownership Charts", icon: PieChartIcon },
                    { id: "insights", label: "Insights", icon: TrendingUp },
                    { id: "detailed", label: "Detailed Metrics", icon: BarChart3 }
                  ].map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all duration-200 ${
                          activeTab === tab.id ? "btn-active" : "btn-inactive"
                        }`}>
                        <Icon size={14} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                {activeTab === "overview" && (
                  <div className="space-y-5">
                    {/* Key metrics grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {holdings.slice(0, 8).map((holding, idx) => (
                        <MetricCard key={idx} metric={holding} />
                      ))}
                    </div>
                    
                    {/* IT Correlation */}
                    <ITCorrelationCard correlation={itCorrelation} />
                    
                    {/* Quick insights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InsightsList 
                        insights={insights.key_insights} 
                        title="Key Insights" 
                        type="info" 
                      />
                      <InsightsList 
                        insights={insights.risk_factors} 
                        title="Risk Factors" 
                        type="risk" 
                      />
                    </div>
                  </div>
                )}

                {activeTab === "charts" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <OwnershipPieChart 
                        data={breakdown.ownership_pie} 
                        title="Ownership Distribution" 
                      />
                      <OwnershipPieChart 
                        data={breakdown.top_holders} 
                        title="Top 10 Holders" 
                      />
                    </div>
                    
                    {/* Ownership breakdown bars */}
                    {breakdown.ownership_pie && breakdown.ownership_pie.length > 0 && (
                      <div className="card p-5">
                        <h4 className="text-sm font-semibold mb-4 text-[var(--text)]">Ownership Breakdown</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={breakdown.ownership_pie}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <Tooltip formatter={(value) => [`${value}%`, 'Holding']} />
                            <Bar dataKey="value" fill="#FF6B35" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "insights" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <InsightsList 
                        insights={insights.key_insights} 
                        title="Key Insights" 
                        type="strength" 
                      />
                      <InsightsList 
                        insights={insights.risk_factors} 
                        title="Risk Factors" 
                        type="risk" 
                      />
                    </div>
                    
                    {/* IT Sector Analysis */}
                    <ITCorrelationCard correlation={itCorrelation} />
                    
                    {/* Sector comparison */}
                    {insights.sector_comparison && (
                      <div className="card p-5">
                        <h4 className="text-sm font-semibold mb-3 text-[var(--text)]">Sector Comparison</h4>
                        <div className="space-y-2">
                          {Object.entries(insights.sector_comparison).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center">
                              <span className="text-xs text-[var(--text-3)] capitalize">{key.replace('_', ' ')}</span>
                              <span className="text-xs font-semibold text-[var(--text)]">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "detailed" && (
                  <div className="space-y-5">
                    {/* Filter controls */}
                    <div className="flex items-center gap-3">
                      <Filter size={16} className="text-[var(--text-3)]" />
                      <select 
                        value={filterCategory} 
                        onChange={e => setFilterCategory(e.target.value)}
                        className="input-base w-48"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {filteredHoldings.length === 0 ? (
                      <EmptyState title="No holding data" sub="Run the pipeline to populate shareholding metrics." />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredHoldings.map((holding, idx) => (
                          <MetricCard key={idx} metric={holding} enhanced={true} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}