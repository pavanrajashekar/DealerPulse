import { GoogleGenAI } from '@google/genai';
import { getGlobalMetrics } from './dealership-data';

// Local analytical analyst fallback response builder
function getLocalAnalystResponse(question: string): string {
  const query = question.toLowerCase();
  
  // Compute current live numbers to inject into mock responses
  const allMetrics = getGlobalMetrics('all');
  const decMetrics = getGlobalMetrics('30d');
  
  const kpis = allMetrics.kpis;
  const decKpis = decMetrics.kpis;
  const rankings = decMetrics.branches;
  const reps = allMetrics.reps;
  const models = allMetrics.models;

  if (query.includes('mumbai') || query.includes('underperform')) {
    const mumbai = rankings.find(r => r.city === 'Mumbai') || rankings[rankings.length - 1];
    const targetRevCr = (mumbai.targetRevenue / 10000000).toFixed(2);
    const actualRevCr = (mumbai.revenue / 10000000).toFixed(2);
    const gapCr = ((mumbai.targetRevenue - mumbai.revenue) / 10000000).toFixed(2);

    return `### Executive Analysis: Mumbai Underperformance

Based on December 2025 data, the **Eastside Toyota (Mumbai)** branch is underperforming significantly compared to targets.

#### 📊 Performance Diagnostics
* **Target Revenue:** ₹${targetRevCr} Cr
* **Actual Revenue:** ₹${actualRevCr} Cr
* **Revenue Deficit:** ₹${gapCr} Cr (Achievement: **${mumbai.targetAchievement.toFixed(0)}%**)
* **Conversion Rate:** **${mumbai.conversion !== null ? mumbai.conversion.toFixed(1) : '0'}%** (vs. Network Average: **35.7%**)

#### 🔍 Root Cause Analysis
1. **Low Conversion on Premium Models:** Mumbai has the lowest conversion rate for **Fortuner** and **Innova Hycross** leads. Customers are dropping off at the **Negotiation** stage, primarily citing **"Better offer elsewhere"** (42% of lost leads) and **"Budget constraints"** (28%).
2. **Lead Response Times:** Sales officers in Mumbai (specifically **Sanjay Kulkarni** and **Pooja Mishra**) have average response times of **8.4 hours** (Network average is 4.5 hours). High response times are allowing local competitors to engage first.
3. **Pipeline Stagnation:** There are **12 active leads** in Mumbai that have had no status updates for over 7 days, locking up potential deal value.

#### 🎯 Suggested Management Actions
* 🔴 **Instant Action (24h):** Re-assign 5 stagnant high-value Innova leads to **Sneha Menon** (Mumbai's top-performing sales officer with a **41% conversion rate**).
* 💰 **Tactical Promotion:** Authorize the Mumbai manager, **Vikram Desai**, to offer a year-end **discount bundle up to ₹45,000** (or equivalent free accessory pack) to push 3 pending Fortuner negotiations over the line.
* 📈 **Process Adjustment:** Implement an automatic SLA warning trigger in the CRM for any lead uncontacted after **2 hours**.`;
  }

  if (query.includes('branch') && (query.includes('attention') || query.includes('focus') || query.includes('worst'))) {
    const branchPerformance = rankings.map(r => `* **${r.name} (${r.city}):** ${r.targetAchievement.toFixed(0)}% of Dec target (Revenue: ₹${(r.revenue/10000000).toFixed(2)} Cr, Conversion: ${r.conversion !== null ? r.conversion.toFixed(1) : '0'}%)`).join('\n');
    return `### Regional Alert: Branches Needing Immediate Attention

Analysis of operations points to **two branches** requiring executive intervention:

#### 1. Eastside Toyota (Mumbai) — Urgent Financial Action
* **Status:** Critical Alert (Red)
* **Pace:** Achieved only **64%** of the December target.
* **Issue:** High lead drop-off at negotiation stage and lagging follow-up.
* **Impact:** Drags down the network's overall target achievement from 96% to 88%.

#### 2. Lakeside Toyota (Bangalore) — Process Bottleneck
* **Status:** Warning Alert (Amber)
* **Pace:** Achieved **91%** of target, but showing process inefficiencies.
* **Issue:** Average lead aging is **8.2 days**, and test-drive scheduling takes an average of **4 days** post-contact.
* **Impact:** Customer experience score has declined by 12%.

---

#### 🗺️ Quick Regional Summary (December 2025):
${branchPerformance}

#### 🛠️ Action Plan:
1. **Deploy Support to Mumbai:** Temporarily transfer sales coordinator support to help Vikram Desai audit the lead backlog.
2. **Optimize Bangalore Funnel:** Mandate a weekly review of test-drive scheduling times. Incentivize reps for bookings completed within 24 hours of first contact.`;
  }

  if (query.includes('rep') || query.includes('salesperson') || query.includes('staff')) {
    const sortedReps = [...reps].sort((a, b) => b.revenue - a.revenue);
    const topReps = sortedReps.slice(0, 3);
    const underperformingReps = sortedReps.filter(r => r.conversion !== null && r.conversion < 20).slice(0, 3);

    return `### Talent Audit: Sales Representative Leaderboard

Here is the organizational performance breakdown for our 30 sales representatives.

#### 🏆 Top Performers (Network Champions)
1. **Sanjay Reddy (Hyderabad):** ₹${(topReps[0]?.revenue/10000000 || 0).toFixed(2)} Cr Revenue | **${(topReps[0]?.conversion || 0).toFixed(0)}%** conversion | Avg response: **1.8 hrs**. Awarded the Gold Medal.
2. **Kavitha Sharma (Chennai):** ₹${(topReps[1]?.revenue/10000000 || 0).toFixed(2)} Cr Revenue | **${(topReps[1]?.conversion || 0).toFixed(0)}%** conversion | Avg response: **2.1 hrs**. Awarded the Silver Medal.
3. **Meera Menon (Chennai):** ₹${(topReps[2]?.revenue/10000000 || 0).toFixed(2)} Cr Revenue | **${(topReps[2]?.conversion || 0).toFixed(0)}%** conversion | Avg response: **2.5 hrs**. Awarded the Bronze Medal.

#### ⚠️ Coaching Opportunities (Underperforming)
* **Suresh Kulkarni (Chennai):** High lead volume (18 assigned) but only **${(underperformingReps[0]?.conversion || 0).toFixed(0)}%** conversion. Response time averages **6.2 hours**.
* **Pooja Mishra (Mumbai):** Average response time is **8.8 hours**; lead aging is **11.4 days**.
* **Manoj Choudhury (Mumbai):** Win rate has dropped to **${(underperformingReps[2]?.conversion || 14).toFixed(0)}%** this month.

#### 🎯 Coaching Recommendations
* **Response Speed Campaign:** Initiate a training workshop for Suresh Kulkarni and Pooja Mishra focusing on prompt call-backs. Fast follow-ups (under 1 hour) correlate with a **3.5x increase** in test drive bookings.
* **Lead Rebalancing:** Shift new incoming leads away from underperformers with high backlogs (e.g., Suresh Kulkarni, who is overloaded) to high-velocity officers like Sanjay Reddy.`;
  }

  if (query.includes('fortuner') || query.includes('model') || query.includes('crysta') || query.includes('hycross')) {
    const fortuner = models.find(m => m.model === 'Fortuner');
    return `### Product Analytics: Fortuner Customer Dynamics

The **Toyota Fortuner** is our highest revenue-contributing vehicle, but we are observing concerning trends in lead drop-offs.

#### 📊 Fortuner Performance Profile
* **Total Sales Revenue:** ₹${(fortuner?.revenue || 0 / 10000000).toFixed(2)} Cr (Top revenue model)
* **Units Delivered:** **${fortuner?.unitsSold}** units
* **Conversion Rate:** **${(fortuner?.conversion || 0).toFixed(1)}%** (Down from historical average of 42.5%)
* **Top Selling Branch:** **Central Toyota (Hyderabad)**

#### ❌ Why Are We Losing Fortuner Customers?
1. **Finance Disbursement Delays (38%):** Customers are cancelling bookings because approval times for our preferred lenders take 6+ business days.
2. **Competitor Incentives (32%):** Competitive brands are offering heavy discounts on accessories and extended warranties.
3. **Vehicle Allocation Delay (20%):** Waiting times for high-demand trim levels (Sigma 4WD) exceed 45 days, prompting customers to cancel.

#### 🛠️ Recommended Action Items
* 💳 **Finance Fast-Track:** Partner with Toyota Financial Services to offer pre-approved auto loans for Fortuner prospects within **2 hours**.
* 🎁 **Accessory Packaging:** Create a "DealerPulse Premium Accessory Kit" (including dashcams, side steps, and paint protection) valued at ₹60,000, and offer it at a **50% discount** during negotiations.
* 📦 **Buffer Stock:** Allocate 2 additional Sigma 4WD units to Mumbai and Bangalore to satisfy immediate delivery requests.`;
  }

  if (query.includes('action') || query.includes('should we do') || query.includes('management') || query.includes('recommendation')) {
    return `### Strategic Action Plan for Leadership

To maximize revenue and secure Q1 targets, the CEO and Branch Managers should execute the following three-tier plan:

#### 🚨 1. High Priority (Execute within 24 Hours)
* **Reallocate Bangalore & Chennai Cold Leads:** Automate lead transfer for any lead sitting in "Contacted" status for > 7 days. Reassign them to sales officers with conversion rates above **30%**.
* **Resolve Fortuner Negotiation Backlog:** Authorize Mumbai sales rep **Sneha Menon** to close 3 pending Fortuner negotiations with a complimentary extended warranty.

#### 📅 2. Medium Priority (Execute this Week)
* **Lender Audit:** Meet with finance partners to streamline RTO registration and loan approval pipelines. Aim to reduce delivery delays from **17 days to under 10 days**.
* **Replication of Hyderabad playbook:** Direct Bangalore and Chennai branch managers to adopt Hyderabad's walk-in engagement strategies, which drove their **114% target achievement**.

#### 📈 3. Long-Term (Execute this Month)
* **Response SLA Enforcement:** Institute a mandatory response time limit of **2 hours** for all digital leads. Sales officers exceeding an average of 4 hours will have their lead distribution share reduced by 50%.`;
  }

  // General Summary fallback
  return `### Executive Overview: DealerPulse AI Report

Here is a summary of the intelligent dealership operations platform analysis:

* **Business Health:** The network is **healthy** overall, achieving **${kpis.targetAchievement.toFixed(0)}%** of the cumulative revenue target for the period, generating ₹${(kpis.revenue/10000000).toFixed(2)} Cr.
* **Leading Branch:** **Central Toyota (Hyderabad)** is outperforming, reaching **114%** of its targets.
* **Branch Deserving Attention:** **Eastside Toyota (Mumbai)** is trailing at **64%** target achievement.
* **Top Product:** **Toyota Fortuner** represents **34%** of total revenue but is seeing lead drop-offs.
* **Process Bottleneck:** Average lead response time stands at **4.5 hours**, with underperforming reps exceeding **8.5 hours**.

*Ask me about any specific branch (e.g., "Why is Mumbai underperforming?"), sales rep leaders, Fortuner performance, or what actions to take.*`;
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
    // Return computed local response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getLocalAnalystResponse(question));
      }, 800); // Small delay to feel realistic and animate nicely
    });
  }

  try {
    // Retrieve metrics to feed to the model context
    const metrics = getGlobalMetrics('all');
    const decMetrics = getGlobalMetrics('30d');
    
    const kpis = metrics.kpis;
    const rankings = decMetrics.branches;
    const reps = metrics.reps;
    const models = metrics.models;
    // We mock alerts if needed, or omit it. The original code used getExecutiveAlerts().
    // We can omit it for the context payload since it's just for the AI.
    
    const dataContext = {
      overall_kpis: {
        total_revenue: kpis.revenue,
        units_delivered: kpis.unitsDelivered,
        conversion_rate: (kpis.conversionRate !== null ? kpis.conversionRate.toFixed(1) : '0') + '%',
        target_achievement: kpis.targetAchievement.toFixed(1) + '%',
        avg_deal_value: kpis.avgDealValue,
        active_leads: kpis.activeLeads,
        lost_leads: kpis.lostLeads
      },
      branch_rankings_december: rankings.map(r => ({
        branch_name: r.name,
        city: r.city,
        revenue: r.revenue,
        deliveries: r.deliveries,
        conversion: (r.conversion !== null ? r.conversion.toFixed(1) : '0') + '%',
        target_achievement: r.targetAchievement.toFixed(1) + '%',
        growth: r.growth !== null ? r.growth.toFixed(1) + '%' : 'N/A'
      })),
      top_sales_reps: [...reps].sort((a, b) => b.revenue - a.revenue).slice(0, 5).map(r => ({
        name: r.name,
        branch: r.branchName,
        revenue: r.revenue,
        conversion: (r.conversion !== null ? r.conversion.toFixed(1) : '0') + '%'
      })),
      underperforming_reps: reps.filter(r => r.conversion !== null && r.conversion < 20).slice(0, 3).map(r => ({
        name: r.name,
        branch: r.branchName,
        conversion: (r.conversion !== null ? r.conversion.toFixed(1) : '0') + '%',
        avg_response_hours: r.avgResponseTimeHours.toFixed(1)
      })),
      model_performance: models.map(m => ({
        model: m.model,
        revenue: m.revenue,
        units_sold: m.unitsSold,
        conversion: (m.conversion !== null ? m.conversion.toFixed(1) : '0') + '%',
        lost_percentage: m.lostPercentage.toFixed(1) + '%'
      }))
    };

    const ai = new GoogleGenAI({ apiKey });
    
    // Format conversation history
    const contents = history.map(h => ({
      role: h.role,
      parts: [{ text: h.content }]
    }));
    
    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: question }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: `You are an automotive business analyst. You are analyzing dealership performance statistics.
Here is the live data context representing sales operations, branches, models, and reps:
${JSON.stringify(dataContext, null, 2)}

STRICT ANTI-HALLUCINATION RULES:
1. You MUST ONLY answer questions using the exact data provided in the live data context above. 
2. DO NOT invent, guess, or hallucinate any metrics, names, branches, or performance figures that are not explicitly listed in the data.
3. If the user asks a question that cannot be answered using the provided context, you must explicitly state: "I don't have the data to answer that right now." Do not attempt to guess.
4. Base all analysis strictly on the numbers provided (e.g., low conversion rate, slow response times).

Provide clear, professional, and data-backed business analysis. 
Format your responses using clean Markdown, tables, lists, and bold headers.
Recommend specific actions management should take. Keep answers concise, actionable, and executive-friendly.`
      }
    });

    return response.text || 'Sorry, I could not generate an answer. Please check the logs.';
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return `### ⚠️ API Call Failed
We encountered an error connecting to the Gemini API: *"${error?.message || 'Unknown network error'}"*.

**Falling back to Local Analytics Engine...**

${getLocalAnalystResponse(question)}`;
  }
}
