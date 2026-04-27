import React, { useEffect, useState, useMemo } from "react";
import { Search, Filter, SlidersHorizontal, TrendingUp, Building2, BarChart3, Target, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAppData } from "../context/AppDataContext";

const FILTER_CATEGORIES = {
  profitability: {
    label: "Profitability",
    icon: TrendingUp,
    filters: [
      { key: "gross_margin", label: "Gross Margin %", min: 0, max: 100 },
      { key: "net_margin", label: "Net Margin %", min: -50, max: 50 },
      { key: "roe", label: "ROE %", min: -50, max: 100 },
      { key: "roa", label: "ROA %", min: -50, max: 50 }
    ]
  },
  liquidity: {
    label: "Liquidity",
    icon: BarChart3,
    filters: [
      { key: "current_ratio", label: "Current Ratio", min: 0, max: 10 },
      { key: "quick_ratio", label: "Quick Ratio", min: 0, max: 10 },
      { key: "cash_ratio", label: "Cash Ratio", min: 0, max: 5 }
    ]
  },
  leverage: {
    label: "Leverage",
    icon: Target,
    filters: [
      { key: "debt_equity", label: "Debt/Equity", min: 0, max: 5 },
      { key: "debt_assets", label: "Debt/Assets", min: 0, max: 1 },
      { key: "interest_coverage", label: "Interest Coverage", min: 0, max: 50 }
    ]
  },
  ownership: {
    label: "Ownership",
    icon: Building2,
    filters: [
      { key: "institutional_ownership", label: "Institutional %", min: 0, max: 100 },
      { key: "promoter_holding", label: "Promoter %", min: 0, max: 100 },
      { key: "public_float", label: "Public Float %", min: 0, max: 100 },
      { key: "hhi", label: "HHI (max)", min: 0, max: 1 }
    ]
  }
};

const CLASSIFICATION_TIERS = {
  excellent: { label: "Excellent", color: "bg-green-500", textColor: "text-green-700", range: [80, 100] },
  good: { label: "Good", color: "bg-blue-500", textColor: "text-blue-700", range: [60, 79] },
  average: { label: "Average", color: "bg-yellow-500", textColor: "text-yellow-700", range: [40, 59] },
  poor: { label: "Poor", color: "bg-orange-500", textColor: "text-orange-700", range: [20, 39] },
  critical: { label: "Critical", color: "bg-red-500", textColor: "text-red-700", range: [0, 19] }
};

