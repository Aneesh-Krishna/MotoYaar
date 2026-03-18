# MotoYaar — Brainstorming Session Results

**Date:** 2026-03-15
**Topic:** Sharpening and detailing MotoYaar MVP features
**Goal:** Focused ideation — drill down and sharpen already outlined features
**Scope:** Solo dev, mobile-first (desktop supported), MVP excludes live trip logging
**Post-MVP Vision:** Live trip logging, DigiLocker / government API integrations

---

## Techniques Used
1. User Journey Mapping
2. Jobs-to-be-Done (JTBD)
3. Edge Case Storming
4. Assumption Surfacing

---

## Technique 1: User Journey Mapping

### Overview
Walking through MotoYaar feature-by-feature as a real user would — surfacing gaps, friction points, and unclear flows.

### Journey Sections

#### Stage 1: Authentication & Onboarding

**Flow:**
1. User lands on MotoYaar → sees "Sign in with Google" (only auth option)
2. First-time auth triggers onboarding flow:
   - Name (mandatory)
   - Username (mandatory, real-time uniqueness validation as user types)
   - Profile image (optional)
   - Bio (optional)
   - Instagram link (optional)
3. On completion → tooltip/modal walkthrough of key sections (Dashboard, My Vehicles, Community, Expenses, Trips)
4. Walkthrough is skippable; accessible again from Settings/Help

**Key Decisions Made:**
- Community is accessible even without a vehicle added
- Walkthrough is informational (not guided "add first vehicle" flow), respecting that some users may only want community access

**Open Questions:**
- Driver's license: part of onboarding or added later from profile? Treated like a vehicle document (parsed, expiry tracked)?

**Resolved:**
- Driver's license → added from Profile/Settings page (not onboarding), parsed by AI, expiry-tracked with notifications

#### Stage 2: Adding a Vehicle

**Flow:**
1. User taps "Add Vehicle"
2. Step 1 — Vehicle basics: Name, Type (2-wheeler / 4-wheeler / truck / other)
3. Step 2 — Vehicle details: Company, Model, Variant, Color, Registration Number (mandatory)
4. Step 3 — Purchase info: Bought on (date), Previous owners (number, default 0)
5. Step 4 — Vehicle image upload (optional)
6. Step 5 — Document upload: RC, Insurance, PUC (optional, can be done later)
7. Step 6 — Review & Save

**Document Parsing Flow (Option A):**
- AI (Claude vision) extracts expiry date from uploaded doc
- Shows user a confirmation screen with extracted date
- User approves or edits → then saves
- If parsing fails entirely → user manually enters expiry date as fallback

**Key Decisions Made:**
- Registration number is mandatory
- Vehicle type affects reports (spend breakdowns by vehicle type: 2-wheeler, 4-wheeler, truck, etc.)
- Vehicle image upload supported
- Same AI API used for both document parsing and report generation (cost-efficient)
- Currency is configurable (default: INR)

**Vehicle Detail Page Structure:**
- Top: Vehicle image, Name, Reg Number, Vehicle Type badge, Owned since, Previous owners, Edit/Delete (kebab menu)
- Tab 1 — Overview: total spend, last service, next doc expiry alert
- Tab 2 — Documents: RC, Insurance, PUC + other docs, each with expiry status (green/amber/red)
- Tab 3 — Expenses: expense list + "Add Expense" CTA + "See Spends" button
- Tab 4 — Trips: trips linked to this vehicle + "Add Trip" CTA

**Bottom Navigation (Mobile):**
| Tab | Contents |
|-----|----------|
| Home | Dashboard: horizontal scrollable vehicle cards + recent activity + community highlights |
| Garage | My Vehicles, docs, expenses per vehicle |
| Community | Posts, search, trending |
| Trips | All trips (Live trip post-MVP) |
| Profile | Profile, settings, DL, reports, invite users |

**Notifications:**
- Bell icon in top bar (opens dropdown/drawer)
- Alerts for document expiry (warning when nearing, urgent when expired)

#### Stage 3: Adding an Expense

**Expense Form Fields:**
- Price (required)
- Date (required)
- Reason (dropdown: Service, Fuel, Trip, Others — "Others" requires manual text entry)
- Where (optional, free-text — e.g. fuel station name, service center name. Post-MVP: consider OpenStreetMap Nominatim autocomplete, free alternative to Google Places)
- Comments (optional: Overpriced / Average / Underpriced)
- Receipt upload (optional)

