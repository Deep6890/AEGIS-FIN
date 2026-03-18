import { useState } from 'react';
import { Building2, Layers, AlertTriangle, ChevronDown, X, ArrowUpRight } from 'lucide-react';

function StatCard({ icon: Icon, label, value, delta, sub, variant }) {
  const isUp   = delta?.startsWith('+') && delta !== '+0';
  const isDown = delta?.startsWith('-');

  const variants = {
    primary: {
      wrap:   'bg-[#0f2318] text-white',
      label:  'text-[#52a374]',
      value:  'text-white',
      sub:    'text-[#52a374]',
      icon:   'bg-[#1a3c2e] text-[#6dbf8f]',
      delta:  'bg-[#1a3c2e] text-[#8dd4aa]',
      arrow:  'text-[#52a374]',
      divider:'border-[#1e4030]',
    },
    default: {
      wrap:   'bg-white border border-[#e6ece6]',
      label:  'text-[#7a9a7a]',
      value:  'text-[#0f1f0f]',
      sub:    'text-[#a0b8a0]',
      icon:   'bg-[#f2f6f2] text-[#2d6a4f]',
      delta:  isUp ? 'bg-[#eaf5ee] text-[#1a5c38]' : isDown ? 'bg-[#fef2f2] text-[#b91c1c]' : 'bg-[#f2f6f2] text-[#7a9a7a]',
      arrow:  'text-[#b0c8b0]',
      divider:'border-[#f0f4f0]',
    },
    danger: {
      wrap:   'bg-white border border-[#fde8e8]',
      label:  'text-[#7a9a7a]',
      value:  'text-[#0f1f0f]',
      sub:    'text-[#a0b8a0]',
      icon:   'bg-[#fef2f2] text-[#b91c1c]',
      delta:  'bg-[#fef2f2] text-[#b91c1c]',
      arrow:  'text-[#b0c8b0]',
      divider:'border-[#fde8e8]',
    },
  };

  const v = variants[variant] ?? variants.default;

  return (
    <div className={`flex-1 rounded-2xl p-4 flex flex-col gap-3 ${v.wrap}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${v.label}`}>{label}</span>
        <div className="flex items-center gap-1.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${v.icon}`}>
            <Icon size={13} />
          </div>
          <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${variant === 'primary' ? 'border-[#2a5c44]' : 'border-[#e6ece6]'}`}>
            <ArrowUpRight size={11} className={v.arrow} />
          </div>
        </div>
      </div>

      <span className={`text-[40px] font-black leading-none tracking-[-0.03em] ${v.value}`}>{value}</span>

      <div className={`flex items-center gap-2 pt-2.5 border-t ${v.divider}`}>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${v.delta}`}>
          {isUp ? '↑' : isDown ? '↓' : '→'} {delta}
        </span>
        <span className={`text-[11px] ${v.sub}`}>{sub}</span>
      </div>
    </div>
  );
}

function SectorFilter({ sectors, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const toggle   = s => onChange(selected.includes(s) ? selected.filter(x => x !== s) : [...selected, s]);
  const clearAll = () => onChange([]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#e6ece6] bg-white text-[11px] font-semibold text-[#4a6a4a] hover:border-[#2d6a4f] hover:text-[#0f2318] transition-all"
      >
        <Layers size={12} />
        {selected.length === 0 ? 'All Sectors' : `${selected.length} selected`}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-white border border-[#e6ece6] rounded-2xl shadow-xl p-3 w-60">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-bold text-[#7a9a7a] uppercase tracking-wider">Filter by Sector</span>
            {selected.length > 0 && (
              <button onClick={clearAll} className="text-[10px] text-[#2d6a4f] hover:text-[#0f2318] font-bold flex items-center gap-1">
                <X size={9} /> Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sectors.map(s => (
              <button
                key={s}
                onClick={() => toggle(s)}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold border transition-all
                  ${selected.includes(s)
                    ? 'bg-[#0f2318] text-white border-[#0f2318]'
                    : 'bg-[#f7f9f7] text-[#4a6a4a] border-[#e6ece6] hover:border-[#2d6a4f]'}`}
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
    <div className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[20px] font-black text-[#0f1f0f] tracking-[-0.02em]">Dashboard</h1>
          <p className="text-[12px] text-[#7a9a7a] mt-0.5 font-medium">Monitor, assess, and act on bank risk signals.</p>
        </div>
        <SectorFilter sectors={sectors} selected={selectedSectors} onChange={onSectorChange} />
      </div>

      <div className="flex gap-3">
        <StatCard icon={Building2} label="Total Companies"  value={stats.totalCompanies.value} delta={stats.totalCompanies.delta} sub={stats.totalCompanies.sub} variant="primary" />
        <StatCard icon={Layers}    label="Active Sectors"   value={stats.totalSectors.value}   delta={stats.totalSectors.delta}   sub={stats.totalSectors.sub}   variant="default" />
        <StatCard icon={AlertTriangle} label="High Risk Alerts" value={stats.highRiskAlerts.value} delta={stats.highRiskAlerts.delta} sub={stats.highRiskAlerts.sub} variant="danger" />
      </div>
    </div>
  );
}
