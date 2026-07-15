'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { dealershipData, ANCHOR_DATE, STAGNANT_LEAD_DAYS, getGlobalMetrics } from '@/lib/dealership-data';
import { useDashboardContext } from '@/lib/dashboard-context';
import { EntitySidebarList, SidebarItem } from '@/components/entity-sidebar-list';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import {
  AlertCircle,
  Clock,
  Truck,
  Building2,
  ArrowRight,
  Phone,
  Briefcase,
  AlertTriangle,
  FileText,
  Send,
  MessageSquare,
  CheckCircle2,
  Calendar,
  User,
  MapPin,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalFilterBar from '@/components/global-filter-bar';

type TabId = 'stagnant' | 'delayed-deliveries' | 'off-pace';

export default function ActionCenterPage() {
  return (
    <Suspense fallback={
      <div className="h-full w-full flex flex-col items-center justify-center space-y-3 bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-xs font-bold text-muted-foreground tracking-tight">Loading Action Center...</span>
      </div>
    }>
      <ActionCenterContent />
    </Suspense>
  );
}

function ActionCenterContent() {
  const searchParams = useSearchParams();
  const initTab = (searchParams.get('tab') as TabId) || 'stagnant';
  const initId = searchParams.get('id');

  const { timeFilter, dateRange, selectedBranches } = useDashboardContext();
  const [activeTab, setActiveTab] = useState<TabId>(initTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(initId);

  const allLeads = dealershipData.leads;
  const metrics = getGlobalMetrics(timeFilter, dateRange, selectedBranches);

  // 1. Stagnant Leads (Active leads idle for > 7 days)
  const stagnantLeads = useMemo(() => allLeads.filter(l => {
    if (['delivered', 'lost'].includes(l.status)) return false;
    // If branches are filtered, ensure lead is in selected branches
    if (selectedBranches.length > 0) {
      const rep = dealershipData.sales_reps.find(r => r.id === l.assigned_to);
      if (!rep || !selectedBranches.includes(rep.branch_id)) return false;
    }
    const idleDays = Math.round((ANCHOR_DATE.getTime() - new Date(l.last_activity_at).getTime()) / (1000 * 60 * 60 * 24));
    return idleDays > STAGNANT_LEAD_DAYS;
  }).map(l => {
    const idleDays = Math.round((ANCHOR_DATE.getTime() - new Date(l.last_activity_at).getTime()) / (1000 * 60 * 60 * 24));
    return { ...l, idleDays };
  }).sort((a, b) => b.idleDays - a.idleDays), [allLeads, selectedBranches]);

  // 2. Delayed Deliveries (Deliveries with delay_reason != null)
  const delayedDeliveries = useMemo(() => dealershipData.deliveries.filter(d => {
    if (!d.delay_reason) return false;
    // Check branch filter
    if (selectedBranches.length > 0) {
      const lead = allLeads.find(l => l.id === d.lead_id);
      const rep = lead && dealershipData.sales_reps.find(r => r.id === lead.assigned_to);
      if (!rep || !selectedBranches.includes(rep.branch_id)) return false;
    }
    return true;
  }).map(d => {
    const lead = allLeads.find(l => l.id === d.lead_id);
    return { ...d, lead };
  }).sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime()), [allLeads, selectedBranches]);

  // 3. Off-Pace Branches (targetAchievement < 100)
  const offPaceBranches = useMemo(() => metrics.branches.filter(b => b.targetAchievement < 100)
    .sort((a, b) => a.targetAchievement - b.targetAchievement), [metrics.branches]);

  // Ensure selected item exists or select first
  useEffect(() => {
    const activeList = activeTab === 'stagnant' ? stagnantLeads :
      activeTab === 'delayed-deliveries' ? delayedDeliveries :
        offPaceBranches;

    if (activeList.length > 0) {
      let idToSelect = (activeList[0] as any).id;
      if (activeTab === 'delayed-deliveries') idToSelect = (activeList[0] as any).lead_id;

      if (!selectedItemId || !activeList.some((item: any) => (item.id || item.lead_id) === selectedItemId)) {
        setSelectedItemId(idToSelect);
      }
    } else {
      setSelectedItemId(null);
    }
  }, [activeTab, stagnantLeads, delayedDeliveries, offPaceBranches, selectedItemId]);

  const getSidebarItems = (): SidebarItem[] => {
    let items: SidebarItem[] = [];
    if (activeTab === 'stagnant') {
      items = stagnantLeads.map(l => {
        const rep = dealershipData.sales_reps.find(r => r.id === l.assigned_to);
        const statusStr = l.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
        return {
          id: l.id,
          title: l.customer_name,
          subtitle: `${rep?.name || 'Unknown'} • ₹${(l.deal_value / 100000).toFixed(1)}L`,
          metricText: statusStr,
          badgeText: `Idle ${l.idleDays}d`,
          badgeColor: l.idleDays > 30 ? 'red' : l.idleDays > 14 ? 'amber' : 'primary'
        };
      });
    } else if (activeTab === 'delayed-deliveries') {
      items = delayedDeliveries.map(d => {
        const rep = d.lead && dealershipData.sales_reps.find(r => r.id === d.lead?.assigned_to);
        return {
          id: d.lead_id,
          title: d.lead?.customer_name || 'Unknown',
          subtitle: `${rep?.name || 'Unknown'} • ${d.delay_reason}`,
          badgeText: `Delay ${d.days_to_deliver}d`,
          badgeColor: 'red'
        };
      });
    } else {
      items = offPaceBranches.map(b => ({
        id: b.id,
        title: b.name,
        subtitle: b.city,
        metricText: `₹${(b.revenue / 10000000).toFixed(2)} Cr`,
        badgeText: `${b.targetAchievement.toFixed(1)}%`,
        badgeColor: 'amber'
      }));
    }

    if (searchTerm) {
      items = items.filter(i => i.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return items;
  };

  const selectedItemData = useMemo(() => {
    if (!selectedItemId) return null;
    if (activeTab === 'stagnant') return stagnantLeads.find(l => l.id === selectedItemId);
    if (activeTab === 'delayed-deliveries') return delayedDeliveries.find(d => d.lead_id === selectedItemId);
    if (activeTab === 'off-pace') return offPaceBranches.find(b => b.id === selectedItemId);
    return null;
  }, [selectedItemId, activeTab, stagnantLeads, delayedDeliveries, offPaceBranches]);

  const tabs = [
    { id: 'stagnant', label: 'Stagnant', count: stagnantLeads.length },
    { id: 'delayed-deliveries', label: 'Delayed', count: delayedDeliveries.length },
    { id: 'off-pace', label: 'Off-Pace', count: offPaceBranches.length },
  ];

  const filterElement = (
    <div className="flex bg-muted/50 p-1 rounded-full border border-border mt-3 w-full">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => { setActiveTab(tab.id as TabId); setSearchTerm(''); }}
          className={`flex-1 text-[11px] font-bold py-1.5 rounded-full transition-colors text-center truncate px-1 ${activeTab === tab.id ? 'bg-card shadow-sm text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
        >
          {tab.label} <span className="opacity-60 ml-0.5">({tab.count})</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* PAGE HEADER */}
      <div className="h-16 border-b border-border px-4 md:px-6 flex items-center justify-between flex-shrink-0 bg-card z-40 sticky top-0">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Action Center</h1>
        </div>
        <div className="flex items-center space-x-4 flex-shrink-0">
          <GlobalFilterBar />
        </div>
      </div>

      {/* PAGE CONTENT */}
      <div className="flex-1 flex overflow-hidden w-full">
        {/* LEFT PANEL: Inbox Queue */}
        <EntitySidebarList
          title="Action Queue"
          items={getSidebarItems()}
          selectedId={selectedItemId}
          onSelect={setSelectedItemId}
          showSearch={true}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search queue..."
          filterElement={filterElement}
          widthClass="w-1/3 md:w-[320px] lg:w-[380px] xl:w-[420px]"
        />

        {/* RIGHT PANEL: Action Details */}
        <div className="flex-1 w-full overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 bg-muted/10 relative">
          <AnimatePresence mode="wait">
            {!selectedItemData ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full text-muted-foreground"
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500 opacity-80" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Queue is Clear</h3>
                <p className="text-sm mt-1 max-w-sm text-center">No items require your attention in this category right now. Great job!</p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedItemId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl mx-auto space-y-4 w-full"
              >

                {/* STAGNANT LEADS ACTION VIEW */}
                {activeTab === 'stagnant' && (
                  <StagnantLeadDetail lead={selectedItemData} />
                )}

                {/* DELAYED DELIVERIES ACTION VIEW */}
                {activeTab === 'delayed-deliveries' && (
                  <DelayedDeliveryDetail delivery={selectedItemData} />
                )}

                {/* OFF-PACE BRANCHES ACTION VIEW */}
                {activeTab === 'off-pace' && (
                  <OffPaceBranchDetail branch={selectedItemData} />
                )}

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// ACTION DETAIL COMPONENTS
// ----------------------------------------------------------------------------

function StagnantLeadDetail({ lead }: { lead: any }) {
  const rep = dealershipData.sales_reps.find(r => r.id === lead.assigned_to);
  const branch = dealershipData.branches.find(b => b.id === rep?.branch_id);
  const statusStr = lead.status.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  const [selectedRep, setSelectedRep] = React.useState('');

  const isCritical = lead.idleDays > 30;
  const isWarning = lead.idleDays > 14 && lead.idleDays <= 30;

  const handleSendEmail = () => {
    toast.success(`Follow-up email drafted for ${lead.customer_name}`, {
      description: `Queued for ${rep?.name || 'assigned rep'} to review and send.`
    });
  };

  const handleReassign = () => {
    if (!selectedRep) {
      toast.error('Please select a representative first');
      return;
    }
    const newRep = dealershipData.sales_reps.find(r => r.id === selectedRep);
    toast.success(`Lead reassigned to ${newRep?.name}`, {
      description: `${lead.customer_name}'s lead has been transferred.`
    });
  };

  const handleLogCall = () => {
    toast.success('Call logged', {
      description: `Activity recorded for ${lead.customer_name} on ${formatDate(ANCHOR_DATE)}.`
    });
  };

  const handleAddNote = () => {
    toast.success('Note saved', {
      description: `Manager note added to ${lead.customer_name}'s lead profile.`
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Profile */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">{lead.customer_name}</h2>
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight ${isCritical ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
              isWarning ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                'bg-primary/10 text-primary border border-primary/20'
              }`}>
              Idle {lead.idleDays} Days
            </span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
            <p className="text-sm font-bold text-muted-foreground flex items-center">
              <Phone className="w-4 h-4 mr-1.5" /> {lead.phone}
            </p>
            <p className="text-sm font-bold text-muted-foreground flex items-center">
              <User className="w-4 h-4 mr-1.5" /> Assigned: {rep?.name || 'Unknown'}
            </p>
            <p className="text-sm font-bold text-muted-foreground flex items-center">
              <Building2 className="w-4 h-4 mr-1.5" /> {branch?.name || 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Context Banner */}
      <div className={`p-5 rounded-md border flex items-start space-x-4 ${isCritical ? 'bg-red-500/5 border-red-500/20' :
        isWarning ? 'bg-amber-500/5 border-amber-500/20' :
          'bg-primary/5 border-primary/20'
        }`}>
        <div className={`p-2 rounded-md ${isCritical ? 'bg-red-500/10 text-red-500' :
          isWarning ? 'bg-amber-500/10 text-amber-500' :
            'bg-primary/10 text-primary'
          }`}>
          {isCritical ? <AlertTriangle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        </div>
        <div>
          <h3 className={`text-sm font-bold mb-1 ${isCritical ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-primary'
            }`}>
            {isCritical ? 'Critical Intervention Required' : isWarning ? 'Attention Needed' : 'Follow-up Recommended'}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This lead has a potential value of <strong className="text-foreground">₹{(lead.deal_value / 100000).toFixed(1)} Lakhs</strong> but has seen no activity since <strong className="text-foreground">{formatDate(lead.last_activity_at)}</strong>. The current status is "{statusStr}". {isCritical && 'Immediate reassignment or manager outreach is recommended to prevent losing the deal.'}
          </p>
        </div>
      </div>

      {/* Action Interface */}
      <div className="bg-card card-base border border-border rounded-md shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-muted/5">
          <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Available Actions</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <button onClick={handleSendEmail} className="w-full flex items-center justify-between p-4 border border-border rounded-full bg-background hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground">Draft Customer Outreach</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Send a follow-up email</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>
            <button onClick={handleReassign} className="w-full flex items-center justify-between p-4 border border-border rounded-full bg-background hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground">Internal Reassignment</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Transfer lead to another rep</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          <div className="space-y-4">
            <button onClick={handleLogCall} className="w-full flex items-center justify-between p-4 border border-border rounded-full bg-background hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground">Log Activity</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Record a phone call</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>
            <button onClick={handleAddNote} className="w-full flex items-center justify-between p-4 border border-border rounded-full bg-background hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground">Add Note</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Add internal remarks</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DelayedDeliveryDetail({ delivery }: { delivery: any }) {
  const lead = delivery.lead;
  const rep = dealershipData.sales_reps.find(r => r.id === lead?.assigned_to);
  const branch = dealershipData.branches.find(b => b.id === rep?.branch_id);
  const [noteText, setNoteText] = React.useState('');

  const handleExpedite = () => {
    toast.success('Escalation raised', {
      description: `Logistics escalation for ${lead?.customer_name}'s delivery sent to regional distributor.`
    });
  };

  const handleNotifyCustomer = () => {
    toast.success(`Customer notified`, {
      description: `Apology message and updated delivery timeline sent to ${lead?.customer_name}.`
    });
  };

  const handleResolve = () => {
    toast.success('Delay marked as resolved', {
      description: `${lead?.customer_name}'s delivery issue has been closed.`
    });
  };

  const handleSaveNote = () => {
    if (!noteText.trim()) {
      toast.error('Note cannot be empty');
      return;
    }
    toast.success('Status note saved', {
      description: noteText
    });
    setNoteText('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">{lead?.customer_name || 'Unknown'}</h2>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight bg-red-500/10 text-red-500 border border-red-500/20">
              Delayed {delivery.days_to_deliver} Days
            </span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
            <p className="text-sm font-bold text-muted-foreground flex items-center">
              <Truck className="w-4 h-4 mr-1.5" /> Model: {lead?.model_id?.toUpperCase()}
            </p>
            <p className="text-sm font-bold text-muted-foreground flex items-center">
              <Calendar className="w-4 h-4 mr-1.5" /> Ordered: {formatDate(delivery.order_date)}
            </p>
            <p className="text-sm font-bold text-muted-foreground flex items-center">
              <Building2 className="w-4 h-4 mr-1.5" /> {branch?.name || 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Context Banner */}
      <div className="p-5 rounded-md border bg-red-500/5 border-red-500/20 flex items-start space-x-4">
        <div className="p-2 rounded-md bg-red-500/10 text-red-500">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold mb-1 text-red-500">
            Delivery Blocked: {delivery.delay_reason}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This vehicle was ordered on <strong className="text-foreground">{formatDate(delivery.order_date)}</strong> but has been delayed primarily due to <strong className="text-foreground">{delivery.delay_reason}</strong>. The target delivery window has been missed.
          </p>
        </div>
      </div>

      {/* Action Interface */}
      <div className="bg-card card-base border border-border rounded-md shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-muted/5 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Resolution Actions</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={handleExpedite} className="flex flex-col items-center justify-center p-4 border border-border rounded-md bg-background hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground">Expedite Logistics</span>
              <span className="text-xs text-muted-foreground text-center mt-1">Escalate to regional distributor</span>
            </button>
            <button onClick={handleNotifyCustomer} className="flex flex-col items-center justify-center p-4 border border-border rounded-md bg-background hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground">Notify Customer</span>
              <span className="text-xs text-muted-foreground text-center mt-1">Send apology &amp; updated timeline</span>
            </button>
            <button onClick={handleResolve} className="flex flex-col items-center justify-center p-4 border border-border rounded-md bg-background hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground">Resolve Issue</span>
              <span className="text-xs text-muted-foreground text-center mt-1">Mark delay as resolved</span>
            </button>
          </div>

          <div className="pt-4 border-t border-border">
            <label className="text-xs font-bold text-foreground flex items-center mb-3">
              <FileText className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Update Status Note
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add a note about the current status..."
                className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={handleSaveNote} className="px-4 py-2 bg-muted text-foreground border border-border text-xs font-bold rounded-full hover:bg-muted/80 transition-colors">Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OffPaceBranchDetail({ branch }: { branch: any }) {
  const isSeverelyOff = branch.targetAchievement < 70;

  const handleScheduleMeeting = () => {
    toast.success('Meeting scheduled', {
      description: `1:1 review request sent to ${branch.manager} at ${branch.name}.`
    });
  };

  const handleSendAlert = () => {
    toast.success('Target alert sent', {
      description: `Push notification dispatched to all ${branch.name} sales reps.`
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">{branch.name}</h2>
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight ${isSeverelyOff ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }`}>
              {branch.targetAchievement.toFixed(1)}% of Target
            </span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
            <p className="text-sm font-bold text-muted-foreground flex items-center">
              <MapPin className="w-4 h-4 mr-1.5" /> {branch.city}
            </p>
            <p className="text-sm font-bold text-muted-foreground flex items-center">
              <User className="w-4 h-4 mr-1.5" /> Manager: {branch.manager}
            </p>
          </div>
        </div>
      </div>

      {/* Context Banner */}
      <div className={`p-5 rounded-md border flex items-start space-x-4 ${isSeverelyOff ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'
        }`}>
        <div className={`p-2 rounded-md ${isSeverelyOff ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
          }`}>
          {isSeverelyOff ? <AlertTriangle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        </div>
        <div>
          <h3 className={`text-sm font-bold mb-1 ${isSeverelyOff ? 'text-red-500' : 'text-amber-500'
            }`}>
            Underperforming Target
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This branch has delivered <strong className="text-foreground">{branch.deliveries} units</strong> against a target of <strong className="text-foreground">{branch.targetUnits} units</strong>. Current revenue is <strong className="text-foreground">₹{(branch.revenue / 10000000).toFixed(2)} Cr</strong>. Performance review is recommended to identify bottlenecks.
          </p>
        </div>
      </div>

      {/* Action Interface */}
      <div className="bg-card card-base border border-border rounded-md shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-muted/5">
          <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Branch Management Actions</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <button onClick={handleScheduleMeeting} className="w-full flex items-center justify-between p-4 border border-border rounded-full bg-background hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-bold text-foreground">Schedule Review Meeting</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">Setup a 1:1 with {branch.manager}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>
            <button onClick={handleSendAlert} className="w-full flex items-center justify-between p-4 border border-border rounded-full bg-background hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-bold text-foreground">Send Target Alert</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">Automated push notification to reps</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          <div className="bg-muted/30 border border-border rounded-md p-4 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-foreground mb-1">Deep Dive</h4>
              <p className="text-[11px] text-muted-foreground mb-4">Analyze branch pipeline, lead sources, and rep performance to find the root cause of the slowdown.</p>
            </div>
            <a href={`/branch-intelligence?branch=${branch.id}`} className="w-full flex items-center justify-center px-4 py-2 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary/90 transition-colors shadow-sm">
              <Building2 className="w-3.5 h-3.5 mr-1.5" /> Go to Branch Intelligence
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
