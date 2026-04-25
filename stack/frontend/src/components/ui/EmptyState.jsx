import React from "react";
import { Database } from "lucide-react";

export default function EmptyState({ title = "No data yet", sub = "Run the pipeline to populate this view." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#FFC224]/10 border-2 border-dashed border-[#FFC224]/30 flex items-center justify-center">
        <Database size={22} className="text-[#FFC224]" />
      </div>
      <p className="text-sm font-black text-gray-700 dark:text-gray-300">{title}</p>
      <p className="text-xs text-gray-400 max-w-xs">{sub}</p>
    </div>
  );
}
