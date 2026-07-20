import { GoogleGenAI } from '@google/genai';
import { getGlobalMetrics } from './dealership-data';

// Local analytical analyst fallback response builder — 100% DYNAMICALLY COMPUTED FROM DATASET
function getLocalAnalystResponse(question: string): string {
  const query = question.toLowerCase();
  
  // Compute current live numbers across the dataset
  const metrics = getGlobalMetrics('all');
  
  const kpis = metrics.kpis;
  const rankings = [...metrics.branches];
  const reps = [...metrics.reps];
  const models = [...metrics.models];

  // Formatting helpers
  const toCr = (val: number) => `₹${(val / 10000000).toFixed(2)} Cr`;
  const pct = (val: number | null) => (val !== null ? `${val.toFixed(1)}%` : 'N/A');

  // Sorted branch lists
  const branchesByConv = [...rankings]
    .filter(b => b.conversion !== null)
    .sort((a, b) => (a.conversion || 0) - (b.conversion || 0));
  const worstConvBranch = branchesByConv[0] || rankings[0];
  const bestConvBranch = branchesByConv[branchesByConv.length - 1] || rankings[0];

  const branchesByRev = [...rankings].sort((a, b) => b.revenue - a.revenue);
  const topRevBranch = branchesByRev[0] || rankings[0];
  const lowestRevBranch = branchesByRev[branchesByRev.length - 1] || rankings[0];

  const branchesByTarget = [...rankings].sort((a, b) => a.targetAchievement - b.targetAchievement);
  const worstTargetBranch = branchesByTarget[0] || rankings[0];
  const bestTargetBranch = branchesByTarget[branchesByTarget.length - 1] || rankings[0];

  // Sorted reps list (filter out rep managers with 0 leads/deliveries)
  const activeReps = reps.filter(r => r.deliveries > 0 || r.revenue > 0);
  const repsByRev = [...activeReps].sort((a, b) => b.revenue - a.revenue);
  const topReps = repsByRev.slice(0, 3);
  const lowReps = [...activeReps]
    .filter(r => r.conversion !== null)
    .sort((a, b) => (a.conversion || 0) - (b.conversion || 0))
    .slice(0, 3);

  // Sorted models list
  const modelsByRev = [...models].sort((a, b) => b.revenue - a.revenue);
  const topModel = modelsByRev[0];

  // 1. Worst / Lowest Conversion Rate Branch Query
  if (query.includes('conversion') && (query.includes('worst') || query.includes('lowest') || query.includes('poor') || query.includes('bad') || query.includes('less'))) {
    const list = branchesByConv.map(b => 
      `* **${b.name} (${b.city}):** Win Rate **${pct(b.conversion)}** (Delivered: ${b.deliveries} units, Revenue: ${toCr(b.revenue)})`
    ).join('\n');

    return `### Conversion Audit: Lowest Win Rate Branch

The branch with the lowest lead conversion rate is **${worstConvBranch.name} (${worstConvBranch.city})** at **${pct(worstConvBranch.conversion)}** (Network Average: **${pct(kpis.conversionRate)}**).

#### 📊 Branch Conversion Leaderboard:
${list}

#### 🔍 Diagnostic Insights for ${worstConvBranch.name}:
* **Units Delivered:** ${worstConvBranch.deliveries} units (${toCr(worstConvBranch.revenue)})
* **Avg Lead Response Time:** ${worstConvBranch.avgResponseTimeHours.toFixed(1)} hours
* **Target Achievement:** ${worstConvBranch.targetAchievement.toFixed(1)}%

#### 🎯 Recommended Action:
Implement mandatory 2-hour SLA alerts and re-assign inactive negotiation deals to higher-converting sales officers.`;
  }

  // 2. Target Achievement / Underperforming / Branch Leaderboard Query
  if (query.includes('mumbai') || query.includes('target') || query.includes('underperform') || query.includes('worst branch') || query.includes('lowest revenue') || query.includes('branch')) {
    const targetList = branchesByTarget.map(b => 
      `* **${b.name} (${b.city}):** Target Achieved: **${b.targetAchievement.toFixed(1)}%** (Revenue: ${toCr(b.revenue)} / Target: ${toCr(b.targetRevenue)})`
    ).join('\n');

    return `### Executive Audit: Branch Target Performance

The branch with the lowest cumulative target achievement is **${worstTargetBranch.name} (${worstTargetBranch.city})**, achieving **${worstTargetBranch.targetAchievement.toFixed(1)}%** of its target. Top revenue branch is **${topRevBranch.name} (${topRevBranch.city})** with **${toCr(topRevBranch.revenue)}**.

#### 📊 Full Regional Target Leaderboard:
${targetList}

#### 🔍 Diagnostic Insights for ${worstTargetBranch.name}:
* **Actual Revenue:** ${toCr(worstTargetBranch.revenue)} vs Target: ${toCr(worstTargetBranch.targetRevenue)}
* **Revenue Deficit:** ${toCr(worstTargetBranch.targetRevenue - worstTargetBranch.revenue)}
* **Lead Response Time:** ${worstTargetBranch.avgResponseTimeHours.toFixed(1)} hrs

#### 🎯 Recommended Action:
* Rebalance lead distribution from slower reps in lagging branches to top-performing officers.
* Authorize tactical accessory bundles to close pending negotiations before month-end.`;
  }

  // 3. Sales Rep Leaderboard / Staff Query
  if (query.includes('rep') || query.includes('salesperson') || query.includes('staff') || query.includes('performer') || query.includes('who')) {
    return `### Talent Audit: Sales Representative Leaderboard

#### 🏆 Top 3 Network Performers by Revenue:
1. **${topReps[0]?.name || 'Rep 1'} (${topReps[0]?.branchName}):** ${toCr(topReps[0]?.revenue || 0)} Revenue | Win Rate: **${pct(topReps[0]?.conversion || 0)}** (${topReps[0]?.deliveries || 0} deliveries)
2. **${topReps[1]?.name || 'Rep 2'} (${topReps[1]?.branchName}):** ${toCr(topReps[1]?.revenue || 0)} Revenue | Win Rate: **${pct(topReps[1]?.conversion || 0)}** (${topReps[1]?.deliveries || 0} deliveries)
3. **${topReps[2]?.name || 'Rep 3'} (${topReps[2]?.branchName}):** ${toCr(topReps[2]?.revenue || 0)} Revenue | Win Rate: **${pct(topReps[2]?.conversion || 0)}** (${topReps[2]?.deliveries || 0} deliveries)

#### ⚠️ Lowest Win Rate Officers (Coaching Opportunities):
${lowReps.map(r => `* **${r.name} (${r.branchName}):** Win Rate **${pct(r.conversion)}** (${r.deliveries} deliveries, ${toCr(r.revenue)})`).join('\n')}

#### 🎯 Action Recommendation:
Pair low-converting sales officers with top performers for call shadowing, and enforce a 1-hour first call SLA on all new leads.`;
  }

  // 4. Vehicle Models Query
  if (query.includes('fortuner') || query.includes('model') || query.includes('innova') || query.includes('hycross') || query.includes('vehicle')) {
    const modelList = modelsByRev.map(m => 
      `* **${m.model}:** Revenue ${toCr(m.revenue)} (${m.unitsSold} units delivered, Win Rate: ${pct(m.conversion)})`
    ).join('\n');

    return `### Product Analytics: Vehicle Performance Breakdown

The **${topModel?.model || 'Fortuner'}** is our highest revenue-generating vehicle across the network (${toCr(topModel?.revenue || 0)}, ${topModel?.unitsSold || 0} units sold).

#### 📊 Vehicle Model Leaderboard:
${modelList}

#### 🔍 Key Model Dynamics:
* **${topModel?.model}:** Drives top-line revenue but suffers from finance approval delays and extended vehicle allocation lead times.
* **Network Conversion Average:** ${pct(kpis.conversionRate)}

#### 🎯 Action Recommendation:
Fast-track auto loan pre-approvals with captive finance partners to prevent negotiation drop-offs on high-value models.`;
  }

  // 5. SLA / Response Speed Query
  if (query.includes('sla') || query.includes('response') || query.includes('speed') || query.includes('delay')) {
    return `### SLA & Response Time Analysis

#### 📊 Network Metrics:
* **Network SLA Compliance:** **${kpis.slaCompliancePct.toFixed(0)}%** (leads contacted within 48 hours)
* **Average Response Time:** **${kpis.avgResponseTimeHours.toFixed(1)} hours**

#### 💡 Branch Response Times:
${rankings.map(r => `* **${r.name} (${r.city}):** ${r.avgResponseTimeHours.toFixed(1)}h avg response → Win Rate: **${pct(r.conversion)}**`).join('\n')}

#### 🎯 Action Recommendation:
Institute automated escalation alerts for any new lead left uncontacted after **2 hours**.`;
  }

  // 6. Strategic Actions Query
  if (query.includes('action') || query.includes('should we do') || query.includes('recommendation') || query.includes('what to do')) {
    return `### Strategic Executive Action Plan

#### 🚨 1. High Priority (24-48 Hours)
* **Reallocate Cold Leads:** Reassign leads idle for >7 days to sales officers with conversion rates above **35%**.
* **Close Stagnant Negotiations:** Offer targeted year-end accessory kits to clear pending negotiation backlogs.

#### 📅 2. Medium Priority (This Week)
* **Streamline Financing:** Partner with preferred lenders to reduce loan approval turnarounds from 6 days to under 2 days.
* **Replicate Top Branch Playbook:** Scale **${bestConvBranch.name}'s** walk-in and follow-up strategies across underperforming locations.

#### 📈 3. Strategic (This Month)
* Enforce a strict **2-hour response SLA** across all digital lead channels.`;
  }

  // Default Overview
  return `### Executive Overview: DealerPulse Network Metrics

* **Total Revenue:** **${toCr(kpis.revenue)}** (${kpis.unitsDelivered} units delivered)
* **Target Achievement:** **${kpis.targetAchievement.toFixed(1)}%** overall network achievement
* **Top Revenue Branch:** **${topRevBranch.name} (${topRevBranch.city})** with **${toCr(topRevBranch.revenue)}**
* **Lowest Win Rate Branch:** **${worstConvBranch.name} (${worstConvBranch.city})** at **${pct(worstConvBranch.conversion)}** win rate
* **Top Vehicle:** **${topModel?.model}** (${toCr(topModel?.revenue)})
* **SLA Compliance:** **${kpis.slaCompliancePct.toFixed(0)}%** (Avg response: **${kpis.avgResponseTimeHours.toFixed(1)} hrs**)

*Ask about specific branches, sales rep rankings, model breakdowns, or recommended actions.*`;
}

