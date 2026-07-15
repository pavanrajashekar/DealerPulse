'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { PageSkeleton } from '@/components/loading-skeleton';
import { useSearchParams, useRouter } from 'next/navigation';
import { getGlobalMetrics, ANCHOR_DATE, STAGNANT_LEAD_DAYS } from '@/lib/dealership-data';
import { useDashboardContext } from '@/lib/dashboard-context';
import { dealershipData } from '@/lib/dealership-data';
import GlobalFilterBar from '@/components/global-filter-bar';
import {
  Building2,
  MapPin,
  User,
  Users,
  Target,
  ArrowRight,
  AlertTriangle,
  IndianRupee,
  Truck,
  Percent,
  Activity,
  Timer,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  Trophy,
  ChevronDown,
  ChevronsUpDown,
  Clock,
  Globe
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
  ComposedChart,
  Line
} from 'recharts';
import { EntitySidebarList, SidebarItem } from '@/components/entity-sidebar-list';
import { CustomFunnelChart } from '@/components/custom-funnel-chart';
import { calculateHealthScore } from '@/components/score-card';
import { ProgressBar } from '@/components/progress-bar';
import InfoTooltip from '@/components/info-tooltip';
import KpiCard from '@/components/kpi-card';
import ScoreCard from '@/components/score-card';
import { METRIC_DEFINITIONS } from '@/lib/metric-definitions';
import { LossReasonList } from '@/components/loss-reason-list';

