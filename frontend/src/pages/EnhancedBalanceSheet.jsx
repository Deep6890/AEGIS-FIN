import React, { useEffect, useState, useMemo } from "react";
import { Search, Building2, FileSpreadsheet, TrendingUp, DollarSign, Activity, Scale, Percent, ShieldAlert, PieChart, BarChart3, Filter, Eye } from "lucide-react";
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { fetchBalanceSheet } from "../lib/api";

const RATIO_ICONS = {
  "Gross Margin %": Percent, "Net Profit Margin %": Percent, "EBITDA Margin %": Percent,
  "ROE %": TrendingUp, "ROA %": TrendingUp,
  "Current Ratio": Activity, "Quick Ratio": Activity, "Cash Ratio": DollarSign,
  "Debt/Equity": Scale, "Debt/Assets": Scale, "Interest Coverage": ShieldAlert,
  "Asset Turnover": Activity, "Inventory Turnover": Activity, "Receivables Turnover": Activity,
  "CFO/Net Income": DollarSign, "FCF Margin %": Percent,
  "Revenue Growth %": TrendingUp, "Net Income Growth %": TrendingUp,
  "Equity Ratio": Scale, "Equity Growth %": TrendingUp,
};

const COLORS = ['#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#118AB2', '#073B4C'];