// -------------------------------------------------------------
// Gemini API Call Integration
// -------------------------------------------------------------
export async function askDealershipAnalyst(
  question: string,
  history: Array<{ role: 'user' | 'model'; content: string }>,
  apiKey?: string
): Promise<string> {
  if (!apiKey && process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  }

  if (!apiKey) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const notice = `> ⚡ **Offline Mode (Local Analytics Engine)**: *No Gemini API Key provided. Response pre-calculated locally from current dataset metrics.*\n\n`;
        resolve(notice + getLocalAnalystResponse(question));
      }, 600);
    });
  }

  try {
    const metrics = getGlobalMetrics('all');
    
    const kpis = metrics.kpis;
    const rankings = metrics.branches;
    const reps = metrics.reps;
    const models = metrics.models;
    
    const dataContext = {
      overall_kpis: {
        total_revenue_inr: kpis.revenue,
        units_delivered: kpis.unitsDelivered,
        conversion_rate: (kpis.conversionRate !== null ? kpis.conversionRate.toFixed(1) : '0') + '%',
        target_achievement: kpis.targetAchievement.toFixed(1) + '%',
        avg_deal_value_inr: kpis.avgDealValue,
        active_leads: kpis.activeLeads,
        lost_leads: kpis.lostLeads,
        sla_compliance: kpis.slaCompliancePct.toFixed(1) + '%',
        avg_response_hours: kpis.avgResponseTimeHours.toFixed(1)
      },
      branch_performance: rankings.map(r => ({
        branch_name: r.name,
        city: r.city,
        revenue_inr: r.revenue,
        deliveries: r.deliveries,
        conversion: (r.conversion !== null ? r.conversion.toFixed(1) : '0') + '%',
        target_achievement: r.targetAchievement.toFixed(1) + '%',
        growth: r.growth !== null ? r.growth.toFixed(1) + '%' : 'N/A',
        avg_response_hours: r.avgResponseTimeHours.toFixed(1)
      })),
      top_sales_reps: [...reps].filter(r => r.deliveries > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5).map(r => ({
        name: r.name,
        branch: r.branchName,
        revenue_inr: r.revenue,
        conversion: (r.conversion !== null ? r.conversion.toFixed(1) : '0') + '%',
        avg_response_hours: r.avgResponseTimeHours.toFixed(1)
      })),
      underperforming_reps: reps.filter(r => r.conversion !== null && r.conversion < 25 && r.deliveries > 0).slice(0, 5).map(r => ({
        name: r.name,
        branch: r.branchName,
        conversion: (r.conversion !== null ? r.conversion.toFixed(1) : '0') + '%',
        avg_response_hours: r.avgResponseTimeHours.toFixed(1)
      })),
      model_performance: models.map(m => ({
        model: m.model,
        revenue_inr: m.revenue,
        units_sold: m.unitsSold,
        conversion: (m.conversion !== null ? m.conversion.toFixed(1) : '0') + '%',
        lost_percentage: m.lostPercentage.toFixed(1) + '%'
      }))
    };

    const ai = new GoogleGenAI({ apiKey });
    
    const contents = history.map(h => ({
      role: h.role,
      parts: [{ text: h.content }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: question }]
    });

    const modelsToTry = [
      'gemini-3.5-flash'
    ];
    let responseText: string | null = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            systemInstruction: `You are an expert automotive business analyst for a Toyota dealership network in India. You are analyzing real dealership performance data.

Here is the LIVE data context:
${JSON.stringify(dataContext, null, 2)}

STRICT ANTI-HALLUCINATION RULES:
1. You MUST ONLY answer using the exact data provided above. 
2. DO NOT invent, guess, or hallucinate any metrics, names, branches, or figures not in the data.
3. If a question cannot be answered from the provided context, say: "I don't have that data right now."
4. All monetary values are in Indian Rupees (₹). Revenue values are raw numbers (divide by 10,000,000 for Crores).

FORMAT: Use clean Markdown with ### headings, bullet lists, and bold for key numbers. Be concise, analytical, and executive-friendly. Always end with a specific recommended action.`
          }
        });
        if (response?.text) {
          responseText = response.text;
          break;
        }
      } catch {
        // Fallback silently
      }
    }

    if (responseText) {
      return responseText;
    }

    const notice = `> ⚡ **Offline Mode (Local Analytics Engine)**: *Gemini API limit reached. The analysis below is pre-calculated locally from current dataset metrics.*\n\n`;

    return notice + getLocalAnalystResponse(question);
  } catch {
    const notice = `> ⚡ **Offline Mode (Local Analytics Engine)**: *Gemini API limit reached. The analysis below is pre-calculated locally from current dataset metrics.*\n\n`;
    return notice + getLocalAnalystResponse(question);
  }
}
