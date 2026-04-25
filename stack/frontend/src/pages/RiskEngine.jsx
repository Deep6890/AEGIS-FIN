import React, { useState, useMemo } from 'react';
import { ShieldAlert, BarChart3, TrendingUp, CheckCircle2, Eye, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import AppLayout from '../components/Layout/AppLayout';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import SectionHeader from '../components/ui/SectionHeader';
import { useAppData } from '../context/AppDataContext';
import { useChartTheme } from '../hooks/useChartTheme';

export default function RiskEngine() {
  const { allCompanies, isLoadingCompanies } = useAppData();
  const ct = useChartTheme();
  const [sortParam, setSortParam] = useState('Worst First');

  const stats = useMemo(() => {
    let total = 0, healthy = 0, watch = 0, distress = 0;
    (allCompanies || []).forEach(c => {
      total++;
      if (c.survival_score >= 70) healthy++;
      else if (c.survival_score >= 40) watch++;
      else distress++;
    });
    return { total, healthy, watch, distress };
  }, [allCompanies]);

  const distribution = useMemo(() => {
    if (!allCompanies || !allCompanies.length) return [];
    
    // Create bins 0-10, 10-20, ... 90-100
    const bins = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${(i + 1) * 10}`,
      min: i * 10,
      count: 0
    }));

    allCompanies.forEach(c => {
      const s = c.survival_score || 0;
      const binIdx = s === 100 ? 9 : Math.floor(s / 10);
      if(bins[binIdx]) bins[binIdx].count++;
    });
    return bins;
  }, [allCompanies]);

  const pieData = [
    { name: 'Survival', value: stats.healthy + stats.watch, fill: ct.healthy },
    { name: 'Distress', value: stats.distress, fill: ct.distress }
  ];

  const sortedRows = useMemo(() => {
    const arr = [...(allCompanies || [])];
    if (sortParam === 'Worst First') {
      arr.sort((a,b) => (a.survival_score || 0) - (b.survival_score || 0));
    } else if (sortParam === 'Best First') {
      arr.sort((a,b) => (b.survival_score || 0) - (a.survival_score || 0));
    } else if (sortParam === 'High Distress') {
      return arr.filter(c => (c.survival_score || 0) < 40).sort((a,b) => (a.survival_score || 0) - (b.survival_score || 0));
    }
    return arr;
  }, [allCompanies, sortParam]);

  const survivalRate = stats.total > 0 ? Math.round(((stats.healthy + stats.watch) / stats.total) * 100) : 0;

  const renderNineLayers = (score) => {
    const segments = 9;
    const filled = Math.round((score / 100) * segments);
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < filled ? (score >= 70 ? 'bg-brand-green' : score >= 40 ? 'bg-brand-amber' : 'bg-brand-red') : 'bg-neutral-200 dark:bg-neutral-800'}`} />
        ))}
      </div>
    );
  };

  const columns = [
    { header: 'Company', accessor: 'name', render: (r) => <span className="font-medium">{r.name}</span> },
    { header: 'Score', accessor: 'survival_score', render: (r) => (
        <span className={`font-bold tabular-nums ${r.survival_score >= 70 ? 'text-brand-green' : r.survival_score >= 40 ? 'text-brand-amber' : 'text-brand-red'}`}>
          {r.survival_score?.toFixed(1) || '—'}
        </span>
      ) 
    },
    { header: 'Status', accessor: 'status', render: (r) => {
        const s = r.survival_score >= 70 ? 'healthy' : r.survival_score >= 40 ? 'watch' : 'distress';
        return <StatusBadge status={s} />
      } 
    },
    { header: 'Health Index', accessor: 'layers', render: (r) => renderNineLayers(r.survival_score || 0) },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* Row 1: KPI Cards */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-3 bg-neutral-900 dark:bg-black rounded-card p-5">
            <div className="flex items-center gap-2 mb-2 text-neutral-400">
              <ShieldAlert size={18} />
              <p className="label-caps">SCORED</p>
            </div>
            <p className="text-4xl font-bold tabular-nums text-white">{stats.total}</p>
          </div>
          <div className="col-span-12 md:col-span-3 bg-[#1A5C38] rounded-card p-5">
            <div className="flex items-center gap-2 mb-2 text-white/70">
              <CheckCircle2 size={18} />
              <p className="label-caps">HEALTHY</p>
            </div>
            <p className="text-4xl font-bold tabular-nums text-white">{stats.healthy}</p>
          </div>
          <div className="col-span-12 md:col-span-3 bg-brand-yellow rounded-card p-5">
            <div className="flex items-center gap-2 mb-2 text-neutral-900/70">
              <Eye size={18} />
              <p className="label-caps">WATCH</p>
            </div>
            <p className="text-4xl font-bold tabular-nums text-neutral-900">{stats.watch}</p>
          </div>
          <div className="col-span-12 md:col-span-3 bg-surface dark:bg-surface-card border border-neutral-200 dark:border-neutral-800 rounded-card p-5">
            <div className="flex items-center gap-2 mb-2 text-neutral-500">
              <AlertTriangle size={18} />
              <p className="label-caps">DISTRESS</p>
            </div>
            <p className="text-4xl font-bold tabular-nums text-brand-red">{stats.distress}</p>
          </div>
        </div>

        {/* Row 2: Charts */}
        <div className="grid grid-cols-12 gap-4">
          {/* Distribution */}
          <div className="col-span-12 lg:col-span-8 bg-surface dark:bg-surface-card border border-neutral-200 dark:border-neutral-800 rounded-card p-6">
            <SectionHeader title="Score Distribution" />
            <div className="h-[280px]">
              {!distribution.length ? (
                <EmptyState icon={BarChart3} title="No distribution data" subtitle="Run the pipeline to populate" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: ct.tick }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: ct.tick }} />
                    <Tooltip cursor={{ fill: ct.grid, opacity: 0.2 }} contentStyle={ct.tooltip.contentStyle} itemStyle={ct.tooltip.itemStyle} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {distribution.map((entry, index) => {
                        const min = entry.min;
                        const fill = min >= 70 ? ct.healthy : min >= 40 ? ct.watch : ct.distress;
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Donut */}
          <div className="col-span-12 lg:col-span-4 bg-surface dark:bg-surface-card border border-neutral-200 dark:border-neutral-800 rounded-card p-6 flex flex-col">
            <SectionHeader title="Survival vs Distress" />
            <div className="flex-1 relative flex items-center justify-center min-h-[220px]">
              {!allCompanies?.length ? (
                <EmptyState title="No metrics" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none" />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center -translate-y-4 pointer-events-none">
                    <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{survivalRate}%</span>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">Survival</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Rankings Table */}
        <div className="bg-surface dark:bg-surface-card border border-neutral-200 dark:border-neutral-800 rounded-card p-6">
          <SectionHeader 
            title="Company Risk Rankings" 
            action={
              <div className="flex gap-2">
                {['Worst First', 'Best First', 'High Distress'].map(sort => (
                  <button 
                    key={sort}
                    onClick={() => setSortParam(sort)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                      sortParam === sort 
                        ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm' 
                        : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {sort}
                  </button>
                ))}
            </div>
            }
          />
          <DataTable 
            columns={columns} 
            rows={sortedRows} 
            loading={isLoadingCompanies} 
            emptyState={<EmptyState title="No ranked data" />}
          />
        </div>

      </div>
    </AppLayout>
  );
}
