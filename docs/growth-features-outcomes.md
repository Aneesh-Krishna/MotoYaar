# MotoYaar — Growth Features Discussion Outcomes

**Date:** 2026-04-28
**Author:** Mary (Analyst Agent)
**Session:** User growth & expansion strategy discussion
**Status:** Approved — ready for PRD authoring

---

## 1. Context

This document captures the outcome of a product analysis session focused on expanding MotoYaar's user base after the core MVP (Epics 01–12) and Live Trip Tracking (Epic 13) ship. The session included:

- A full competitive landscape analysis
- Identification of feature gaps vs. Drivvo, REVER, MotoVault, CarInfo, and Indian-market apps
- Monetisation viability assessment
- A feature proposal pass with explicit user approval/rejection/concern feedback
- Refined specs for complex features

This document is the source of truth for PRD authoring for Epics 14, 15, and 16.

---

## 2. Feature Decisions

### 2a. Approved — Build These

| Feature | Epic | Priority | Notes |
|---------|------|----------|-------|
| Guest read-only live session view | 13 (add story 13.8) | P0 | Removes #1 group-ride adoption blocker |
| Public trip route sharing | 14 | P0 | Organic marketing via shareable route cards |
| Per-fill-up fuel efficiency tracking | 14 | P1 | Weekly habit loop; kmpl from litres + odometer |
| Service reminders (km + date-based) | 14 | P1 | With graceful degradation — see §4.2 |
| Gamification — milestones & badges | 14 | P2 | Enthusiast status signalling |
| Mechanic / Service Center reviews (UGC) | 15 | P2 | Crowdsourced POI model — no pre-seeding needed |
| Vehicle history by registration number | 15 | P3 | Viral used-buyer hook — see §4.3 for integrity model |
| Group expense splitting | 16 | P1 | Brings friend groups onto platform — see §4.4 for full spec |
| Riding Club / Group Management | 16 | P2 | Bulk acquisition: 1 club organiser = 20–100 users |
| Community Route Library | 16 | P2 | GPS routes from live trips; discovery via search |

### 2b. Rejected / Deferred

| Feature | Decision | Reason |
|---------|----------|--------|
| DigiLocker Integration | **Rejected** | Requires company registration + MeitY approval + cost. Not viable for pre-scale solo dev. Revisit after incorporation. |
| Insurance & PUC Renewal Affiliate Integrations | **Deferred** | Needs notable active user base before insurance partners will engage. Revisit at 2,000+ active users. |

### 2c. Alternative to DigiLocker (Zero Cost)

The **Vahan API** (`vahan.parivahan.gov.in`) is publicly accessible — returns vehicle details (registration date, vehicle class, fuel type, manufacturer) by reg number using a free API key. Implement as an optional "auto-fill" at "Add Vehicle" time when the user enters their reg number, reducing onboarding friction without company registration.

---

## 3. New Epic Structure

| Epic | Title | Depends On |
|------|-------|-----------|
| **14** | Growth & Engagement | Epics 01–06 (vehicles, expenses, trips) |
| **15** | Community Expansion | Epics 03, 09 (vehicles, community) |
| **16** | Groups & Club Features | Epics 06, 09, 13 (trips, community, live tracking) |

---

## 4. Refined Specs for Complex Features

### 4.1 Guest Read-Only Live Session View

The invite link `motoyaar.app/trips/join/[code]` currently redirects unauthenticated users to login. Change: allow unauthenticated access in **read-only mode**.

**Behaviour:**
- Guest opens invite link → sees full-screen live map with all participant positions updating in real time
- Guest subscribes to Supabase Realtime Broadcast channel (receive-only — no location broadcast)
- No guest position is shown on the map
- Persistent banner at top: *"Join MotoYaar to share your live location"* with a Sign Up CTA
- Session participant list shows participant names + "Guest viewing" count
- All existing session access control (ended/expired session = error page) applies

**Why this works as a growth driver:** One MotoYaar user shares a group ride link in their riding club WhatsApp group. All non-MotoYaar members open it on their phone and watch the live map. They experience the product's core value without signup friction. Conversion happens naturally at the next ride.

---

### 4.2 Service Reminders — Graceful Degradation Design

**Concern addressed:** If the user does not log odometer readings, km-based reminders cannot work. Solution: two-tier reminder system.

| User logs odometer | Reminder type |
|---|---|
| Yes (on service expenses) | Km-based: "Oil change due in ~800 km" |
| No | Date-based: "Last oil change was 89 days ago — service due?" |
| Neither | Reminder inactive — no noise generated |

