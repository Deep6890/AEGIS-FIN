import React, { useState, useMemo } from "react";
import { Search, TrendingUp, BarChart3, Activity, Filter, Eye, PieChart, Building2, Users, Zap } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import StunningEmptyState from "../components/ui/StunningEmptyState";
import BoxPlotChart from "../components/charts/BoxPlotChart";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import SignalBadge from "../components/ui/SignalBadge";
import { useAppData } from "../context/AppDataContext";

const COLORS = ['#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#118AB2', '#073B4C', '#8B5CF6', '#EF4444'];

const SECTORS = [
  { id: 'it', name: 'IT Sector', icon: '💻', companies: 12, performance: 8.5 },
  { id: 'banking', name: 'Banking', icon: '🏦', companies: 8, performance: 5.2 },
  { id: 'auto', name: 'Auto', icon: '🚗', companies: 6, performance: -2.3 },
  { id: 'pharma', name: 'Pharma', icon: '💊', companies: 5, performance: 3.1 },
  { id: 'fmcg', name: 'FMCG', icon: '🛒', companies: 4, performance: 1.8 },
  { id: 'metal', name: 'Metal', icon: '⚙️', companies: 3, performance: 6.7 },
  { id: 'realty', name: 'Realty', icon: '🏢', companies: 4, performance: 4.2 },
  { id: 'energy', name: 'Energy', icon: '⚡', companies: 3, performance: 2.9 }
];

function SectorCard({ sector, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
        isSelected
          ? 'border-[var(--orange)] border-2 bg-[var(--orange)]/5'
          : 'hover:border-[var(--orange)]/30'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{sector.icon}</span>
        <SignalBadge value={sector.performance > 0 ? "bullish" : sector.performance < -2 ? "bearish" : "neutral"} />
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{sector.name}</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Companies</span>
          <span className="font-semibold text-gray-900 dark:text-white">{sector.companies}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Performance</span>
          <span className={`font-semibold ${sector.performance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {sector.performance >= 0 ? '+' : ''}{sector.performance.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function SectorMetricsCard({ title, value, unit, trend, icon: Icon, color = "blue" }) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
    green: "bg-green-50 dark:bg-green-900/20 text-green-600",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600"
  };

  return (
    <div className={`card p-5 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon size={20} />
        {trend && <SignalBadge value={trend} />}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}{unit}
      </p>
    </div>
  );
}

