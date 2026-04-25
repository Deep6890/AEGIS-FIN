import React from "react";

export default function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-in">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 rounded-full border-2 border-neutral-200 dark:border-neutral-700" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-orange animate-spin" />
      </div>
      <p className="text-xs text-neutral-500">{text}</p>
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