**Key Data Flow Rules:**
- Reason = Trip → redirect to create a new trip (expense auto-created from trip)
- A trip owns its expense entry — no way to independently create an expense with reason=Trip for an existing trip; only editable
- Receipt upload supported on all expense entries

#### Stage 4: Adding a Trip

**Trip Form Fields:**
- Title / Description
- Date (single day or date range: start date → end date)
- Route: text description (e.g. "Delhi to Manali") and/or a maps link
- Time taken
- Vehicle (optional — one vehicle or none for MVP; multi-vehicle post-MVP)
- Expense breakdown (Food, Fuel, Stay, etc.)

**Key Data Flow Rules:**
- Trip created with vehicle linked → one combined expense entry auto-created in that vehicle's expenses
- Trip created with no vehicle linked → user prompted: "This trip has no vehicle linked. Do you want to add it as a general expense?"
- If Yes → one combined expense entry created under user's general/unlinked expenses
- Trip breakdown contains Fuel + vehicle is linked → fuel expense auto-added to vehicle's expenses as one combined entry
- Trip breakdown contains Fuel + no vehicle linked → same prompt as above (general expense)
- Each breakdown does NOT create separate expense entries — one combined entry per trip

**MVP Scope:**
- One vehicle or none per trip
- Multi-vehicle trips → post-MVP

#### Stage 5: Reports & Spends

**Code-Calculated Report (Vehicle-level):**
- Totals by reason/category
- Spend on each expense type with dates
- Charts and graphs (user selects chart type) + data table/list format
- Comparison to previous period (trends)

**Code-Calculated Report (Overall — all vehicles):**
- Filters: Monthly, Date Range, Yearly
- Visual: charts/graphs (user selects type) + data table/list
- Comparison logic:
  - Monthly → user picks which months to compare
  - Date Range → auto-compare to equivalent prior period (same duration, shifted back); user can override and pick custom comparison range; comparison range shown clearly in UI
  - Yearly → auto-compare to previous year

**AI Report:**
- Triggered via button on the overall spends page
- Covers overall spends with per-vehicle breakdowns included
- 1 free report per month per user
- After free report used → "Come back next month" message
- Subscriptions / add-ons (paid AI reports) → post-MVP

#### Stage 6: Community

**Post Structure:**
- Title (mandatory)
- Description (character limit applies)
- Images (max 2 per post)
- Links (optional)
- Tags: hybrid — predefined set (Bikes, Cars, Mods, Travel, Maintenance, Fuel, Roads, Events, Help) + custom user-created tags

**Feed:**
- Default: smart/trending algorithm
- Sort options: Trending, Newest

**Engagement:**
- Likes & Dislikes shown as exact separate counts (👍 24 👎 3)
- Comments: Reddit-style nested/threaded
- Report: user selects a reason (Spam, Inappropriate, Misinformation, etc.) + optional description

**Admin Dashboard:**
- Dedicated hidden URL (not visible in main app navigation)
- Default admin account seeded to DB at setup; admin can create additional admin accounts
- Admin login: predefined credentials (separate from Google SSO)
- Actions on reported posts: Remove post, Warn user, Suspend user (admin sets duration manually), Ban user
- Warned/suspended users notified via both in-app notification and email

#### Stage 7: Inviting Users to View Vehicles

- Owner invites specific users via email to view specific vehicles (not all vehicles)
- Invitees are view-only for MVP (no edit/delete access); edit permissions → post-MVP
- UI label: "Invite to view" (not "invite to manage") to set correct expectations
- Non-MotoYaar users: receive invite email → click link → directed to signup (Google SSO) → automatically granted view access to the specific vehicle after signup
- Owner can revoke access at any time from vehicle settings

---

## Technique 2: Jobs-to-be-Done (JTBD)

### Overview
For each core feature: "When I [situation], I want to [motivation], so I can [outcome]."

### JTBD Statements
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

## Technique 3: Edge Case Storming

### Overview
Systematically surfacing "what could go wrong or get weird" for each feature — especially document parsing/expiry, expense↔trip linking, shared vehicle management, and community moderation.

### Edge Cases by Feature

#### Documents & Notifications
| # | Scenario | Resolution |
|---|----------|------------|
| 1 | AI fails to parse expiry date, user skips manual entry | Document saved but flagged as "Incomplete" — visible in Documents tab with a warning indicator |
| 2 | Document expires today | Warning notification sent days before (configurable window, default 30 days). Urgent notification sent on expiry day. "Expired" status applied from the next day. Notification asks user to renew and update in app. |
| 3 | Multiple documents expiring same week across vehicles | Single combined notification ("X documents expiring soon") — not per-vehicle spam |
| Notification window | How far in advance? | Configurable per user (default: 30 days) |

