# MotoYaar — Product Requirements Document (PRD)

**Version:** 1.0
**Status:** Draft
**Date:** 2026-03-15
**Author:** John (PM) · MotoYaar
**Source:** [Brainstorming Session Results](brainstorming-session-results.md)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Target Users](#4-target-users)
5. [User Personas](#5-user-personas)
6. [Jobs-to-be-Done](#6-jobs-to-be-done)
7. [Scope](#7-scope)
8. [Feature Requirements](#8-feature-requirements)
   - 8.1 Authentication & Onboarding
   - 8.2 Vehicle Management
   - 8.3 Document Management
   - 8.4 Expense Tracking
   - 8.5 Trip Logging
   - 8.6 Reports & Spends
   - 8.7 Community
   - 8.8 Notifications
   - 8.9 Vehicle Sharing / Invites
   - 8.10 Admin Dashboard
   - 8.11 User Profile & Settings
9. [Data Model Overview](#9-data-model-overview)
10. [Key Data Flow Rules](#10-key-data-flow-rules)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Tech Stack](#12-tech-stack)
13. [Edge Cases & Resolutions](#13-edge-cases--resolutions)
14. [Assumptions & Risks](#14-assumptions--risks)
15. [Out of Scope (Post-MVP)](#15-out-of-scope-post-mvp)
16. [Open Questions](#16-open-questions)

---

## 1. Executive Summary

MotoYaar is a mobile-first web application (PWA) for Indian vehicle owners — primarily motorcycle and car enthusiasts — that serves as a digital garage. It combines vehicle document management, expense tracking, trip logging, AI-powered insights, and a community social feed in a single platform.

The core value proposition is threefold:
- **Never miss a document expiry** — RC, Insurance, PUC parsed by AI and tracked with proactive alerts
- **Understand vehicle spend** — structured expense logging with visual reports and an AI narrative layer
- **Connect with enthusiasts** — a community feed for sharing trips, tips, and experiences

MotoYaar is a solo-developer, India-first product targeting launch as a fully free MVP, with paid AI features planned post-MVP.

---

## 2. Problem Statement

Indian vehicle owners face three persistent pain points:

1. **Document chaos** — RC, Insurance, and PUC certificates are physical papers or buried in WhatsApp. Expiry dates are missed, leading to fines, legal trouble, and last-minute renewals.

2. **No visibility into vehicle spend** — Fuel, service, repairs, and trips are paid without tracking. Owners have no idea of total cost of ownership or where money leaks.

3. **Fragmented enthusiast community** — Vehicle enthusiasts rely on generic social platforms (Instagram, Facebook groups) that lack context, structure, or vehicle-specific features.

MotoYaar solves all three in one app, with India-specific document formats, INR-first design, and a community built around vehicles.

---

## 3. Goals & Success Metrics

### MVP Goals
- Launch a fully functional, free PWA covering all core features
- Establish product-market fit among Indian vehicle enthusiasts
- Validate document parsing accuracy and user trust

### Success Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Registered users (3 months post-launch) | **50** | Beta via invite wave; organic post-launch |
| Vehicles added per active user | ≥ 1 | Activation signal |
| Expense entries per active user (30 days) | ≥ 3 | Retention / habit signal |
| Document expiry alerts delivered | — | Track delivery + open rate |
| AI reports generated | — | Track free report usage |
| Community posts per week | — | Engagement signal |

> **Launch target:** End of May 2026 (beta). 50 registered users within 3 months of launch.

---

## 4. Target Users

**Primary:** Indian vehicle owners (2-wheeler and 4-wheeler) who want to manage their vehicles digitally.

**Secondary:** Vehicle enthusiasts who want community connection, trip logging, and expense insights.

**Geography:** India-first. INR is the default currency; multi-currency is configurable.

**Platform:** Mobile-first (smartphone browser PWA). Desktop supported but not primary.

**Auth requirement:** Google account required (Google SSO only for MVP).

---

## 5. User Personas

### Persona 1 — The Responsible Owner (Primary)
- 25–40 years old, owns 1–2 vehicles
- Misses renewal dates, keeps documents in a physical folder or photos in phone gallery
- Wants peace of mind: "Tell me before something expires"
- Logs expenses occasionally, would do it more if the flow was fast

### Persona 2 — The Enthusiast Rider
- 22–35 years old, passionate about bikes/cars
- Takes weekend trips, mods their vehicle, follows the enthusiast community
- Wants to log trips with route + cost, share with the community
- May join MotoYaar primarily for community and discover the garage features

### Persona 3 — The Family Vehicle Manager
- Manages 2–4 vehicles for household
- Wants to share vehicle info with spouse/family members (view access)
- Cares deeply about document expiry — one person managing for all

---

## 6. Jobs-to-be-Done

| Feature | JTBD Statement |
|---------|---------------|
| **Vehicles** | When I add a vehicle, I want a single digital home for all its information and documents, so I never have to worry about where things are or miss an important expiry. |
| **Documents** | When I upload a vehicle document, I want it parsed and tracked automatically, so I get alerted before it expires without having to remember dates manually. |
| **Expenses** | When I log an expense, I want to categorize it with context (what, where, why), so I can understand exactly where my money goes over time. |
| **Trips** | When I log a trip, I want to capture route, duration, and cost breakdown, so I have a complete record of my journeys and their financial impact. |
| **Code Reports** | When I want to understand my spending, I want a detailed visual breakdown by category and time period with trend comparisons, so I can make smarter decisions about my vehicles. |
| **AI Report** | When I want deeper insight, I want an AI-generated narrative on my spending patterns, so I notice things I'd miss just looking at numbers. |
| **Community** | When I want to connect with other enthusiasts, I want to share experiences and get advice, so I feel part of a community that understands my passion. |
| **Invites** | When I share a vehicle with a family member, I want them to view its documents and history, so everyone stays informed without me relaying information manually. |
| **Notifications** | When a document is nearing expiry, I want to be alerted well in advance, so I never drive with an expired document or face legal trouble. |

---

## 7. Scope

### In Scope (MVP)
- Google SSO authentication + onboarding
- Vehicle management (add / edit / delete, multi-type)
- Document upload + AI parsing (RC, Insurance, PUC, Driver's License)
- Expense tracking (manual entry, receipt upload)
- Trip logging (manual, no live GPS)
- Code-calculated spend reports (vehicle-level + overall)
- AI spend report (1 free/month, async)
- Community feed (posts, comments, likes/dislikes, tags, reporting)
- Admin dashboard (moderation, user management)
- PWA push notifications + email alerts (document expiry)
- Vehicle sharing via invite (view-only)
- User profile + settings

### Out of Scope (Post-MVP)
See [Section 15](#15-out-of-scope-post-mvp).

---

## 8. Feature Requirements

### 8.1 Authentication & Onboarding

**Auth:**
- Google SSO is the only authentication method for MVP
- No username/password auth

**Onboarding Flow (first-time login):**
1. Name (mandatory)
2. Username (mandatory) — real-time uniqueness validation as user types
3. Profile image (optional)
4. Bio (optional)
5. Instagram link (optional)
6. On completion → tooltip/modal walkthrough of key sections: Dashboard, My Vehicles, Community, Expenses, Trips

**Walkthrough — Simple Modal Tour (Option A):**
- 5 modal cards, one per section: Dashboard, Garage, Community, Trips, Profile
- Each card: section name + one-line description + illustration placeholder
- Navigation: "Next" / "Skip" buttons; back navigation supported
- Copy tone: casual-friendly, clean — e.g. *"Your garage, organized."* / *"Every rupee, accounted for."*
- Skippable at any time (persists "seen" flag so it doesn't re-show)
- Re-accessible from Settings / Help
- Informational only — does not force "add first vehicle" action
- Community is accessible without a vehicle added

---

### 8.2 Vehicle Management

**Add Vehicle Flow (6 steps):**
1. Vehicle basics: Name, Type (2-wheeler / 4-wheeler / truck / other)
2. Vehicle details: Company, Model, Variant, Color, Registration Number (**mandatory**)
3. Purchase info: Bought on (date), Previous owners (number, default 0)
4. Vehicle image upload (optional)
5. Document upload: RC, Insurance, PUC (optional — can be done later)
6. Review & Save

**Validation:**
- Registration number is mandatory
- Same user cannot add the same registration number twice (validated on save)
- Duplicate reg numbers across different users are allowed (ownership changes)

**Vehicle Detail Page:**
- Header: Vehicle image, Name, Reg Number, Vehicle Type badge, Owned since, Previous owners, Edit/Delete (kebab menu)
- Tab 1 — **Overview:** total spend, last service, next doc expiry alert
- Tab 2 — **Documents:** RC, Insurance, PUC + other docs, each with expiry status (green / amber / red)
- Tab 3 — **Expenses:** expense list + "Add Expense" CTA + "See Spends" button
- Tab 4 — **Trips:** trips linked to this vehicle + "Add Trip" CTA

**Bottom Navigation (Mobile):**

| Tab | Contents |
|-----|----------|
| Home | Dashboard: horizontal scrollable vehicle cards + recent activity + community highlights |
| Garage | My Vehicles, docs, expenses per vehicle |
| Community | Posts, search, trending |
| Trips | All trips (live trip post-MVP) |
| Profile | Profile, settings, DL, reports, invite users |

---

### 8.3 Document Management

**Supported Documents:**
- RC (Registration Certificate)
- Insurance
- PUC (Pollution Under Control)
- Driver's License (added from Profile/Settings, not onboarding)
- Other (user-labeled)

**Document Parsing Flow (AI-assisted):**
1. User uploads document image/PDF
2. AI (Claude Vision API) extracts expiry date
3. Confirmation screen shown with extracted date
4. User approves or manually edits → saves
5. If parsing fails entirely → user manually enters expiry date as fallback
6. Document flagged as "Incomplete" if expiry date missing and user skips entry

**Storage Options:**
- **Default: Parse-only mode** — AI extracts expiry date; document is NOT stored after parsing
- **Opt-in: Full storage** — document stored in Cloudflare R2; auto-deleted 10 days after expiry date
- "Delete all my data" option in Settings removes all stored documents immediately

**Expiry Status Indicators:**
- Green: valid, expiry > 30 days away (or user's configured window)
- Amber: expiry within notification window (default 30 days)
- Red: expired

**Driver's License:**
- Added from Profile/Settings page (not onboarding)
- Parsed by AI (same flow as vehicle documents)
- Expiry tracked with same notification pipeline

---

### 8.4 Expense Tracking

**Expense Form Fields:**

| Field | Required | Notes |
|-------|----------|-------|
| Price | Yes | Currency defaults to INR (configurable) |
| Date | Yes | — |
| Reason | Yes | Dropdown: Service / Fuel / Trip / Others |
| Where | No | Free-text (post-MVP: OpenStreetMap Nominatim autocomplete) |
| Comments | No | Dropdown: Overpriced / Average / Underpriced |
| Receipt upload | No | Supported on all expense entries |

**Business Rules:**
- Reason = "Trip" → redirects user to create a new trip (expense auto-created from trip)
- A trip owns its expense entry — no standalone "Trip" reason expense for an existing trip; only editable
- Expenses with a past date show a warning but are allowed
- All expenses are always editable

---

### 8.5 Trip Logging

**Trip Form Fields:**

| Field | Required | Notes |
|-------|----------|-------|
| Title | Yes | — |
| Description | No | — |
| Date | Yes | Single day or date range (start → end) |
| Route | No | Free text (e.g. "Delhi to Manali") and/or maps link |
| Time taken | No | — |
| Vehicle | No | One vehicle or none (multi-vehicle post-MVP) |
| Expense breakdown | No | Categories: Food, Fuel, Stay, etc. |

**Trip → Expense → Vehicle Data Flow:**

| Scenario | Behavior |
|----------|----------|
| Trip created, vehicle linked | One combined expense entry auto-created under that vehicle's expenses |
| Trip created, no vehicle linked | Prompt: "This trip has no vehicle linked. Do you want to add it as a general expense?" — if Yes, creates under user's general/unlinked expenses |
| Trip breakdown contains Fuel, vehicle linked | Fuel included in the one combined vehicle expense entry |
| Trip breakdown contains Fuel, no vehicle linked | Same prompt as no-vehicle scenario |
| Trip deleted | Warning shown: "Deleting this trip will also delete its associated expense entries. This cannot be undone. Continue?" → cascade delete on confirm |

**Key Rule:** Each breakdown category does NOT create separate expense entries — **one combined entry per trip**.

---

### 8.6 Reports & Spends

**Vehicle-Level Report (Code-Calculated):**
- Totals by reason/category
- Spend on each expense type with dates
- Comparison to previous period (trends)
- **Chart types (user picks):** Bar (category comparison) / Line (trend over time) / Donut (spend proportion by category)
- **Layout:** Two tabs — **Chart** (selected chart rendered full-width) / **Table** (sortable data list)

**Overall Report (All Vehicles, Code-Calculated):**

| Filter | Comparison Logic |
|--------|-----------------|
| Monthly | User picks which months to compare |
| Date Range | Auto-compare to equivalent prior period (same duration, shifted back); user can override with custom comparison range; comparison range shown clearly in UI |
| Yearly | Auto-compare to previous year |

- Same chart types and Chart / Table tab layout as vehicle-level report

**AI Report:**
- Triggered via button on the overall spends page
- Covers overall spends with per-vehicle breakdowns included
- **1 free report per month per user**
- Free report NOT consumed if no data exists for the period ("No data" message shown)
- After free report used → "Come back next month" message
- Generation is **async**: user shown "We're generating your report. We'll notify you when it's ready." → in-app + email notification on completion
- Report accessible from Reports page after generation
- Paid add-ons (additional AI reports) → post-MVP

**Currency Handling:**
- Currency is configurable per user (default: INR)
- If user changes currency mid-period → all historical amounts converted to current currency setting for unified report totals

---

### 8.7 Community

**Post Structure:**

| Field | Required | Constraints |
|-------|----------|------------|
| Title | Yes | — |
| Description | Yes | Max 1,000 characters |
| Images | No | Max 2 per post |
| Links | No | — |
| Tags | No | Hybrid: predefined set + custom user-created tags |

**Predefined Tags:** Bikes, Cars, Mods, Travel, Maintenance, Fuel, Roads, Events, Help

**Feed:**
- Default: smart/trending algorithm (see below)
- Sort options: Trending, Newest

**Trending Algorithm — Reddit-style Hot Score:**
```
score = (likes - dislikes) / (age_in_hours + 2)^1.5
```
- Posts with higher net engagement rank higher
- Time decay (denominator) ensures older posts fall naturally
- Exponent 1.5 gives a ~6-hour "half-life" — fresh posts can surface quickly
- New posts with 0 votes get a baseline score, preventing them from disappearing instantly
- Recalculated server-side on feed load (no real-time updates needed at MVP scale)

**Engagement:**
- Likes & Dislikes shown as exact separate counts (e.g. 👍 24 👎 3)
- Comments: Reddit-style nested/threaded
- Post editing: allowed anytime; "Edited" label shown; full version history maintained
- Duplicate submission protection: identical title + description from same user within 60 seconds → blocked silently, toast shown: "Your post was already submitted."

**Reporting:**
- User selects reason: Spam / Inappropriate / Misinformation / Other
- Optional description field
- Auto-hide threshold: configurable from admin dashboard (default: 10 unique reports)
- Auto-hidden posts await admin review to restore or permanently remove

**Guest Access:**
- Community is view-only for non-logged-in users (reduces signup friction)
- Interaction (post, like, comment) requires login

---

### 8.8 Notifications

**Channels:**
- **PWA Push Notifications** (primary — mobile-first, no native app needed)
- **Email** (secondary, via Resend)
- Both channels used for document expiry alerts

**Notification Types:**

| Type | Trigger | Channel |
|------|---------|---------|
| Document expiry warning | X days before expiry (default 30, configurable per user) | PWA push + email |
| Document expired | Day of expiry | PWA push + email |
| Multiple docs expiring | Combined "X documents expiring soon" (not per-vehicle spam) | PWA push + email |
| AI report ready | Report generation complete | PWA push + email |
| Vehicle access revoked | Owner revokes invite | In-app |
| Warned/suspended | Admin action | In-app + email |

**Bell Icon:**
- Top bar bell icon opens notification dropdown/drawer
- Alert indicators for unread notifications

---

### 8.9 Vehicle Sharing / Invites

**Flow:**
1. Owner invites specific users via email to view a specific vehicle (not all vehicles)
2. Invitee receives email with invite link
3. Existing MotoYaar user → clicks link → granted view access immediately
4. New user → clicks link → directed to Google SSO signup → view access granted automatically after signup
5. Invite expires after **3 days** if not accepted

**Access Rules:**
- Invitees are **view-only** for MVP (no edit/delete)
- UI label: "Invite to view" (not "invite to manage")
- Owner can revoke access at any time from vehicle settings
- If owner deletes vehicle → invited viewers receive notification that vehicle has been removed

---

### 8.10 Admin Dashboard

**Access:**
- Dedicated hidden URL (not visible in main app navigation)
- Default admin account seeded to DB at setup
- Admin can create additional admin accounts
- Admin login: predefined credentials (separate from Google SSO)

**Moderation Actions on Reported Posts:**

| Action | Notes |
|--------|-------|
| Remove post | Permanent removal |
| Warn user | In-app + email notification to user |
| Suspend user | Admin sets duration manually; user notified in-app + email |
| Ban user | Permanent; cannot be undone. Banned user's posts/comments stay visible unless admin explicitly deletes during ban action |

**Other Admin Capabilities:**
- Post & pin/feature content (solves community cold-start)
- Configure auto-hide report threshold
- Configure notification defaults
- Re-link MotoYaar account to new Google ID (for lost Google account recovery)
- **Send invite emails to users** (admin-initiated — for beta seeding)

**Admin Analytics Dashboard:**

| Metric | Description |
|--------|-------------|
| Total registered users | All-time count |
| New users this week / month | Growth signal |
| Total vehicles added | Activation signal |
| Total posts / comments | Community health |
| AI reports generated this month | Free quota usage across all users |
| Document parsing success rate | % parsed successfully vs. manual fallback required |

---

### 8.11 User Profile & Settings

**Profile Page:**
- Edit name, username, bio, profile image, Instagram link
- Add/manage Driver's License (AI-parsed, expiry-tracked)
- Invite users to view vehicles
- Access to Reports

**Settings:**
- Default currency (default: INR)
- Notification window for document expiry (default: 30 days, configurable)
- Push notification preferences
- Document storage preference (parse-only vs. full storage)
- "Delete all my data" — removes all stored documents + account data
- Access walkthrough / help again

---

## 9. Data Model Overview

| Entity | Key Fields |
|--------|-----------|
| **User** | id, google_id, name, username, bio, profile_image_url, instagram_link, currency, notification_window_days, created_at |
| **Vehicle** | id, user_id, name, type, company, model, variant, color, registration_number, purchased_at, previous_owners, image_url, created_at |
| **Document** | id, vehicle_id (nullable), user_id, type (RC/Insurance/PUC/DL/Other), label, expiry_date, storage_url (nullable), parse_status, created_at |
| **Expense** | id, vehicle_id (nullable), user_id, trip_id (nullable), price, currency, date, reason, where_text, comment, receipt_url, created_at |
| **Trip** | id, user_id, vehicle_id (nullable), title, description, start_date, end_date, route_text, maps_link, time_taken, breakdown (JSON), created_at |
| **Post** | id, user_id, title, description, images (array), links (array), tags (array), edited, edit_history (JSON), created_at |
| **Comment** | id, post_id, parent_comment_id (nullable), user_id, content, created_at |
| **PostReaction** | id, post_id, user_id, type (like/dislike) |
| **PostReport** | id, post_id, reporter_user_id, reason, description, created_at |
| **VehicleInvite** | id, vehicle_id, owner_user_id, invitee_email, invitee_user_id (nullable), status, expires_at |
| **VehicleAccess** | id, vehicle_id, user_id, access_level (view) |
| **Notification** | id, user_id, type, title, body, read, created_at |

---

## 10. Key Data Flow Rules

### Expense ↔ Trip ↔ Vehicle Cascade Rules

```
ADD TRIP (vehicle linked)
  → auto-create 1 combined Expense linked to vehicle + trip

ADD TRIP (no vehicle)
  → prompt user: add as general expense?
  → if yes: auto-create 1 combined Expense (vehicle_id = null, trip_id = trip)

DELETE TRIP
  → warning: "This will also delete associated expense entries. Cannot be undone."
  → on confirm: cascade delete all expenses where trip_id = this trip

EXPENSE reason = "Trip"
  → redirect to create new trip (do not create standalone trip expense)
  → expense is owned by the trip; editable only through the trip
```

### Document Expiry Notification Rules

```
DAILY CRON / EVENT CHECK:
  → for each document with expiry_date:
    → if expiry_date - today <= notification_window_days AND no warning sent:
        → send warning notification (PWA push + email)
    → if expiry_date == today AND no expiry notification sent:
        → send expiry notification
    → if expiry_date < today:
        → set status = "Expired"
    → if multiple docs expiring for same user within same check:
        → combine into single notification
```

**Scheduling approach:** Daily cron job (not event-driven). Runs once per day, checks all documents for all users. Simple, predictable, easy to debug at MVP scale. Vercel Cron Jobs (free tier) or Supabase scheduled functions.

---

## 11. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Page load < 3s on 4G mobile; PWA offline support for cached data |
| **Availability** | Target 99.5% uptime for MVP |
| **Security** | HTTPS only; document storage with signed URLs; no document served publicly; Google OAuth token validation server-side |
| **Privacy** | Explicit privacy page: storage policy, access policy, encryption details; parse-only mode default; auto-delete 10 days post-expiry; "delete all my data" available |
| **Scalability** | Designed for vertical scale at MVP; stateless API for horizontal scale post-MVP |
| **AI Cost Control** | Same Claude API key used for both document parsing and AI reports; AI reports are async (no timeout pressure); free tier capped at 1/month/user |
| **Accessibility** | WCAG 2.1 AA baseline; readable font sizes on mobile |
| **i18n** | English-only for MVP; INR default currency; multi-currency configurable |

---

## 12. Tech Stack

**Guiding Principle:** Minimize cost for a solo developer. Prefer managed services with generous free tiers.

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Frontend + Backend** | Next.js (App Router) | Single repo for UI + API routes; Vercel free tier; ideal for PWA |
| **Database** | PostgreSQL via Supabase | Generous free tier; built-in auth helpers; Row Level Security |
| **Document Storage** | Cloudflare R2 | Near-zero egress cost vs. AWS S3; S3-compatible API |
| **Hosting** | Vercel | Free tier for Next.js; zero-config deployment; Edge functions available |
| **Email** | Resend | 3,000 emails/month free; developer-friendly API |
| **AI (Parsing + Reports)** | Claude API (Anthropic) | Vision for doc parsing; text generation for AI reports; single API |
| **Push Notifications** | Web Push API + service workers | Free; PWA-native; no native app required |
| **Auth** | NextAuth.js + Google OAuth | Free; integrates with Next.js; session management handled |

**Estimated MVP Monthly Cost (hobby/low-traffic tier):** ~$0–$10/month

---

## 13. Edge Cases & Resolutions

### Documents & Notifications

| # | Scenario | Resolution |
|---|----------|-----------|
| 1 | AI fails to parse expiry date, user skips manual entry | Document saved but flagged as "Incomplete" — visible in Documents tab with warning indicator |
| 2 | Document expires today | Warning notification sent within notification window. Urgent notification on expiry day. "Expired" status from next day. Notification prompts renewal. |
| 3 | Multiple documents expiring same week across vehicles | Single combined notification — not per-vehicle spam |

### Expenses & Trips

| # | Scenario | Resolution |
|---|----------|-----------|
| 4 | Trip deleted that has auto-created expense entries | Warning + cascade delete on confirm |
| 5 | Expense logged with date far in the past | Warn user but allow. Expense always editable. |
| 6 | Owner deletes vehicle with invited viewers | Viewers receive notification that vehicle has been removed |

### Community

| # | Scenario | Resolution |
|---|----------|-----------|
| 7 | Banned user's existing posts/comments | Stay visible unless admin explicitly deletes during ban action. Permanent bans cannot be undone. |
| 8 | User edits a post after engagement | "Edited" label shown. Full version history maintained. No time limit on editing. |
| 9 | Duplicate post submission (double-tap / network retry) | Identical title + description from same user within 60 seconds → blocked silently; toast: "Your post was already submitted." |
| 10 | Post reported by multiple users | Auto-hidden after X reports (threshold configurable, default 10). Awaits admin review. |

### Reports & AI

| # | Scenario | Resolution |
|---|----------|-----------|
| 11 | AI report requested with no expense data | "No data" message. Free monthly report NOT consumed. |
| 12 | Expenses logged in multiple currencies | All amounts converted to user's current currency setting for report totals |
| 13 | AI report API latency | Async generation; user notified via in-app + email when ready |

### Invites & Access

| # | Scenario | Resolution |
|---|----------|-----------|
| 14 | Invitee never signs up after invite email | Invite expires after 3 days |
| 15 | User loses access to their Google account | No self-serve recovery. User contacts support → admin manually re-links to new Google ID from admin dashboard |

### Vehicles

| # | Scenario | Resolution |
|---|----------|-----------|
| 16 | Duplicate registration numbers across users | Allowed (ownership changes over time). Same user cannot add same reg number twice. |

---

## 14. Assumptions & Risks

| # | Assumption | Risk | Resolution |
|---|------------|------|-----------|
| 1 | All target users have a Google account | Users without Google cannot access MotoYaar | Accepted for MVP. Monitor post-launch feedback. |
| 2 | AI can reliably parse Indian vehicle documents | RC, Insurance, PUC formats vary; regional languages may break parsing | Review-and-confirm flow + manual fallback always available |
| 3 | Users are motivated enough to log expenses manually | Habit formation is fragile; logging friction kills retention | Minimize form fields, smart defaults, quick-add flows are critical |
| 4 | Community will have enough users at launch | Empty feed = poor first impression | Admin can post & pin content; community view-only for guests; beta invite wave before public launch |
| 5 | Users will trust a new app with sensitive legal documents | Uploading RC/Insurance/PUC to an unknown app requires trust | Explicit privacy page; parse-only mode default; auto-delete policy; "delete all my data" option |
| 6 | Email notifications are sufficient | Mobile-first users ignore email | PWA push notifications as primary channel + email as secondary |
| 7 | 1 free AI report/month meets user needs | Power users may feel limited | Accepted for MVP. Paid add-ons planned post-MVP. |

---

## 15. Out of Scope (Post-MVP)

| Feature | Notes |
|---------|-------|
| Live GPS trip tracking | Route, speed, real-time logging |
| DigiLocker / government API integration | Document fetching via official APIs |
| Edit permissions for invited vehicle viewers | MVP is view-only |
| Multi-vehicle trip support | MVP: one vehicle or none per trip |
| Paid AI report subscriptions / add-ons | MVP: 1 free/month |
| Multi-user trip expense splitting | — |
| OpenStreetMap Nominatim autocomplete for "Where" field | Functional without it at MVP |
| Cross-user vehicle history | Full ownership + service history by reg number |
| Community-sourced fuel price tracking | By location |
| Insurance renewal integrations | Redirect to renew from expiry alert |
| Vehicle resale value estimator | Based on logged expenses + service history |

---

## 16. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | What is the specific registered user target for the first 3 months? | Founder | **Resolved: 50 users** |
| 2 | What is the target launch date / beta date? | Founder | **Resolved: End of May 2026** |
| 3 | What is the post description character limit for community posts? | PM / Design | **Resolved: 1,000 characters** |
| 4 | What does the onboarding walkthrough look like in detail (screens, copy, illustrations)? | PM / Design | **Resolved: Simple modal tour, 5 cards, casual-friendly tone (see §8.1)** |
| 5 | How will the trending algorithm for community posts work? | Engineering | **Resolved: Reddit-style hot score (see §8.7)** |
| 6 | What does the spends report UI look like in detail (chart types, layout)? | PM / Design | **Resolved: Bar/Line/Donut, Chart + Table tabs (see §8.6)** |
| 7 | Notification scheduling: cron jobs vs. event-driven approach? | Engineering | **Resolved: Daily cron job (see §10)** |
| 8 | AI prompt engineering strategy for Indian document formats (RC, Insurance, PUC)? | Engineering | Open |
| 9 | Admin dashboard: what additional analytics/metrics should admins see? | PM | **Resolved: See §8.10 Admin Analytics Dashboard** |
| 10 | Beta invite strategy: how many users, what channels? | Founder | **Resolved: Open beta; admin can send invite emails (see §8.10)** |

---

*Document prepared by John (PM Agent) · MotoYaar · 2026-03-15*