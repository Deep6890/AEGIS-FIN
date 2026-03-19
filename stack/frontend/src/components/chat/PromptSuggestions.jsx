import { TrendingDown, BarChart3, AlertTriangle, Activity, Shield, Layers } from 'lucide-react';

const iconMap = {
  'trending-down': TrendingDown,
  'bar-chart':     BarChart3,
  'alert':         AlertTriangle,
  'activity':      Activity,
  'shield':        Shield,
  'layers':        Layers,
};

export default function PromptSuggestions({ prompts, onSelect }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold text-[#7a9a7a] uppercase tracking-widest px-1">Suggested Queries</span>
      <div className="grid grid-cols-2 gap-2">
        {prompts.map(p => {
          const Icon = iconMap[p.icon] ?? Activity;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.label)}
              className="flex items-start gap-2.5 p-3 bg-white border border-[#e4ebe4] rounded-xl text-left hover:border-[#b5d8c5] hover:bg-[#f7faf7] transition-all group"
            >
              <div className="w-6 h-6 rounded-lg bg-[#f0f5f0] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#eaf5ee] transition-colors">
                <Icon size={11} className="text-[#2d6a4f]" />
              </div>
              <span className="text-[11px] font-semibold text-[#1a2e1a] leading-snug">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