#### Expenses & Trips
| # | Scenario | Resolution |
|---|----------|------------|
| 4 | Trip deleted that has auto-created expense entries | Warning shown: "Deleting this trip will also delete its associated expense entries. This cannot be undone. Continue?" — cascade delete on confirm |
| 5 | Expense logged with date far in the past (e.g. wrong year) | Warn the user but allow it. Expense entries are always editable. |
| 6 | Owner deletes vehicle with invited viewers | Invited viewers receive a friendly notification that the vehicle has been removed |

#### Community
| # | Scenario | Resolution |
|---|----------|------------|
| 7 | Banned user's existing posts/comments | Stay visible unless admin explicitly deletes them during the ban action. Permanent bans cannot be undone. |
| 8 | User edits a post after engagement (likes/comments) | "Edited" label shown on post. Full version history maintained. No time limit on editing. |
| 9 | Duplicate post submission (double-tap / network retry) | Detect identical title + description from same user within 60 seconds → block second submission silently, show toast: "Your post was already submitted." |
| 10 | Post reported by multiple users | Auto-hidden after X reports from unique users (threshold configurable from admin dashboard, e.g. default 10). Awaits admin review to restore or permanently remove. |

#### Reports & AI
| # | Scenario | Resolution |
|---|----------|------------|
| 11 | AI report requested with no expense data for the period | Show "No data" message. Free monthly report is NOT consumed — only consumed when a report is actually generated. |
| 12 | Expenses logged in multiple currencies (user changed currency mid-year) | All amounts converted to the user's current currency setting for unified report totals |
| 13 | AI report API latency | Async: user shown "We're generating your report. We'll notify you when it's ready." → in-app + email notification on completion → report accessible from Reports page |

#### Invites & Access
| # | Scenario | Resolution |
|---|----------|------------|
| 14 | Invitee never signs up after receiving invite email | Invite expires after 3 days |
| 15 | User loses access to their Google account | No self-serve recovery. User contacts support via email → admin manually re-links MotoYaar account to new Google ID from admin dashboard |

#### Vehicles
| # | Scenario | Resolution |
|---|----------|------------|
| 16 | Duplicate registration numbers across users | Allowed (vehicle changes owners over time — past and current owner may both have it). Same user cannot add the same reg number twice (validated on save). |

---

## Technique 4: Assumption Surfacing

### Overview
Listing assumptions baked into the current design and stress-testing them — helps a solo dev catch blind spots before building.

### Assumptions & Stress Tests
| # | Assumption | Risk | Resolution |
|---|------------|------|------------|
| 1 | All target users have a Google account | Users without Google accounts can't access MotoYaar | Accepted for MVP — Google SSO only. Monitor feedback post-launch. |
| 2 | AI can reliably parse Indian vehicle documents | RC, Insurance, PUC formats vary widely; regional languages may break parsing | Option A (review & confirm) mitigates bad extracts; manual fallback always available |
| 3 | Users are motivated enough to log expenses manually | Habit formation is fragile; logging friction kills retention | Minimize form fields, smart defaults, and quick-add flows are critical |
| 4 | Community will have enough users at launch | Empty feed = poor first impression | **Mitigations:** Admin can post & pin/feature content; community is view-only for non-logged-in users; beta invite wave before public launch |
| 5 | Users will trust a new app with sensitive legal documents | Uploading RC/Insurance/PUC to an unknown app requires trust | **Mitigations:** Explicit privacy page (storage, access, encryption); "parse only" mode (AI extracts date, doc not stored); docs auto-deleted 10 days after expiry if stored; "delete all my data" option in settings |
| 6 | Email notifications are sufficient | Mobile-first users ignore email; critical expiry alerts go unseen | **Resolution:** PWA push notifications (free, no native app needed) + email. Both channels for expiry alerts. |
| 7 | 1 free AI report per month meets user needs | Power users may feel limited | Accepted for MVP. Paid add-ons / subscriptions planned for post-MVP. |

---

## Idea Categorization

### Immediate Opportunities
- PWA push notifications for document expiry (critical for core value delivery)
- "Parse only" document mode — builds trust, reduces storage cost
- Admin can post to community — solves cold start problem
- Community view-only for non-logged-in users — reduces signup friction
- Configurable notification window per user
- Combined notifications for multiple expiring docs
- Hybrid tags (predefined + custom) for community posts
- Post version history on edit