// ─── Sources List ─────────────────────────────────────────
function SourcesList({ sources }: { sources: any[] }) {
  const [metric, setMetric] = React.useState<'value' | 'count'>('value');

  const valFormatter = (d: any) => {
    if (metric === 'value') {
      if (d.value >= 10000000) return `₹${(d.value / 10000000).toFixed(2)} Cr`;
      if (d.value >= 100000) return `₹${(d.value / 100000).toFixed(1)} L`;
      return `₹${d.value}`;
    }
    return `${d.count} leads`;
  };

  const sortVal = (d: any) => metric === 'value' ? d.value : d.count;
  const sortedData = [...sources].sort((a, b) => sortVal(b) - sortVal(a));
  const maxVal = sortedData.length > 0 ? sortVal(sortedData[0]) : 1;

  const rankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-500';
    if (rank === 2) return 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
    if (rank === 3) return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-500';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="bg-card card-base border border-border rounded-md p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Top Sources</h3>
        </div>
        <div className="flex items-center bg-muted/50 p-1 rounded-full border border-border">
          <button onClick={() => setMetric('value')} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center transition-colors ${metric === 'value' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Rev</button>
          <button onClick={() => setMetric('count')} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center transition-colors ${metric === 'count' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Leads</button>
        </div>
      </div>
      <div className="space-y-2 flex-1 overflow-y-auto min-h-0 pr-1">
        {sortedData.map((d, idx) => {
          const rank = idx + 1;
          const val = sortVal(d);
          const pct = Math.max(2, (val / maxVal) * 100);
          return (
            <div key={d.source} className="relative rounded-md overflow-hidden group border border-transparent transition-colors hover:bg-muted/30">
              <div className="absolute top-0 left-0 h-full bg-primary/10 dark:bg-primary/10 transition-all duration-500 ease-out rounded-r-md" style={{ width: `${pct}%` }} />
              <div className="relative p-2.5 flex items-center justify-between z-10">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm ${rankBadgeColor(rank)}`}>
                    {rank <= 3 ? <Trophy className="w-3.5 h-3.5" /> : rank}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block capitalize">
                      {d.source.replace(/_/g, ' ')}
                    </span>
                    <p className="text-xs text-muted-foreground flex items-center">
                      Conv: <span className="font-bold text-foreground ml-1">{d.conversion !== null ? `${d.conversion.toFixed(1)}%` : 'N/A'}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-foreground">{valFormatter(d)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


export default function BranchIntelligencePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading Branch Intelligence...</div>}>
      <BranchIntelligenceContent />
    </Suspense>
  );
}

function BranchIntelligenceContent() {
  const { timeFilter, dateRange, selectedBranches, selectedEntityId, setSelectedEntityId } = useDashboardContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const branchParam = searchParams.get('branch');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [leadSortConfig, setLeadSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // M5-C fix: pass dateRange so branch page respects the global date filter
  const metrics = getGlobalMetrics(timeFilter, dateRange, selectedBranches);
  const branches = metrics.branches;

  useEffect(() => {
    if (branchParam && branches.some(b => b.id === branchParam)) {
      if (selectedEntityId !== branchParam) {
        setSelectedEntityId(branchParam);
      }
    } else if (!selectedEntityId || !branches.some(b => b.id === selectedEntityId)) {
      const defaultId = branches[0]?.id || null;
      if (selectedEntityId !== defaultId) {
        setSelectedEntityId(defaultId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchParam, branches]);

  const selectedBranch = branches.find(b => b.id === selectedEntityId) || branches[0];

  const handleBranchSelect = (id: string) => {
    router.push(`/branch-intelligence?branch=${id}`, { scroll: false });
  };

  if (!selectedBranch) return <PageSkeleton />;

  const branchReps = metrics.reps.filter(r => r.branchId === selectedBranch.id);

  const sortedBranchReps = useMemo(() => {
    let reps = [...branchReps];
    if (sortConfig) {
      reps.sort((a, b) => {
        let aVal = a[sortConfig.key as keyof typeof a];
        let bVal = b[sortConfig.key as keyof typeof b];

        // Handle null conversions
        if (aVal === null) aVal = -1;
        if (bVal === null) bVal = -1;

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      reps.sort((a, b) => b.revenue - a.revenue); // Default sort
    }
    return reps;
  }, [branchReps, sortConfig]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const branchLeads = useMemo(() => {
    return dealershipData.leads.filter(l => l.branch_id === selectedBranch.id);
  }, [selectedBranch.id]);

  const activeBranchLeads = useMemo(() => branchLeads.filter(l => !['delivered', 'lost'].includes(l.status)), [branchLeads]);
  const lostBranchLeads = useMemo(() => branchLeads.filter(l => l.status === 'lost'), [branchLeads]);

  const sortedBranchLeads = useMemo(() => {
    let leads = [...branchLeads];
    if (leadSortConfig) {
      leads.sort((a, b) => {
        let aVal = a[leadSortConfig.key as keyof typeof a];
        let bVal = b[leadSortConfig.key as keyof typeof b];

        if (leadSortConfig.key === 'timeline') {
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

        const safeA = aVal ?? '';
        const safeB = bVal ?? '';

        if (safeA < safeB) return leadSortConfig.direction === 'asc' ? -1 : 1;
        if (safeA > safeB) return leadSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return leads;
  }, [branchLeads, leadSortConfig]);

  const handleLeadSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (leadSortConfig && leadSortConfig.key === key && leadSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setLeadSortConfig({ key, direction });
  };

  // 7-month chart for specific branch
  const monthlyTrend = useMemo(() => {
    const months = ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
    return months.map(m => {
      const rev = dealershipData.leads
        .filter(l => l.branch_id === selectedBranch.id && l.created_at.startsWith(m) && ['delivered', 'order_placed'].includes(l.status))
        .reduce((sum, l) => sum + l.deal_value, 0);
      const target = dealershipData.targets
        .filter(t => t.branch_id === selectedBranch.id && t.month === m)
        .reduce((sum, t) => sum + t.target_revenue, 0);
      return {
        month: m,
        name: new Date(`${m}-02`).toLocaleString('default', { month: 'short' }),
        revenue: rev,
        targetRevenue: target
      };
    });
  }, [selectedBranch.id]);

  const gaugeData = [
    { name: 'Achieved', value: Math.min(selectedBranch.targetAchievement, 100), fill: selectedBranch.targetAchievement >= 100 ? '#10b981' : selectedBranch.targetAchievement >= 80 ? '#f59e0b' : '#ef4444' },
    { name: 'Remaining', value: Math.max(100 - selectedBranch.targetAchievement, 0), fill: '#e5e7eb' }
  ];

  const branchDeliveries = useMemo(() => {
    return dealershipData.deliveries.filter(d => {
      const lead = dealershipData.leads.find(l => l.id === d.lead_id);
      return lead && lead.branch_id === selectedBranch.id;
    });
  }, [selectedBranch.id]);

  const delayedBranchDeliveries = branchDeliveries.filter(d => d.delay_reason);
  const onTimePct = branchDeliveries.length > 0 ? ((branchDeliveries.length - delayedBranchDeliveries.length) / branchDeliveries.length) * 100 : 100;

  const topDelayReasons = useMemo(() => {
    const counts = delayedBranchDeliveries.reduce((acc, d) => {
      if (d.delay_reason) acc[d.delay_reason] = (acc[d.delay_reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 2);
  }, [delayedBranchDeliveries]);

  // KPIs
  const branchMetrics = getGlobalMetrics(timeFilter, dateRange, [selectedBranch.id]);
  const kpis = branchMetrics.kpis;

  // Stagnant leads for this branch (idle > 7 days)
  const branchStagnantLeads = useMemo(() => {
    return dealershipData.leads.filter(l => {
      if (['delivered', 'lost'].includes(l.status)) return false;
      if (l.branch_id !== selectedBranch.id) return false;
      const idleDays = Math.round((ANCHOR_DATE.getTime() - new Date(l.last_activity_at).getTime()) / (1000 * 60 * 60 * 24));
      return idleDays > STAGNANT_LEAD_DAYS;
    });
  }, [selectedBranch.id]);


  const trendIcon = (val: number | null) => {
    if (val === null) return null;
    if (val > 0) return <TrendingUp className="w-3 h-3 text-green-500 mr-1" />;
    if (val < 0) return <TrendingDown className="w-3 h-3 text-primary mr-1" />;
    return null;
  };

  const kpiCards = [
    { label: 'Revenue', value: <>₹{(kpis.revenue / 10000000).toFixed(2)}<span className="text-sm font-medium text-muted-foreground ml-1 tracking-normal">/ {(kpis.targetRevenue / 10000000).toFixed(2)} Cr</span></>, icon: IndianRupee, pct: kpis.targetAchievement, subtext: `Delivered: ₹${(kpis.deliveredRevenue / 10000000).toFixed(2)} Cr`, growth: kpis.growth, highlight: 'none' as const, link: null, metricInfo: METRIC_DEFINITIONS.REVENUE },
    { label: 'Units Delivered', value: <>{kpis.unitsDelivered}<span className="text-sm font-medium text-muted-foreground ml-1 tracking-normal">/ {kpis.targetUnits}</span></>, icon: Truck, pct: kpis.targetUnitsAchievement, subtext: 'Completed sales', growth: null, highlight: 'none' as const, link: null, metricInfo: METRIC_DEFINITIONS.UNITS_DELIVERED },
    { label: 'On-Time Delivery', value: `${onTimePct.toFixed(0)}%`, icon: Timer, pct: onTimePct, subtext: 'Deliveries w/o delays', highlight: onTimePct >= 80 ? 'green' as const : 'red' as const, growth: null, link: null, metricInfo: METRIC_DEFINITIONS.ON_TIME_DELIVERY },
    { label: 'Lead Conversion Rate', value: kpis.conversionRate !== null ? `${kpis.conversionRate.toFixed(1)}%` : 'N/A', icon: Percent, pct: null, subtext: 'Leads won / Total leads closed', growth: null, highlight: 'none' as const, link: null, metricInfo: METRIC_DEFINITIONS.WIN_RATE },
    { label: 'Avg Response', value: `${kpis.avgResponseTimeHours.toFixed(1)}h`, icon: Timer, pct: null, subtext: kpis.avgResponseTimeHours <= 48 ? '✓ Within 48h SLA' : '⚠ Exceeds 48h SLA', growth: null, highlight: kpis.avgResponseTimeHours <= 48 ? 'green' as const : kpis.avgResponseTimeHours <= 72 ? 'none' as const : 'red' as const, link: null, metricInfo: METRIC_DEFINITIONS.AVG_RESPONSE_TIME },
    { label: 'Active Leads', value: `${activeBranchLeads.length}`, icon: Users, pct: null, subtext: `Total: ${branchLeads.length}  ·  Lost: ${lostBranchLeads.length}`, growth: null, highlight: 'none' as const, link: null, metricInfo: METRIC_DEFINITIONS.ACTIVE_LEADS }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <div className="h-16 border-b border-border px-4 md:px-6 flex items-center justify-between flex-shrink-0 bg-card z-40 sticky top-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Branch Intelligence</h1>
        <div className="flex items-center space-x-4 flex-shrink-0">
          <GlobalFilterBar />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden w-full">
        {/* LEFT PANEL: Branch List */}
        <EntitySidebarList
          title="All Branches"
          items={branches
            .filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(b => {
              const hs = calculateHealthScore({
                type: 'branch',
                targetAchievement: b.targetAchievement,
                slaCompliancePct: b.slaCompliancePct,
                funnel: b.funnel,
                stagnantRatio: b.stagnantRatio
              });
              return {
                id: b.id,
                title: b.name,
                subtitle: `₹${(b.revenue / 10000000).toFixed(2)} Cr`,
                metricText: `${b.deliveries} / ${b.targetUnits} units`,
                badgeText: `${hs}`,
                badgeColor: hs >= 75 ? 'green' : hs >= 50 ? 'amber' : 'red'
              };
            })}
          selectedId={selectedEntityId}
          onSelect={handleBranchSelect}
          showSearch={true}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search branches..."
        />

        {/* RIGHT PANEL: Detail View */}
        <div className="flex-1 w-full overflow-y-auto p-4 md:p-6 lg:p-8 pb-24">
          <div className="space-y-4 w-full">

            {/* Header Profile */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">{selectedBranch.name}</h2>
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
                  <p className="text-sm font-bold text-muted-foreground flex items-center">
                    <MapPin className="w-4 h-4 mr-1.5" />
                    {selectedBranch.city}
                  </p>
                  <p className="text-sm font-bold text-muted-foreground flex items-center">
                    <User className="w-4 h-4 mr-1.5" />
                    {selectedBranch.manager}
                  </p>
                  <p className="text-sm font-bold text-muted-foreground flex items-center">
                    <Users className="w-4 h-4 mr-1.5" />
                    {branchReps.length} Reps
                  </p>
                  <p className="text-sm font-bold text-muted-foreground flex items-center">
                    <Target className="w-4 h-4 mr-1.5" />
                    {dealershipData.leads.filter(l => l.branch_id === selectedBranch.id).length} Leads
                  </p>
                  {branchStagnantLeads.length > 0 && (
                    <a href="/action-center" className="flex items-center text-sm font-bold text-amber-500 hover:text-amber-600 transition-colors">
                      <Clock className="w-4 h-4 mr-1.5" />
                      {branchStagnantLeads.length} idle &gt;7d
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* KPI Strip — shared KpiCard component */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2 sm:col-span-4 lg:col-span-1 lg:row-span-2 flex h-full">
                <ScoreCard
                  title="Branch Health"
                  type="branch"
                  targetAchievement={selectedBranch.targetAchievement}
                  slaCompliancePct={selectedBranch.slaCompliancePct}
                  funnel={selectedBranch.funnel}
                  stagnantRatio={selectedBranch.stagnantRatio}
                  className="w-full h-full"
                />
              </div>
              {kpiCards.map((card, idx) => (
                <KpiCard key={idx} {...card} tooltipAlign={idx % 3 === 0 ? 'left' : idx % 3 === 2 ? 'right' : 'center'} className="lg:col-span-1" />
              ))}
            </div>


            {/* Row 1: Chart and Sources */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
              {/* 7-month Chart */}
              <div className="lg:col-span-3 bg-card card-base border border-border rounded-md p-5 shadow-sm flex flex-col">
                <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-4 flex-shrink-0">Revenue vs Target (7 Mo)</h3>
                <div className="flex-1 w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={val => `₹${(val / 10000000).toFixed(1)}Cr`} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.97)', border: '1px solid #e4e4e7', borderRadius: '8px', fontSize: '11px', color: '#000' }} formatter={(val: any) => [`₹${(val / 10000000).toFixed(2)} Cr`]} />
                      <Bar name="Revenue" dataKey="revenue" fill="#3b82f6" radius={[50, 50, 50, 50]} barSize={32} />
                      <Line name="Target" type="monotone" dataKey="targetRevenue" stroke="#71717a" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="lg:col-span-2">
                <SourcesList sources={branchMetrics.sources} />
              </div>
            </div>

            {/* Row 2: Pipeline and Loss Reasons */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
              <div className="lg:col-span-3 bg-card card-base border border-border rounded-md p-5 shadow-sm relative">
                <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-2">Pipeline Analysis</h3>
                <CustomFunnelChart funnel={branchMetrics.funnel} />
              </div>
              <div className="lg:col-span-2 bg-card card-base border border-border rounded-md p-5 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-5 flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Loss Reason Breakdown</h3>
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <LossReasonList data={Object.entries(branchMetrics.lostReasons || {}).filter(([, count]) => (count as number) > 0).map(([reason, count]) => ({ reason, count: count as number }))} />
                </div>
              </div>
            </div>

            {/* Rep Leaderboard */}
            <div className="bg-card card-base border border-border/50 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Team Leaderboard</h3>
              </div>
              <div className="overflow-auto max-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-card border-b border-border/60">
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80" onClick={() => handleSort('name')}>
                        <div className="flex items-center space-x-1">
                          <span>Rep</span>
                          {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80 text-right" onClick={() => handleSort('avgResponseTimeHours')}>
                        <div className="flex items-center justify-end space-x-1">
                          <span>Resp Time</span>
                          {sortConfig?.key === 'avgResponseTimeHours' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80 text-right" onClick={() => handleSort('activeLeadsCount')}>
                        <div className="flex items-center justify-end space-x-1">
                          <span>Active Leads</span>
                          {sortConfig?.key === 'activeLeadsCount' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80 text-right" onClick={() => handleSort('conversion')}>
                        <div className="flex items-center justify-end space-x-1">
                          <span>Conv %</span>
                          {sortConfig?.key === 'conversion' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80 text-right" onClick={() => handleSort('revenue')}>
                        <div className="flex items-center justify-end space-x-1">
                          <span>Rev Closed</span>
                          {sortConfig?.key === 'revenue' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80 text-right" onClick={() => handleSort('deliveries')}>
                        <div className="flex items-center justify-end space-x-1">
                          <span>Delivered</span>
                          {sortConfig?.key === 'deliveries' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedBranchReps.map(rep => {
                      return (
                        <tr key={rep.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex items-center space-x-2">
                              <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground group-hover:text-primary transition-colors">{rep.name}</p>
                            </div>
                          </td>
                          <td className={`px-5 py-4 text-right text-sm font-semibold ${rep.avgResponseTimeHours > 5 ? 'text-red-500' : rep.avgResponseTimeHours <= 2 ? 'text-green-500' : 'text-foreground'}`}>
                            {rep.avgResponseTimeHours.toFixed(1)}h
                          </td>
                          <td className="px-5 py-4 text-right text-sm font-bold">{rep.activeLeadsCount}</td>
                          <td className="px-5 py-4 text-right text-sm font-semibold">{rep.conversion !== null ? `${rep.conversion.toFixed(1)}%` : 'N/A'}</td>
                          <td className="px-5 py-4 text-right text-sm font-semibold">₹{(rep.revenue / 10000000).toFixed(2)} Cr</td>
                          <td className="px-5 py-4 text-right text-sm font-semibold">{rep.deliveries}</td>
                          <td className="px-5 py-4 text-right">
                            <a href={`/sales-reps?rep=${rep.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-white transition-all cursor-pointer">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                    {branchReps.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">No reps found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Branch Leads Table */}
            <div className="bg-card card-base border border-border/50 rounded-3xl shadow-sm overflow-hidden mt-4">
              <div className="p-5 border-b border-border flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Branch Leads ({branchLeads.length})</h3>
                  {lostBranchLeads.length > 0 && (
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full text-xs font-semibold">Lost: {lostBranchLeads.length}</span>
                  )}
                </div>
              </div>
              <div className="overflow-auto max-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-card border-b border-border/60">
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80" onClick={() => handleLeadSort('customer_name')}>
                        <div className="flex items-center space-x-1">
                          <span>Customer</span>
                          {leadSortConfig?.key === 'customer_name' ? (leadSortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80" onClick={() => handleLeadSort('assigned_to')}>
                        <div className="flex items-center space-x-1">
                          <span>Sales Rep</span>
                          {leadSortConfig?.key === 'assigned_to' ? (leadSortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80" onClick={() => handleLeadSort('model_interested')}>
                        <div className="flex items-center space-x-1">
                          <span>Model</span>
                          {leadSortConfig?.key === 'model_interested' ? (leadSortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80" onClick={() => handleLeadSort('status')}>
                        <div className="flex items-center space-x-1">
                          <span>Status</span>
                          {leadSortConfig?.key === 'status' ? (leadSortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80 text-right" onClick={() => handleLeadSort('deal_value')}>
                        <div className="flex items-center justify-end space-x-1">
                          <span>Value</span>
                          {leadSortConfig?.key === 'deal_value' ? (leadSortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer hover:bg-muted/80 text-right" onClick={() => handleLeadSort('timeline')}>
                        <div className="flex items-center justify-end space-x-1">
                          <span>Timeline</span>
                          {leadSortConfig?.key === 'timeline' ? (leadSortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedBranchLeads.map(lead => {
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
                            <span className="text-sm font-semibold text-foreground">{dealershipData.sales_reps.find(r => r.id === lead.assigned_to)?.name || 'Unassigned'}</span>
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
                    {sortedBranchLeads.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                          No leads found for this branch.
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
