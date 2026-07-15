'use client';

import React from 'react';
import { ANCHOR_DATE, STAGNANT_LEAD_DAYS, getGlobalMetrics } from '@/lib/dealership-data';
import { dealershipData } from '@/lib/dealership-data';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Truck,
  Target,
  Percent,
  Trophy,
  AlertTriangle,
  Activity,
  Timer,
  Zap,
  Clock,
  User,
  Users,
  Car,
  Globe,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { METRIC_DEFINITIONS } from '@/lib/metric-definitions';
import InfoTooltip from '@/components/info-tooltip';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie
} from 'recharts';
import { useDashboardContext } from '@/lib/dashboard-context';
import GlobalFilterBar from '@/components/global-filter-bar';
import { CustomFunnelChart } from '@/components/custom-funnel-chart';
import { ProgressBar } from '@/components/progress-bar';
import { BranchComparisonChart } from '@/components/branch-comparison-chart';
import KpiCard from '@/components/kpi-card';

// ─── Mini Sparkline ─────────────────────────────────────
function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const pts = data.map((v) => ({ v }));
  return (
    <div className="w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pts}>
          <Line type="monotone" dataKey="v" stroke={positive ? '#22c55e' : '#ef4444'} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

import ScoreCard from '@/components/score-card';
// ─── Ranked List ─────────────────────────────────────────
function RankedList({ title, data, type }: { title: string, data: any[], type: 'branch' | 'rep' }) {
  const [metric, setMetric] = React.useState<'revenue' | 'units' | 'avg'>('revenue');

  const valFormatter = (d: any) => {
    if (metric === 'revenue') return `₹${(d.revenue / 10000000).toFixed(2)} Cr`;
    if (metric === 'units') return `${d.unitsSold || d.deliveries} units`;
    return `₹${((d.revenue / (d.unitsSold || d.deliveries || 1)) / 100000).toFixed(1)} L`;
  };

  const sortVal = (d: any) => {
    if (metric === 'revenue') return d.revenue;
    if (metric === 'units') return d.unitsSold || d.deliveries;
    return d.revenue / (d.unitsSold || d.deliveries || 1);
  };

  const sortedData = [...data].sort((a, b) => sortVal(b) - sortVal(a)).slice(0, 5);
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
        <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">{title}</h3>
        <div className="flex items-center bg-muted/50 p-1 rounded-full border border-border">
          <button onClick={() => setMetric('revenue')} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center transition-colors ${metric === 'revenue' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Rev</button>
          <button onClick={() => setMetric('units')} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center transition-colors ${metric === 'units' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Units</button>
          <button onClick={() => setMetric('avg')} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center transition-colors ${metric === 'avg' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Avg</button>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {sortedData.map((d, idx) => {
          const rank = idx + 1;
          const val = sortVal(d);
          const pct = Math.max(2, (val / maxVal) * 100);
          // Sparkline for branches — only show when we have growth data
          const sparklineData = type === 'branch' && d.monthlyRevenue && d.growth !== null ? d.monthlyRevenue : null;
          const isUp = type === 'branch' && d.growth !== null ? d.growth > 0 : false;

          return (
            <div key={d.id} className="relative rounded-md overflow-hidden group border border-transparent transition-colors hover:bg-muted/30">
              <div className="absolute top-0 left-0 h-full bg-primary/10 dark:bg-primary/10 transition-all duration-500 ease-out rounded-r-md" style={{ width: `${pct}%` }} />
              <div className="relative p-2.5 flex items-center justify-between z-10">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm ${rankBadgeColor(rank)}`}>
                    {rank <= 3 ? <Trophy className="w-3.5 h-3.5" /> : rank}
                  </div>
                  <div>
                    <a href={type === 'branch' ? `/branch-intelligence?branch=${d.id}` : `/sales-reps?rep=${d.id}`} className="text-xs font-bold text-foreground hover:text-primary transition-colors block">
                      {d.name}
                    </a>
                    <p className="text-xs text-muted-foreground flex items-center">
                      {type === 'branch' ? d.city : `${d.branchName}`}
                      <span className="mx-1.5 opacity-50">•</span>
                      Avg: ₹{((d.revenue / (d.unitsSold || d.deliveries || 1)) / 100000).toFixed(1)} L
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {sparklineData && <MiniSparkline data={sparklineData} positive={isUp} />}
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


// ─── Models Donut ─────────────────────────────────────────
function ModelsDonut({ models }: { models: any[] }) {
  const [metric, setMetric] = React.useState<'revenue' | 'units'>('revenue');

  const valFormatter = (val: number) => {
    if (metric === 'revenue') return `₹${(val / 10000000).toFixed(2)} Cr`;
    return `${val} units`;
  };

  const sortVal = (d: any) => metric === 'revenue' ? d.revenue : (d.unitsSold || d.deliveries);
  const sortedData = [...models].sort((a, b) => sortVal(b) - sortVal(a));
  const COLORS = ['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
  const chartData = sortedData.map((d, i) => ({ name: d.model, value: sortVal(d), color: COLORS[i % COLORS.length] }));
  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-card card-base border border-border rounded-md p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Model Distribution</h3>
        <div className="flex items-center bg-muted/50 p-1 rounded-full border border-border">
          <button onClick={() => setMetric('revenue')} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center transition-colors ${metric === 'revenue' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Rev</button>
          <button onClick={() => setMetric('units')} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center transition-colors ${metric === 'units' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Units</button>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[200px]">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
              {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
            </Pie>
            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '12px' }} formatter={(val: any) => valFormatter(val)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-muted-foreground tracking-tight font-bold uppercase">Total</span>
          <span className="text-sm font-semibold text-foreground mt-0.5">{valFormatter(total)}</span>
        </div>
      </div>
      <div className="flex flex-col space-y-2.5 mt-4 flex-1 overflow-y-auto min-h-0 pr-1">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: d.color }} />
              <span className="text-muted-foreground">{d.name}</span>
            </div>
            <span className="text-foreground font-bold">{valFormatter(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Boardroom Summary ────────────────────────────────────
function BoardroomSummary({ rankedDealerships, rankedReps, rankedModels }: { rankedDealerships: any[]; rankedReps: any[]; rankedModels: any[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <RankedList title="Ranked Dealerships" data={rankedDealerships} type="branch" />
      <RankedList title="Ranked Sales Reps" data={rankedReps} type="rep" />
      <ModelsDonut models={rankedModels} />
    </div>
  );
}

// ─── Actionable Insights Feed ──────────────────────────────
function ActionableInsightsWidget({ metrics, dealershipData, ANCHOR_DATE }: { metrics: any; dealershipData: any; ANCHOR_DATE: Date }) {
  // 1. Off-Pace Branches Insight
  const offPaceBranches = metrics.branches.filter((b: any) => b.targetAchievement < 100).sort((a: any, b: any) => a.targetAchievement - b.targetAchievement);

  // 2. Stagnant Leads Insight
  const allLeads = dealershipData.leads;
  const activeLeads = allLeads.filter((l: any) => !['delivered', 'lost', 'order_placed'].includes(l.status));
  const highlyStagnant = activeLeads.filter((l: any) => {
    const idleDays = Math.floor((ANCHOR_DATE.getTime() - new Date(l.last_activity_at).getTime()) / (1000 * 3600 * 24));
    return idleDays > STAGNANT_LEAD_DAYS;
  });
  const stagnantValue = highlyStagnant.reduce((sum: number, l: any) => sum + l.deal_value, 0);

  // 3. Delayed Deliveries Insight
  const delayedDeliveries = dealershipData.deliveries.filter((d: any) => d.delay_reason);

  const insights = [];

  if (offPaceBranches.length > 0) {
    const worst = offPaceBranches[0];
    insights.push({
      id: worst.id,
      tab: 'off-pace',
      title: 'Branch Underperforming Target',
      desc: `${worst.name} branch is delivering at only ${worst.targetAchievement.toFixed(1)}% of its monthly target. Immediate review recommended.`,
      icon: TrendingDown,
      accent: 'red'
    });
  }

  if (highlyStagnant.length > 0) {
    const topStagnantBranchId = dealershipData.sales_reps.find((r: any) => r.id === highlyStagnant[0].assigned_to)?.branch_id;
    const topStagnantBranch = dealershipData.branches.find((b: any) => b.id === topStagnantBranchId);
    insights.push({
      id: highlyStagnant[0].id,
      tab: 'stagnant',
      title: 'High Pipeline Risk Detected',
      desc: `${highlyStagnant.length} leads have been idle for ${STAGNANT_LEAD_DAYS}+ days. ₹${(stagnantValue / 100000).toFixed(1)}L pipeline at risk.`,
      icon: Clock,
      accent: 'amber'
    });
  }

  if (delayedDeliveries.length > 0) {
    insights.push({
      id: delayedDeliveries[0].lead_id,
      tab: 'delayed-deliveries',
      title: 'Deliveries Blocked',
      desc: `${delayedDeliveries.length} vehicle deliveries are currently delayed (e.g. "${delayedDeliveries[0].delay_reason}").`,
      icon: Truck,
      accent: 'blue'
    });
  }

  return (
    <div className="bg-card card-base border border-border rounded-md p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Bottlenecks</h3>
        <a href="/action-center" className="text-xs text-primary font-bold hover:underline">View All</a>
      </div>

      <div className="space-y-3">
        {insights.length > 0 ? insights.map((insight, idx) => {
          const Icon = insight.icon;
          let accentClasses = '';
          let iconBgClasses = '';
          if (insight.accent === 'red') {
            accentClasses = 'border-l-red-500';
            iconBgClasses = 'bg-red-500/10 text-red-500';
          } else if (insight.accent === 'amber') {
            accentClasses = 'border-l-amber-500';
            iconBgClasses = 'bg-amber-500/10 text-amber-500';
          } else if (insight.accent === 'blue') {
            accentClasses = 'border-l-blue-500';
            iconBgClasses = 'bg-blue-500/10 text-blue-500';
          }
          return (
            <a key={idx} href={`/action-center?id=${insight.id}&tab=${insight.tab}`} className={`group flex items-start space-x-3 p-3 rounded-md border border-border bg-card hover:bg-accent/5 transition-all border-l-4 ${accentClasses} shadow-sm hover:shadow-md`}>
              <div className={`mt-0.5 p-1.5 rounded-md ${iconBgClasses}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{insight.title}</p>
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5 leading-snug">{insight.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all flex-shrink-0 mt-2 transform group-hover:translate-x-1" />
            </a>
          );
        }) : (
          <div className="p-6 text-center flex flex-col items-center text-muted-foreground bg-muted/30 rounded-md">
            <CheckCircle2 className="w-8 h-8 text-green-500/80 mb-2" />
            <span className="text-xs font-bold text-foreground">All clear</span>
            <span className="text-xs">No urgent insights detected.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function OverviewPage() {
  const { timeFilter, dateRange, selectedBranches } = useDashboardContext();
  const metrics = getGlobalMetrics(timeFilter, dateRange, selectedBranches);
  const { kpis, branches, reps, sources, models, funnel } = metrics;

  const rankedDealerships = [...branches];
  const rankedReps = [...reps].slice(0, 5);

  // Stagnant pipeline value: replace 15% magic number with actual computed value
  const stagnantPipelineDisplay = kpis.stagnantPipelineValue > 0
    ? `₹${(kpis.stagnantPipelineValue / 10000000).toFixed(2)} Cr stagnant (>14d)`
    : 'Pipeline healthy';

  const kpiCards = [
    {
      label: 'Revenue',
      value: (
        <>
          ₹{(kpis.revenue / 10000000).toFixed(2)}
          <span className="text-sm font-medium text-muted-foreground ml-1 tracking-normal">
            / {(kpis.targetRevenue / 10000000).toFixed(2)} Cr
          </span>
        </>
      ),
      icon: IndianRupee,
      pct: kpis.targetAchievement,
      pctLabel: '% of Target',
      subtext: `Delivered: ₹${(kpis.deliveredRevenue / 10000000).toFixed(2)} Cr`,
      growth: kpis.growth,
      highlight: 'none' as const,
      link: null,
      metricInfo: METRIC_DEFINITIONS.REVENUE
    },
    {
      label: 'Units Delivered',
      value: (
        <>
          {kpis.unitsDelivered}
          <span className="text-sm font-medium text-muted-foreground ml-1 tracking-normal">
            / {kpis.targetUnits}
          </span>
        </>
      ),
      icon: Truck,
      pct: kpis.targetUnitsAchievement,
      pctLabel: '% of Target',
      subtext: 'Total completed sales',
      growth: null,
      highlight: 'none' as const,
      link: null,
      metricInfo: METRIC_DEFINITIONS.UNITS_DELIVERED
    },
    {
      label: 'SLA Compliance',
      value: `${kpis.slaCompliancePct.toFixed(0)}%`,
      icon: ShieldCheck,
      pct: kpis.slaCompliancePct,
      pctLabel: 'SLA Met',
      subtext: `Avg: ${kpis.avgResponseTimeHours.toFixed(1)}h response`,
      highlight: kpis.slaCompliancePct >= 80 ? 'green' as const : kpis.slaCompliancePct >= 50 ? 'none' as const : 'red' as const,
      growth: null,
      link: null,
      metricInfo: METRIC_DEFINITIONS.SLA_COMPLIANCE
    },
    {
      label: 'Lead Conversion Rate',
      value: kpis.conversionRate !== null ? `${kpis.conversionRate.toFixed(1)}%` : 'N/A',
      icon: Percent,
      pct: null,
      subtext: 'Leads won / Total leads closed',
      growth: null,
      highlight: 'none' as const,
      link: null,
      metricInfo: METRIC_DEFINITIONS.WIN_RATE
    },
    {
      label: 'Active Pipeline',
      value: `₹${(kpis.activePipelineValue / 10000000).toFixed(2)} Cr`,
      icon: Activity,
      pct: null,
      subtext: stagnantPipelineDisplay,
      highlight: kpis.stagnantPipelineValue > 0 ? 'red-subtext' as const : 'none' as const,
      growth: null,
      link: '/action-center',
      metricInfo: METRIC_DEFINITIONS.ACTIVE_PIPELINE
    },
    {
      label: 'Sales Velocity',
      value: `${kpis.salesVelocity}d`,
      icon: Zap,
      pct: null,
      subtext: `Delivery: ${kpis.avgDaysToDeliver}d avg handover`,
      highlight: 'none' as const,
      growth: null,
      link: null,
      metricInfo: METRIC_DEFINITIONS.SALES_VELOCITY
    }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="h-16 border-b border-border px-4 md:px-6 flex items-center justify-between flex-shrink-0 bg-card z-10 sticky top-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
        <div className="flex items-center space-x-4 flex-shrink-0">
          <GlobalFilterBar />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 pb-24 md:pb-12">

        {/* Health Score + KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 lg:row-span-2 flex h-full">
            <ScoreCard
              title="Business Health"
              type="overall"
              targetAchievement={kpis.targetAchievement}
              slaCompliancePct={kpis.slaCompliancePct}
              funnel={funnel}
              stagnantRatio={metrics.kpis.stagnantPipelineValue > 0 ? (dealershipData.leads.filter(l => !['delivered', 'lost'].includes(l.status)).length > 0 ? (dealershipData.leads.filter(l => !['delivered', 'lost'].includes(l.status) && ANCHOR_DATE.getTime() - new Date(l.last_activity_at).getTime() > STAGNANT_LEAD_DAYS * 24 * 3600 * 1000).length / dealershipData.leads.filter(l => !['delivered', 'lost'].includes(l.status)).length) : 0) : 0}
              className="w-full h-full"
            />
          </div>
          {kpiCards.map((card, idx) => (
            <KpiCard key={idx} {...card} tooltipAlign={idx % 3 === 0 ? 'left' : idx % 3 === 2 ? 'right' : 'center'} className="lg:col-span-1" />
          ))}
        </div>

        {/* Funnel & Actions Rail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card card-base border border-border rounded-md p-5 shadow-sm relative">
            <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-2">Pipeline Analysis</h3>
            <CustomFunnelChart funnel={funnel} />
          </div>

          <ActionableInsightsWidget metrics={metrics} dealershipData={dealershipData} ANCHOR_DATE={ANCHOR_DATE} />
        </div>

        <div className="mt-4 mb-4">
          <BranchComparisonChart monthlyTrend={metrics.monthlyTrend} />
        </div>

        <BoardroomSummary rankedDealerships={rankedDealerships} rankedReps={rankedReps} rankedModels={models} />

      </div>
    </div>
  );
}
