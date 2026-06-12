'use client';

import React from 'react';

export function SkeletonShimmer({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden bg-slate-900/40 rounded ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-800/30 to-transparent" />
      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

export function InvoiceCardSkeleton() {
  return (
    <div className="bg-card border border-border/60 rounded-lg p-5 space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <SkeletonShimmer className="h-3.5 w-24" />
          <SkeletonShimmer className="h-4 w-32" />
        </div>
        <SkeletonShimmer className="h-6 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <SkeletonShimmer className="h-3 w-16" />
          <SkeletonShimmer className="h-5 w-24" />
        </div>
        <div className="space-y-1">
          <SkeletonShimmer className="h-3 w-16" />
          <SkeletonShimmer className="h-5 w-16" />
        </div>
      </div>
      <div className="space-y-2 border-t border-border/30 pt-3">
        <div className="flex justify-between">
          <SkeletonShimmer className="h-3.5 w-12" />
          <SkeletonShimmer className="h-3.5 w-32" />
        </div>
        <div className="flex justify-between">
          <SkeletonShimmer className="h-3.5 w-12" />
          <SkeletonShimmer className="h-3.5 w-28" />
        </div>
      </div>
      <SkeletonShimmer className="h-8 w-full" />
    </div>
  );
}

export function PoolStatsPanelSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-6 flex flex-col md:flex-row items-center gap-8">
      {/* Gauge skeleton */}
      <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
        <div className="w-28 h-28 rounded-full border-[8px] border-slate-900" />
        <SkeletonShimmer className="absolute w-12 h-4" />
      </div>
      
      {/* Key stats grid */}
      <div className="grid grid-cols-2 gap-6 w-full">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <SkeletonShimmer className="h-3 w-24" />
            <SkeletonShimmer className="h-6 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InvoiceFeedSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card/25 border border-border/40 p-3.5 rounded flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SkeletonShimmer className="w-5 h-5 rounded" />
            <div className="space-y-1">
              <SkeletonShimmer className="h-3.5 w-36" />
              <SkeletonShimmer className="h-3 w-24" />
            </div>
          </div>
          <div className="text-right space-y-1">
            <SkeletonShimmer className="h-3.5 w-16" />
            <SkeletonShimmer className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}