function SectorComparison({ sectors }) {
  const radarData = sectors.map(sector => ({
    name: sector.name.replace(' Sector', ''),
    performance: Math.max(0, sector.performance + 10), // Normalize to 0-20 scale
    companies: sector.companies * 2.5, // Scale for visibility
    growth: Math.random() * 20
  }));

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sector Comparison</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} />
          <PolarRadiusAxis angle={90} domain={[0, 20]} tick={{ fontSize: 10, fill: '#6B7280' }} />
          <Radar name="Performance" dataKey="performance" stroke="#FF6B35" fill="#FF6B35" fillOpacity={0.3} />
          <Radar name="Growth" dataKey="growth" stroke="#06FFA5" fill="#06FFA5" fillOpacity={0.2} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopCompaniesInSector({ sectorName, count = 5 }) {
  const mockCompanies = Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `${sectorName} Company ${i + 1}`,
    ticker: `${sectorName.substring(0, 3).toUpperCase()}${i + 1}.NS`,
    performance: Math.random() * 20 - 5,
    marketCap: Math.random() * 50000 + 5000
  }));

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Companies</h3>
      <div className="space-y-3">
        {mockCompanies.map((company, idx) => (
          <div key={company.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--orange)]/10 flex items-center justify-center text-sm font-bold text-[var(--orange)]">
                {idx + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{company.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{company.ticker}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${company.performance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {company.performance >= 0 ? '+' : ''}{company.performance.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">₹{(company.marketCap / 1000).toFixed(0)}K Cr</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SectorIntelligence() {
  const { companies } = useAppData();
  const [selectedSector, setSelectedSector] = useState(SECTORS[0]);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSectors = useMemo(() => {
    return SECTORS.filter(sector =>
      sector.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const sectorData = {
    overview: {
      totalCompanies: selectedSector.companies,
      avgPerformance: selectedSector.performance,
      marketCap: Math.random() * 500000 + 100000,
      volatility: Math.random() * 15 + 5
    },
    performance: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
      performance: selectedSector.performance + Math.random() * 4 - 2 + i * 0.1
    })),
    priceBoxPlots: [
      {
        period: 'Q1 2024',
        prices: Array.from({ length: 100 }, () => Math.random() * 1000 + 500)
      },
      {
        period: 'Q2 2024',
        prices: Array.from({ length: 100 }, () => Math.random() * 1200 + 600)
      },
      {
        period: 'Q3 2024',
        prices: Array.from({ length: 100 }, () => Math.random() * 1100 + 550)
      },
      {
        period: 'Q4 2024',
        prices: Array.from({ length: 100 }, () => Math.random() * 1300 + 700)
      }
    ]
  };

  if (companies.length === 0) {
    return (
      <PageLayout title="Sector Intelligence">
        <StunningEmptyState
          title="Sector Intelligence Platform"
          subtitle="Deep Sector Analysis & Insights"
          description="Analyze sector performance, track company movements, and gain intelligent insights into sector-specific trends and dynamics."
          icon={Building2}
          theme="intelligence"
          primaryAction={{
            label: "Load Sector Data",
            onClick: () => {}
          }}
          secondaryAction={{
            label: "Explore Sectors",
            onClick: () => {}
          }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Sector Intelligence">
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Intelligence</p>
          <h1 className="page-heading">Sector Intelligence Platform</h1>
          <p className="page-subheading">Deep sector analysis, performance tracking, and intelligent insights into sector-specific trends and dynamics.</p>
        </div>

        {/* Sector Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Sector</h2>
            <div className="relative w-full max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search sectors..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-base pl-10 w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredSectors.map(sector => (
              <SectorCard
                key={sector.id}
                sector={sector}
                isSelected={selectedSector.id === sector.id}
                onClick={() => setSelectedSector(sector)}
              />
            ))}
          </div>
        </div>

        {/* Selected Sector Details */}
        {selectedSector && (
          <>
            {/* Sector Header */}
            <div className="card-glass p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{selectedSector.icon}</span>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedSector.name}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedSector.companies} companies tracked</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-bold ${selectedSector.performance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {selectedSector.performance >= 0 ? '+' : ''}{selectedSector.performance.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">30-day performance</p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-[var(--border)] overflow-x-auto pb-2">
              {[
                { id: "overview", label: "Overview", icon: Eye },
                { id: "performance", label: "Performance", icon: TrendingUp },
                { id: "companies", label: "Companies", icon: Building2 },
                { id: "analytics", label: "Analytics", icon: Activity }
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

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <SectorMetricsCard
                    title="Total Companies"
                    value={sectorData.overview.totalCompanies}
                    unit=""
                    icon={Building2}
                    color="blue"
                  />
                  <SectorMetricsCard
                    title="Avg Performance"
                    value={sectorData.overview.avgPerformance.toFixed(1)}
                    unit="%"
                    trend={sectorData.overview.avgPerformance > 0 ? "bullish" : "bearish"}
                    icon={TrendingUp}
                    color={sectorData.overview.avgPerformance > 0 ? "green" : "red"}
                  />
                  <SectorMetricsCard
                    title="Market Cap"
                    value={(sectorData.overview.marketCap / 1000).toFixed(0)}
                    unit="K Cr"
                    icon={Zap}
                    color="orange"
                  />
                  <SectorMetricsCard
                    title="Volatility"
                    value={sectorData.overview.volatility.toFixed(1)}
                    unit="%"
                    icon={Activity}
                    color="red"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SectorComparison sectors={SECTORS} />
                  <TopCompaniesInSector sectorName={selectedSector.name} count={5} />
                </div>
              </div>
            )}

            {activeTab === "performance" && (
              <div className="space-y-6">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">30-Day Performance Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={sectorData.performance}>
                      <defs>
                        <linearGradient id="sectorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#6B7280' }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="performance"
                        stroke="#FF6B35"
                        strokeWidth={2}
                        fill="url(#sectorGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === "companies" && (
              <div className="space-y-6">
                <TopCompaniesInSector sectorName={selectedSector.name} count={10} />
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="space-y-6">
                <BoxPlotChart
                  data={sectorData.priceBoxPlots}
                  title="Quarterly Price Distribution - Sector Analysis"
                  className="col-span-full"
                />
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}