function CategoryScoreCard({ category, data }) {
  const { score, green, total, status } = data;
  const statusColor = status === 'strong' ? 'text-green-500' : status === 'moderate' ? 'text-yellow-500' : 'text-red-500';
  
  return (
    <div className="card p-4 hover-lift">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[var(--text)]">{category}</h4>
        <span className={`text-lg font-bold ${statusColor}`}>{score}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full ${status === 'strong' ? 'bg-green-500' : status === 'moderate' ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-[var(--text-3)]">{green}/{total} ratios healthy</p>
    </div>
  );
}

function InsightCard({ title, insights, type = "info" }) {
  const iconColor = type === "strength" ? "text-green-500" : type === "concern" ? "text-red-500" : "text-blue-500";
  const bgColor = type === "strength" ? "bg-green-50 dark:bg-green-900/20" : type === "concern" ? "bg-red-50 dark:bg-red-900/20" : "bg-blue-50 dark:bg-blue-900/20";
  
  return (
    <div className={`card p-4 ${bgColor} border-l-4 ${type === "strength" ? "border-green-500" : type === "concern" ? "border-red-500" : "border-blue-500"}`}>
      <h4 className={`text-sm font-semibold mb-2 ${iconColor}`}>{title}</h4>
      <ul className="space-y-1">
        {insights.map((insight, idx) => (
          <li key={idx} className="text-xs text-[var(--text-2)] flex items-start gap-2">
            <span className={`w-1 h-1 rounded-full mt-2 ${type === "strength" ? "bg-green-500" : type === "concern" ? "bg-red-500" : "bg-blue-500"}`} />
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PieChartCard({ title, data, dataKey = "value" }) {
  if (!data || data.length === 0) return null;
  
  return (
    <div className="card p-5">
      <h4 className="text-sm font-semibold mb-4 text-[var(--text)]">{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey={dataKey}
            label={({ name, value }) => `${name}: ${value}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function EnhancedBalanceSheet() {
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
    fetchBalanceSheet(selectedCompany).then(res => {
      const rows = res.data || [];
      // rows is a flat array from balance_sheet_ratios table
      // Build the structure the page expects
      const categoryScores = {};
      const byCategory = {};
      rows.forEach(r => {
        const cat = r.ratio_definitions?.category || "Other";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(r);
      });
      Object.entries(byCategory).forEach(([cat, items]) => {
        const green = items.filter(r => r.status === "green").length;
        categoryScores[cat] = {
          score: items.length ? Math.round(green / items.length * 100) : 0,
          green,
          total: items.length,
          status: green / items.length >= 0.75 ? "strong" : green / items.length >= 0.5 ? "moderate" : "weak",
        };
      });
      setData({
        ratios: rows,
        insights: {
          key_strengths: rows.filter(r => r.status === "green" && r.value != null)
            .slice(0, 3).map(r => `${r.ratio_definitions?.name || "Ratio"}: ${parseFloat(r.value).toFixed(2)}`),
          key_concerns: rows.filter(r => r.status === "red" && r.value != null)
            .slice(0, 3).map(r => `${r.ratio_definitions?.name || "Ratio"}: ${parseFloat(r.value).toFixed(2)}`),
          recommendations: [],
          sector_comparison: {},
          trend_analysis: {},
        },
        breakdown: {
          category_scores: categoryScores,
          profitability_pie: rows
            .filter(r => r.ratio_definitions?.category === "Profitability" && r.value != null)
            .map(r => ({ name: r.ratio_definitions?.name?.replace(" %", "") || "", value: Math.max(0, parseFloat(r.value)) })),
        },
        it_sector_correlation: {},
      });
    }).finally(() => setLoading(false));
  }, [selectedCompany]);

  const selectedComp = companies.find(c => c.id === selectedCompany);
  
  const ratios = data?.ratios || [];
  const insights = data?.insights || {};
  const breakdown = data?.breakdown || {};
  const itCorrelation = data?.it_sector_correlation || {};

  const groupedRatios = useMemo(() => {
    const groups = {};
    ratios.forEach(r => {
      const cat = r.ratio_definitions?.category || "Other";
      if (filterCategory === "all" || cat === filterCategory) {
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(r);
      }
    });
    return groups;
  }, [ratios, filterCategory]);

  const categories = [...new Set(ratios.map(r => r.ratio_definitions?.category || "Other"))];

  return (
    <PageLayout title="Enhanced Balance Sheet Analytics">
      <div className="space-y-5 pb-10">
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Enhanced Analytics</p>
          <h1 className="page-heading">Balance Sheet Intelligence</h1>
          <p className="page-subheading">Comprehensive financial analysis with insights, visualizations, and sector correlations.</p>
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
                  <BarChart3 size={36} className="text-[var(--text-3)]" />
                </div>
                <h3 className="title-lg mb-2">Enhanced Financial Analytics</h3>
                <p className="text-sm text-[var(--text-3)] max-w-md leading-relaxed mb-6">
                  Select a company to view comprehensive balance sheet analysis with insights, visualizations, and sector correlations.
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
                      <p className="text-xs font-mono text-[var(--text-3)]">{selectedComp?.ticker} · Enhanced Analytics</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[var(--orange)]/10 flex items-center justify-center">
                      <Building2 size={22} className="text-[var(--orange)]" />
                    </div>
                  </div>
                  
                  {/* IT Sector Correlation */}
                  {itCorrelation.correlation_strength && (
                    <div className="mt-4 pt-4 border-t border-[var(--border)]">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-[var(--text)]">IT Sector Correlation</p>
                          <p className="text-xs text-[var(--text-3)]">{itCorrelation.correlation_strength}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-[var(--orange)]">{itCorrelation.sector_health}%</p>
                          <p className="text-xs text-[var(--text-3)]">Sector Health</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation tabs */}
                <div className="flex gap-2 border-b border-[var(--border)] overflow-x-auto pb-2">
                  {[
                    { id: "overview", label: "Overview", icon: Eye },
                    { id: "insights", label: "Insights", icon: TrendingUp },
                    { id: "charts", label: "Charts", icon: PieChart },
                    { id: "detailed", label: "Detailed View", icon: FileSpreadsheet }
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
                {activeTab === "overview" && breakdown.category_scores && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {Object.entries(breakdown.category_scores).map(([category, data]) => (
                        <CategoryScoreCard key={category} category={category} data={data} />
                      ))}
                    </div>
                    
                    {insights.key_strengths?.length > 0 && (
                      <InsightCard title="Key Strengths" insights={insights.key_strengths} type="strength" />
                    )}
                    
                    {insights.key_concerns?.length > 0 && (
                      <InsightCard title="Key Concerns" insights={insights.key_concerns} type="concern" />
                    )}
                  </div>
                )}

                {activeTab === "insights" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {insights.key_strengths?.length > 0 && (
                        <InsightCard title="Key Strengths" insights={insights.key_strengths} type="strength" />
                      )}
                      
                      {insights.key_concerns?.length > 0 && (
                        <InsightCard title="Key Concerns" insights={insights.key_concerns} type="concern" />
                      )}
                      
                      {insights.recommendations?.length > 0 && (
                        <InsightCard title="Recommendations" insights={insights.recommendations} type="info" />
                      )}
                      
                      {insights.sector_comparison && (
                        <div className="card p-4">
                          <h4 className="text-sm font-semibold mb-2 text-[var(--text)]">Sector Analysis</h4>
                          <p className="text-xs text-[var(--text-2)]">{insights.sector_comparison.narrative}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs font-semibold">Direction:</span>
                            <SignalBadge value={insights.sector_comparison.direction?.toLowerCase()} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "charts" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {breakdown.category_scores && (
                        <div className="card p-5">
                          <h4 className="text-sm font-semibold mb-4 text-[var(--text)]">Category Performance</h4>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={Object.entries(breakdown.category_scores).map(([name, data]) => ({ name, score: data.score }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="score" fill="#FF6B35" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      
                      {breakdown.profitability_pie?.length > 0 && (
                        <PieChartCard title="Profitability Breakdown" data={breakdown.profitability_pie} />
                      )}
                    </div>
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

                    {Object.keys(groupedRatios).length === 0 ? (
                      <EmptyState title="No balance sheet data" sub="Run the pipeline to populate fundamentals." />
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(groupedRatios).map(([category, items]) => (
                          <div key={category}>
                            <div className="flex items-center gap-3 mb-3">
                              <p className="title-md">{category}</p>
                              <div className="h-px flex-1 bg-[var(--border)]" />
                              <span className="text-xs text-[var(--text-3)]">{items.length} ratios</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {items.map(r => {
                                const ratioName = r.ratio_definitions?.name || "Ratio";
                                const Icon = RATIO_ICONS[ratioName] || Activity;
                                return (
                                  <div key={r.id || ratioName} className="card p-5 group hover:border-[var(--orange)]/30 hover:-translate-y-0.5 transition-all duration-200">
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-[var(--orange)]/8 flex items-center justify-center group-hover:bg-[var(--orange)] transition-colors duration-200">
                                          <Icon size={13} className="text-[var(--orange)] group-hover:text-white transition-colors duration-200" />
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">{ratioName}</p>
                                      </div>
                                      <SignalBadge value={r.adjusted_status || r.status} />
                                    </div>
                                    <p className="text-2xl font-bold tabular-nums text-[var(--text)] mb-1">
                                      {r.value != null ? r.value.toFixed(2) : "—"}
                                    </p>
                                    {r.yoy_pct != null && (
                                      <p className={`text-xs font-semibold tabular-nums flex items-center gap-1 ${r.yoy_pct >= 0 ? "text-[var(--orange)]" : "text-[var(--text-3)]"}`}>
                                        {r.yoy_pct >= 0 ? "↑" : "↓"} {Math.abs(r.yoy_pct).toFixed(1)}% YoY
                                      </p>
                                    )}
                                    {r.ratio_definitions?.description && (
                                      <p className="text-[10px] text-[var(--text-3)] mt-2 leading-relaxed">{r.ratio_definitions.description}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
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