import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowUpRight } from 'lucide-react';

const sentimentCfg = {
  positive: { label: 'Positive', icon: TrendingUp,  pill: 'bg-[#edf7f2] text-[#2d6a4f]' },
  negative: { label: 'Negative', icon: TrendingDown, pill: 'bg-rose-50 text-rose-500'    },
  neutral:  { label: 'Neutral',  icon: Minus,        pill: 'bg-[#f5f5f3] text-[#888880]' },
};

function getBarColor(avgScore) {
  if (avgScore < 45) return '#dc2626';
  if (avgScore < 70) return '#f59e0b';
  return '#2d6a4f';
}

const RiskBarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1f0f] text-white px-3 py-2 rounded-xl text-[11px] shadow-xl border border-white/10">
      <p className="font-semibold">{payload[0].payload.sector}</p>
      <p className="text-white/60 mt-0.5">Avg Score: <span className="text-white font-bold">{payload[0].value}</span></p>
    </div>
  );
};

function NewsItem({ item, rank }) {
  const s = sentimentCfg[item.sentiment] ?? sentimentCfg.neutral;
  const SIcon = s.icon;
  return (
    <div className="flex gap-3 py-3 border-b border-[#f3f7f4] last:border-0 group cursor-pointer">
      <span className="text-[11px] text-[#c8d4c8] pt-0.5 w-5 shrink-0 tabular-nums select-none">
        {String(rank).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <p className="text-[12px] font-medium text-[#1a2e1a] leading-[1.5] group-hover:text-[#2d6a4f] transition-colors">
          {item.headline}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${s.pill}`}>
            <SIcon size={9} strokeWidth={2} /> {s.label}
          </span>
          <span className="text-[10px] text-[#c0c8c0]">{item.time}</span>
          <span className="text-[10px] text-[#a0b8a0]">
            Impact <span className={`font-semibold ${item.impact >= 8 ? 'text-rose-500' : item.impact >= 6 ? 'text-amber-500' : 'text-[#2d6a4f]'}`}>{item.impact}/10</span>
          </span>
        </div>
        {item.companies?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.companies.map(c => (
              <span key={c} className="text-[10px] px-2 py-0.5 rounded-lg bg-[#f3f7f4] text-[#4a6a4a] hover:bg-[#e8f2ec] transition-colors cursor-pointer">{c}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewsAndRiskRow({ newsFeed = [], sectorCompanyList = [] }) {
  const sorted = [...newsFeed].sort((a, b) => b.impact - a.impact);
  const counts = {
    positive: sorted.filter(n => n.sentiment === 'positive').length,
    negative: sorted.filter(n => n.sentiment === 'negative').length,
    neutral:  sorted.filter(n => n.sentiment === 'neutral').length,
  };

  const barData = sectorCompanyList.map(g => ({
    sector: g.sector.slice(0, 6),
    avgScore: Math.round(g.companies.reduce((a, c) => a + c.score, 0) / g.companies.length),
  }));

  return (
    <div className="flex flex-col lg:flex-row gap-5">

      {/* LEFT: News Feed */}
      <div className="w-full lg:w-[55%] bg-white rounded-3xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-[13px] font-medium text-[#0f1f0f]">Market News</p>
            <p className="text-[12px] text-[#a0b8a0] mt-0.5">Most impactful today</p>
          </div>
          <button className="flex items-center gap-1 text-[11px] text-[#2d6a4f] hover:opacity-70 transition-opacity">
            View all <ArrowUpRight size={11} />
          </button>
        </div>
        <div className="flex items-center gap-2 px-5 pb-3">
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#edf7f2] text-[#2d6a4f]">↑ {counts.positive} positive</span>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-50 text-rose-500">↓ {counts.negative} negative</span>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#f5f5f3] text-[#888880]">— {counts.neutral} neutral</span>
        </div>
        <div className="border-t border-[#f3f7f4]" />
        <div className="flex-1 overflow-y-auto px-5 max-h-[360px]">
          {sorted.map((item, i) => <NewsItem key={item.id} item={item} rank={i + 1} />)}
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#f3f7f4]">
          <span className="text-[10px] text-[#c0c8c0]">Updated just now</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f] animate-pulse" />
            <span className="text-[10px] text-[#2d6a4f]">Live</span>
          </div>
        </div>
      </div>

      {/* RIGHT: Sector Risk Bar Chart */}
      <div className="w-full lg:w-[45%] bg-white rounded-3xl shadow-sm p-6 flex flex-col border border-emerald-100">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-[#0f1f0f] tracking-tight flex items-center gap-2">
              <AlertTriangle size={16} className="text-emerald-500" /> Sector Risk Summary
            </h3>
            <p className="text-[12px] text-emerald-400 mt-1">Average risk score by sector</p>
          </div>
          <div className="px-2.5 py-1 bg-emerald-50 rounded-full text-[10px] uppercase font-semibold text-emerald-600 border border-emerald-200">Live</div>
        </div>
        <div className="flex-1 w-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }} barCategoryGap="28%">
              <XAxis dataKey="sector" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4a6a4a', fontWeight: 600 }} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip cursor={{ fill: 'rgba(16,185,129,0.06)' }} content={<RiskBarTooltip />} />
              <Bar dataKey="avgScore" radius={[6, 6, 0, 0]} barSize={28} background={{ fill: '#f0faf5', radius: [6, 6, 0, 0] }}>
                {barData.map((d, i) => <Cell key={i} fill={getBarColor(d.avgScore)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