**Smart defaults for popular Indian bikes (pre-loaded, user can override):**

| Vehicle type | Service | Default interval |
|---|---|---|
| Royal Enfield (350–650cc) | Engine oil change | 5,000 km / 6 months |
| Hero Splendor / Honda Shine | Engine oil change | 3,000 km / 3 months |
| KTM / Bajaj Pulsar (200cc+) | Engine oil change | 4,000 km / 4 months |
| All 2-wheelers | Chain lubrication | 500 km / 1 month |
| All 2-wheelers | Air filter clean | 6,000 km / 6 months |
| All vehicles | Tyre pressure check | — / 1 month |

**Odometer prompt:** When reason = "Service" on the expense form, a secondary field *"Odometer at service (optional, for km-based reminders)"* appears. Unobtrusive; skippable.

---

### 4.3 Vehicle History by Registration Number — Data Integrity Model

**Concern addressed:** Seller can alter or delete logs before selling.

**Solution — soft-delete with audit trail:**
- Service log entries are never hard-deleted. Deleting an entry sets `deleted_by_owner = true`, `deleted_at = timestamp`.
- On the public vehicle history lookup, deleted entries appear as: *"[Service type] — entry removed by owner on [date]"* — no amount, no detail, just the fact of deletion.
- This makes pre-sale cleanup visible as a red flag pattern.

**UX framing:** Present history as *"Community-logged history — not verified."* Users understand the same way they understand Zomato reviews vs. lab reports. The value is in pattern recognition: a bike with 3 years of consistent oil change entries carries meaning even if not cryptographically verified.

**Privacy opt-out:** User can toggle *"Exclude my vehicle data from community history lookups"* in Settings. Defaults to included (opted-in).

**Data shown per history entry:**
- Service type (Oil change, Tyre replacement, etc.)
- Date (month + year — exact day hidden)
- Service center name (if tagged)
- Deleted status (if applicable)

**Data NOT shown:** Amount, owner identity, trip data, location.

---

### 4.4 Group Expense Splitting — Full Spec

#### Core Concept
Splitwise-style expense splitting, embedded in the group ride context. Pre-wired to live session participants; no manual friend management needed.

#### Data Model

```
group_expense_sessions
  id UUID PK
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL   -- optional
  live_session_id UUID REFERENCES live_trip_sessions(id) ON DELETE SET NULL  -- optional
  created_by UUID REFERENCES users(id)
  status TEXT  -- 'active' | 'settled' | 'archived'
  currency TEXT DEFAULT 'INR'
  created_at TIMESTAMPTZ

group_expense_session_members
  id UUID PK
  session_id UUID REFERENCES group_expense_sessions(id) ON DELETE CASCADE
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
  joined_at TIMESTAMPTZ
  UNIQUE(session_id, user_id)

group_expense_items
  id UUID PK
  session_id UUID REFERENCES group_expense_sessions(id) ON DELETE CASCADE
  logged_by UUID REFERENCES users(id)          -- who entered the expense
  paid_by UUID REFERENCES users(id)            -- who physically paid
  amount NUMERIC(12,2) NOT NULL
  description TEXT NOT NULL
  category TEXT  -- 'Food' | 'Fuel' | 'Stay' | 'Toll' | 'Misc'
  included_user_ids UUID[]                      -- split among these members only
  created_at TIMESTAMPTZ

group_expense_settlements
  id UUID PK
  session_id UUID REFERENCES group_expense_sessions(id)
  from_user_id UUID REFERENCES users(id)
  to_user_id UUID REFERENCES users(id)
  amount NUMERIC(12,2)
  settled_at TIMESTAMPTZ  -- null = not yet settled
```

#### Key Behaviours

1. **Any member can log an expense** — `logged_by` tracks who entered it; `paid_by` is who actually paid (can differ).

2. **Selective participant inclusion** — `included_user_ids` defaults to all session members. User can deselect specific members per expense item.
   - Example: Aneesh and Rahul buy juice (₹80). Priya and Vikram are deselected. `included_user_ids = [aneesh_id, rahul_id]`. Each owes ₹40.

3. **Balance calculation** — Server computes net balance per member (standard debt-simplification: A→B ₹100, B→C ₹100 → simplified to A→C ₹100). Exposed via `GET /api/group-expenses/[sessionId]/balances`.

4. **Settlement** — "Mark as settled" records the payment; no in-app payment processing. Creates a `group_expense_settlements` record.

5. **Session lifecycle** — Can be started from a live group ride session (auto-adds live participants) OR manually (invite members by username). Survives after the live session ends.

#### Expense Logging UX

