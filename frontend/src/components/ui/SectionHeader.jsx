import React from 'react';

export default function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4 border-b border-neutral-200 dark:border-neutral-800 pb-3">
      <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">{title}</h2>
      {action && <div>{action}</div>}
    </div>
  );
}
