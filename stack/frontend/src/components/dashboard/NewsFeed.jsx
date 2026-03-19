import { ArrowUpRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const sentimentCfg = {
  positive: { label: 'Positive', icon: TrendingUp,  pill: 'bg-[#edf7f2] text-[#2d6a4f]' },
  negative: { label: 'Negative', icon: TrendingDown, pill: 'bg-rose-50 text-rose-500'    },
  neutral:  { label: 'Neutral',  icon: Minus,        pill: 'bg-[#f5f5f3] text-[#888880]' },
};

function NewsItem({ item, rank }) {
  const s     = sentimentCfg[item.sentiment] ?? sentimentCfg.neutral;
  const SIcon = s.icon;

  return (
    <div className="flex gap-3 py-3.5 border-b border-[#f3f7f4] last:border-0 group cursor-pointer">
      <span className="text-[11px] text-[#c8d4c8] pt-0.5 w-5 shrink-0 tabular-nums select-none">
        {String(rank).padStart(2, '0')}
      </span>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <p className="text-[12px] font-medium text-[#1a2e1a] leading-[1.55] group-hover:text-[#2d6a4f] transition-colors">
          {item.headline}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${s.pill}`}>
            <SIcon size={9} strokeWidth={2} />
            {s.label}
          </span>
          <span className="text-[10px] text-[#c0c8c0]">{item.time}</span>
          <span className="text-[10px] text-[#a0b8a0]">
            Impact{' '}
            <span className={`font-semibold ${item.impact >= 8 ? 'text-rose-500' : item.impact >= 6 ? 'text-amber-500' : 'text-[#2d6a4f]'}`}>
              {item.impact}/10
            </span>
          </span>
        </div>

        {item.companies?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.companies.map(c => (
              <span key={c} className="text-[10px] px-2 py-0.5 rounded-lg bg-[#f3f7f4] text-[#4a6a4a] hover:bg-[#e8f2ec] transition-colors cursor-pointer">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewsFeed({ news }) {
  const sorted = [...news].sort((a, b) => b.impact - a.impact);
  const counts = {
    positive: sorted.filter(n => n.sentiment === 'positive').length,
    negative: sorted.filter(n => n.sentiment === 'negative').length,
    neutral:  sorted.filter(n => n.sentiment === 'neutral').length,
  };

  return (
    <div className="flex-1 bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div>
          <p className="text-[13px] font-medium text-[#0f1f0f]">Market News</p>
          <p className="text-[12px] text-[#a0b8a0] mt-0.5">Most impactful today</p>
        </div>
        <button className="flex items-center gap-1 text-[11px] text-[#2d6a4f] hover:opacity-70 transition-opacity">
          View all <ArrowUpRight size={11} />
        </button>
      </div>

      {/* Sentiment chips */}
      <div className="flex items-center gap-2 px-5 pb-3">
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#edf7f2] text-[#2d6a4f]">↑ {counts.positive} positive</span>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-50 text-rose-500">↓ {counts.negative} negative</span>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#f5f5f3] text-[#888880]">— {counts.neutral} neutral</span>
      </div>

      <div className="border-t border-[#f3f7f4]" />

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 max-h-[380px]">
        {sorted.map((item, i) => <NewsItem key={item.id} item={item} rank={i + 1} />)}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[#f3f7f4]">
        <span className="text-[10px] text-[#c0c8c0]">Updated just now</span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f] animate-pulse" />
          <span className="text-[10px] text-[#2d6a4f]">Live</span>
        </div>
      </div>
    </div>
  );
}
