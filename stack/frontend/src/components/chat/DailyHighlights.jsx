import { Zap } from 'lucide-react';

export default function DailyHighlights({ highlights }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <Zap size={12} className="text-[#2d6a4f]" />
        <span className="text-[10px] font-bold text-[#7a9a7a] uppercase tracking-widest">Today's Highlights</span>
      </div>
      {highlights.map(h => (
        <div key={h.id} className="bg-white border border-[#e4ebe4] rounded-xl p-3 flex flex-col gap-1.5 hover:border-[#b5d8c5] transition-colors cursor-default">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${h.tagCls}`}>{h.tag}</span>
            <span className="text-[9px] text-[#9ab09a]">{h.time}</span>
          </div>
          <p className="text-[11px] font-bold text-[#1a2e1a] leading-snug">{h.title}</p>
          <p className="text-[10px] text-[#7a9a7a] leading-relaxed">{h.body}</p>
        </div>
      ))}
    </div>
  );
}
