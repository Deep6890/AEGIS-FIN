import React from "react";
import { Database } from "lucide-react";

export default function EmptyState({ title = "No data yet", sub = "Run the pipeline to populate this view.", icon: Icon = Database }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-[#E8C547]/10 border-2 border-dashed border-[#E8C547]/30 flex items-center justify-center">
        <Icon size={22} className="text-[#E8C547]" />
      </div>
      <p className="text-sm font-bold text-[#0D0D0D] dark:text-[#E8E6E0]">{title}</p>
      <p className="text-xs text-[#6B7280] max-w-xs leading-relaxed">{sub}</p>
    </div>
  );
}
