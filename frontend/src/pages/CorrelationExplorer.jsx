import React, { useState, useMemo } from "react";
import { Search, GitBranch, TrendingUp, BarChart3, Activity, Filter, Eye, Grid3x3, ArrowRight } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import StunningEmptyState from "../components/ui/StunningEmptyState";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import SignalBadge from "../components/ui/SignalBadge";
import { useAppData } from "../context/AppDataContext";

const SECTORS = [
  'IT Sector', 'Bank Nifty', 'Auto Sector', 'Metal Sector',
  'Realty Sector', 'FMCG Sector', 'Pharma Sector', 'Energy Sector'
];

function CorrelationMatrix({ data }) {
  if (!data || data.length === 0) return null;

  const maxCorr = Math.max(...data.map(d => Math.abs(d.correlation)));

  const getColor = (value) => {
    if (value > 0.7) return 'bg-green-500';
    if (value > 0.3) return 'bg-green-300';
    if (value > -0.3) return 'bg-gray-300';
    if (value > -0.7) return 'bg-red-300';
    return 'bg-red-500';
  };

  return (
    <div className="card p-6 overflow-x-auto">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Correlation Matrix</h3>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(data.length))}, minmax(100px, 1fr))` }}>
        {data.map((item, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg text-center text-white font-semibold text-sm ${getColor(item.correlation)} transition-all duration-200 hover:scale-110 cursor-pointer`}
            title={`${item.company1} vs ${item.company2}: ${item.correlation.toFixed(3)}`}
          >
            <div className="text-xs opacity-90 mb-1">{item.company1.substring(0, 3)}</div>
            <div className="text-lg font-bold">{item.correlation.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Strong Positive (&gt;0.7)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Neutral (-0.3 to 0.3)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Strong Negative (&lt;-0.7)</span>
        </div>
      </div>
    </div>
  );
}

