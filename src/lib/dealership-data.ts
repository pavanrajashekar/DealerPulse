import rawData from '../../dealership_data.json';
import {
    DealershipData,
    Lead,
    GlobalMetrics,
    LeadStatus,
} from './types';

export const dealershipData = rawData as DealershipData;

// Anchor date: December 31, 2025 (latest date in dataset)
export const ANCHOR_DATE = new Date('2025-12-31T23:59:59Z');

// Single source of truth for "stagnant" lead threshold
export const STAGNANT_LEAD_DAYS = 7;

// We memoize the result to prevent recalculating everything on every render
// Added LRU cap to prevent unbounded memory growth
const MAX_CACHE_SIZE = 50;
const memoizedMetrics: Record<string, GlobalMetrics> = {};
let cacheKeys: string[] = [];

// Helper to compute funnel from a set of leads
function computeFunnelData(leads: Lead[]) {
    const stages: { stage: LeadStatus; label: string; count: number; value: number }[] = [
        { stage: 'new', label: 'New Lead', count: 0, value: 0 },
        { stage: 'contacted', label: 'Contacted', count: 0, value: 0 },
        { stage: 'test_drive', label: 'Test Drive', count: 0, value: 0 },
        { stage: 'negotiation', label: 'Negotiation', count: 0, value: 0 },
        { stage: 'order_placed', label: 'Order Placed', count: 0, value: 0 },
        { stage: 'delivered', label: 'Delivered', count: 0, value: 0 }
    ];

    const stageLostReasons: Record<LeadStatus, Record<string, number>> = {
        new: {}, contacted: {}, test_drive: {}, negotiation: {}, order_placed: {}, delivered: {}, lost: {}
    };

    leads.forEach(l => {
        const reached = new Set(l.status_history.map(h => h.status));

        // Auto-fill previous stages
        if (l.status === 'delivered' || reached.has('delivered')) {
            reached.add('order_placed'); reached.add('negotiation'); reached.add('test_drive'); reached.add('contacted'); reached.add('new');
        }
        if (l.status === 'order_placed' || reached.has('order_placed')) {
            reached.add('negotiation'); reached.add('test_drive'); reached.add('contacted'); reached.add('new');
        }
        if (l.status === 'negotiation' || reached.has('negotiation')) {
            reached.add('test_drive'); reached.add('contacted'); reached.add('new');
        }
        if (l.status === 'test_drive' || reached.has('test_drive')) {
            reached.add('contacted'); reached.add('new');
        }
        if (l.status === 'contacted' || reached.has('contacted')) {
            reached.add('new');
        }

        stages.forEach(s => {
            if (reached.has(s.stage)) {
                s.count++;
            }
        });

        if (l.status === 'lost') {
            const lostIdx = l.status_history.findIndex(h => h.status === 'lost');
            const prevStage = lostIdx > 0 ? l.status_history[lostIdx - 1].status : 'new';
            if (l.lost_reason) {
                if (!stageLostReasons[prevStage as LeadStatus][l.lost_reason]) {
                    stageLostReasons[prevStage as LeadStatus][l.lost_reason] = 0;
                }
                stageLostReasons[prevStage as LeadStatus][l.lost_reason]++;
            }
        }
    });

    return stages.map((s, idx) => {
        const nextCount = idx < stages.length - 1 ? stages[idx + 1].count : 0;
        const dropOffCount = s.count - nextCount;
        const dropOffPct = s.count > 0 ? (dropOffCount / s.count) * 100 : 0;
        const conversionFromStart = stages[0].count > 0 ? (s.count / stages[0].count) * 100 : 0;

        const lostReasonsMap = stageLostReasons[s.stage];
        let topReason = null;
        let max = 0;
        const breakdown = [];
        for (const [r, c] of Object.entries(lostReasonsMap)) {
            if (c > max) { max = c; topReason = r; }
            breakdown.push({ reason: r, count: c });
        }

        // Sort breakdown by count descending
        breakdown.sort((a, b) => b.count - a.count);

        // Add "Proceeded" to the bottom of the stack (first in array)
        if (nextCount > 0) {
            breakdown.unshift({ reason: 'Proceeded', count: nextCount });
        } else if (idx === stages.length - 1 && s.count > 0) {
            breakdown.unshift({ reason: 'Won', count: s.count });
        }

        return {
            ...s,
            dropOffPct,
            conversionFromStart,
            dropOffCount,
            topLostReason: topReason,
            breakdown
        };
    });
}