```
Who paid?         ○ Me  ○ [Member 2]  ○ [Member 3]  ○ Other
Amount            ₹ ___________
Description       _________________________  (e.g. "Juice at dhaba")
Category          Food | Fuel | Stay | Toll | Misc
Split between     ☑ Aneesh   ☑ Rahul   ☐ Priya   ☐ Vikram
                  [Select All]
```

#### API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/group-expenses` | Create a new group expense session |
| GET | `/api/group-expenses/[id]` | Get session with members and items |
| POST | `/api/group-expenses/[id]/members` | Add a member by username |
| POST | `/api/group-expenses/[id]/items` | Log an expense item |
| PATCH | `/api/group-expenses/[id]/items/[itemId]` | Edit an item |
| DELETE | `/api/group-expenses/[id]/items/[itemId]` | Delete an item |
| GET | `/api/group-expenses/[id]/balances` | Get computed net balances |
| POST | `/api/group-expenses/[id]/settle` | Mark a balance as settled |

---

### 4.5 Mechanic / Service Center Reviews — UGC Bootstrap Model

No pre-seeded database required. Flow:

1. User adds a "Service" expense → "Where?" field now has search + create
2. Types service center name → searches existing DB entries
3. If not found: *"Add '[Name]' as a new service center"* → user enters name (required), city, pincode (optional) → entry created immediately
4. After saving the expense, optional prompt: *"Rate [Service Center]?"*
5. Rating: 1–5 stars + optional one-line review (max 100 chars)

**Data shown on service center profile:**
- Name, city
- Average star rating + total review count
- Last 10 reviews (star + comment + date; no reviewer name)
- List of services logged there (oil change, tyre, etc. — aggregate counts)

---

## 5. Priority Rationale

**P0 first (ship alongside Epic 13):**
- Guest live session view requires minimal code change (route guard + read-only channel subscription) and has the highest impact on group ride adoption.
- Public route sharing is the first viral loop — every live trip becomes organic content.

**P1 after Epic 13 is stable:**
- Fuel efficiency and expense splitting deepen retention and introduce the friend-group network effect.

**P2 after P1 is shipped:**
- Clubs, route library, and gamification require new data models and more surface area. Build once P1 retention signals are confirmed.

**P3 when community has depth:**
- Vehicle history by reg number and mechanic reviews become valuable only when there is enough logged data to make them useful. Low-traffic lookups returning "no data" are a worse experience than not having the feature.

---

## 6. Open Questions for PRD Authoring

| # | Question | Feature | Priority |
|---|----------|---------|----------|
| 1 | Should the group expense session be tied to a trip, a live session, or can it be standalone? All three? | Expense splitting | High |
| 2 | Can a club member start a live session on behalf of the club, or only on their personal trip? | Clubs | High |
| 3 | Should the community route library be searchable by non-logged-in users? (SEO vs. signup wall) | Route library | Medium |
| 4 | What is the opt-in/opt-out default for vehicle history data? Include by default or explicit opt-in? | Vehicle history | Medium |
| 5 | Should badges appear on community posts next to username, or only on profile? | Gamification | Low |
| 6 | For service reminders, should the smart defaults be editable globally (once) or per vehicle? | Service reminders | Low |
| 7 | Vahan API integration for auto-fill at vehicle add — is a free API key sufficient or does it require paid tier for volume? | Vehicle add flow | Low |

---

## 7. Stories Created

| Story | Title | Epic |
|-------|-------|------|
| 13.8 | Guest Read-Only Live Session View | 13 — Live Trip Tracking |
| 14.1 | Public Trip Route Sharing | 14 — Growth & Engagement |
| 14.2 | Per-Fill-Up Fuel Efficiency Tracking | 14 — Growth & Engagement |
| 14.3 | Service Reminders (km + date-based) | 14 — Growth & Engagement |
| 14.4 | Gamification — Riding Milestones & Badges | 14 — Growth & Engagement |
| 15.1 | Mechanic / Service Center Reviews | 15 — Community Expansion |
| 15.2 | Vehicle History by Registration Number | 15 — Community Expansion |
| 16.1 | Group Expense Session (Create & Join) | 16 — Groups & Club Features |
| 16.2 | Log Group Expense with Selective Splitting | 16 — Groups & Club Features |
| 16.3 | Group Balances & Settle Up | 16 — Groups & Club Features |
| 16.4 | Riding Club Management | 16 — Groups & Club Features |
| 16.5 | Community Route Library | 16 — Groups & Club Features |

---

*Document prepared by Mary (Analyst Agent) · MotoYaar · 2026-04-28*
