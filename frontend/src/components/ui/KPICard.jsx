import React from 'react';

export default function KPICard({ label, value, trend, icon: Icon, variant = 'default', subtitle }) {
  const variantStyles = {
    default: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-500',
    healthy: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-500',
    watch:   'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-500',
    distress: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-500',
  };

  return (
    <div className="bg-surface dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 shadow-card p-5 group transition-all duration-150 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${variantStyles[variant]}`}>
          {Icon && <Icon size={20} />}
        </div>
        {trend !== undefined && (
          <div className={`text-xs font-medium ${trend >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
            {trend >= 0 ? '↑' : '↓'} {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="label-caps text-neutral-500">{label}</p>
        <p className="text-4xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100 mt-1">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