function FilterSection({ category, filters, values, onChange }) {
  const { label, icon: Icon } = FILTER_CATEGORIES[category];
  
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-[var(--orange)]" />
        <h3 className="text-sm font-semibold text-[var(--text)]">{label}</h3>
      </div>
      <div className="space-y-3">
        {filters.map(filter => (
          <div key={filter.key} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-[var(--text-2)]">{filter.label}</label>
              <span className="text-xs text-[var(--text-3)]">
                {values[filter.key]?.min ?? filter.min} - {values[filter.key]?.max ?? filter.max}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={values[filter.key]?.min ?? ""}
                onChange={e => onChange(filter.key, 'min', parseFloat(e.target.value) || filter.min)}
                className="input-base text-xs w-20"
                min={filter.min}
                max={filter.max}
                step={filter.key === 'hhi' ? 0.01 : 1}
              />
              <input
                type="number"
                placeholder="Max"
                value={values[filter.key]?.max ?? ""}
                onChange={e => onChange(filter.key, 'max', parseFloat(e.target.value) || filter.max)}
                className="input-base text-xs w-20"
                min={filter.min}
                max={filter.max}
                step={filter.key === 'hhi' ? 0.01 : 1}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassificationCard({ tier, count, total, companies }) {
  const { label, color, textColor, range } = CLASSIFICATION_TIERS[tier];
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
  
  return (
    <div className="card p-4 hover-lift">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <h4 className="text-sm font-semibold text-[var(--text)]">{label}</h4>
        </div>
        <span className="text-xs text-[var(--text-3)]">{range[0]}-{range[1]}%</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold text-[var(--text)]">{count}</span>
          <span className="text-sm text-[var(--text-3)]">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {companies.length > 0 && (
          <div className="mt-2 space-y-1">
            {companies.slice(0, 3).map(company => (
              <div key={company.id} className="text-xs text-[var(--text-3)] truncate">
                {company.name}
              </div>
            ))}
            {companies.length > 3 && (
              <div className="text-xs text-[var(--text-3)]">+{companies.length - 3} more</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyCard({ company, score, onClick }) {
  const tier = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'average' : score >= 20 ? 'poor' : 'critical';
  const { color, textColor } = CLASSIFICATION_TIERS[tier];
  
  return (
    <div 
      className="card p-4 hover-lift cursor-pointer transition-all duration-200 hover:border-[var(--orange)]/30"
      onClick={() => onClick(company)}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-[var(--text)] truncate">{company.name}</h4>
        <div className={`px-2 py-1 rounded text-xs font-bold ${color} text-white`}>
          {score}
        </div>
      </div>
      <p className="text-xs text-[var(--text-3)] mb-2">{company.ticker}</p>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${textColor}`}>
          {CLASSIFICATION_TIERS[tier].label}
        </span>
        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
          <div 
            className={`h-1 rounded-full ${color}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function FilteringClassification() {
  const { companies } = useAppData();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("filters");
  const [filterValues, setFilterValues] = useState({});
  const [sortBy, setSortBy] = useState("score");
  const [sortOrder, setSortOrder] = useState("desc");

  // Mock data for demonstration - in real app, this would come from API
  const [companyScores] = useState(() => {
    return companies.map(company => ({
      ...company,
      score: Math.floor(Math.random() * 100),
      profitability_score: Math.floor(Math.random() * 100),
      liquidity_score: Math.floor(Math.random() * 100),
      leverage_score: Math.floor(Math.random() * 100),
      ownership_score: Math.floor(Math.random() * 100),
      // Mock financial metrics
      gross_margin: Math.random() * 50 + 10,
      net_margin: Math.random() * 20 - 5,
      roe: Math.random() * 30 - 5,
      roa: Math.random() * 15 - 2,
      current_ratio: Math.random() * 5 + 0.5,
      quick_ratio: Math.random() * 3 + 0.3,
      cash_ratio: Math.random() * 2 + 0.1,
      debt_equity: Math.random() * 3,
      debt_assets: Math.random() * 0.8,
      interest_coverage: Math.random() * 20 + 1,
      institutional_ownership: Math.random() * 80 + 10,
      promoter_holding: Math.random() * 70 + 15,
      public_float: Math.random() * 60 + 20,
      hhi: Math.random() * 0.5 + 0.1
    }));
  });

  const handleFilterChange = (key, type, value) => {
    setFilterValues(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [type]: value
      }
    }));
  };

  const filteredCompanies = useMemo(() => {
    let filtered = companyScores.filter(company =>
      company.name.toLowerCase().includes(search.toLowerCase()) ||
      (company.ticker || "").toLowerCase().includes(search.toLowerCase())
    );

    // Apply filters
    Object.entries(filterValues).forEach(([key, range]) => {
      if (range.min !== undefined || range.max !== undefined) {
        filtered = filtered.filter(company => {
          const value = company[key];
          if (value === undefined) return true;
          if (range.min !== undefined && value < range.min) return false;
          if (range.max !== undefined && value > range.max) return false;
          return true;
        });
      }
    });

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });

    return filtered;
  }, [companyScores, search, filterValues, sortBy, sortOrder]);

  const classificationData = useMemo(() => {
    const tiers = {
      excellent: [],
      good: [],
      average: [],
      poor: [],
      critical: []
    };

    filteredCompanies.forEach(company => {
      const score = company.score;
      if (score >= 80) tiers.excellent.push(company);
      else if (score >= 60) tiers.good.push(company);
      else if (score >= 40) tiers.average.push(company);
      else if (score >= 20) tiers.poor.push(company);
      else tiers.critical.push(company);
    });

    return tiers;
  }, [filteredCompanies]);

  const chartData = useMemo(() => {
    return Object.entries(classificationData).map(([tier, companies]) => ({
      tier: CLASSIFICATION_TIERS[tier].label,
      count: companies.length,
      color: CLASSIFICATION_TIERS[tier].color
    }));
  }, [classificationData]);

  return (
    <PageLayout title="Filtering & Classification">
      <div className="space-y-5 pb-10">
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Analytics</p>
          <h1 className="page-heading">Company Filtering & Classification</h1>
          <p className="page-subheading">Advanced filtering and classification system for comprehensive company analysis.</p>
        </div>

        {/* Search and controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search companies…" 
              className="input-base pl-10 w-full" 
            />
          </div>
          
          <div className="flex gap-2">
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className="input-base text-sm"
            >
              <option value="score">Overall Score</option>
              <option value="profitability_score">Profitability</option>
              <option value="liquidity_score">Liquidity</option>
              <option value="leverage_score">Leverage</option>
              <option value="ownership_score">Ownership</option>
            </select>
            
            <button
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              className="btn-secondary px-3 py-2"
            >
              {sortOrder === "desc" ? "↓" : "↑"}
            </button>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex gap-2 border-b border-[var(--border)] overflow-x-auto pb-2">
          {[
            { id: "filters", label: "Filters", icon: SlidersHorizontal },
            { id: "classification", label: "Classification", icon: Target },
            { id: "companies", label: "Companies", icon: Building2 },
            { id: "analytics", label: "Analytics", icon: BarChart3 }
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
        {activeTab === "filters" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text)]">Filter Criteria</h3>
              <button
                onClick={() => setFilterValues({})}
                className="btn-secondary text-sm"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(FILTER_CATEGORIES).map(([category, config]) => (
                <FilterSection
                  key={category}
                  category={category}
                  filters={config.filters}
                  values={filterValues}
                  onChange={handleFilterChange}
                />
              ))}
            </div>
            
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text)]">Filtered Results</span>
                <span className="text-lg font-bold text-[var(--orange)]">{filteredCompanies.length}</span>
              </div>
              <p className="text-xs text-[var(--text-3)] mt-1">
                companies match your criteria
              </p>
            </div>
          </div>
        )}

        {activeTab === "classification" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(classificationData).map(([tier, companies]) => (
                <ClassificationCard
                  key={tier}
                  tier={tier}
                  count={companies.length}
                  total={filteredCompanies.length}
                  companies={companies}
                />
              ))}
            </div>
            
            <div className="card p-5">
              <h4 className="text-sm font-semibold mb-4 text-[var(--text)]">Classification Distribution</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tier" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#FF6B35" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "companies" && (
          <div className="space-y-5">
            {filteredCompanies.length === 0 ? (
              <EmptyState title="No companies found" sub="Adjust your filters to see results." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCompanies.map(company => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    score={company.score}
                    onClick={(company) => {
                      // Navigate to company detail
                      window.location.href = `/companies/${company.id}`;
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="card p-5">
                <h4 className="text-sm font-semibold mb-4 text-[var(--text)]">Score Distribution</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <ScatterChart data={filteredCompanies}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="profitability_score" name="Profitability" />
                    <YAxis dataKey="liquidity_score" name="Liquidity" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter dataKey="score" fill="#FF6B35" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              
              <div className="card p-5">
                <h4 className="text-sm font-semibold mb-4 text-[var(--text)]">Category Performance</h4>
                <div className="space-y-3">
                  {['profitability_score', 'liquidity_score', 'leverage_score', 'ownership_score'].map(category => {
                    const avg = filteredCompanies.reduce((sum, c) => sum + (c[category] || 0), 0) / filteredCompanies.length;
                    return (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-xs text-[var(--text-2)] capitalize">
                          {category.replace('_score', '').replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-[var(--orange)]"
                              style={{ width: `${avg}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-[var(--text)] w-8">
                            {avg.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}