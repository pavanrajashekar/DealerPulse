'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageSkeleton } from '@/components/loading-skeleton';
import { useSearchParams, useRouter } from 'next/navigation';
import { getGlobalMetrics, dealershipData, ANCHOR_DATE } from '@/lib/dealership-data';
import { useDashboardContext } from '@/lib/dashboard-context';
import GlobalFilterBar from '@/components/global-filter-bar';
import { calculateHealthScore } from '@/components/score-card';
import { formatDate } from '@/lib/utils';
import {
  Users,
  Search,
  Building2,
  Calendar,
  Briefcase,
  Clock,
  Zap,
  Info,
  IndianRupee,
  Truck,
  Percent,
  Activity,
  Target,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertTriangle,
  Timer
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell
} from 'recharts';

import { EntitySidebarList } from '@/components/entity-sidebar-list';
import InfoTooltip from '@/components/info-tooltip';
import KpiCard from '@/components/kpi-card';
import ScoreCard from '@/components/score-card';
import { METRIC_DEFINITIONS } from '@/lib/metric-definitions';

export default function SalesRepsPage() {
  return (
    <React.Suspense fallback={<div className="p-6">Loading...</div>}>
      <SalesRepsContent />
    </React.Suspense>
  );
}

function SalesRepsContent() {
  const { timeFilter, dateRange, selectedBranches, selectedEntityId, setSelectedEntityId } = useDashboardContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const repParam = searchParams.get('rep');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const metrics = getGlobalMetrics(timeFilter, dateRange, selectedBranches);
  const reps = metrics.reps;
  const branches = metrics.branches;

  useEffect(() => {
    if (repParam && reps.some(r => r.id === repParam)) {
      if (selectedEntityId !== repParam) {
        setSelectedEntityId(repParam);
      }
    } else if (!selectedEntityId || !reps.some(r => r.id === selectedEntityId)) {
      // Default to the first rep in the list (highest conversion)
      const sorted = [...reps].sort((a, b) => (b.conversion || 0) - (a.conversion || 0));
      const defaultId = sorted[0]?.id || null;
      if (selectedEntityId !== defaultId) {
        setSelectedEntityId(defaultId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repParam, reps]);

  const selectedRep = reps.find(r => r.id === selectedEntityId) || [...reps].sort((a, b) => (b.conversion || 0) - (a.conversion || 0))[0];

  const handleRepSelect = (id: string) => {
    router.push(`/sales-reps?rep=${id}`, { scroll: false });
  };

  const filteredReps = useMemo(() => {
    let sorted = [...reps].sort((a, b) => (b.conversion || 0) - (a.conversion || 0));
    if (searchTerm) {
      sorted = sorted.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedBranches.length > 0) {
      sorted = sorted.filter(r => selectedBranches.includes(r.branchId));
    }
    return sorted;
  }, [reps, searchTerm, selectedBranches]);


  // Monthly Deliveries
  const monthlyDeliveries = useMemo(() => {
    const months = ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
    return months.map(m => {
      const del = dealershipData.deliveries.filter(d => {
        const lead = dealershipData.leads.find(l => l.id === d.lead_id);
        return lead && lead.assigned_to === selectedRep?.id && d.delivery_date.startsWith(m);
      }).length;
      return {
        month: m,
        name: new Date(`${m}-02`).toLocaleString('default', { month: 'short' }),
        deliveries: del
      };
    });
  }, [selectedRep?.id]);

  // Branch averages for funnel
  const branchData = branches.find(b => b.id === selectedRep?.branchId);
  const pairedFunnel = useMemo(() => {
    if (!branchData || !selectedRep) return [];
    return selectedRep.funnel.slice(0, -1).map((s, idx) => {
      const bStage = branchData.funnel[idx];
      return {
        stage: s.label,
        repConv: s.count > 0 ? 100 - s.dropOffPct : 0,
        branchConv: bStage.count > 0 ? 100 - bStage.dropOffPct : 0
      };
    });
  }, [selectedRep?.funnel, branchData]);

  // All leads for this rep (including delivered/lost)
  const repLeads = useMemo(() => {
    if (!selectedRep) return [];
    let leads = dealershipData.leads
      .filter(l => l.assigned_to === selectedRep.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (sortConfig) {
      leads = [...leads].sort((a, b) => {
        let aVal: any = a[sortConfig.key as keyof typeof a];
        let bVal: any = b[sortConfig.key as keyof typeof b];

        // special case for timeline (days)
        if (sortConfig.key === 'timeline') {
          const getDays = (lead: any) => {
            const isClosed = lead.status === 'delivered' || lead.status === 'lost';
            if (isClosed) {
              const endDate = lead.status_history ? new Date(lead.status_history[lead.status_history.length - 1].timestamp) : ANCHOR_DATE;
              return Math.round((endDate.getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
            } else {
              return Math.round((ANCHOR_DATE.getTime() - new Date(lead.last_activity_at).getTime()) / (1000 * 60 * 60 * 24));
            }
          };
          aVal = getDays(a);
          bVal = getDays(b);
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return leads;
  }, [selectedRep?.id, sortConfig]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  if (!selectedRep) return <PageSkeleton />;

  // Find rep details from raw data for role/tenure
  const rawRepData = dealershipData.sales_reps.find(r => r.id === selectedRep.id);

  const branchReps = reps.filter(r => r.branchId === selectedRep.branchId);
  const branchConv = branchData?.conversion || 0;
  const topRepConv = Math.max(...branchReps.map(r => r.conversion || 0));

  const branchRevAvg = branchData ? branchData.revenue / branchReps.length : 0;
  const topRepRev = Math.max(...branchReps.map(r => r.revenue));

  const branchLeadsAvg = branchData ? dealershipData.leads.filter(l => l.branch_id === selectedRep.branchId).length / branchReps.length : 0;
  const topRepLeads = Math.max(...branchReps.map(r => dealershipData.leads.filter(l => l.assigned_to === r.id).length));

  const joinedDate = rawRepData ? new Date(rawRepData.joined) : new Date();
  const tenureYears = (new Date('2025-12-31').getTime() - joinedDate.getTime()) / (1000 * 3600 * 24 * 365);

  const activeRepLeads = repLeads.filter(l => !['delivered', 'lost'].includes(l.status));
  const lostRepLeads = repLeads.filter(l => l.status === 'lost');
  const needsCoaching = (selectedRep.conversion !== null && selectedRep.conversion < 20) || selectedRep.avgResponseTimeHours > 48;

  let coachingReason = '';
  if (selectedRep.conversion !== null && selectedRep.conversion < 20 && selectedRep.avgResponseTimeHours > 48) {
    coachingReason = 'Conversion rate < 20% & Response > 48h';
  } else if (selectedRep.conversion !== null && selectedRep.conversion < 20) {
    coachingReason = 'Conversion rate is critically low (< 20%)';
  } else if (selectedRep.avgResponseTimeHours > 48) {
    coachingReason = 'Response time exceeds 48h SLA';
  }

  const kpiCards = [
    { label: 'Revenue Closed', value: `₹${(selectedRep.revenue / 10000000).toFixed(2)} Cr`, icon: IndianRupee, pct: (selectedRep.revenue / Math.max(1, topRepRev)) * 100, subtext: `Branch Avg: ₹${(branchRevAvg / 10000000).toFixed(2)} Cr`, growth: null, highlight: 'none' as const, link: null, metricInfo: { ...METRIC_DEFINITIONS.REVENUE, description: 'Total revenue generated from closed deals. The background progress bar represents this rep\'s performance compared to the top performing rep in the branch.' } },
    { label: 'Units Delivered', value: `${selectedRep.deliveries}`, icon: Truck, pct: (selectedRep.deliveries / Math.max(1, Math.max(...branchReps.map(r => r.deliveries)))) * 100, subtext: 'Total completed sales', growth: null, highlight: 'none' as const, link: null, metricInfo: { ...METRIC_DEFINITIONS.UNITS_DELIVERED, description: 'Number of vehicles successfully delivered to customers. The background progress bar represents this rep\'s performance compared to the top performing rep in the branch.' } },
    { label: 'Lead Conversion Rate', value: selectedRep.conversion !== null ? `${selectedRep.conversion.toFixed(1)}%` : 'N/A', icon: Percent, pct: ((selectedRep.conversion || 0) / Math.max(1, topRepConv)) * 100, subtext: `Branch Avg: ${branchConv.toFixed(1)}%`, growth: null, highlight: selectedRep.conversion !== null && selectedRep.conversion < 20 ? 'red' as const : 'none' as const, link: null, metricInfo: { ...METRIC_DEFINITIONS.WIN_RATE, description: 'Percentage of leads successfully converted to sales. The background progress bar represents this rep\'s performance compared to the top performing rep in the branch.' } },
    { label: 'Avg Response Time', value: `${selectedRep.avgResponseTimeHours.toFixed(1)}h`, icon: Timer, pct: null, subtext: selectedRep.avgResponseTimeHours <= 48 ? '✓ Within SLA (48h)' : '⚠ Exceeds 48h SLA', growth: null, highlight: selectedRep.avgResponseTimeHours <= 48 ? 'green' as const : selectedRep.avgResponseTimeHours <= 72 ? 'none' as const : 'red' as const, link: null, metricInfo: METRIC_DEFINITIONS.AVG_RESPONSE_TIME },
    { label: 'Active Leads', value: `${activeRepLeads.length}`, icon: Users, pct: null, subtext: `Total: ${repLeads.length}  ·  Lost: ${lostRepLeads.length}`, growth: null, highlight: 'none' as const, link: null, metricInfo: METRIC_DEFINITIONS.ACTIVE_LEADS },
    { label: 'Active Pipeline', value: `₹${(activeRepLeads.reduce((acc, l) => acc + l.deal_value, 0) / 10000000).toFixed(2)} Cr`, icon: Activity, pct: null, subtext: 'Potential revenue', growth: null, highlight: 'none' as const, link: null, metricInfo: METRIC_DEFINITIONS.ACTIVE_PIPELINE },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <div className="h-16 border-b border-border px-4 md:px-6 flex items-center justify-between flex-shrink-0 bg-card z-40 sticky top-0">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sales Representatives</h1>
        </div>
        <div className="flex items-center space-x-4 flex-shrink-0">
          <GlobalFilterBar />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Rep List */}
        <EntitySidebarList
          title="All Reps"
          items={filteredReps.map(r => {
            const hs = calculateHealthScore({
              type: 'rep',
              winRate: r.conversion,
              slaCompliancePct: r.slaCompliancePct,
              funnel: r.funnel,
              stagnantRatio: r.stagnantRatio
            });
            return {
              id: r.id,
              title: r.name,
              subtitle: r.branchName,
              metricText: `${r.deliveries} Units  •  ₹${(r.revenue / 10000000).toFixed(2)} Cr`,
              badgeText: `${hs}`,
              badgeColor: hs >= 75 ? 'green' : hs >= 50 ? 'amber' : 'red'
            };
          })}
          selectedId={selectedEntityId}
          onSelect={handleRepSelect}
          showSearch={true}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {/* RIGHT PANEL: Detail View */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24">
          <div className="space-y-4">

            {/* Header Profile */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <div className="flex items-center space-x-3">
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground">{selectedRep.name}</h2>
                  {needsCoaching && (
                    <span className="flex items-center px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold tracking-tight">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Needs Coaching
                      <InfoTooltip
                        align="left"
                        metric={{
                          title: 'Needs Coaching Flag',
                          description: 'This representative is underperforming in key metrics and requires intervention.',
                          calculation: `Triggered because: ${coachingReason}`,
                          importance: 'Targeted coaching prevents missed targets and improves team retention.'
                        }}
                      />
                    </span>
                  )}
                </div>
                <div className="flex space-x-4 mt-2">
                  <p className="text-sm font-bold text-muted-foreground flex items-center">
                    <Briefcase className="w-4 h-4 mr-1.5" />
                    {rawRepData?.role?.replace('_', ' ') || 'Sales Rep'}
                  </p>
                  <p className="text-sm font-bold text-muted-foreground flex items-center">
                    <Building2 className="w-4 h-4 mr-1.5" />
                    {selectedRep.branchName}
                  </p>
                  <p className="text-sm font-bold text-muted-foreground flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5" />
                    Joined {formatDate(rawRepData?.joined)}
                  </p>
                </div>
              </div>
            </div>

            {/* KPI Strip — uses shared KpiCard component */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2 sm:col-span-4 lg:col-span-1 lg:row-span-2 flex h-full">
                <ScoreCard
                  title="Rep Health"
                  type="rep"
                  winRate={selectedRep.winRate}
                  slaCompliancePct={selectedRep.slaCompliancePct}
                  funnel={selectedRep.funnel}
                  stagnantRatio={selectedRep.stagnantRatio}
                  className="w-full h-full"
                />
              </div>
              {kpiCards.map((card, idx) => (
                <KpiCard key={idx} {...card} tooltipAlign={idx % 3 === 0 ? 'left' : idx % 3 === 2 ? 'right' : 'center'} className="lg:col-span-1" />
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Monthly Deliveries */}
              <div className="bg-card card-base border border-border rounded-md p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-4">Deliveries (7 Mo)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyDeliveries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'rgba(255,255,255,0.97)', border: '1px solid #e4e4e7', borderRadius: '8px', fontSize: '11px', color: '#000' }} />
                      <Bar dataKey="deliveries" name="Deliveries" fill="#3b82f6" radius={[50, 50, 50, 50]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Funnel vs Branch Avg */}
              <div className="bg-card card-base border border-border rounded-md p-5 shadow-sm flex flex-col">
                <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-4">Stage Conversion vs Branch</h3>
                <div className="flex-1 min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={pairedFunnel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="stage" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        content={({ active, payload, label }: any) => {
                          if (active && payload && payload.length >= 2) {
                            const repConv = payload.find((p: any) => p.dataKey === 'repConv')?.value || 0;
                            const branchConv = payload.find((p: any) => p.dataKey === 'branchConv')?.value || 0;
                            const delta = repConv - branchConv;
                            return (
                              <div className="bg-card border border-border shadow-lg rounded-md p-4 text-sm min-w-[200px]">
                                <p className="font-bold text-foreground mb-3">{label}</p>
                                <div className="flex items-center justify-between gap-4 mb-2">
                                  <span className="text-muted-foreground flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" /> Rep Conversion</span>
                                  <span className="font-bold">{repConv.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
                                  <span className="text-muted-foreground flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#a1a1aa]" /> Branch Avg</span>
                                  <span className="font-bold">{branchConv.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 bg-muted/30 p-2 -mx-2 rounded-md">
                                  <span className="font-medium text-foreground text-xs tracking-tight">Performance Delta</span>
                                  <span className={`font-semibold ${delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-500' : 'text-foreground'}`}>
                                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                      <Bar dataKey="repConv" name="Rep Conv %" fill="#3b82f6" radius={[50, 50, 50, 50]} barSize={32} />
                      <Line type="monotone" dataKey="branchConv" name="Branch Avg Benchmark %" stroke="#a1a1aa" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: '#a1a1aa', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Assigned Leads Table */}
            <div className="bg-card card-base border border-border/50 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Assigned Leads ({repLeads.length})</h3>
                  {lostRepLeads.length > 0 && (
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full text-xs font-semibold">Lost: {lostRepLeads.length}</span>
                  )}
                </div>
              </div>
              <div className="overflow-auto max-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-card border-b border-border/60">
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80" onClick={() => handleSort('customer_name')}>
                        <div className="flex items-center space-x-1">
                          <span>Customer</span>
                          {sortConfig?.key === 'customer_name' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80" onClick={() => handleSort('model_interested')}>
                        <div className="flex items-center space-x-1">
                          <span>Model</span>
                          {sortConfig?.key === 'model_interested' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80" onClick={() => handleSort('status')}>
                        <div className="flex items-center space-x-1">
                          <span>Status</span>
                          {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80 text-right" onClick={() => handleSort('deal_value')}>
                        <div className="flex items-center justify-end space-x-1">
                          <span>Value</span>
                          {sortConfig?.key === 'deal_value' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80 text-right" onClick={() => handleSort('timeline')}>
                        <div className="flex items-center justify-end space-x-1">
                          <span>Timeline</span>
                          {sortConfig?.key === 'timeline' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {repLeads.map(lead => {
                      const isClosed = lead.status === 'delivered' || lead.status === 'lost';
                      const startDate = new Date(lead.created_at);

                      let days = 0;
                      if (isClosed) {
                        const endDate = lead.status_history ? new Date(lead.status_history[lead.status_history.length - 1].timestamp) : ANCHOR_DATE;
                        days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                      } else {
                        const endDate = new Date(lead.last_activity_at);
                        days = Math.round((ANCHOR_DATE.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
                      }

                      return (
                        <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-4">
                            <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground">{lead.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{lead.phone}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-semibold">{lead.model_interested}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-tight ${lead.status === 'new' ? 'bg-blue-500/10 text-blue-500' :
                              lead.status === 'contacted' ? 'bg-cyan-500/10 text-cyan-500' :
                                lead.status === 'test_drive' ? 'bg-purple-500/10 text-purple-500' :
                                  lead.status === 'negotiation' ? 'bg-orange-500/10 text-orange-500' :
                                    lead.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                                      'bg-neutral-500/10 text-neutral-500'
                              }`}>
                              {lead.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-sm font-semibold">₹{(lead.deal_value / 100000).toFixed(1)} L</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {isClosed ? (
                              <div className="flex items-center justify-end space-x-1.5 text-muted-foreground">
                                <span className="text-sm font-bold">Closed in {Math.max(0, days)}d</span>
                              </div>
                            ) : (
                              <div className={`flex items-center justify-end space-x-1.5 ${days > 30 ? 'text-red-500' : days > 7 ? 'text-amber-500' : 'text-muted-foreground'
                                }`}>
                                <Clock className="w-3.5 h-3.5" />
                                <span className="text-sm font-bold">Idle {Math.max(0, days)}d</span>
                                {days > 30 && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {repLeads.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                          No leads found for this representative.
                        </td>
                      </tr>
                    )}
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
