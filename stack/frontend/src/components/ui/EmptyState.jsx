import React from "react";
import { Database } from "lucide-react";

export default function EmptyState({ title = "No data yet", sub = "Run the pipeline to populate this view.", icon: Icon = Database }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <Icon size={20} className="text-neutral-400" />
      </div>
      <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{title}</p>
      <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">{sub}</p>
    </div>
  );
}
