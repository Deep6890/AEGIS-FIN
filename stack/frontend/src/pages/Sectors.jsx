import React, { useState, useMemo } from 'react';
import { Layers, Building2, Activity, Star } from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';
import DataTable from '../components/ui/DataTable';
import KPICard from '../components/ui/KPICard';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';
import { useAppData } from '../context/AppDataContext';
import { Link } from 'react-router-dom';

export default function Sectors() {
  const { allSectors, allCompanies, isLoadingSectors } = useAppData();
  const [selectedSectorId, setSelectedSectorId] = useState(null);

  // Compute sector stats (healthy %, total companies etc.)
  const sectorData = useMemo(() => {
    if (!allSectors || !allCompanies) return [];
    
    return allSectors.map(sec => {
      const comps = allCompanies.filter(c => c.sector_id === sec.id);
      let healthyCount = 0;
      let totalScore = 0;
      let topComp = null;
      
      comps.forEach(c => {
        if (c.survival_score >= 70) healthyCount++;
        totalScore += (c.survival_score || 0);
        if (!topComp || (c.survival_score || 0) > (topComp.survival_score || 0)) {
          topComp = c;
        }
      });

      const total = comps.length;
      const avgScore = total > 0 ? totalScore / total : 0;
      const healthyPct = total > 0 ? (healthyCount / total) * 100 : 0;

      return {
        ...sec,
        totalCompanies: total,
        healthyCount,
        healthyPct,
        avgScore,
        topComp,
        companies: comps
      };
    }).sort((a,b) => b.totalCompanies - a.totalCompanies);
  }, [allSectors, allCompanies]);

  const selectedSector = sectorData.find(s => s.id === selectedSectorId);

  const columns = [
    { header: 'Company', accessor: 'name', render: (r) => (
      <Link to={`/companies/${r.id}`} className="font-medium hover:text-brand-accent transition-colors">
        {r.name}
      </Link>
    )},
    { header: 'Ticker', accessor: 'ticker', render: (r) => <span className="text-xs font-mono text-neutral-500">{r.ticker}</span> },
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
    }
  ];

  return (
    <AppLayout>
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
        
        {/* Left Panel */}
        <div className="col-span-12 lg:col-span-4 flex flex-col pt-2">
          <p className="label-caps mb-4 mt-1">ALL SECTORS ({sectorData.length})</p>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 pb-10">
            {isLoadingSectors ? (
              <EmptyState title="Loading sectors..." />
            ) : sectorData.length === 0 ? (
              <EmptyState icon={Layers} title="No sectors" />
            ) : (
              sectorData.map(sec => {
                const isSelected = selectedSectorId === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setSelectedSectorId(sec.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all border ${
                      isSelected 
                        ? 'border-l-4 border-l-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10 border-transparent dark:border-transparent' 
                        : 'border-transparent hover:bg-white dark:hover:bg-surface-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium text-sm ${isSelected ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-700 dark:text-neutral-300'}`}>
                        {sec.name}
                      </span>
                      <span className="text-xs font-mono text-neutral-400 tabular-nums">{sec.totalCompanies}</span>
                    </div>
                    {/* Health Bar */}
                    <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 w-full overflow-hidden">
                      <div className="h-full rounded-full bg-brand-green transition-all" style={{ width: `${sec.healthyPct}%` }} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="col-span-12 lg:col-span-8 flex flex-col h-full right-panel-scroll">
          {!selectedSector ? (
            <div className="flex-1 flex items-center justify-center">
               <EmptyState icon={Layers} title="Select a sector" subtitle="Click any sector on the left to view detailed metrics and components." />
            </div>
          ) : (
            <div className="space-y-6 pb-12 animate-fade-in">
              <div className="bg-surface dark:bg-surface-card border border-neutral-200 dark:border-neutral-800 rounded-card p-6 border-t-4 border-t-neutral-900 dark:border-t-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Layers size={120} />
                </div>
                <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6 relative z-10">{selectedSector.name}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                  <KPICard label="TOTAL COMPANIES" value={selectedSector.totalCompanies} icon={Building2} />
                  <KPICard label="AVG SURVIVAL SCORE" value={selectedSector.avgScore.toFixed(1)} icon={Activity} variant={selectedSector.avgScore >= 70 ? 'healthy' : selectedSector.avgScore >= 40 ? 'watch' : 'distress'} />
                  <KPICard label="TOP COMPANY" value={selectedSector.topComp?.ticker || '—'} icon={Star} subtitle={selectedSector.topComp?.name} />
                </div>
              </div>

              <div className="bg-surface dark:bg-surface-card border border-neutral-200 dark:border-neutral-800 rounded-card p-1">
                <DataTable 
                  columns={columns} 
                  rows={selectedSector.companies.sort((a,b) => (b.survival_score||0)-(a.survival_score||0))}
                  emptyState={<EmptyState title="No companies in this sector" />}
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
