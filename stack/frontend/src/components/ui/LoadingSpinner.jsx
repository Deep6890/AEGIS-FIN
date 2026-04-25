import React from "react";

export function SkeletonCard({ className = "" }) {
  return <div className={`bg-neutral-100 dark:bg-neutral-800 rounded-card animate-pulse ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-12 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} className="col-span-3 h-28" />)}
      </div>
      <div className="grid grid-cols-12 gap-4">
        <SkeletonCard className="col-span-8 h-64" />
        <SkeletonCard className="col-span-4 h-64" />
      </div>
      <SkeletonCard className="col-span-12 h-48" />
    </div>
  );
}

export default function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-neutral-200 dark:border-neutral-700" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-yellow-400 animate-spin" />
      </div>
      <p className="label-caps">{text}</p>
    </div>
  );
}
