# Epic 07 — Reports & Spends

**Status:** Not Started
**Priority:** P1 — Requires expense + trip data to be meaningful
**Depends On:** Epic 05 (Expenses), Epic 06 (Trips), Epic 01 (Claude API)

## Goal
Users get visual spend reports at both the vehicle level and across all vehicles. An AI-generated narrative report adds insight beyond raw numbers. This epic closes the loop on MotoYaar's "understand your spend" value proposition.

---

## Stories

### STORY-07-01: Vehicle-Level Spend Report
**As a** vehicle owner,
**I want** to see a detailed spend breakdown for a specific vehicle,
**so that** I understand exactly where my money goes on that vehicle.

**Acceptance Criteria:**
- [ ] Accessible from Vehicle Detail → Expenses tab → "See Spends" button
- [ ] Summary cards: total spend, average monthly spend, most expensive category
- [ ] Chart area: user selects chart type (Bar / Line / Donut) via toggle; chart renders accordingly
  - Bar: spend per category (x = category, y = amount)
  - Line: spend over time by month
  - Donut: proportion of total spend by category
- [ ] Two tabs below chart: **Chart** (full-width chart) / **Table** (sortable expense summary by category with amounts and dates)
- [ ] Date filter: All time / This year / This month / Custom range
- [ ] Comparison to previous equivalent period shown below totals (e.g. "↑ ₹1,200 vs last month")

---

### STORY-07-02: Overall Spend Report (All Vehicles)
**As a** user with multiple vehicles,
**I want** to see a combined spend report across all my vehicles,
**so that** I understand my total vehicle ownership cost.

**Acceptance Criteria:**
- [ ] Accessible from Profile tab → "Reports" or from Dashboard
- [ ] Per-vehicle spend breakdown cards in addition to overall total
- [ ] Same chart types as vehicle-level report (Bar / Line / Donut toggle)
- [ ] Same Chart / Table tab layout
- [ ] Filter options:
  - Monthly: user picks two months to compare side-by-side
  - Date Range: user picks range; auto-compares to equivalent prior period (same duration, shifted back); user can override comparison range; both ranges displayed clearly
  - Yearly: auto-compares to previous year
- [ ] Comparison range displayed clearly in UI (e.g. "Nov 2025 vs Oct 2025")
- [ ] Currency: all amounts displayed in user's current currency setting; converted amounts noted with a tooltip if currency was changed

---

### STORY-07-03: AI Spend Report (Trigger & Async Generation)
**As a** user,
**I want** to request an AI-generated narrative report on my spending,
**so that** I get insights and patterns I might miss just looking at numbers.

**Acceptance Criteria:**
- [ ] "Generate AI report" button on the Overall Spend Report page
- [ ] Button shows remaining free reports this month (e.g. "1 free report available this month")
- [ ] If no expense data for the selected period: "No data to analyse for this period." — button disabled; free report not consumed
- [ ] On click (with data): API call triggers async Claude report generation
- [ ] User shown: "Your report is being generated. We'll notify you when it's ready." — toast + in-app notification queued
- [ ] User can leave the page; report generates in background
- [ ] After free report used: button replaced with "Come back next month for your next free report"
- [ ] Free report counter resets on the 1st of each month (per user)

---

### STORY-07-04: AI Spend Report (View Generated Report)
**As a** user,
**I want** to read my generated AI report,
**so that** I can act on the spending insights provided.

**Acceptance Criteria:**
- [ ] Generated report accessible from: Overall Spend Report page → "View report" + notification link
- [ ] Report displays as formatted text narrative (markdown rendered)
- [ ] Report includes: overall summary, per-vehicle breakdown highlights, trends, and actionable observations
- [ ] Report shows generation date and the period it covers
- [ ] Report is read-only; no regeneration within the same month
- [ ] Reports page shows history of previously generated reports (all months)

---

### STORY-07-05: AI Report Notification (Delivery)
**As a** user waiting for an AI report,
**I want** to be notified when my report is ready,
**so that** I don't have to keep checking the app.

**Acceptance Criteria:**
- [ ] On report generation completion: in-app notification created (type: ai_report_ready)
- [ ] Email sent via Resend: "Your MotoYaar AI report is ready" with link to report
- [ ] PWA push notification sent if user has push enabled
- [ ] Notification links directly to the generated report page

---

### STORY-07-06: Currency Conversion for Reports
**As a** user who changed their currency setting,
**I want** all report totals shown in my current currency,
**so that** I see a unified number regardless of when expenses were logged.

**Acceptance Criteria:**
- [ ] All expense amounts stored in original currency + original amount in DB
- [ ] On report generation: amounts converted to user's current currency setting
- [ ] Conversion note shown in report header: "Amounts converted to INR based on your current currency setting"
- [ ] If user has never changed currency (default INR throughout): no conversion note shown