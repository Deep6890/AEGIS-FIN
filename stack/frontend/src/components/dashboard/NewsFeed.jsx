import { ArrowUpRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const sentimentCfg = {
  positive: {
    label: 'Positive',
    icon: TrendingUp,
    pill: 'bg-[#eaf5ee] text-[#1a3c2e] border-[#c8e6d0]',
  },
  negative: {
    label: 'Negative',
    icon: TrendingDown,
    pill: 'bg-[#fdf2f2] text-[#7a2020] border-[#f0d0d0]',
  },
  neutral: {
    label: 'Neutral',
    icon: Minus,
    pill: 'bg-[#f7f7f5] text-[#888880] border-[#e8e8e4]',
  },
};

function NewsItem({ item, rank }) {
  const s     = sentimentCfg[item.sentiment] ?? sentimentCfg.neutral;
  const SIcon = s.icon;

  return (
    <div className="flex gap-4 py-4 border-b border-[#f4f4f2] last:border-0 group cursor-pointer">

      {/* Rank number */}
      <span className="text-[12px] font-bold text-[#d4d4d0] pt-0.5 w-5 shrink-0 select-none tabular-nums">
        {String(rank).padStart(2, '0')}
      </span>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">

        {/* Headline */}
        <p className="text-[13px] font-semibold text-[#1a1a18] leading-[1.5] group-hover:text-[#2d6a4f] transition-colors duration-150">
          {item.headline}
        </p>

        {/* Meta row — pill · time · impact score */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${s.pill}`}>
            <SIcon size={9} strokeWidth={2.5} />
            {s.label}
          </span>

          <span className="text-[#d4d4d0] select-none">·</span>

          <span className="text-[11px] text-[#b0b0a8]">{item.time}</span>

          <span className="text-[#d4d4d0] select-none">·</span>

          <span className="text-[11px] text-[#888880]">
            Impact{' '}
            <span className={`font-bold ${
              item.impact >= 8 ? 'text-[#b03030]' :
              item.impact >= 6 ? 'text-[#a06010]' :
                                 'text-[#2d6a4f]'
            }`}>
              {item.impact}/10
            </span>
          </span>
        </div>

        {/* Company chips */}
        {item.companies?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.companies.map(c => (
              <span
                key={c}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#f4f4f2] text-[#4a6a4a] border border-[#e8e8e4] hover:bg-[#eaf5ee] hover:border-[#c8e6d0] hover:text-[#1a3c2e] transition-all duration-150 cursor-pointer"
              >
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
    <div className="flex-1 bg-white rounded-2xl border border-[#e6ece6] flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2.5">
        <div>
          <p className="text-[12px] font-bold text-[#0f1f0f] tracking-tight">Market News</p>
          <p className="text-[11px] text-[#a0b8a0] mt-0.5 font-medium">Most impactful today</p>
        </div>
        <button className="flex items-center gap-1 text-[11px] font-semibold text-[#2d6a4f] hover:text-[#1a3c2e] transition-colors duration-150">
          View all <ArrowUpRight size={11} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Sentiment summary chips ── */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#eaf5ee] text-[#1a3c2e] border border-[#c8e6d0]">
          ↑ {counts.positive} positive
        </span>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#fdf2f2] text-[#7a2020] border border-[#f0d0d0]">
          ↓ {counts.negative} negative
        </span>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#f7f7f5] text-[#888880] border border-[#e8e8e4]">
          — {counts.neutral} neutral
        </span>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-[#f4f4f2]" />

      {/* ── News list ── */}
      <div className="flex-1 overflow-y-auto px-4 max-h-[380px] scrollbar-hide">
        {sorted.map((item, i) => (
          <NewsItem key={item.id} item={item} rank={i + 1} />
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#f4f4f2]">
        <span className="text-[10px] text-[#c0c0bc]">Updated just now</span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f] animate-pulse" />
          <span className="text-[10px] font-semibold text-[#2d6a4f]">Live</span>
        </div>
      </div>
    </div>
  );
}