function CompanyPairAnalysis({ company1, company2, correlation }) {
  const data = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
    company1: Math.random() * 100 + 50 + i * 0.5,
    company2: Math.random() * 100 + 50 + i * 0.3 + (correlation > 0 ? i * 0.3 : -i * 0.2)
  }));

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {company1} vs {company2}
        </h3>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
            correlation > 0.5 ? 'bg-green-100 text-green-700' :
            correlation > 0 ? 'bg-blue-100 text-blue-700' :
            correlation > -0.5 ? 'bg-orange-100 text-orange-700' :
            'bg-red-100 text-red-700'
          }`}>
            {correlation > 0 ? '+' : ''}{correlation.toFixed(3)}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
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
          <Line type="monotone" dataKey="company1" stroke="#FF6B35" strokeWidth={2} dot={false} name={company1} />
          <Line type="monotone" dataKey="company2" stroke="#06FFA5" strokeWidth={2} dot={false} name={company2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectorCorrelationChart({ sector, companies }) {
  const data = companies.map((company, idx) => ({
    name: company.substring(0, 3),
    correlation: Math.random() * 2 - 1,
    company: company
  }));

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {sector} Correlation with Companies
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#6B7280' }}
            type="category"
          />
          <YAxis
            dataKey="correlation"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            domain={[-1, 1]}
            label={{ value: 'Correlation', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}
          />
          <Scatter
            name="Correlation"
            data={data}
            fill="#FF6B35"
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function CorrelationExplorer() {
  const { companies } = useAppData();
  const [activeTab, setActiveTab] = useState("matrix");
  const [selectedCompany1, setSelectedCompany1] = useState(companies[0]?.ticker || "");
  const [selectedCompany2, setSelectedCompany2] = useState(companies[1]?.ticker || "");
  const [selectedSector, setSelectedSector] = useState(SECTORS[0]);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCompanies = useMemo(() => {
    return companies.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.ticker || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [companies, searchTerm]);

  // Mock correlation data
  const correlationMatrix = useMemo(() => {
    return companies.slice(0, 8).map((c1, i) =>
      companies.slice(i + 1, i + 2).map(c2 => ({
        company1: c1.ticker || c1.name,
        company2: c2.ticker || c2.name,
        correlation: Math.random() * 2 - 1
      }))
    ).flat();
  }, [companies]);

  const selectedCorrelation = useMemo(() => {
    const pair = correlationMatrix.find(
      c => (c.company1 === selectedCompany1 && c.company2 === selectedCompany2) ||
           (c.company1 === selectedCompany2 && c.company2 === selectedCompany1)
    );
    return pair ? pair.correlation : Math.random() * 2 - 1;
  }, [correlationMatrix, selectedCompany1, selectedCompany2]);

  if (companies.length === 0) {
    return (
      <PageLayout title="Correlation Explorer">
        <StunningEmptyState
          title="Correlation Explorer"
          subtitle="Company Co-movement Analysis"
          description="Explore correlations between companies and NSE sector indices. Understand how companies move together and identify diversification opportunities."
          icon={GitBranch}
          theme="correlation"
          primaryAction={{
            label: "Load Companies",
            onClick: () => {}
          }}
          secondaryAction={{
            label: "Learn More",
            onClick: () => {}
          }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Correlation Explorer">
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Analysis</p>
          <h1 className="page-heading">Correlation Explorer</h1>
          <p className="page-subheading">Analyze company co-movements with NSE sector indices across 20+ companies. Understand correlations and diversification opportunities.</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-[var(--border)] overflow-x-auto pb-2">
          {[
            { id: "matrix", label: "Correlation Matrix", icon: Grid3x3 },
            { id: "pair", label: "Pair Analysis", icon: ArrowRight },
            { id: "sector", label: "Sector Correlation", icon: TrendingUp }
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
        {activeTab === "matrix" && (
          <div className="space-y-6">
            <CorrelationMatrix data={correlationMatrix} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Correlation Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Average Correlation</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {(correlationMatrix.reduce((sum, c) => sum + c.correlation, 0) / correlationMatrix.length).toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Highest Correlation</span>
                    <span className="font-semibold text-green-500">
                      {Math.max(...correlationMatrix.map(c => c.correlation)).toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Lowest Correlation</span>
                    <span className="font-semibold text-red-500">
                      {Math.min(...correlationMatrix.map(c => c.correlation)).toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Std Deviation</span>
                    <span className="font-semibold text-gray-900 dark:text-white">0.342</span>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Interpretation Guide</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 mt-1 shrink-0"></div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Strong Positive (&gt;0.7)</p>
                      <p className="text-gray-600 dark:text-gray-400">Move together in same direction</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-gray-400 mt-1 shrink-0"></div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Neutral (-0.3 to 0.3)</p>
                      <p className="text-gray-600 dark:text-gray-400">Independent movements</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 mt-1 shrink-0"></div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Strong Negative (&lt;-0.7)</p>
                      <p className="text-gray-600 dark:text-gray-400">Move in opposite directions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "pair" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company 1</label>
                <select
                  value={selectedCompany1}
                  onChange={e => setSelectedCompany1(e.target.value)}
                  className="input-base w-full"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.ticker || c.name}>
                      {c.name} ({c.ticker})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company 2</label>
                <select
                  value={selectedCompany2}
                  onChange={e => setSelectedCompany2(e.target.value)}
                  className="input-base w-full"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.ticker || c.name}>
                      {c.name} ({c.ticker})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <CompanyPairAnalysis
              company1={selectedCompany1}
              company2={selectedCompany2}
              correlation={selectedCorrelation}
            />

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Analysis Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Correlation Coefficient</span>
                  <span className={`text-lg font-bold ${
                    selectedCorrelation > 0.5 ? 'text-green-500' :
                    selectedCorrelation > 0 ? 'text-blue-500' :
                    selectedCorrelation > -0.5 ? 'text-orange-500' :
                    'text-red-500'
                  }`}>
                    {selectedCorrelation > 0 ? '+' : ''}{selectedCorrelation.toFixed(3)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedCorrelation > 0.7 ? "These companies show strong positive correlation, moving together in the same direction." :
                   selectedCorrelation > 0.3 ? "Moderate positive correlation indicates some synchronized movement." :
                   selectedCorrelation > -0.3 ? "Weak correlation suggests relatively independent price movements." :
                   selectedCorrelation > -0.7 ? "Moderate negative correlation indicates inverse movements." :
                   "Strong negative correlation means these companies typically move in opposite directions."}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sector" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Sector</label>
              <select
                value={selectedSector}
                onChange={e => setSelectedSector(e.target.value)}
                className="input-base w-full max-w-xs"
              >
                {SECTORS.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>

            <SectorCorrelationChart
              sector={selectedSector}
              companies={companies.slice(0, 10).map(c => c.ticker || c.name)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sector Insights</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Sector Health</span>
                    <span className="font-semibold text-green-500">Strong</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Avg Company Correlation</span>
                    <span className="font-semibold text-gray-900 dark:text-white">0.542</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Sector Momentum</span>
                    <span className="font-semibold text-blue-500">Positive</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Diversification Score</span>
                    <span className="font-semibold text-orange-500">Moderate</span>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recommendations</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-gray-600 dark:text-gray-400">Good diversification within sector</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">→</span>
                    <span className="text-gray-600 dark:text-gray-400">Consider sector rotation strategies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold">!</span>
                    <span className="text-gray-600 dark:text-gray-400">Monitor sector-wide risks</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}