import React from 'react';

export function PageSkeleton() {
  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden animate-pulse">
      {/* Header Skeleton */}
      <div className="h-14 border-b border-border px-4 md:px-6 flex items-center justify-between flex-shrink-0 bg-background">
        <div className="w-48 h-5 bg-muted rounded-md" />
        <div className="w-24 h-8 bg-muted rounded-md" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Skeleton */}
        <div className="w-1/3 md:w-1/4 lg:w-1/5 border-r border-border flex flex-col bg-muted/10 hidden md:flex">
          <div className="p-4 border-b border-border">
            <div className="w-full h-9 bg-muted rounded-md" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex flex-col space-y-2">
                <div className="w-3/4 h-4 bg-muted rounded-md" />
                <div className="w-1/2 h-3 bg-muted rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Header Area */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-muted rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="w-1/3 h-6 bg-muted rounded-md" />
              <div className="w-1/4 h-4 bg-muted rounded-md" />
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-28 bg-muted/50 rounded-md border border-border" />
            ))}
          </div>

          {/* Charts Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-[400px] bg-muted/50 rounded-md border border-border" />
            <div className="lg:col-span-1 h-[400px] bg-muted/50 rounded-md border border-border" />
          </div>
        </div>
      </div>
    </div>
  );
}
