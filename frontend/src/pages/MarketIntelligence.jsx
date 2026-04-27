import React, { useState, useEffect } from "react";
import { Search, Globe, TrendingUp, BarChart3, Activity, Target, Zap, Filter, Eye, PieChart } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import StunningEmptyState from "../components/ui/StunningEmptyState";
import BoxPlotChart from "../components/charts/BoxPlotChart";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import SignalBadge from "../components/ui/SignalBadge";
import { useAppData } from "../context/AppDataContext";

const COLORS = ['#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#118AB2', '#073B4C', '#8B5CF6', '#EF4444'];

const MARKET_SEGMENTS = [
  { id: 'large_cap', name: 'Large Cap', color: '#10B981', threshold: 20000 },
  { id: 'mid_cap', name: 'Mid Cap', color: '#F59E0B', threshold: 5000 },
  { id: 'small_cap', name: 'Small Cap', color: '#EF4444', threshold: 0 }
];

const SECTORS = [
  'IT Sector', 'Bank Nifty', 'Auto Sector', 'Metal Sector', 
  'Realty Sector', 'FMCG Sector', 'Pharma Sector', 'Energy Sector'
];

function MarketOverviewCard({ title, value, change, trend, icon: Icon, color = "blue" }) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600",
    green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600",
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600",
    orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600"
  };

  return (
    <div className={`card p-6 border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl ${colorClasses[color].replace('text-', 'bg-').replace('600', '100')} flex items-center justify-center`}>
          <Icon size={24} className={colorClasses[color].split(' ').find(c => c.startsWith('text-'))} />
        </div>
        {trend && <SignalBadge value={trend} />}
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
        {change && (
          <p className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '↗' : '↘'} {Math.abs(change).toFixed(2)}%
          </p>
        )}
      </div>
    </div>
  );
}

function SectorPerformanceChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sector Performance</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="sector" 
            tick={{ fontSize: 10, fill: '#6B7280' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}
          />
          <Bar dataKey="performance" fill="#FF6B35" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MarketCapDistribution({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Market Cap Distribution</h3>
      <ResponsiveContainer width="100%" height={250}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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

function MarketTrendChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Market Trend (30 Days)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="marketGradient" x1="0" y1="0" x2="0" y2="1">
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
            dataKey="index"
            stroke="#FF6B35"
            strokeWidth={2}
            fill="url(#marketGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function MarketIntelligence() {
  const { companies } = useAppData();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSegment, setSelectedSegment] = useState("all");
  const [selectedSector, setSelectedSector] = useState("all");

  // Mock data - in real app, this would come from API
  const [marketData] = useState({
    overview: {
      totalMarketCap: "₹2,45,67,890 Cr",
      totalCompanies: companies.length,
      activeTrading: Math.floor(companies.length * 0.85),
      avgVolatility: "12.5%"
    },
    sectorPerformance: SECTORS.map(sector => ({
      sector: sector.replace(' Sector', '').replace('Bank Nifty', 'Banking'),
      performance: Math.random() * 20 - 10 // -10 to +10
    })),
    marketCapDistribution: [
      { name: 'Large Cap', value: 65, count: Math.floor(companies.length * 0.15) },
      { name: 'Mid Cap', value: 25, count: Math.floor(companies.length * 0.25) },
      { name: 'Small Cap', value: 10, count: Math.floor(companies.length * 0.60) }
    ],
    marketTrend: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
      index: 18500 + Math.random() * 2000 - 1000 + i * 10
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
  });

  const filteredCompanies = companies.filter(company => {
    if (selectedSegment !== "all") {
      // Filter by market cap segment (mock logic)
      const mockMarketCap = Math.random() * 50000;
      const segment = MARKET_SEGMENTS.find(s => s.id === selectedSegment);
      if (segment && mockMarketCap < segment.threshold) return false;
    }
    return true;
  });

  if (companies.length === 0) {
    return (
      <PageLayout title="Market Intelligence">
        <StunningEmptyState
          title="Market Intelligence Hub"
          subtitle="Comprehensive Market Analysis Platform"
          description="Discover market trends, sector performance, and intelligent insights across the entire market ecosystem. Get started by loading market data or exploring our analytics capabilities."
          icon={Globe}
          theme="intelligence"
          primaryAction={{
            label: "Load Market Data",
            onClick: () => setLoading(true)
          }}
          secondaryAction={{
            label: "Explore Features",
            onClick: () => setActiveTab("analytics")
          }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Market Intelligence">
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Intelligence</p>
          <h1 className="page-heading">Market Intelligence Hub</h1>
          <p className="page-subheading">Comprehensive market analysis, sector performance tracking, and intelligent insights across the entire market ecosystem.</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-3">
            <select 
              value={selectedSegment} 
              onChange={e => setSelectedSegment(e.target.value)}
              className="input-base text-sm"
            >
              <option value="all">All Market Caps</option>
              {MARKET_SEGMENTS.map(segment => (
                <option key={segment.id} value={segment.id}>{segment.name}</option>
              ))}
            </select>
            
            <select 
              value={selectedSector} 
              onChange={e => setSelectedSector(e.target.value)}
              className="input-base text-sm"
            >
              <option value="all">All Sectors</option>
              {SECTORS.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Analyzing {filteredCompanies.length} companies
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-[var(--border)] overflow-x-auto pb-2">
          {[
            { id: "overview", label: "Market Overview", icon: Globe },
            { id: "sectors", label: "Sector Analysis", icon: BarChart3 },
            { id: "trends", label: "Market Trends", icon: TrendingUp },
            { id: "analytics", label: "Price Analytics", icon: Activity }
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
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Market Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MarketOverviewCard
                    title="Total Market Cap"
                    value={marketData.overview.totalMarketCap}
                    change={2.34}
                    trend="bullish"
                    icon={Target}
                    color="blue"
                  />
                  <MarketOverviewCard
                    title="Listed Companies"
                    value={marketData.overview.totalCompanies.toLocaleString()}
                    change={0.5}
                    trend="stable"
                    icon={BarChart3}
                    color="green"
                  />
                  <MarketOverviewCard
                    title="Active Trading"
                    value={marketData.overview.activeTrading.toLocaleString()}
                    change={1.2}
                    trend="bullish"
                    icon={Activity}
                    color="orange"
                  />
                  <MarketOverviewCard
                    title="Avg Volatility"
                    value={marketData.overview.avgVolatility}
                    change={-0.8}
                    trend="bearish"
                    icon={Zap}
                    color="red"
                  />
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <MarketCapDistribution data={marketData.marketCapDistribution} />
                  <SectorPerformanceChart data={marketData.sectorPerformance} />
                </div>
              </div>
            )}

            {activeTab === "sectors" && (
              <div className="space-y-6">
                <SectorPerformanceChart data={marketData.sectorPerformance} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {marketData.sectorPerformance.map((sector, idx) => (
                    <div key={sector.sector} className="card p-5 hover-lift">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{sector.sector}</h4>
                        <SignalBadge value={sector.performance > 0 ? "bullish" : sector.performance < -5 ? "bearish" : "neutral"} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-2xl font-bold ${sector.performance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {sector.performance >= 0 ? '+' : ''}{sector.performance.toFixed(2)}%
                        </span>
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${sector.performance >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, Math.abs(sector.performance) * 5)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "trends" && (
              <div className="space-y-6">
                <MarketTrendChart data={marketData.marketTrend} />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card p-5">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Trend Analysis</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">30-Day Trend</span>
                        <span className="text-sm font-semibold text-green-500">↗ Bullish</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Momentum</span>
                        <span className="text-sm font-semibold text-orange-500">Strong</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Support Level</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">18,200</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card p-5">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Volume Analysis</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Avg Daily Volume</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">₹45,230 Cr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Volume Trend</span>
                        <span className="text-sm font-semibold text-blue-500">Increasing</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Participation</span>
                        <span className="text-sm font-semibold text-green-500">High</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card p-5">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Market Sentiment</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Bull/Bear Ratio</span>
                        <span className="text-sm font-semibold text-green-500">65:35</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Fear & Greed</span>
                        <span className="text-sm font-semibold text-orange-500">Neutral</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">VIX Level</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">16.8</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="space-y-6">
                <BoxPlotChart
                  data={marketData.priceBoxPlots}
                  title="Quarterly Price Distribution Analysis"
                  className="col-span-full"
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistical Summary</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Mean Price</span>
                        <span className="font-semibold text-gray-900 dark:text-white">₹847.50</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Median Price</span>
                        <span className="font-semibold text-gray-900 dark:text-white">₹823.20</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Standard Deviation</span>
                        <span className="font-semibold text-gray-900 dark:text-white">₹156.80</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Skewness</span>
                        <span className="font-semibold text-gray-900 dark:text-white">0.23</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Kurtosis</span>
                        <span className="font-semibold text-gray-900 dark:text-white">2.87</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Risk Metrics</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Value at Risk (95%)</span>
                        <span className="font-semibold text-red-500">₹234.50</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Expected Shortfall</span>
                        <span className="font-semibold text-red-500">₹298.70</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Sharpe Ratio</span>
                        <span className="font-semibold text-green-500">1.24</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Max Drawdown</span>
                        <span className="font-semibold text-red-500">-18.5%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Beta (vs Nifty)</span>
                        <span className="font-semibold text-gray-900 dark:text-white">0.87</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}