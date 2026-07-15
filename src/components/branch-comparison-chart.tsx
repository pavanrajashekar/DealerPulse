'use client';

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#6366f1', '#3b82f6', '#f97316', '#10b981', '#eab308', '#ec4899'];

const CustomTooltip = ({ active, payload, label, formatValue }: any) => {
  if (active && payload && payload.length) {
    // Sort tooltip items by value descending
    const sortedPayload = [...payload].sort((a: any, b: any) => b.value - a.value);

    return (
      <div className="bg-background/95 backdrop-blur shadow-xl border border-border rounded-md px-4 py-3 text-xs text-foreground font-medium flex flex-col space-y-1">
        <div className="text-center font-bold mb-1 border-b border-border pb-1">{label}</div>
        {sortedPayload.map((entry: any) => (
          <div key={entry.name} className="flex justify-between items-center text-xs space-x-4">
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-bold">{formatValue(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function BranchComparisonChart({ monthlyTrend }: { monthlyTrend: any[] }) {
  const [metric, setMetric] = useState<'revenue' | 'units' | 'leads' | 'average'>('revenue');

  // Determine fixed branch list for consistent colors
  const branches = useMemo(() => {
    const map = new Map<string, string>();
    monthlyTrend.forEach(m => {
      m.branchBreakdown?.forEach((b: any) => map.set(b.branchId, b.name));
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [monthlyTrend]);

  const getColor = (branchId: string) => {
    const idx = branches.findIndex(b => b.id === branchId);
    return COLORS[idx >= 0 ? idx % COLORS.length : 0];
  };

  // Format data for Recharts: { month: "Jun", "Central": 100, "Downtown": 200 }
  const chartData = useMemo(() => {
    return monthlyTrend.map(m => {
      const dataPoint: any = { month: m.name };
      m.branchBreakdown?.forEach((b: any) => {
        if (metric === 'average') {
          dataPoint[b.name] = b.units > 0 ? b.revenue / b.units : 0;
        } else {
          dataPoint[b.name] = b[metric] || 0;
        }
      });
      return dataPoint;
    });
  }, [monthlyTrend, metric]);

  const formatValue = (val: number) => {
    if (metric === 'revenue' || metric === 'average') {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
      if (val >= 1000) return `₹${(val / 1000).toFixed(1)} K`;
      return `₹${val.toFixed(0)}`;
    }
    return val.toLocaleString();
  };

  if (!monthlyTrend || monthlyTrend.length === 0) return null;


  return (
    <div className="w-full relative group border border-border shadow-sm bg-card card-base rounded-md flex flex-col">
      <div className="flex flex-row items-center justify-between pb-2 z-10 relative p-5 pb-0 flex-shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Branch Comparison</h3>
        <div className="flex items-center bg-muted/50 p-1 rounded-full border border-border">
          <button 
            onClick={() => setMetric('revenue')}
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center transition-colors ${metric === 'revenue' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Revenue
          </button>
          <button 
            onClick={() => setMetric('units')}
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center transition-colors ${metric === 'units' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Units
          </button>
          <button 
            onClick={() => setMetric('leads')}
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center transition-colors ${metric === 'leads' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Leads
          </button>
          <button 
            onClick={() => setMetric('average')}
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center transition-colors ${metric === 'average' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Avg Deal
          </button>
        </div>
      </div>
      
      <div className="pt-4 z-10 relative p-5 h-full flex flex-col">
        <div className="w-full">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#888888" strokeOpacity={0.2} />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#888888', fontSize: 12, fontWeight: 500 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={formatValue}
                tick={{ fill: '#888888', fontSize: 12, fontWeight: 500 }}
                dx={-10}
                width={70}
              />
              <Tooltip cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }} content={(props) => <CustomTooltip {...props} formatValue={formatValue} />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingBottom: '20px' }}
              />
              
              {branches.map((b) => (
                <Line
                  key={b.id}
                  type="monotone"
                  dataKey={b.name}
                  stroke={getColor(b.id)}
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 0, fill: getColor(b.id) }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={1500}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