### Future Innovations
- DigiLocker / government API integration for document fetching (post-MVP)
- Live GPS trip tracking with route, speed, and report (post-MVP)
- Edit permissions for invited vehicle viewers (post-MVP)
- Multi-vehicle trip support (post-MVP)
- Paid AI report subscriptions / add-ons (post-MVP)
- Multi-user trip expense splitting
- OpenStreetMap Nominatim autocomplete for "where" field (free Google Places alternative)

### Moonshots
- Cross-user vehicle history (see full ownership & service history of a reg number)
- Community-sourced fuel price tracking by location
- Insurance renewal integrations (redirect to renew directly from expiry alert)
- Vehicle resale value estimator based on logged expenses and service history

### Insights & Learnings
- Community access without a vehicle is a key differentiator — MotoYaar is both a garage tool and a social platform
- The trip → expense → vehicle data flow is the most complex chain in the app; getting cascade logic right is critical
- Trust is the #1 barrier for document upload — "parse only" mode removes the biggest objection
- PWA is the right MVP choice for push notifications on a solo dev budget
- Admin posting/pinning solves the cold start problem without external dependencies
- The AI report should be positioned as a narrative insight layer, not a replacement for the code-calculated report

---

## Action Planning

### Top Priority Ideas
1. **Document parsing + notification pipeline** — Core value of MotoYaar. Get this right first: upload → AI parse → confirm → save expiry → PWA push + email notification on schedule.
   - *Rationale: If expiry alerts don't work reliably, the app's primary utility is broken.*

2. **Expense ↔ Trip ↔ Vehicle data flow** — The most complex chain in the app. Define and implement cascade rules (trip delete → expense delete, trip fuel breakdown → vehicle expense) before building UI.
   - *Rationale: Retrofitting this logic after the fact will break data integrity.*

3. **Community with admin-first seeding** — Build community with admin post/pin capabilities. Launch in beta with invited enthusiasts before going public.
   - *Rationale: Cold start is the biggest community risk; seeding content early is the mitigation.*

### Next Steps
1. Define data models for: User, Vehicle, Document, Expense, Trip, Post, Comment, Invite
2. Map all cascade delete/create rules for expense ↔ trip ↔ vehicle relationships
3. Set up Claude API integration for both document parsing and AI report generation
4. Build PWA scaffold with push notification support from day one
5. Design the admin dashboard alongside the main app (not as an afterthought)
6. Implement Google SSO + onboarding flow as the first working feature

### Resources / Research Needed
- Claude API: vision for doc parsing, text generation for AI reports
- PWA push notification setup (Web Push API + service workers)
- OpenStreetMap Nominatim API for location autocomplete (free, no key required)
- Email service: Resend or SendGrid for transactional notifications
- Secure document storage: Cloudflare R2 or AWS S3 (with 10-day post-expiry auto-delete policy)

---

## Reflection & Follow-up

### What Worked Well
- User Journey Mapping surfaced critical data flow rules early (especially trip → expense cascade)
- Edge Case Storming uncovered trust and notification gaps that would have hurt retention
- Assumption Surfacing led to three concrete architectural decisions: PWA, parse-only docs, admin seeding

### Key Decisions Made This Session
| Decision | Choice |
|----------|--------|
| Auth | Google SSO only |
| Push notifications | PWA push + email |
| Document storage | Parse only (opt-in full storage, auto-delete 10 days post-expiry) |
| Community cold start | Admin posts + pin, view-only for guests, beta invite wave |
| Trip deletion | Cascade delete with confirmation warning |
| AI report | Async generation, 1 free/month, not consumed if no data |
| Registration numbers | Unique per user, allowed across users |
| Invite expiry | 3 days |
| Currency | Configurable, default INR |
| Comparison logic | Monthly: user picks; Date range: auto prior period (overridable); Yearly: auto prior year |

### Areas for Further Exploration
- Detailed data model design (especially the expense ↔ trip ↔ vehicle relationships)
- Notification scheduling logic (cron jobs vs. event-driven)
- AI prompt engineering for document parsing (Indian doc formats)
- Admin dashboard feature scope

### Questions for Future Sessions
- What does the onboarding walkthrough look like in detail (screens, copy, illustrations)?
- What tech stack will MotoYaar be built on? (React + Node? Next.js? Database choice?)
- How will the trending algorithm for community posts work?
- What does the spends report UI look like in detail (chart types, layout)?