export function getGlobalMetrics(
    timeFilter: string = 'all',
    dateRange: { from: string | null, to: string | null } = { from: null, to: null },
    selectedBranches: string[] = []
): GlobalMetrics {
    const cacheKey = JSON.stringify({ timeFilter, dateRange, selectedBranches });
    if (memoizedMetrics[cacheKey]) {
        return memoizedMetrics[cacheKey];
    }

    // 1. FILTER DATA
    const leads = [...dealershipData.leads];
    const targets = [...dealershipData.targets];
    const deliveries = [...dealershipData.deliveries];

    const getFiltered = () => {
        let fLeads = leads;
        let fTargets = targets;
        let fDeliveries = deliveries;
        let prevFLeads: Lead[] = []; // for growth calculation

        // Apply explicit date range if provided
        if (dateRange.from && dateRange.to) {
            const fromDate = new Date(dateRange.from);
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999);
            fLeads = leads.filter(l => {
                const d = new Date(l.created_at);
                return d >= fromDate && d <= toDate;
            });
            fDeliveries = deliveries.filter(d => {
                const dDate = new Date(d.delivery_date);
                return dDate >= fromDate && dDate <= toDate;
            });
            const fromMonth = dateRange.from.substring(0, 7);
            const toMonth = dateRange.to.substring(0, 7);
            fTargets = targets.filter(t => t.month >= fromMonth && t.month <= toMonth);
        } else if (timeFilter !== 'all') {
            const cutoff = new Date(ANCHOR_DATE);
            const prevCutoff = new Date(ANCHOR_DATE);

            if (timeFilter === '30d') {
                cutoff.setDate(cutoff.getDate() - 30);
                prevCutoff.setDate(prevCutoff.getDate() - 60);
                fTargets = targets.filter(t => t.month === '2025-12');
            } else if (timeFilter === '90d') {
                cutoff.setDate(cutoff.getDate() - 90);
                prevCutoff.setDate(prevCutoff.getDate() - 180);
                const months = ['2025-10', '2025-11', '2025-12'];
                fTargets = targets.filter(t => months.includes(t.month));
            } else if (timeFilter.includes('-')) {
                fTargets = targets.filter(t => t.month === timeFilter);
                fLeads = leads.filter(l => l.created_at.startsWith(timeFilter));
                fDeliveries = deliveries.filter(d => d.delivery_date.startsWith(timeFilter));
            }

            if (timeFilter === '30d' || timeFilter === '90d') {
                fLeads = leads.filter(l => new Date(l.created_at) >= cutoff);
                fDeliveries = deliveries.filter(d => new Date(d.delivery_date) >= cutoff);
                prevFLeads = leads.filter(l => new Date(l.created_at) >= prevCutoff && new Date(l.created_at) < cutoff);
            }
        } else {
            const activeMonths = new Set(fLeads.map(l => l.created_at.substring(0, 7)));
            fTargets = targets.filter(t => activeMonths.has(t.month));
        }

        // Apply branch filter
        if (selectedBranches.length > 0) {
            fLeads = fLeads.filter(l => {
                const rep = dealershipData.sales_reps.find(r => r.id === l.assigned_to);
                return rep && selectedBranches.includes(rep.branch_id);
            });
            fDeliveries = fDeliveries.filter(d => {
                const lead = dealershipData.leads.find(l => l.id === d.lead_id);
                const rep = lead && dealershipData.sales_reps.find(r => r.id === lead.assigned_to);
                return rep && selectedBranches.includes(rep.branch_id);
            });
            fTargets = fTargets.filter(t => selectedBranches.includes(t.branch_id));
        }

        return { fLeads, fTargets, fDeliveries, prevFLeads };
    };

    const { fLeads, fTargets, fDeliveries, prevFLeads } = getFiltered();

    // Helper for growth
    const calculateGrowth = (currentRev: number, prevRev: number) => {
        if (prevRev === 0) return null; // Avoid division by zero, null indicates "New"
        return ((currentRev - prevRev) / prevRev) * 100;
    };

    // 2. COMPUTE KPIs
    const bookingsLeads = fLeads.filter(l => ['delivered', 'order_placed'].includes(l.status));
    const bookingsValue = bookingsLeads.reduce((sum, l) => sum + l.deal_value, 0);
    const deliveredLeads = fLeads.filter(l => l.status === 'delivered');
    const deliveredValue = deliveredLeads.reduce((sum, l) => sum + l.deal_value, 0);

    const unitsDelivered = deliveredLeads.length;
    const unitsBooked = bookingsLeads.length;
    const lostLeads = fLeads.filter(l => l.status === 'lost');

    const totalClosed = unitsBooked + lostLeads.length;
    const conversionRate = totalClosed > 0 ? (unitsBooked / totalClosed) * 100 : null;

    const targetRevenue = fTargets.reduce((sum, t) => sum + t.target_revenue, 0);
    const targetUnits = fTargets.reduce((sum, t) => sum + t.target_units, 0);
    const targetAchievement = targetRevenue > 0 ? (bookingsValue / targetRevenue) * 100 : 0;
    const targetUnitsAchievement = targetUnits > 0 ? (unitsBooked / targetUnits) * 100 : 0;

    const avgDealValue = unitsBooked > 0 ? bookingsValue / unitsBooked : 0;
    const activeLeadsCount = fLeads.filter(l => !['delivered', 'lost'].includes(l.status)).length;

    // Growth
    const prevBookings = prevFLeads.filter(l => ['delivered', 'order_placed'].includes(l.status));
    const prevBookingsValue = prevBookings.reduce((sum, l) => sum + l.deal_value, 0);
    const growth = timeFilter === 'all' ? null : calculateGrowth(bookingsValue, prevBookingsValue);

    // Response Time / SLA (48 hours)
    let totalResponseMs = 0;
    let slaMetCount = 0;
    let contactedCount = 0;

    fLeads.forEach(l => {
        const newH = l.status_history.find(h => h.status === 'new');
        const contactH = l.status_history.find(h => h.status === 'contacted');
        if (newH && contactH) {
            const ms = new Date(contactH.timestamp).getTime() - new Date(newH.timestamp).getTime();
            totalResponseMs += ms;
            contactedCount++;
            if (ms <= 48 * 60 * 60 * 1000) {
                slaMetCount++;
            }
        }
    });

    const avgResponseTimeHours = contactedCount > 0 ? (totalResponseMs / (1000 * 60 * 60)) / contactedCount : 0;
    const slaCompliancePct = contactedCount > 0 ? (slaMetCount / contactedCount) * 100 : 0;

    // Active Pipeline Value
    const activeLeads = fLeads.filter(l => !['delivered', 'lost'].includes(l.status));
    const activePipelineValue = activeLeads.reduce((sum, l) => sum + l.deal_value, 0);

    // Stagnant Pipeline Value (>14 days inactive)
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    const anchorTime = ANCHOR_DATE.getTime();
    const stagnantPipelineValue = activeLeads
        .filter(l => anchorTime - new Date(l.last_activity_at).getTime() > fourteenDaysMs)
        .reduce((sum, l) => sum + l.deal_value, 0);

    // Sales Velocity (avg days from new to delivered)
    let totalVelocityMs = 0;
    let velocityCount = 0;
    deliveredLeads.forEach(l => {
        const newH = l.status_history.find(h => h.status === 'new');
        const delH = l.status_history.find(h => h.status === 'delivered');
        if (newH && delH) {
            totalVelocityMs += new Date(delH.timestamp).getTime() - new Date(newH.timestamp).getTime();
            velocityCount++;
        }
    });
    const salesVelocity = velocityCount > 0 ? Math.round(totalVelocityMs / (1000 * 60 * 60 * 24) / velocityCount) : 0;

    // Avg Days to Deliver
    const validDeliveries = fDeliveries.filter(d => d.days_to_deliver > 0);
    const avgDaysToDeliver = validDeliveries.length > 0 ? Math.round(validDeliveries.reduce((sum, d) => sum + d.days_to_deliver, 0) / validDeliveries.length) : 0;

    // 3. COMPUTE FUNNEL
    const funnelData = computeFunnelData(fLeads);

    // Lost reasons globally
    const lostReasons: Record<string, number> = {};
    fLeads.forEach(l => {
        if (l.status === 'lost' && l.lost_reason) {
            lostReasons[l.lost_reason] = (lostReasons[l.lost_reason] || 0) + 1;
        }
    });

    // 4. COMPUTE BRANCHES
    const branchData = dealershipData.branches.map(b => {
        const bLeads = fLeads.filter(l => l.branch_id === b.id);
        const prevBLeads = prevFLeads.filter(l => l.branch_id === b.id);
        const bBooked = bLeads.filter(l => ['delivered', 'order_placed'].includes(l.status));
        const prevBBooked = prevBLeads.filter(l => ['delivered', 'order_placed'].includes(l.status));
        const bDelivered = bLeads.filter(l => l.status === 'delivered');

        const rev = bBooked.reduce((sum, l) => sum + l.deal_value, 0);
        const prevRev = prevBBooked.reduce((sum, l) => sum + l.deal_value, 0);
        const bGrowth = timeFilter === 'all' ? null : calculateGrowth(rev, prevRev);

        const delCount = bDelivered.length;
        const closedCount = bBooked.length + bLeads.filter(l => l.status === 'lost').length;
        const conv = closedCount > 0 ? (bBooked.length / closedCount) * 100 : null;

        const bTargets = fTargets.filter(t => t.branch_id === b.id);
        const tRev = bTargets.reduce((sum, t) => sum + t.target_revenue, 0);
        const tUnits = bTargets.reduce((sum, t) => sum + t.target_units, 0);
        const tAch = tRev > 0 ? (rev / tRev) * 100 : 0;

        let bTotalMs = 0, bContactCount = 0;
        let bSlaMet = 0, bSlaTotal = 0;
        bLeads.forEach(l => {
            const nh = l.status_history.find(h => h.status === 'new');
            const ch = l.status_history.find(h => h.status === 'contacted');
            if (nh && ch) {
                bTotalMs += new Date(ch.timestamp).getTime() - new Date(nh.timestamp).getTime();
                bContactCount++;

                bSlaTotal++;
                if ((new Date(ch.timestamp).getTime() - new Date(nh.timestamp).getTime()) <= 48 * 60 * 60 * 1000) {
                    bSlaMet++;
                }
            }
        });
        const bAvgResp = bContactCount > 0 ? (bTotalMs / (1000 * 60 * 60)) / bContactCount : 0;
        const bSlaCompliancePct = bSlaTotal > 0 ? (bSlaMet / bSlaTotal) * 100 : 0;

        const bActive = bLeads.filter(l => !['delivered', 'lost'].includes(l.status));
        const bStagnantCount = bActive.filter(l => ANCHOR_DATE.getTime() - new Date(l.last_activity_at).getTime() > STAGNANT_LEAD_DAYS * 24 * 3600 * 1000).length;
        const bStagnantRatio = bActive.length > 0 ? bStagnantCount / bActive.length : 0;

        const manager = dealershipData.sales_reps.find(r => r.branch_id === b.id && r.role === 'branch_manager')?.name || 'N/A';

        // Forecasting pace (simple implementation based on elapsed month time, Dec is fully elapsed if anchor is Dec 31)
        const paceRevenue = rev;
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (timeFilter === '30d' || timeFilter === '2025-12') {
            riskLevel = tAch >= 100 ? 'low' : tAch >= 80 ? 'medium' : 'high';
        } else {
            riskLevel = tAch >= 100 ? 'low' : tAch >= 80 ? 'medium' : 'high';
        }

        // Sparkline data
        const months = ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
        const monthlyRevenue = months.map(m => {
            const mRev = dealershipData.leads
                .filter(l => l.branch_id === b.id && l.created_at.startsWith(m) && ['delivered', 'order_placed'].includes(l.status))
                .reduce((sum, l) => sum + l.deal_value, 0);
            return mRev / 10000000;
        });

        return {
            id: b.id, name: b.name, city: b.city, manager,
            revenue: rev, deliveries: delCount, conversion: conv,
            targetRevenue: tRev, targetUnits: tUnits, targetAchievement: tAch,
            growth: bGrowth, avgResponseTimeHours: bAvgResp, slaCompliancePct: bSlaCompliancePct,
            paceRevenue, riskLevel, monthlyRevenue, stagnantRatio: bStagnantRatio,
            funnel: computeFunnelData(bLeads)
        };
    }).sort((a, b) => b.revenue - a.revenue);

    // 5. COMPUTE REPS
    const repsData = dealershipData.sales_reps.map(r => {
        const rLeads = fLeads.filter(l => l.assigned_to === r.id);
        const rBooked = rLeads.filter(l => ['delivered', 'order_placed'].includes(l.status));
        const rDelivered = rLeads.filter(l => l.status === 'delivered');
        const rLost = rLeads.filter(l => l.status === 'lost');
        const rActive = rLeads.filter(l => !['delivered', 'lost'].includes(l.status));

        const rev = rBooked.reduce((sum, l) => sum + l.deal_value, 0);
        const delCount = rDelivered.length;
        const closed = rBooked.length + rLost.length;
        const conv = closed > 0 ? (rBooked.length / closed) * 100 : null;

        let rTotalMs = 0, rContactCount = 0;
        let rSlaMet = 0, rSlaTotal = 0;
        rLeads.forEach(l => {
            const nh = l.status_history.find(h => h.status === 'new');
            const ch = l.status_history.find(h => h.status === 'contacted');
            if (nh && ch) {
                rTotalMs += new Date(ch.timestamp).getTime() - new Date(nh.timestamp).getTime();
                rContactCount++;

                rSlaTotal++;
                if ((new Date(ch.timestamp).getTime() - new Date(nh.timestamp).getTime()) <= 48 * 60 * 60 * 1000) {
                    rSlaMet++;
                }
            }
        });
        const rAvgResp = rContactCount > 0 ? (rTotalMs / (1000 * 60 * 60)) / rContactCount : 0;
        const rSlaCompliancePct = rSlaTotal > 0 ? (rSlaMet / rSlaTotal) * 100 : 0;

        let rTotalAgeMs = 0;
        let rStagnantCount = 0;
        rActive.forEach(l => {
            const inactiveMs = ANCHOR_DATE.getTime() - new Date(l.last_activity_at).getTime();
            rTotalAgeMs += inactiveMs;
            if (inactiveMs > STAGNANT_LEAD_DAYS * 24 * 3600 * 1000) rStagnantCount++;
        });
        const rAvgAge = rActive.length > 0 ? Math.min(214, (rTotalAgeMs / (1000 * 60 * 60 * 24)) / rActive.length) : 0;
        const rStagnantRatio = rActive.length > 0 ? rStagnantCount / rActive.length : 0;
        const rActivePipelineValue = rActive.reduce((sum, l) => sum + l.deal_value, 0);

        const bName = dealershipData.branches.find(b => b.id === r.branch_id)?.name || 'Unknown';

        return {
            id: r.id, name: r.name, branchId: r.branch_id, branchName: bName, role: r.role,
            revenue: rev, deliveries: delCount, conversion: conv, winRate: conv,
            avgResponseTimeHours: rAvgResp, avgLeadAgeDays: rAvgAge, slaCompliancePct: rSlaCompliancePct,
            activeLeadsCount: rActive.length, lostCount: rLost.length, stagnantRatio: rStagnantRatio,
            activePipelineValue: rActivePipelineValue,
            funnel: computeFunnelData(rLeads)
        };
    }).sort((a, b) => b.revenue - a.revenue);

    // 6. COMPUTE MODELS
    const allModels = [...new Set(dealershipData.leads.map(l => l.model_interested))];
    const modelsData = allModels.map(m => {
        const mLeads = fLeads.filter(l => l.model_interested === m);
        const prevMLeads = prevFLeads.filter(l => l.model_interested === m);

        const mBooked = mLeads.filter(l => ['delivered', 'order_placed'].includes(l.status));
        const prevMBooked = prevMLeads.filter(l => ['delivered', 'order_placed'].includes(l.status));
        const mLost = mLeads.filter(l => l.status === 'lost');
        const mActive = mLeads.filter(l => !['delivered', 'lost'].includes(l.status));

        const rev = mBooked.reduce((sum, l) => sum + l.deal_value, 0);
        const prevRev = prevMBooked.reduce((sum, l) => sum + l.deal_value, 0);
        const units = mBooked.length;

        const closed = units + mLost.length;
        const conv = closed > 0 ? (units / closed) * 100 : null;
        const avgVal = units > 0 ? rev / units : 0;
        const lostPct = closed > 0 ? (mLost.length / closed) * 100 : 0;

        let mGrowth = timeFilter === 'all' ? null : calculateGrowth(rev, prevRev);
        if (timeFilter === 'all') {
            const decBooked = leads.filter(l => {
                if (!['delivered', 'order_placed'].includes(l.status) || l.model_interested !== m) return false;
                const d = dealershipData.deliveries.find(d => d.lead_id === l.id);
                return d && (l.status === 'delivered' ? d.delivery_date : d.order_date).startsWith('2025-12');
            });
            const novBooked = leads.filter(l => {
                if (!['delivered', 'order_placed'].includes(l.status) || l.model_interested !== m) return false;
                const d = dealershipData.deliveries.find(d => d.lead_id === l.id);
                return d && (l.status === 'delivered' ? d.delivery_date : d.order_date).startsWith('2025-11');
            });
            mGrowth = calculateGrowth(
                decBooked.reduce((sum, l) => sum + l.deal_value, 0),
                novBooked.reduce((sum, l) => sum + l.deal_value, 0)
            );
        }

        // Top branch
        const bCounts: Record<string, number> = {};
        mBooked.forEach(l => { bCounts[l.branch_id] = (bCounts[l.branch_id] || 0) + 1; });
        let topBId = '', maxB = 0;
        for (const [id, c] of Object.entries(bCounts)) {
            if (c > maxB) { maxB = c; topBId = id; }
        }
        const topBranch = dealershipData.branches.find(b => b.id === topBId)?.name || 'Multiple';

        // Lost reasons
        const mReasons: Record<string, number> = {};
        mLost.forEach(l => { if (l.lost_reason) mReasons[l.lost_reason] = (mReasons[l.lost_reason] || 0) + 1; });
        const reasonsArr = Object.entries(mReasons).map(([r, c]) => ({ reason: r, count: c })).sort((a, b) => b.count - a.count);

        // Sources
        const mSources: Record<string, number> = {};
        mLeads.forEach(l => { mSources[l.source] = (mSources[l.source] || 0) + 1; });
        const sourcesArr = Object.entries(mSources).map(([s, c]) => ({ source: s, count: c })).sort((a, b) => b.count - a.count);

        let mSlaMet = 0, mSlaTotal = 0;
        mLeads.forEach(l => {
            const nh = l.status_history.find(h => h.status === 'new');
            const ch = l.status_history.find(h => h.status === 'contacted');
            if (nh && ch) {
                mSlaTotal++;
                if ((new Date(ch.timestamp).getTime() - new Date(nh.timestamp).getTime()) <= 48 * 60 * 60 * 1000) {
                    mSlaMet++;
                }
            }
        });
        const mSlaCompliancePct = mSlaTotal > 0 ? (mSlaMet / mSlaTotal) * 100 : 0;
        const mStagnantCount = mActive.filter(l => ANCHOR_DATE.getTime() - new Date(l.last_activity_at).getTime() > STAGNANT_LEAD_DAYS * 24 * 3600 * 1000).length;
        const mStagnantRatio = mActive.length > 0 ? mStagnantCount / mActive.length : 0;

        return {
            model: m, revenue: rev, unitsSold: units, conversion: conv, avgDealValue: avgVal,
            lostPercentage: lostPct, topBranch, trend: mGrowth, activeLeadsCount: mActive.length,
            lostReasons: reasonsArr, sources: sourcesArr, slaCompliancePct: mSlaCompliancePct,
            stagnantRatio: mStagnantRatio, funnel: computeFunnelData(mLeads)
        };
    }).sort((a, b) => b.revenue - a.revenue);

    // 7. COMPUTE SOURCES
    const allSources = [...new Set(dealershipData.leads.map(l => l.source))];
    const humanNames: Record<string, string> = {
        walk_in: 'Walk-In', website: 'Website', referral: 'Referral',
        social_media: 'Social Media', phone_enquiry: 'Phone Enquiry', auto_expo: 'Auto Expo'
    };

    const sourcesData = allSources.map(s => {
        const sLeads = fLeads.filter(l => l.source === s);
        const prevSLeads = prevFLeads.filter(l => l.source === s);
        const sBooked = sLeads.filter(l => ['delivered', 'order_placed'].includes(l.status));
        const prevSBooked = prevSLeads.filter(l => ['delivered', 'order_placed'].includes(l.status));
        const sLost = sLeads.filter(l => l.status === 'lost');

        const closed = sBooked.length + sLost.length;
        const conv = closed > 0 ? (sBooked.length / closed) * 100 : null;
        const val = sBooked.reduce((sum, l) => sum + l.deal_value, 0);
        const prevVal = prevSBooked.reduce((sum, l) => sum + l.deal_value, 0);

        let sGrowth = timeFilter === 'all' ? null : calculateGrowth(val, prevVal);
        if (timeFilter === 'all') {
            const decBooked = leads.filter(l => {
                if (!['delivered', 'order_placed'].includes(l.status) || l.source !== s) return false;
                const d = dealershipData.deliveries.find(d => d.lead_id === l.id);
                return d && (l.status === 'delivered' ? d.delivery_date : d.order_date).startsWith('2025-12');
            });
            const novBooked = leads.filter(l => {
                if (!['delivered', 'order_placed'].includes(l.status) || l.source !== s) return false;
                const d = dealershipData.deliveries.find(d => d.lead_id === l.id);
                return d && (l.status === 'delivered' ? d.delivery_date : d.order_date).startsWith('2025-11');
            });
            sGrowth = calculateGrowth(
                decBooked.reduce((sum, l) => sum + l.deal_value, 0),
                novBooked.reduce((sum, l) => sum + l.deal_value, 0)
            );
        }

        return {
            source: humanNames[s] || s,
            count: sLeads.length,
            conversion: conv,
            value: val,
            trend: sGrowth
        };
    }).sort((a, b) => (b.conversion || 0) - (a.conversion || 0)); // sort by conversion

    // 8. MONTHLY TREND
    const months = ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
    let filteredMonths = months;
    if (timeFilter === '30d') filteredMonths = ['2025-12'];
    if (timeFilter === '90d') filteredMonths = ['2025-10', '2025-11', '2025-12'];
    if (timeFilter.includes('-')) filteredMonths = [timeFilter];

    const monthlyTrend = filteredMonths.map(m => {
        const mLeads = leads.filter(l => l.created_at.startsWith(m));
        const mBooked = leads.filter(l => {
            if (!['delivered', 'order_placed'].includes(l.status)) return false;
            const d = dealershipData.deliveries.find(d => d.lead_id === l.id);
            if (!d) return false;
            if (l.status === 'delivered') return d.delivery_date.startsWith(m);
            return d.order_date.startsWith(m);
        });
        const mTargets = targets.filter(t => t.month === m);

        // Compute branch breakdown
        const branchBreakdown = dealershipData.branches.map(b => {
            const bReps = dealershipData.sales_reps.filter(r => r.branch_id === b.id).map(r => r.id);
            const bBooked = mBooked.filter(l => bReps.includes(l.assigned_to));
            const bLeads = mLeads.filter(l => bReps.includes(l.assigned_to));
            return {
                branchId: b.id,
                name: b.name,
                revenue: bBooked.reduce((sum, l) => sum + l.deal_value, 0),
                units: bBooked.length,
                leads: bLeads.length
            };
        });

        return {
            month: m,
            name: new Date(`${m}-02`).toLocaleString('default', { month: 'short' }),
            revenue: mBooked.reduce((sum, l) => sum + l.deal_value, 0),
            deliveries: mBooked.length,
            targetRevenue: mTargets.reduce((sum, t) => sum + t.target_revenue, 0),
            targetUnits: mTargets.reduce((sum, t) => sum + t.target_units, 0),
            branchBreakdown
        };
    });

    const finalMetrics: GlobalMetrics = {
        kpis: {
            revenue: bookingsValue,
            deliveredRevenue: deliveredValue,
            unitsDelivered,
            unitsBooked,
            conversionRate,
            targetAchievement,
            targetUnitsAchievement,
            avgDealValue,
            activeLeads: activeLeadsCount,
            lostLeads: lostLeads.length,
            targetRevenue,
            targetUnits,
            avgResponseTimeHours,
            slaCompliancePct,
            growth,
            salesVelocity,
            avgDaysToDeliver,
            activePipelineValue,
            stagnantPipelineValue
        },
        funnel: funnelData,
        branches: branchData,
        reps: repsData,
        models: modelsData,
        sources: sourcesData,
        monthlyTrend,
        lostReasons,
        timeFilter
    };

    memoizedMetrics[cacheKey] = finalMetrics;
    cacheKeys = cacheKeys.filter(k => k !== cacheKey);
    cacheKeys.push(cacheKey);
    if (cacheKeys.length > MAX_CACHE_SIZE) {
        const oldestKey = cacheKeys.shift();
        if (oldestKey) delete memoizedMetrics[oldestKey];
    }

    return finalMetrics;
}
