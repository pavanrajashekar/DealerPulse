export interface MetricDefinition {
    title: string;
    description: string;
    calculation: string;
    importance: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
    REVENUE: {
        title: 'Revenue',
        description: 'The total monetary value of all closed-won deals.',
        calculation: "Sum of deal_value for all leads in 'delivered' or 'order_placed' status.",
        importance: 'The primary indicator of top-line business health and sales success.'
    },
    UNITS_DELIVERED: {
        title: 'Units Delivered',
        description: 'The total volume of vehicles successfully handed over to customers.',
        calculation: "Count of leads that have reached the 'delivered' status.",
        importance: 'Measures operational throughput and inventory turnover.'
    },
    WIN_RATE: {
        title: 'Win Rate',
        description: 'The percentage of resolved leads that resulted in a successful sale.',
        calculation: '(Closed Won / Total Closed) * 100 (excludes active pipeline).',
        importance: 'Indicates the effectiveness of the sales team at converting prospects into buyers.'
    },
    ACTIVE_PIPELINE: {
        title: 'Active Pipeline',
        description: 'The total potential value of all deals currently in progress.',
        calculation: "Sum of deal_value for leads not yet 'delivered' or 'lost'.",
        importance: 'Forecasts future revenue and helps identify if there is enough pipeline to meet upcoming targets.'
    },
    SLA_COMPLIANCE: {
        title: 'SLA Compliance',
        description: 'The percentage of leads that were responded to within the required timeframe.',
        calculation: '(Leads responded to < 48hrs / Total Leads) * 100.',
        importance: 'Fast response times directly correlate with higher win rates and better customer experience.'
    },
    SALES_VELOCITY: {
        title: 'Sales Velocity',
        description: 'The average speed at which a lead moves from creation to delivery.',
        calculation: 'Average days elapsed between lead created_at and delivery_date.',
        importance: 'Faster velocity means quicker revenue realization and lower customer drop-off.'
    },
    AVG_RESPONSE_TIME: {
        title: 'Avg Response Time',
        description: 'The average time taken by a sales rep to log their first interaction with a new lead.',
        calculation: 'Average hours between created_at and first_response_at.',
        importance: 'Crucial for capturing high-intent buyers before they engage with competitors.'
    },
    TARGET_ATTAINMENT: {
        title: 'Target Attainment',
        description: 'How current performance compares to the set goals.',
        calculation: '(Current Revenue / Target Revenue) * 100.',
        importance: 'Tracks pacing towards business objectives and triggers early interventions.'
    },
    ON_TIME_DELIVERY: {
        title: 'On-Time Delivery',
        description: 'The reliability of the dealership in meeting promised delivery dates.',
        calculation: 'Percentage of deliveries executed on or before the committed promised_date.',
        importance: 'Key driver of customer satisfaction (CSAT) and referral business.'
    },
    ACTIVE_LEADS: {
        title: 'Active Leads',
        description: 'The total number of prospects currently being worked by a rep or branch.',
        calculation: "Count of leads not in 'delivered' or 'lost' status.",
        importance: 'Helps balance workload; too many leads risk SLA breaches, too few risk missed targets.'
    },
    LOST_PROSPECTS: {
        title: 'Lost Prospects',
        description: 'The percentage of prospects that dropped out of the funnel.',
        calculation: '(Lost Leads / Total Leads) * 100.',
        importance: 'Highlights friction points in the sales process and potential product/pricing issues.'
    },
    AVG_DEAL_SIZE: {
        title: 'Avg Deal Size',
        description: 'The average revenue generated per vehicle sold.',
        calculation: 'Total Revenue / Units Sold.',
        importance: 'Identifies upselling success and shifts in customer model preferences.'
    },
    BUSINESS_HEALTH: {
        title: 'Business Health',
        description: 'A comprehensive, weighted score evaluating the overall operational health of the business.',
        calculation: '(Target 30%) + (SLA 25%) + (Funnel 25%) + (Pipeline 20%)',
        importance: 'Provides a single, at-a-glance pulse check to easily identify areas needing attention.'
    },
    BRANCH_HEALTH: {
        title: 'Branch Health',
        description: 'A comprehensive, weighted score evaluating the operational health of this specific branch.',
        calculation: '(Target 30%) + (SLA 25%) + (Funnel 25%) + (Pipeline 20%)',
        importance: 'Highlights top-performing branches and isolates regional operational bottlenecks.'
    },
    REP_HEALTH: {
        title: 'Rep Health',
        description: 'A comprehensive, weighted score evaluating the operational health of this sales representative.',
        calculation: '(Win Rate 30%) + (SLA 25%) + (Funnel 25%) + (Pipeline 20%)',
        importance: 'Identifies coaching opportunities and tracks individual sales effectiveness.'
    },
    MODEL_HEALTH: {
        title: 'Model Health',
        description: 'A comprehensive, weighted score evaluating the sales performance and demand for this vehicle model.',
        calculation: '(Win Rate 30%) + (SLA 25%) + (Funnel 25%) + (Pipeline 20%)',
        importance: 'Guides inventory allocation and marketing focus based on model traction.'
    }
};
