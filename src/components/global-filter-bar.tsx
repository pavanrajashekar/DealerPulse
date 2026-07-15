'use client';

import React, { useState } from 'react';
import { useDashboardContext } from '@/lib/dashboard-context';
import { dealershipData } from '@/lib/dealership-data';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, Building2 } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function GlobalFilterBar() {
  const { timeFilter, setTimeFilter } = useDashboardContext();
  const { dateRange, setDateRange, selectedBranches, setSelectedBranches } = useDashboardContext();

  const branches = [...new Set(dealershipData.branches.map(b => ({ id: b.id, name: b.name })))];
  const preset = timeFilter;
  const setPreset = setTimeFilter;
  const [selectedYear, setSelectedYear] = useState(2025);

  const toggleBranch = (id: string) => {
    if (selectedBranches.includes(id)) {
      setSelectedBranches(selectedBranches.filter(b => b !== id));
    } else {
      setSelectedBranches([...selectedBranches, id]);
    }
  };

  const getDisplayLabel = () => {
    if (preset === 'all') return 'All Time';
    if (preset === 'ytd') return `YTD ${selectedYear}`;
    if (preset.startsWith('month-')) {
      const m = parseInt(preset.split('-')[1]);
      return `${MONTHS[m]} ${selectedYear}`;
    }
    if (preset.startsWith('q')) {
      return `${preset.toUpperCase()} ${selectedYear}`;
    }
    if (preset === 'custom') {
      if (dateRange.from && dateRange.to) {
        return `${dateRange.from} to ${dateRange.to}`;
      }
      return 'Custom Range';
    }
    return 'Custom Range';
  };

  return (
    <div className="flex items-center gap-4 text-sm flex-shrink-0 z-50">
      {/* Date Range Dropdown */}
      <div 
        className="relative group/date"
        onMouseLeave={() => { if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) document.activeElement.blur(); }}
      >
        <button className="flex items-center space-x-2 bg-card px-3 py-1.5 rounded-full border border-border font-semibold text-xs transition-colors hover:bg-muted w-auto justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className={`w-3.5 h-3.5 ${preset !== 'all' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span>{getDisplayLabel()}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <div className="absolute left-0 top-full mt-1 w-64 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover/date:opacity-100 group-hover/date:visible group-focus-within/date:opacity-100 group-focus-within/date:visible transition-all z-50 overflow-hidden flex flex-col p-2">
          
          {/* Year Selector */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button onClick={() => setSelectedYear(y => y - 1)} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="w-4 h-4"/></button>
            <span className="font-bold text-sm text-foreground">{selectedYear}</span>
            <button onClick={() => setSelectedYear(y => y + 1)} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><ChevronRight className="w-4 h-4"/></button>
          </div>

          {/* Quick Filters */}
          <div className="flex space-x-2 mb-3">
             <button 
               onClick={() => { setPreset('all'); setDateRange({ from: null, to: null }); }}
               className={`flex-1 py-1.5 text-xs font-medium tracking-tight rounded border transition-colors ${preset === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-transparent'}`}
             >All Time</button>
             <button 
               onClick={() => { 
                 setPreset('ytd'); 
                 setDateRange({ from: `${selectedYear}-01-01`, to: `${selectedYear}-12-31` }); 
               }}
               className={`flex-1 py-1.5 text-xs font-medium tracking-tight rounded border transition-colors ${preset === 'ytd' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-transparent'}`}
             >YTD</button>
          </div>

          {/* 3x4 Months Grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {MONTHS.map((m, i) => {
              const monthPreset = `month-${i}`;
              return (
                <button
                  key={m}
                  onClick={() => {
                    setPreset(monthPreset);
                    const from = `${selectedYear}-${String(i+1).padStart(2, '0')}-01`;
                    // Use Date object trick to get the last day of the current month
                    const to = new Date(selectedYear, i+1, 0).toISOString().split('T')[0];
                    setDateRange({ from, to });
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-full transition-colors border ${preset === monthPreset ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-muted/30 hover:bg-muted text-foreground border-border/50'}`}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* 1x4 Quarters Grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => {
              const qPreset = `q${i+1}`;
              return (
                <button
                  key={q}
                  onClick={() => {
                    setPreset(qPreset);
                    const fromMonth = i * 3 + 1;
                    const toMonth = i * 3 + 3;
                    const from = `${selectedYear}-${String(fromMonth).padStart(2, '0')}-01`;
                    const to = new Date(selectedYear, toMonth, 0).toISOString().split('T')[0];
                    setDateRange({ from, to });
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-full transition-colors border ${preset === qPreset ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-muted/30 hover:bg-muted text-foreground border-border/50'}`}
                >
                  {q}
                </button>
              );
            })}
          </div>

          {/* Custom Date Inputs inside the dropdown */}
          <div className="pt-3 border-t border-border">
            <button 
              onClick={() => {
                if (preset !== 'custom') {
                  setPreset('custom');
                  setDateRange({ from: null, to: null });
                }
              }}
              className={`text-xs font-semibold w-full text-left flex justify-between items-center py-1.5 px-2 rounded-full transition-colors border ${preset === 'custom' ? 'bg-primary/10 text-primary border-primary/20' : 'hover:bg-muted text-foreground border-transparent'}`}
            >
              <span>Custom Range</span>
            </button>
            
            {preset === 'custom' && (
              <div className="flex flex-col space-y-2 mt-2 px-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-muted-foreground">From</span>
                  <input 
                    type="date" 
                    value={dateRange.from || ''} 
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-[130px] text-foreground"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-muted-foreground">To</span>
                  <input 
                    type="date" 
                    value={dateRange.to || ''} 
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-[130px] text-foreground"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Branch Multi-Select */}
      <div 
        className="relative group"
        onMouseLeave={() => { if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) document.activeElement.blur(); }}
      >
        <button className="flex items-center space-x-2 bg-card px-3 py-1.5 rounded-full border border-border font-semibold text-xs transition-colors hover:bg-muted w-auto justify-between min-w-[140px]">
          <div className="flex items-center space-x-2">
            <Building2 className={`w-3.5 h-3.5 ${selectedBranches.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="truncate max-w-[150px]">{selectedBranches.length === 0 ? 'All Branches' : selectedBranches.length === 1 ? (branches.find(b => b.id === selectedBranches[0])?.name || '1 Branch') : `${selectedBranches.length} Branches`}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all z-50 overflow-hidden flex flex-col">
          <div className="p-3 flex flex-col space-y-1.5 max-h-60 overflow-y-auto">
            {branches.map(b => {
              const isSelected = selectedBranches.includes(b.id);
              return (
                <button 
                  key={b.id} 
                  onClick={() => toggleBranch(b.id)}
                  className={`w-full text-left px-3 py-2 rounded-full text-xs font-semibold transition-all border ${
                    isSelected 
                      ? 'bg-primary text-primary-foreground shadow-sm border-transparent' 
                      : 'bg-transparent text-foreground border-transparent hover:bg-muted hover:border-border/50'
                  }`}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
          {selectedBranches.length > 0 && (
            <div className="p-3 border-t border-border">
              <button 
                onClick={() => setSelectedBranches([])} 
                className="w-full py-2 rounded-full bg-transparent hover:bg-muted text-xs font-bold text-foreground transition-colors border border-border"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
