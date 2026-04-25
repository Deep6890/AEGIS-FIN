import React from "react";
import { Database } from "lucide-react";

export default function EmptyState({ icon: Icon = Database, title = "No data", subtitle = "Run the pipeline to populate this view." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <Icon size={22} className="text-neutral-400 dark:text-neutral-500" />
      </div>
      <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{title}</p>
      <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">{subtitle}</p>
    </div>
  );
}
