import React from 'react';
import { METRIC_DEFINITIONS } from '@/lib/metric-definitions';
import InfoTooltip from '@/components/info-tooltip';

export interface ScoreCardProps {
  title?: string;
  type?: 'overall' | 'branch' | 'rep' | 'model';
  targetAchievement?: number; 
  slaCompliancePct?: number; 
  funnel?: { stage: string; count: number }[];
  stagnantRatio?: number;
  winRate?: number | null; 
  className?: string;
}

export function calculateHealthScore(props: Partial<ScoreCardProps>) {
  const {
    type = 'overall',
    targetAchievement = 0,
    slaCompliancePct = 0,
    funnel = [],
    stagnantRatio = 0,
    winRate = 0
  } = props;

  let m1Score = 0;
  if (type === 'overall' || type === 'branch') {
    m1Score = Math.min(targetAchievement || 0, 100) * 0.30;
  } else {
    m1Score = Math.min((winRate || 0) * 3, 100) * 0.30; 
  }

  const m2Score = (slaCompliancePct || 0) * 0.25;

  const deliveredStage = funnel.find(f => f.stage === 'delivered');
  const newStage = funnel.find(f => f.stage === 'new');
  const funnelConv = newStage && newStage.count > 0 ? ((deliveredStage?.count || 0) / newStage.count) * 100 : 0;
  const m3Score = Math.min(funnelConv * 3, 100) * 0.25; 

  const m4Score = (1 - (stagnantRatio || 0)) * 100 * 0.20;

  return Math.round(m1Score + m2Score + m3Score + m4Score);
}

export default function ScoreCard({
  title = "Business Health",
  type = 'overall',
  targetAchievement = 0,
  slaCompliancePct = 0,
  funnel = [],
  stagnantRatio = 0,
  winRate = 0,
  className = ''
}: ScoreCardProps) {
  
  // 1. Metric 1 (Target or Win Rate) - Max 30
  let m1Label = 'Target';
  let m1Score = 0;
  if (type === 'overall' || type === 'branch') {
    m1Score = Math.min(targetAchievement || 0, 100) * 0.30;
  } else {
    m1Label = 'Win Rate';
    m1Score = Math.min((winRate || 0) * 3, 100) * 0.30; 
  }

  // 2. Metric 2 (SLA) - Max 25
  const m2Label = 'SLA';
  const m2Score = (slaCompliancePct || 0) * 0.25;

  // 3. Metric 3 (Funnel Conversion) - Max 25
  const deliveredStage = funnel.find(f => f.stage === 'delivered');
  const newStage = funnel.find(f => f.stage === 'new');
  const funnelConv = newStage && newStage.count > 0 ? ((deliveredStage?.count || 0) / newStage.count) * 100 : 0;
  const m3Label = 'Funnel';
  const m3Score = Math.min(funnelConv * 3, 100) * 0.25; 

  // 4. Metric 4 (Pipeline Health / Stagnant) - Max 20
  const m4Label = 'Pipeline';
  const m4Score = (1 - (stagnantRatio || 0)) * 100 * 0.20;

  const total = calculateHealthScore({ type, targetAchievement, slaCompliancePct, funnel, stagnantRatio, winRate });

  const label = total >= 75 ? 'Healthy' : total >= 50 ? 'Needs Attention' : 'At Risk';
  const color = total >= 75 ? '#22c55e' : total >= 50 ? '#f59e0b' : '#ef4444';
  const textColor = total >= 75 ? 'text-green-500' : total >= 50 ? 'text-amber-500' : 'text-red-500';

  const getBarColor = (val: number, max: number) => {
    const pct = (val / max) * 100;
    if (pct >= 90) return 'bg-green-500';
    if (pct >= 70) return 'bg-primary';
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const radius = 80;
  const circumference = Math.PI * radius;
  const dashOffset = circumference - (total / 100) * circumference;

  return (
    <div className={`bg-card card-base border border-border rounded-md p-5 flex flex-col h-full shadow-sm relative ${className}`}>
      {/* Top Header */}
      <div className="flex items-center space-x-1 mb-2">
        <h2 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">{title}</h2>
        <InfoTooltip 
          metric={
            type === 'branch' ? METRIC_DEFINITIONS.BRANCH_HEALTH :
            type === 'rep' ? METRIC_DEFINITIONS.REP_HEALTH :
            type === 'model' ? METRIC_DEFINITIONS.MODEL_HEALTH :
            METRIC_DEFINITIONS.BUSINESS_HEALTH
          } 
          align="left" 
        />
      </div>

      {/* Gauge Chart */}
      <div className="relative w-full flex flex-col items-center justify-center mt-2 mb-4">
        <div className="relative w-48">
          <svg viewBox="0 0 200 100" className="w-full h-auto">
            <path 
              d="M 20 90 A 80 80 0 0 1 180 90" 
              fill="none" 
              stroke="currentColor" 
              className="text-slate-200 dark:text-slate-800" 
              strokeWidth="20" 
              strokeLinecap="round" 
            />
            <path 
              d="M 20 90 A 80 80 0 0 1 180 90" 
              fill="none" 
              stroke={color} 
              strokeWidth="20" 
              strokeLinecap="round" 
              strokeDasharray={circumference} 
              strokeDashoffset={dashOffset} 
              style={{ transition: 'stroke-dashoffset 1s ease-out' }} 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1.5">
            <span className="text-4xl font-extrabold text-foreground tracking-tighter leading-none">{total}%</span>
          </div>
        </div>
        <span className={`text-[11px] font-bold uppercase tracking-widest mt-2 ${textColor}`}>{label}</span>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 gap-y-4 gap-x-2 mt-auto">
        {[
          { label: m1Label, val: m1Score, max: 30, note: `Based on achieving the ${m1Label.toLowerCase()} goal.` },
          { label: m2Label, val: m2Score, max: 25, note: 'Based on responding to leads within 48hrs.' },
          { label: m3Label, val: m3Score, max: 25, note: 'Based on conversion rates from new lead to delivered.' },
          { label: m4Label, val: m4Score, max: 20, note: 'Based on the ratio of active vs stagnant pipeline.' },
        ].map(item => (
          <div key={item.label} className="relative flex items-center space-x-2.5 group cursor-help w-max focus:outline-none" tabIndex={0}>
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getBarColor(item.val, item.max)}`} />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">{item.label}</span>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block group-focus:block w-48 p-3 bg-slate-900 rounded-md shadow-xl z-50 text-left border border-slate-700 pointer-events-none">
              <span className="block text-xs font-bold text-white mb-2 uppercase tracking-wide border-b border-slate-700 pb-2">{item.label} Score</span>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-300">Achieved</span>
                <span className="text-xs font-bold text-white">{Math.round(item.val)} / {item.max}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {item.note}
              </p>
              {/* Pointer */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-700">
                 <div className="absolute -top-[6px] -left-[4px] border-[4px] border-transparent border-t-slate-900" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
