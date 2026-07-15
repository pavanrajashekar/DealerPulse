'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageSkeleton } from '@/components/loading-skeleton';
import { useSearchParams } from 'next/navigation';
import { getGlobalMetrics, dealershipData, ANCHOR_DATE } from '@/lib/dealership-data';
import { useDashboardContext } from '@/lib/dashboard-context';
import { 
  Car, 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  MapPin, 
  AlertTriangle,
  User,
  Activity,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Target,
  Percent
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalFilterBar from '@/components/global-filter-bar';
import { calculateHealthScore } from '@/components/score-card';
import { EntitySidebarList } from '@/components/entity-sidebar-list';
import InfoTooltip from '@/components/info-tooltip';
import KpiCard from '@/components/kpi-card';
import ScoreCard from '@/components/score-card';
import { METRIC_DEFINITIONS } from '@/lib/metric-definitions';
import { LossReasonList } from '@/components/loss-reason-list';

// Dark to light blue gradient
const COLORS = ['#1e3a8a', '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];


export default function ModelsPage() {
  return (
    <React.Suspense fallback={<div className="p-6">Loading...</div>}>
      <ModelsContent />
    </React.Suspense>
  );
}

function ModelsContent() {
  const { timeFilter, dateRange, selectedBranches, setSelectedEntityId } = useDashboardContext();
  const searchParams = useSearchParams();
  const initialModel = searchParams.get('model');
  
  const metrics = getGlobalMetrics(timeFilter, dateRange, selectedBranches);
  const modelsData = metrics.models;
  
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (initialModel && modelsData.some(m => m.model === initialModel)) {
      setSelectedModel(initialModel);
    } else if (!selectedModel || !modelsData.some(m => m.model === selectedModel)) {
      setSelectedModel(modelsData[0]?.model || null);
    }
  }, [initialModel, modelsData, selectedModel]);

  useEffect(() => {
    if (selectedModel) {
      setSelectedEntityId(selectedModel);
    }
  }, [selectedModel, setSelectedEntityId]);

  const activeModelDetails = modelsData.find(m => m.model === selectedModel);

  const getTopRepForModel = (model: string) => {
    const repRevenues: Record<string, number> = {};
    dealershipData.leads.forEach(l => {
      if (l.model_interested === model && l.status === 'delivered') {
        if (selectedBranches.length > 0) {
          const rep = dealershipData.sales_reps.find(r => r.id === l.assigned_to);
          if (!rep || !selectedBranches.includes(rep.branch_id)) return;
        }
        repRevenues[l.assigned_to] = (repRevenues[l.assigned_to] || 0) + l.deal_value;
      }
    });
    
    let maxRev = 0;
    let topRepId = null;
    for (const [id, rev] of Object.entries(repRevenues)) {
      if (rev > maxRev) {
        maxRev = rev;
        topRepId = id;
      }
    }
    const topRep = dealershipData.sales_reps.find(r => r.id === topRepId);
    return topRep ? { name: topRep.name, revenue: maxRev } : null;
  };

  const topRep = selectedModel ? getTopRepForModel(selectedModel) : null;

  const branchModelData = useMemo(() => {
    if (!selectedModel) return [];
  
    // Filter leads based on timeFilter and dateRange
    let fLeads = dealershipData.leads.filter(l => l.model_interested === selectedModel);
    
    if (dateRange.from && dateRange.to) {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      fLeads = fLeads.filter(l => {
        const d = new Date(l.created_at);
        return d >= fromDate && d <= toDate;
      });
    } else if (timeFilter !== 'all') {
        const cutoff = new Date(ANCHOR_DATE);
        if (timeFilter === '30d') {
          cutoff.setDate(cutoff.getDate() - 30);
        } else if (timeFilter === '90d') {
          cutoff.setDate(cutoff.getDate() - 90);
        }
        
        if (timeFilter === '30d' || timeFilter === '90d') {
          fLeads = fLeads.filter(l => new Date(l.created_at) >= cutoff);
        } else if (timeFilter.includes('-')) {
          fLeads = fLeads.filter(l => l.created_at.startsWith(timeFilter));
        }
    }
  
    if (selectedBranches.length > 0) {
       fLeads = fLeads.filter(l => {
          const rep = dealershipData.sales_reps.find(r => r.id === l.assigned_to);
          return rep && selectedBranches.includes(rep.branch_id);
       });
    }
  
    // Aggregate by branch
    const branchMap: Record<string, { branchId: string, branchName: string, activeLeadsCount: number, revenue: number, unitsSold: number, totalClosed: number }> = {};
    dealershipData.branches.forEach(b => {
       if (selectedBranches.length > 0 && !selectedBranches.includes(b.id)) return;
       branchMap[b.id] = {
         branchId: b.id,
         branchName: b.name,
         activeLeadsCount: 0,
         revenue: 0,
         unitsSold: 0,
         totalClosed: 0
       };
    });
  
    fLeads.forEach(l => {
       const rep = dealershipData.sales_reps.find(r => r.id === l.assigned_to);
       if (!rep || !branchMap[rep.branch_id]) return;
  
       const bId = rep.branch_id;
       
       if (!['delivered', 'lost'].includes(l.status)) {
         branchMap[bId].activeLeadsCount++;
       }
       
       if (['delivered', 'order_placed'].includes(l.status)) {
         branchMap[bId].revenue += l.deal_value;
         branchMap[bId].unitsSold++;
         branchMap[bId].totalClosed++;
       } else if (l.status === 'lost') {
         branchMap[bId].totalClosed++;
       }
    });
  
    let results = Object.values(branchMap).map(b => ({
       ...b,
       conversion: b.totalClosed > 0 ? (b.unitsSold / b.totalClosed) * 100 : null
    }));
  
    if (sortConfig) {
        results.sort((a, b) => {
          let aVal = a[sortConfig.key as keyof typeof a];
          let bVal = b[sortConfig.key as keyof typeof b];
          
          if (aVal === null) aVal = -1;
          if (bVal === null) bVal = -1;
  
          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
    } else {
        results.sort((a, b) => b.revenue - a.revenue);
    }
  
    return results;
  
  }, [selectedModel, timeFilter, dateRange, selectedBranches, sortConfig]);

  // Compute monthly trend for the selected model
  const monthlyTrendData = useMemo(() => {
    if (!selectedModel) return [];
    const months = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
    return months.map(m => {
      const mLeads = dealershipData.leads.filter(l => l.model_interested === selectedModel);
      const booked = mLeads.filter(l => {
        if (!['delivered', 'order_placed'].includes(l.status)) return false;
        const d = dealershipData.deliveries.find(d => d.lead_id === l.id);
        if (!d) return false;
        if (l.status === 'delivered') return d.delivery_date.startsWith(m);
        return d.order_date.startsWith(m);
      });
      return {
        month: new Date(`${m}-02`).toLocaleString('default', { month: 'short' }),
        revenue: booked.reduce((sum, l) => sum + l.deal_value, 0)
      };
    });
  }, [selectedModel]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  if (!activeModelDetails) return <PageSkeleton />;

  const kpiCards = activeModelDetails ? [
    { label: 'Total Revenue', value: `₹${(activeModelDetails.revenue / 10000000).toFixed(2)} Cr`, icon: IndianRupee, pct: null, subtext: 'Total booked/delivered', growth: null, link: null, highlight: 'green' as const, metricInfo: METRIC_DEFINITIONS.REVENUE },
    { label: 'Units Delivered', value: activeModelDetails.unitsSold.toString(), icon: Car, pct: null, subtext: 'Completed sales', growth: null, link: null, highlight: 'none' as const, metricInfo: METRIC_DEFINITIONS.UNITS_DELIVERED },
    { label: 'Lead Conversion Rate', value: activeModelDetails.conversion !== null ? `${activeModelDetails.conversion.toFixed(1)}%` : 'N/A', icon: Target, pct: null, subtext: 'Leads won / Total closed leads', growth: null, link: null, highlight: activeModelDetails.conversion && activeModelDetails.conversion > 20 ? 'green' as const : 'red' as const, metricInfo: METRIC_DEFINITIONS.WIN_RATE },
    { label: 'Active Pipeline', value: `${activeModelDetails.activeLeadsCount}`, icon: Activity, pct: null, subtext: 'In-progress deals', growth: null, link: null, highlight: 'none' as const, metricInfo: METRIC_DEFINITIONS.ACTIVE_PIPELINE },
    { label: 'Lost Prospects', value: `${activeModelDetails.lostPercentage.toFixed(1)}%`, icon: AlertTriangle, pct: null, subtext: 'Closed lost', growth: null, link: null, highlight: activeModelDetails.lostPercentage > 50 ? 'red' as const : 'none' as const, metricInfo: METRIC_DEFINITIONS.LOST_PROSPECTS },
    { label: 'Avg Deal Size', value: activeModelDetails.unitsSold > 0 ? `₹${(activeModelDetails.revenue / activeModelDetails.unitsSold / 100000).toFixed(2)} L` : 'N/A', icon: Percent, pct: null, subtext: 'Average per unit', growth: null, link: null, highlight: 'none' as const, metricInfo: METRIC_DEFINITIONS.AVG_DEAL_SIZE },
  ] : [];

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* PAGE HEADER */}
      <div className="h-16 border-b border-border px-4 md:px-6 flex items-center justify-between flex-shrink-0 bg-card z-40 sticky top-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Models</h1>
        <div className="flex items-center space-x-4 flex-shrink-0">
          <GlobalFilterBar />
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: Model List */}
        <EntitySidebarList
          title="All Models"
          items={modelsData
            .filter(m => m.model.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(m => {
              const hs = calculateHealthScore({
                type: 'model',
                winRate: m.conversion,
                slaCompliancePct: m.slaCompliancePct,
                funnel: m.funnel,
                stagnantRatio: m.stagnantRatio
              });
              return {
                id: m.model,
                title: m.model,
                subtitle: `₹${(m.revenue / 10000000).toFixed(2)} Cr`,
                metricText: `${m.unitsSold} Units`,
                badgeText: `${hs}`,
                badgeColor: hs >= 75 ? 'green' : hs >= 50 ? 'amber' : 'red'
              };
          })}
          selectedId={selectedModel}
          onSelect={setSelectedModel}
          showSearch={true}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search models..."
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24">
          <div className="space-y-4">
          <AnimatePresence mode="wait">
            {selectedModel && activeModelDetails && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                key={selectedModel}
                className="flex flex-col space-y-4 w-full"
              >
                {/* Header Profile */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <h2 className="text-3xl font-semibold tracking-tight text-foreground">{selectedModel}</h2>
                    <div className="flex space-x-4 mt-2">
                      <p className="text-sm font-bold text-muted-foreground flex items-center">
                        <MapPin className="w-4 h-4 mr-1.5" />
                        Top Branch: {activeModelDetails.topBranch}
                      </p>
                      {topRep && (
                        <p className="text-sm font-bold text-muted-foreground flex items-center">
                          <User className="w-4 h-4 mr-1.5" />
                          Top Rep: {topRep.name}
                        </p>
                      )}
                      {activeModelDetails.trend !== null && (
                        <div className={`px-2 py-0.5 rounded flex items-center text-[11px] font-bold ${activeModelDetails.trend > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {activeModelDetails.trend > 0 ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                          {Math.abs(activeModelDetails.trend).toFixed(1)}% MoM
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2 sm:col-span-4 lg:col-span-1 lg:row-span-2 flex h-full">
                     <ScoreCard 
                       title="Model Health"
                       type="model"
                       winRate={activeModelDetails.conversion}
                       slaCompliancePct={activeModelDetails.slaCompliancePct}
                       funnel={activeModelDetails.funnel}
                       stagnantRatio={activeModelDetails.stagnantRatio}
                       className="w-full h-full"
                     />
                  </div>
                  {kpiCards.map((card, idx) => (
                    <KpiCard key={idx} {...card} tooltipAlign={idx % 3 === 0 ? 'left' : idx % 3 === 2 ? 'right' : 'center'} className="lg:col-span-1" />
                  ))}
                </div>



                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                  {/* Monthly Trend Chart */}
                  <div className="bg-card card-base border border-border rounded-md p-5 shadow-sm flex flex-col">
                    <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-4 flex-shrink-0">Revenue Trend (6 Months)</h3>
                    <div className="flex-1 w-full min-h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} className="fill-muted-foreground font-semibold" />
                          <YAxis 
                            tickFormatter={(val) => `₹${(val / 10000000).toFixed(0)}Cr`} 
                            fontSize={10} tickLine={false} axisLine={false} className="fill-muted-foreground font-semibold" 
                          />
                          <Tooltip 
                            cursor={{stroke: '#e4e4e7', strokeWidth: 1, strokeDasharray: '4 4'}} 
                            contentStyle={{ backgroundColor: 'rgba(255,255,255,0.97)', border: '1px solid #e4e4e7', borderRadius: '8px', fontSize: '11px', color: '#000', fontWeight: 'bold' }} 
                            formatter={(value: any) => [`₹${(value / 10000000).toFixed(2)} Cr`, 'Revenue']}
                          />
                          <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Drop-out Reasons Analysis */}
                  <div className="bg-card card-base border border-border rounded-md p-5 shadow-sm flex flex-col">
                    <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-4 flex-shrink-0">Drop-out Reasons Analysis</h3>
                    <div className="flex-1 w-full">
                      <LossReasonList data={activeModelDetails.lostReasons} />
                    </div>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Branch Leaderboard Table */}
          <div className="bg-card card-base border border-border/50 rounded-3xl shadow-sm overflow-hidden mt-4">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <div className="flex flex-col">
                <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-1">Branch Performance for {selectedModel}</h3>
                <p className="text-xs text-muted-foreground font-medium">Comparative view across all branches.</p>
              </div>
            </div>
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-card border-b border-border/60">
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80" onClick={() => handleSort('branchName')}>
                      <div className="flex items-center space-x-1">
                        <span>Branch</span>
                        {sortConfig?.key === 'branchName' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                      </div>
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80 text-right" onClick={() => handleSort('activeLeadsCount')}>
                      <div className="flex items-center justify-end space-x-1">
                        <span>Active Pipeline</span>
                        {sortConfig?.key === 'activeLeadsCount' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                      </div>
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80 text-right" onClick={() => handleSort('conversion')}>
                      <div className="flex items-center justify-end space-x-1">
                        <span>Conv. Rate</span>
                        {sortConfig?.key === 'conversion' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                      </div>
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80 text-right" onClick={() => handleSort('revenue')}>
                      <div className="flex items-center justify-end space-x-1">
                        <span>Revenue</span>
                        {sortConfig?.key === 'revenue' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                      </div>
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80 text-right" onClick={() => handleSort('unitsSold')}>
                      <div className="flex items-center justify-end space-x-1">
                        <span>Units Sold</span>
                        {sortConfig?.key === 'unitsSold' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {branchModelData.map((b) => (
                    <tr key={b.branchId} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-5 py-4">
                        <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground">{b.branchName}</p>
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-bold">{b.activeLeadsCount}</td>
                      <td className={`px-5 py-4 text-right text-sm font-semibold ${b.conversion && b.conversion > 20 ? 'text-green-500' : 'text-foreground'}`}>
                        {b.conversion !== null ? `${b.conversion.toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-semibold">₹{(b.revenue / 10000000).toFixed(2)} Cr</td>
                      <td className="px-5 py-4 text-right text-sm font-semibold">{b.unitsSold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          </div>
        </div>
      </div>
    </div>
  );
}
