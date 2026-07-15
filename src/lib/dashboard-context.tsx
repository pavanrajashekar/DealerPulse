'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type MetricToggle = 'revenue' | 'units' | 'avg' | 'win_rate';

interface DashboardContextType {
  timeFilter: string;
  setTimeFilter: (v: string) => void;
  selectedEntityId: string | null;
  setSelectedEntityId: (v: string | null) => void;
  selectedSegment: { type: 'funnel_stage' | 'loss_reason'; value: string } | null;
  setSelectedSegment: (v: { type: 'funnel_stage' | 'loss_reason'; value: string } | null) => void;
  activeMetricToggle: MetricToggle;
  setActiveMetricToggle: (v: MetricToggle) => void;
  selectedBranches: string[];
  setSelectedBranches: (v: string[]) => void;
  dateRange: { from: string | null, to: string | null };
  setDateRange: (v: { from: string | null, to: string | null }) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [timeFilter, setTimeFilter] = useState('all'); // Default to all Jun-Dec 2025
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<{ type: 'funnel_stage' | 'loss_reason'; value: string } | null>(null);
  const [activeMetricToggle, setActiveMetricToggle] = useState<MetricToggle>('revenue');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: string | null, to: string | null }>({ from: null, to: null });

  // Reset segment and entity on page change, but that will be handled by effects in layout or pages
  
  return (
    <DashboardContext.Provider value={{
      timeFilter, setTimeFilter,
      selectedEntityId, setSelectedEntityId,
      selectedSegment, setSelectedSegment,
      activeMetricToggle, setActiveMetricToggle,
      selectedBranches, setSelectedBranches,
      dateRange, setDateRange
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
}
