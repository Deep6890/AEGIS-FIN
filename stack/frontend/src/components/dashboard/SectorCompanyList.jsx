import { useState } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

function RiskBadge({ score }) {
  if (score >= 70) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#eaf5ee] text-[#1a3c2e] border border-[#c8e6d0]">Low</span>;
  if (score >= 45) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#fdf8ee] text-[#a06010] border border-[#f0ddb0]">Med</span>;
  return               <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#fdf2f2] text-[#7a2020] border border-[#f0d0d0]">High</span>;
}

const BAR_COLORS = {
  low:    '#2d6a4f',
  medium: '#c89020',
  high:   '#c03030',
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a2e1a] text-white px-3 py-2 rounded-xl text-[11px] shadow-xl">
      <p className="font-bold text-[#a8d8b8] mb-0.5">{label}</p>
      <p>{payload[0].value} high-risk co.</p>
    </div>
  );
};

function RiskDistributionChart({ data }) {
  const chartData = data.map(g => ({
    sector: g.sector.length > 8 ? g.sector.slice(0, 7) + '…' : g.sector,
    full:   g.sector,
    high:   g.companies.filter(c => c.score < 45).length,
    total:  g.companies.length,
  }));

  const maxHigh = Math.max(...chartData.map(d => d.high), 1);

  return (
    <div className="px-5 pt-4 pb-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-bold text-[#1a1a18]">High-risk distribution</p>
        <span className="text-[10px] text-[#b0b0a8]">by sector</span>
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={chartData} barCategoryGap="28%" margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <XAxis
            dataKey="sector"
            tick={{ fontSize: 10, fill: '#a8a8a2', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: '#c8c8c4' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f4f4f2', radius: 6 }} />
          <Bar dataKey="high" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={
                  d.high === 0         ? '#e8e8e4' :
                  d.high === maxHigh   ? '#1a3c2e' :
                  d.high >= maxHigh * 0.6 ? '#2d6a4f' :
                                          '#7ab89a'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Mini legend strip */}
      <div className="flex items-center gap-4 mt-1 px-1">
        {[
          { color: '#1a3c2e', label: 'Most at risk' },
          { color: '#7ab89a', label: 'Moderate'     },
          { color: '#e8e8e4', label: 'None'          },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[10px] text-[#b0b0a8]">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function CompanyRow({ company }) {
  const isUp   = company.change > 0;
  const isFlat = company.change === 0;
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[#f7f7f5] transition-colors duration-150 group cursor-pointer">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-[#f4f4f2] flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-[#4a6a4a]">{company.name[0]}</span>
        </div>
        <span className="text-[12px] font-semibold text-[#1a2e1a] truncate group-hover:text-[#2d6a4f] transition-colors">
          {company.name}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[13px] font-bold text-[#1a1a18] w-7 text-right tabular-nums">
          {company.score}
        </span>
        <RiskBadge score={company.score} />
        <div className={`flex items-center gap-0.5 text-[11px] font-bold w-12 justify-end tabular-nums
          ${isUp ? 'text-[#2d6a4f]' : isFlat ? 'text-[#c0c0bc]' : 'text-[#b03030]'}`}>
          {isUp ? <TrendingUp size={11} /> : isFlat ? <Minus size={11} /> : <TrendingDown size={11} />}
          {company.change > 0 ? '+' : ''}{company.change}
        </div>
      </div>
    </div>
  );
}

function SectorGroup({ group }) {
  const [open, setOpen] = useState(true);
  const highCount = group.companies.filter(c => c.score < 45).length;

  return (
    <div className="border border-[#ebebeb] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#fafafa] hover:bg-[#f4f4f2] transition-colors duration-150"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-bold text-[#1a1a18]">{group.sector}</span>
          <span className="text-[10px] text-[#b0b0a8] font-medium">{group.companies.length} co.</span>
          {highCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fdf2f2] text-[#7a2020] border border-[#f0d0d0]">
              {highCount} high
            </span>
          )}
        </div>
        <ChevronDown
          size={13}
          className={`text-[#c8c8c4] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-2 py-1">
          {group.companies.map(c => <CompanyRow key={c.name} company={c} />)}
        </div>
      )}
    </div>
  );
}

export default function SectorCompanyList({ data, selectedSectors }) {
  const filtered = selectedSectors?.length > 0
    ? data.filter(g => selectedSectors.includes(g.sector))
    : data;

  return (
    <div className="flex-1 bg-white rounded-2xl border border-[#e6ece6] flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div>
          <p className="text-[12px] font-bold text-[#0f1f0f] tracking-tight">Sector Breakdown</p>
          <p className="text-[11px] text-[#a0b8a0] mt-0.5 font-medium">Company risk by sector</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#b0b0a8] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f] inline-block" />Low ≥70
          <span className="w-1.5 h-1.5 rounded-full bg-[#c89020] inline-block ml-1" />Med
          <span className="w-1.5 h-1.5 rounded-full bg-[#c03030] inline-block ml-1" />High
        </div>
      </div>

      {/* ── Bar chart ── */}
      <div className="border-t border-[#f4f4f2]">
        <RiskDistributionChart data={filtered} />
      </div>

      <div className="border-t border-[#f4f4f2] mx-5" />

      {/* ── Sector groups ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 flex flex-col gap-2 max-h-[320px]">
        {filtered.length === 0
          ? <p className="text-[13px] text-[#b0b0a8] text-center py-8">No sectors match the current filter.</p>
          : filtered.map(g => <SectorGroup key={g.sector} group={g} />)
        }
      </div>
    </div>
  );
}