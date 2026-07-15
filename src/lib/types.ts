export interface Branch {
    id: string;
    name: string;
    city: string;
}

export type SalesRole = 'branch_manager' | 'sales_officer';

export interface SalesRep {
    id: string;
    name: string;
    branch_id: string;
    role: SalesRole;
    joined: string;
}

export type LeadStatus =
    | 'new'
    | 'contacted'
    | 'test_drive'
    | 'negotiation'
    | 'order_placed'
    | 'delivered'
    | 'lost';

export interface StatusTransition {
    status: LeadStatus;
    timestamp: string;
    note: string;
}

export interface Lead {
    id: string;
    customer_name: string;
    phone: string;
    source: string;
    model_interested: string;
    status: LeadStatus;
    assigned_to: string;
    branch_id: string;
    created_at: string;
    last_activity_at: string;
    status_history: StatusTransition[];
    expected_close_date: string;
    deal_value: number;
    lost_reason: string | null;
}

export interface Target {
    branch_id: string;
    month: string; // YYYY-MM
    target_units: number;
    target_revenue: number;
}

export interface Delivery {
    lead_id: string;
    order_date: string;
    delivery_date: string;
    days_to_deliver: number;
    delay_reason: string | null;
}

export interface DealershipData {
    metadata: {
        generated_at: string;
        description: string;
        date_range: string;
        notes: string;
    };
    branches: Branch[];
    sales_reps: SalesRep[];
    leads: Lead[];
    targets: Target[];
    deliveries: Delivery[];
}

export interface GlobalMetrics {
    kpis: {
        revenue: number;
        deliveredRevenue: number;
        unitsDelivered: number;
        unitsBooked: number;
        conversionRate: number | null;
        targetAchievement: number;
        targetUnitsAchievement: number;
        avgDealValue: number;
        activeLeads: number;
        lostLeads: number;
        targetRevenue: number;
        targetUnits: number;
        avgResponseTimeHours: number;
        slaCompliancePct: number; // Based on 48hr SLA
        growth: number | null;
        salesVelocity: number;
        avgDaysToDeliver: number;
        activePipelineValue: number;
        stagnantPipelineValue: number;
    };
    funnel: {
        stage: LeadStatus;
        label: string;
        count: number;
        value: number;
        dropOffPct: number;
        conversionFromStart: number;
        dropOffCount: number;
        topLostReason: string | null;
    }[];
    branches: {
        id: string;
        name: string;
        city: string;
        manager: string;
        revenue: number;
        deliveries: number;
        conversion: number | null;
        targetRevenue: number;
        targetUnits: number;
        targetAchievement: number;
        growth: number | null;
        avgResponseTimeHours: number;
        paceRevenue: number;
        riskLevel: 'low' | 'medium' | 'high';
        monthlyRevenue: number[];
        slaCompliancePct: number;
        stagnantRatio: number;
        funnel: {
            stage: LeadStatus;
            label: string;
            count: number;
            value: number;
            dropOffPct: number;
            conversionFromStart: number;
            dropOffCount: number;
            topLostReason: string | null;
        }[];
    }[];
    reps: {
        id: string;
        name: string;
        branchId: string;
        branchName: string;
        role: SalesRole;
        revenue: number;
        deliveries: number;
        conversion: number | null;
        winRate: number | null;
        avgResponseTimeHours: number;
        avgLeadAgeDays: number;
        activeLeadsCount: number;
        lostCount: number;
        activePipelineValue: number;
        slaCompliancePct: number;
        stagnantRatio: number;
        funnel: {
            stage: LeadStatus;
            label: string;
            count: number;
            value: number;
            dropOffPct: number;
            conversionFromStart: number;
            dropOffCount: number;
            topLostReason: string | null;
        }[];
    }[];
    models: {
        model: string;
        revenue: number;
        unitsSold: number;
        conversion: number | null;
        avgDealValue: number;
        lostPercentage: number;
        topBranch: string;
        trend: number | null;
        activeLeadsCount: number;
        lostReasons: { reason: string; count: number }[];
        sources: { source: string; count: number }[];
        slaCompliancePct: number;
        stagnantRatio: number;
        funnel: {
            stage: LeadStatus;
            label: string;
            count: number;
            value: number;
            dropOffPct: number;
            conversionFromStart: number;
            dropOffCount: number;
            topLostReason: string | null;
        }[];
    }[];
    sources: {
        source: string;
        count: number;
        conversion: number | null;
        value: number;
        trend: number | null;
    }[];
    monthlyTrend: {
        month: string;
        name: string;
        revenue: number;
        deliveries: number;
        targetRevenue: number;
        targetUnits: number;
        branchBreakdown?: {
            branchId: string;
            name: string;
            revenue: number;
            units: number;
            leads: number;
        }[];
    }[];
    lostReasons: Record<string, number>;
    timeFilter: string;
}
