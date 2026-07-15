import React from 'react';

const FUNNEL_COLORS = [
  'bg-blue-200 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100',
  'bg-blue-300 dark:bg-blue-800/60 text-blue-900 dark:text-blue-100',
  'bg-blue-400 dark:bg-blue-700/80 text-blue-950 dark:text-white',
  'bg-blue-500 dark:bg-blue-600 text-white',
  'bg-blue-700 dark:bg-blue-500 text-white',
  'bg-blue-900 dark:bg-blue-400 text-white',
];

export function CustomFunnelChart({ funnel }: { funnel: any[] }) {
  const maxCount = funnel.length > 0 ? funnel[0].count : 1;
  
  return (
    <div className="w-full flex flex-col py-2 relative">
      {funnel.map((step, idx) => {
        const widthPct = Math.max((step.count / maxCount) * 100, 2);
        const nextWidthPct = idx < funnel.length - 1 ? Math.max((funnel[idx + 1].count / maxCount) * 100, 2) : widthPct;
        const colorClass = FUNNEL_COLORS[idx % FUNNEL_COLORS.length];

        return (
          <div key={step.stage} className="relative w-full flex items-start group">
            
            {/* Left Label */}
            <div className="w-28 pt-2.5 pr-4 text-right text-sm font-medium text-foreground flex-shrink-0">
              {step.label}
            </div>

            {/* Right side: Bar + Dropoff */}
            <div className="flex-1 relative flex flex-col">
              
              {/* Connecting background polygon */}
              {idx < funnel.length - 1 && (
                <div 
                  className="absolute left-0 w-full bg-blue-100 dark:bg-slate-800/50 transition-all duration-300"
                  style={{
                    top: '2.5rem', // starts exactly below the bar
                    height: '2rem', // exact height of the gap/text area
                    clipPath: `polygon(0 0, ${widthPct}% 0, ${nextWidthPct}% 100%, 0 100%)`
                  }}
                />
              )}

              {/* The Bar */}
              <div 
                className={`h-10 relative flex items-center justify-end px-4 font-bold shadow-sm transition-all duration-300 ${colorClass}`}
                style={{ width: `${widthPct}%` }}
              >
                {step.count}
              </div>

              {/* Drop-off Text */}
              {idx < funnel.length - 1 && (
                <div className="relative z-10 flex items-center h-8 px-2 text-xs">
                  <span className="font-semibold text-foreground mr-2">-{step.dropOffPct?.toFixed(0) || 0}%</span>
                  <span className="text-muted-foreground">{step.topLostReason}</span>
                </div>
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
}
