import React from "react";
import { Database } from "lucide-react";

export default function EmptyState({ title = "No data yet", sub = "Run the pipeline to populate this view." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
        <Database size={22} className="text-orange-400" />
      </div>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 max-w-xs">{sub}</p>
    </div>
  );
}
