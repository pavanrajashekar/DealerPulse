# DealerPulse: Architecture & Product Decisions

## 1. Executive Summary
DealerPulse is a real-time dealership performance dashboard engineered for dealership network CEOs and branch managers. It transforms complex raw data into a top-down view of vital business signs, offers intuitive drill-down paths, and surfaces actionable insights to directly improve sales velocity and operational efficiency.

---

## 2. Application Structure & Tech Stack
- **Framework:** Next.js (App Router). The routing structure (`src/app/`) perfectly mirrors the business domain: `overview`, `action-center`, `branch-intelligence`, `sales-reps`, and `models`.
- **Styling & UI Aesthetic:** Built with Tailwind CSS, utilizing a premium Glassmorphism design system. Supports seamless Light/Dark mode transitions via `next-themes`. Micro-animations (via Framer Motion) elevate the UX to feel like a high-end enterprise SaaS tool.
- **Data Visualization:** Recharts is used for responsive, accessible, and interactive charts (e.g., custom funnels and branch comparison charts).
- **State Management:** React Context (`DashboardContext`) holds the global filters (date ranges and selected branches), instantly synchronizing data across all views.
- **AI Integration:** Seamlessly integrates the Gemini API (`gemini.ts`) to provide natural language executive summaries, reducing cognitive load on leadership.

---

## 3. Core Features
- **Overview Dashboard:** Provides a high-level pulse of the business using robust KPI cards (Revenue, Sales, Lead Conversion, Health Score). It answers the immediate question: "Are we healthy?"
- **Action Center:** A three-tab priority inbox for managers (`Stagnant Leads`, `Delayed Deliveries`, `Off-Pace Branches`). It shifts the app from a passive reporting tool to an active operational queue.
- **AI Executive Summary:** Context-aware insights generated via the Gemini API, adjusting to the user's current filters and view. (Falls back to a structured local heuristic analyst if no API key is provided).
- **Comprehensive Drill-downs:** Specialized pages for deep-diving into individual branches (`branch-intelligence`), individual sales representative performance (`sales-reps`), and vehicle line performance (`models`).
- **Boardroom Mode:** A dedicated fullscreen toggle designed for executive presentations, stripping away browser chrome for a distraction-free experience.

---

## 4. Key Product & Architecture Decisions

### 4a. Centralized Data Aggregation
- **Decision:** Implemented a single, memoized `getGlobalMetrics` function (`dealership-data.ts`) to handle all data reduction.
- **Reasoning:** In earlier iterations, individual pages computed their own stats, which risked drift (e.g., off-by-one errors in funnels). Centralizing ensures a single source of truth. An LRU cache limits memory usage during rapid filter swapping.

### 4b. Anchor Date Time-Shifting
- **Decision:** The dataset spans June–December 2025. The system time "Today" is anchored to **December 31, 2025**.
- **Reasoning:** Filtering by the real-world current date would yield empty dashboards. Anchoring ensures relative date filters (e.g., "Last 30 Days") remain functional and illustrative of the app's capabilities.

### 4c. Unified "Stagnant" Definition
- **Decision:** A strict constant `STAGNANT_LEAD_DAYS = 7` is used globally.
- **Reasoning:** Ensures absolute consistency. The Action Center, Health Score algorithm, and sidebar badges all use the exact same logic for what constitutes a stagnant lead. 

### 4d. Standardized Metric Terminology
- **Decision:** The conversion metric is universally labeled **"Lead Conversion Rate"**.
- **Reasoning:** Prevents ambiguity in executive meetings. Standardized terminology builds trust in the data.

### 4e. Funnel Drop-off Attribution
- **Decision:** Drop-offs are attributed to the *current* stage (i.e., `dropOffCount = stageCount - nextStageCount`).
- **Reasoning:** This accurately reflects leads that successfully reached a stage but failed to advance out of it, correctly highlighting the true process bottleneck.

---

## 5. Interesting Patterns Discovered in the Data

- **Hyderabad (Central Toyota) Outperforms:** Achieved **114%** of its December target. This is driven by manager Sanjay Reddy's lightning-fast **1.8-hour** follow-up speed and a network-high **42.1%** lead conversion rate.
- **Mumbai (Eastside Toyota) Trails:** Finished December at ~64% of target revenue. The data reveals critical operational issues: lagging response times and abnormally high cancellation rates during the negotiation stage.
- **Toyota Fortuner Revenue Dominance:** Accounts for ~34% of overall revenue. However, its conversion rate dipped in the final 30 days. Status logs reveal the primary culprits are *"Finance disbursement pending"* (38% of cancellations) and *"Better offer elsewhere."*
- **Lead Source vs. Quality Mismatch:** Digital/website leads generate the highest volume but yield the lowest conversion rate. Conversely, walk-ins and referrals convert exceptionally well. This suggests a massive opportunity in improving top-of-funnel digital lead nurturing.

---

## 6. Future Scope & Roadmap (If More Time)

1. **Interactive CRM (Read/Write):** Evolve the platform from a read-only analytics dashboard to an actionable CRM. Enable managers to reassign leads, add follow-up notes, and progress deal stages directly from the UI.
2. **Automated SMS/WhatsApp Triggers:** Build background workers to auto-message customers when a lead ages past 3 days or a test drive is scheduled, enforcing process compliance.
3. **Inventory-Aware Forecasting:** Overlay sales pipeline data with live warehouse inventory. Warn managers proactively if high-intent buyers are negotiating for models that are about to stock out.
4. **Scheduled Export & Reporting:** Allow one-click PDF generation and scheduled weekly email digests for automated boardroom updates.
