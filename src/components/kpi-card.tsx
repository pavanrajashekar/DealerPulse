'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { ProgressBar } from '@/components/progress-bar';
import InfoTooltip from './info-tooltip';
import { MetricDefinition } from '@/lib/metric-definitions';

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  /** 0-100 progress bar value. Pass null to hide bar. */
  pct?: number | null;
  /** Label describing what the progress bar represents */
  pctLabel?: string;
  subtext?: string;
  /** 'red' = red value text; 'green' = green value text; 'red-subtext' = red subtext only */
  highlight?: 'red' | 'green' | 'red-subtext' | 'none';
  /** MoM growth %, positive or negative */
  growth?: number | null;
  /** If provided, wraps the card in a Next Link */
  link?: string | null;
  /** Optional extra content rendered below the progress bar */
  children?: React.ReactNode;
  className?: string;
  /** Detailed information about the metric to display in a tooltip */
  metricInfo?: MetricDefinition;
  /** How to align the tooltip (left, center, right) */
  tooltipAlign?: 'left' | 'center' | 'right';
}

export default function KpiCard({
  label,
  value,
  icon: Icon,
  pct = null,
  pctLabel = 'Achievement',
  subtext,
  highlight = 'none',
  growth = null,
  link = null,
  children,
  className = '',
  metricInfo,
  tooltipAlign = 'center',
}: KpiCardProps) {
  const valueColor =
    highlight === 'red'
      ? 'text-red-500'
      : highlight === 'green'
      ? 'text-green-500'
      : 'text-foreground';

  const subtextColor =
    highlight === 'red-subtext'
      ? 'text-red-500 font-bold'
      : 'text-muted-foreground';

  const barColor =
    pct !== null
      ? pct >= 100
        ? 'bg-green-500'
        : pct >= 75
        ? 'bg-primary'
        : pct >= 50
        ? 'bg-amber-500'
        : 'bg-red-500'
      : '';

  const cardContent = (
    <div
      className={`bg-card card-base border border-border rounded-md p-3 flex flex-col justify-between shadow-sm h-full relative ${
        link ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center min-w-0">
          <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground truncate">
            {label}
          </span>
          {metricInfo && <InfoTooltip metric={metricInfo} align={tooltipAlign} pct={pct} pctLabel={pctLabel} />}
        </div>
        <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0 ml-2" />
      </div>

      {/* Value + Growth */}
      <div className="mt-3 flex items-baseline space-x-2">
        <span className={`text-2xl font-semibold tracking-tight ${valueColor}`}>
          {value}
        </span>
        {growth !== null && (
          <span
            className={`flex items-center text-xs font-bold ${
              growth > 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {growth > 0 ? (
              <TrendingUp className="w-3 h-3 mr-1" />
            ) : growth < 0 ? (
              <TrendingDown className="w-3 h-3 mr-1" />
            ) : null}
            {Math.abs(growth).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Subtext */}
      {subtext && (
        <p className={`text-xs mt-1 ${subtextColor}`}>{subtext}</p>
      )}

      {/* Progress bar */}
      {pct !== null && (
        <div className="mt-3 flex flex-col space-y-1.5">
          <ProgressBar value={pct} colorClass={barColor} />
        </div>
      )}

      {children}
    </div>
  );

  return link ? <Link href={link}>{cardContent}</Link> : cardContent;
}
