import React from 'react';
import { Info } from 'lucide-react';
import { MetricDefinition } from '@/lib/metric-definitions';

interface InfoTooltipProps {
  title?: string;
  description?: string;
  metric?: MetricDefinition;
  align?: 'left' | 'center' | 'right';
  className?: string;
  pct?: number | null;
  pctLabel?: string;
}

export default function InfoTooltip({ 
  title, 
  description, 
  metric, 
  align = 'center', 
  className = '', 
  pct = null, 
  pctLabel = 'Achievement' 
}: InfoTooltipProps) {
  let positionClasses = 'left-1/2 -translate-x-1/2';
  let pointerClasses = 'left-1/2 -translate-x-1/2';

  if (align === 'left') {
    positionClasses = 'left-0 -translate-x-3';
    pointerClasses = 'left-4';
  } else if (align === 'right') {
    positionClasses = 'right-0 translate-x-3';
    pointerClasses = 'right-4';
  }

  const displayTitle = metric?.title || title;
  const displayDescription = metric?.description || description;

  return (
    <div 
      className={`group relative inline-flex items-center align-middle ml-1.5 ${className} normal-case tracking-normal font-normal focus:outline-none`}
      tabIndex={0}
    >
      <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground transition-colors cursor-help" />
      
      {/* Invisible hover bridge */}
      <div className="absolute top-full left-0 w-full h-3 hidden group-hover:block group-focus:block" />

      {/* Tooltip Content */}
      <div className={`absolute top-full mt-2.5 hidden group-hover:block group-focus:block w-64 p-0 bg-slate-900 rounded-md shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-[9999] text-left border border-slate-700 overflow-hidden pointer-events-none ${positionClasses}`}>
        
        {/* Header */}
        {displayTitle && (
          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
            <strong className="block font-bold text-sm text-slate-100 tracking-tight">{displayTitle}</strong>
          </div>
        )}
        
        {/* Body */}
        <div className="px-4 py-3 space-y-3 relative z-10">
          {pct !== null && (
            <div className="mb-3 pb-3 border-b border-slate-700/50">
              <span className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-1 block">{pctLabel}</span>
              <p className="text-lg font-semibold text-white">{pct.toFixed(1)}%</p>
            </div>
          )}
          
          {displayDescription && (
            <div>
              {metric && <span className="text-[11px] uppercase font-bold tracking-widest text-blue-400 mb-1 block">What it tells</span>}
              <p className="text-xs text-slate-300 leading-relaxed">{displayDescription}</p>
            </div>
          )}
          
          {metric?.calculation && (
            <div className="pt-2 border-t border-slate-700/50">
              <span className="text-[11px] uppercase font-bold tracking-widest text-emerald-400 mb-1 block">How it&apos;s calculated</span>
              <p className="text-[11px] text-slate-200 font-mono bg-slate-950 p-2 rounded-md border border-slate-800 break-words leading-relaxed">{metric.calculation}</p>
            </div>
          )}
          
          {metric?.importance && (
            <div className="pt-2 border-t border-slate-700/50">
              <span className="text-[11px] uppercase font-bold tracking-widest text-amber-400 mb-1 block">Why it matters</span>
              <p className="text-xs text-slate-300 leading-relaxed">{metric.importance}</p>
            </div>
          )}
        </div>

        {/* Triangle pointer */}
        <div className={`absolute bottom-full border-4 border-transparent border-b-slate-700 z-20 ${pointerClasses}`}>
           <div className="absolute top-[1px] -left-[3px] border-[3px] border-transparent border-b-slate-900" />
        </div>
      </div>
    </div>
  );
}
