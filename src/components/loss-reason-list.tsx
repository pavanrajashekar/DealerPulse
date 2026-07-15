import React from 'react';

export interface LossReasonItem {
  reason: string;
  count: number;
}

interface LossReasonListProps {
  data: LossReasonItem[];
}

export function LossReasonList({ data }: LossReasonListProps) {
  // Sort descending by count
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const maxVal = sortedData.length > 0 ? sortedData[0].count : 1;

  if (sortedData.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center min-h-[200px]">
        <p className="text-xs text-muted-foreground">No lost deals in this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 flex-1 overflow-y-auto min-h-[250px] pr-1">
      {sortedData.map((d, idx) => {
        const rank = idx + 1;
        const pct = Math.max(2, (d.count / maxVal) * 100);
        return (
          <div key={d.reason} className="relative rounded-md overflow-hidden group border border-transparent transition-colors hover:bg-muted/30">
            {/* Background progress bar */}
            <div 
              className="absolute top-0 left-0 h-full bg-red-500/10 dark:bg-red-500/15 transition-all duration-500 ease-out rounded-r-md" 
              style={{ width: `${pct}%` }} 
            />
            
            <div className="relative p-2.5 flex items-center justify-between z-10">
              <div className="flex items-center space-x-3">
                {/* Rank Badge - no trophies, just simple circle */}
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm bg-muted text-muted-foreground border border-border">
                  {rank}
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block capitalize">
                    {d.reason.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-foreground">{d.count} {d.count === 1 ? 'Lead' : 'Leads'}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
