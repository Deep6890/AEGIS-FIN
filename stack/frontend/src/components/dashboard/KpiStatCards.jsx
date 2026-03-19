import { useState } from 'react';
import { Building2, Layers, AlertTriangle, ChevronDown, X, ArrowUpRight } from 'lucide-react';

function StatCard({ icon: Icon, label, value, delta, sub, highlight, description }) {
  const isUp = delta?.startsWith('+') && delta !== '+0';

  return (
    <div className={[
      'group flex-1 rounded-3xl p-5 flex flex-col gap-4 transition-all duration-300',
      highlight ? 'bg-[#2d6a4f] text-white shadow-sm' : 'bg-white shadow-sm'
    ].join(' ')}>

      <div className="flex items-center justify-between">
        <span className={`text-[12px] font-medium ${highlight ? 'text-white/70' : 'text-[#8fa88f]'}`}>
          {label}
        </span>
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110
          ${highlight ? 'bg-white/20' : 'bg-[#f3f7f4] text-[#2d6a4f]'}`}>
          <Icon size={16} className={highlight ? 'text-white' : ''} />
        </div>
      </div>

      <span className={`text-[36px] font-bold tracking-tight leading-none
        ${highlight ? 'text-white' : 'text-[#0f1f0f]'}`}>
        {value}
      </span>

      <div className="flex items-end justify-between mt-auto">
        <div className="flex flex-col gap-1.5 flex-1 pr-4">
          <div className="flex items-center gap-2">
            <span className={`text-[12px] font-semibold
              ${highlight ? 'text-white/90' : isUp ? 'text-[#2d6a4f]' : 'text-[#dc2626]'}`}>
              {delta}
            </span>
            <span className={`text-[12px] ${highlight ? 'text-white/60' : 'text-[#a0b8a0]'}`}>
              {sub}
            </span>
          </div>
          {description && (
            <p className={`text-[11px] font-medium leading-relaxed
              ${highlight ? 'text-white/80' : 'text-[#8fa88f]'}`}>
              {description}
            </p>
          )}
        </div>

        <button className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md
          ${highlight ? 'bg-white text-[#2d6a4f]' : 'bg-white border text-[#2d6a4f] hover:border-[#d0e0d6]'}`}>
          <ArrowUpRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function SectorFilter({ sectors, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const toggle = s => onChange(selected.includes(s) ? selected.filter(x => x !== s) : [...selected, s]);
  const clearAll = () => onChange([]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white shadow-sm text-[12px] font-medium text-[#4a6a4a] transition-all"
      >
        <Layers size={13} />
        {selected.length === 0 ? 'All Sectors' : `${selected.length} Selected`}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-3xl shadow-sm p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium text-[#8fa88f]">Filter by sector</span>
            {selected.length > 0 && (
              <button onClick={clearAll} className="text-[11px] text-[#2d6a4f] font-medium flex items-center gap-1 hover:opacity-70">
                <X size={10} /> Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sectors.map(s => (
              <button
                key={s}
                onClick={() => toggle(s)}
                className={`px-3 py-1 rounded-xl text-[11px] font-medium transition-all
                  ${selected.includes(s)
                    ? 'bg-[#2d6a4f] text-white shadow-sm'
                    : 'bg-[#f3f7f4] text-[#4a6a4a] hover:bg-[#e8f2ec]'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KpiStatCards({ stats, sectors, selectedSectors, onSectorChange }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#0f1f0f] tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-[#8fa88f] mt-0.5">Monitor and manage your financial insights</p>
        </div>
        <SectorFilter sectors={sectors} selected={selectedSectors} onChange={onSectorChange} />
      </div>

      <div className="flex gap-4">
        <StatCard
          icon={Building2}
          label="Total Companies"
          value={stats.totalCompanies.value}
          delta={stats.totalCompanies.delta}
          sub={stats.totalCompanies.sub}
          description="Tracking market trends and overall company performance indicators."
          highlight
        />
        <StatCard
          icon={Layers}
          label="Active Sectors"
          value={stats.totalSectors.value}
          delta={stats.totalSectors.delta}
          sub={stats.totalSectors.sub}
          description="Monitoring various market segments and their relative strength."
        />
        <StatCard
          icon={AlertTriangle}
          label="High Risk Alerts"
          value={stats.highRiskAlerts.value}
          delta={stats.highRiskAlerts.delta}
          sub={stats.highRiskAlerts.sub}
          description="Identifying potential vulnerabilities and emerging market threats."
        />
      </div>
    </div>
  );
}
