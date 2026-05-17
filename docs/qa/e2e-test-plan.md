# MotoYaar — End-to-End Test Plan

**Version:** 1.0
**Last Updated:** 2026-04-29
**Author:** Mary (Business Analyst)
**Scope:** Full application — all 12+ epics, web + PWA + admin
**Audience:** QA engineers, developers, product owners

---

## 1. Purpose & Approach

This document defines an **executable, traceable end-to-end (E2E) test plan** for the entire MotoYaar platform. It is organized by **user journey** (not by code module), so a tester can pick it up cold and validate the product the way real users experience it.

Each test case follows the structure:

> **TC-ID** · **Title** · **Pre-conditions** → **Steps** → **Expected Result** → **Pass/Fail**

Severity levels:
- **P0 — Blocker** · breaks core flow; must pass before any release
- **P1 — Critical** · breaks a major feature; fix before release
- **P2 — Major** · degrades UX but feature still usable
- **P3 — Minor** · cosmetic / nice-to-have

---

## 2. Pre-Test Setup

### 2.1 Environments

| Env | Purpose | URL |
|---|---|---|
| Local | Dev validation | `http://localhost:3000` |
| Staging | Pre-release UAT | (to be filled) |
| Production | Smoke only | (to be filled) |

### 2.2 Test Accounts Required

| Role | Account | Notes |
|---|---|---|
| Primary user (owner) | A real Google account, no prior MotoYaar profile | Tests new user onboarding |
| Existing user | A Google account already onboarded with ≥ 1 vehicle | Tests returning flows |
| Invitee user | A separate Google account for accepting share invites | Tests sharing |
| Guest (unauth) | Incognito window, no login | Tests live-trip guest viewing & invite gating |
| Admin | An entry in `admin_accounts` with known password | Tests admin dashboard |

### 2.3 Test Data Required

- A second device or emulator capable of geolocation (for live-trip tests)
- A sample vehicle insurance PDF + a JPG of a registration certificate (for document AI parse)
- A sample receipt image (for expense receipt upload)
- An email inbox you can read for invite + notification emails
- A browser supporting Web Push (Chrome/Edge desktop or Android Chrome)

### 2.4 Pre-Test Checklist

- [ ] `pnpm install` succeeds
- [ ] `.env.local` populated (DB URL, Google OAuth, R2/S3 keys, Resend, VAPID push keys, AI API keys, Cron secret)
- [ ] `pnpm db:migrate` runs cleanly
- [ ] `pnpm dev` starts without errors
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` (vitest unit tests) green
- [ ] DB seeded with at least one admin account

---

## 3. Test Suites by Epic

> **Tip:** Suites can be run in the listed order to follow the natural data dependency chain (a vehicle must exist before expenses, etc.). Within a suite, run tests in numerical order.

### Suite 1 — Foundation & Infrastructure (Epic 01)

| TC | Title | Severity | Steps | Expected |
|---|---|---|---|---|
| TC-1.1 | App boots | P0 | Visit `/` unauthenticated | Redirects to `/login`; no console errors |
| TC-1.2 | PWA installable | P1 | Open in Chrome, check install prompt + service worker registered (DevTools › Application) | Install banner appears; SW active; manifest valid |
| TC-1.3 | Offline fallback | P2 | Install PWA, go offline, reopen | App shell renders; offline message shown for non-cached routes |
| TC-1.4 | Health: DB connectivity | P0 | Inspect server logs on cold boot | No Drizzle/postgres connection errors |
| TC-1.5 | Health: external services | P1 | Trigger one document parse + one push subscribe | No 5xx from AI provider, R2, web-push |

### Suite 2 — Authentication & Onboarding (Epic 02)

| TC | Title | Severity | Steps | Expected |
|---|---|---|---|---|
| TC-2.1 | Google sign-in (new user) | P0 | `/login` → click Google → consent | Redirected to `/onboarding`; user row created |
| TC-2.2 | Onboarding profile creation | P0 | Fill name, username, currency, optional bio/IG; submit | Username uniqueness validated; user updated; redirect to walkthrough |
| TC-2.3 | Username collision | P1 | Submit a username already in DB | Inline error "username taken"; form not submitted |
| TC-2.4 | Walkthrough modal | P2 | Step through all walkthrough slides; click Done | `walkthrough_seen=true`; redirected to `/` (garage) |
| TC-2.5 | Returning user skips onboarding | P0 | Sign out, sign in again | Lands directly on `/` |
| TC-2.6 | Sign out | P0 | Click sign-out from menu | Session cleared; redirected to `/login`; protected routes denied |
| TC-2.7 | Middleware route protection | P0 | While unauthenticated, hit `/garage`, `/trips`, `/profile` directly | Each redirects to `/login` |

### Suite 3 — Vehicle Management (Epic 03)

| TC | Title | Severity | Steps | Expected |
|---|---|---|---|---|
| TC-3.1 | Add vehicle | P0 | `/garage/new` → fill name, type, reg #, fuel, optional image; save | Vehicle visible in garage list |
| TC-3.2 | Vehicle image upload | P1 | Add a vehicle with a 5 MB JPG | Image uploads to R2; thumbnail rendered |
| TC-3.3 | Vehicle detail page | P0 | Click vehicle in garage | Detail page shows all fields + tabs (docs/expenses/trips) |
| TC-3.4 | Edit vehicle | P1 | Edit page → change name → save | Updated name reflected on detail + garage |
| TC-3.5 | Delete vehicle | P1 | Delete confirmation → confirm | Vehicle removed; cascading expense/doc/trip rows cleaned |
| TC-3.6 | Validation: required fields | P2 | Try submitting empty form | Field-level errors; submit disabled |

### Suite 4 — Document Management (Epic 04)

| TC | Title | Severity | Steps | Expected |
|---|---|---|---|---|
| TC-4.1 | Upload PDF doc | P0 | Vehicle detail › docs tab › upload PDF | Doc appears with "parsing" status |
| TC-4.2 | AI parse extracts metadata | P0 | Wait for parse | Type/issuer/expiry auto-populated; user can edit |
| TC-4.3 | Storage preference: parse_only | P1 | Set preference; upload doc | Original file deleted from R2 after parse; only metadata kept |
| TC-4.4 | Storage preference: full_storage | P1 | Switch to full_storage; upload | File retained; "view file" presigned URL works |
| TC-4.5 | Manual document edit | P2 | Edit auto-parsed fields; save | Persisted |
| TC-4.6 | Document expiry highlight | P1 | Add doc with expiry within notification window | Doc card shows expiry warning |
| TC-4.7 | Delete document | P2 | Delete from list | Removed; R2 file cleaned if stored |
| TC-4.8 | Personal (driving licence) document | P1 | `/profile/driving-licence` upload | Same parse flow under user (not vehicle) scope |

### Suite 5 — Expense Tracking (Epic 05)

| TC | Title | Severity | Steps | Expected |
|---|---|---|---|---|
| TC-5.1 | Add expense | P0 | Vehicle › expenses › add (category, amount, date, note) | Listed with correct currency formatting |
| TC-5.2 | Receipt upload | P1 | Add expense with image receipt | Receipt thumbnail + presigned view URL |
| TC-5.3 | Edit expense | P1 | Edit amount/category | Updated everywhere (lists, reports cache invalidates) |
| TC-5.4 | Delete expense | P1 | Delete with confirmation | Removed; reports recompute |
| TC-5.5 | Filter / sort expenses | P2 | Filter by date range or category | Correct subset rendered |

### Suite 6 — Trip Logging & Live Tracking (Epic 06 + 13)

| TC | Title | Severity | Steps | Expected |
|---|---|---|---|---|
| TC-6.1 | Add manual trip | P0 | `/trips/new` → fill from/to/date/distance/vehicle/expenses | Trip persisted; appears on `/trips` and vehicle detail |
| TC-6.2 | Edit trip | P1 | Edit and save | Updated |
| TC-6.3 | Delete trip + cascade | P1 | Delete trip with linked expenses | Trip removed; expense cascade behavior matches PRD |
| TC-6.4 | Trip kebab menu actions | P2 | Use kebab on TripCard | All listed actions function |
| TC-6.5 | Start live trip session | P0 | `/trips/[id]/live` → start → grant geolocation | Session created; share-code generated |
| TC-6.6 | GPS route recording | P0 | Move device or simulate location updates | Polyline grows on map; points stored |
| TC-6.7 | Multi-user live session | P1 | Second user joins via share code | Both pins on map; both names listed |
| TC-6.8 | Guest read-only view | P1 | Open `/trips/join/[code]` in incognito | Map renders; cannot post location; guest counter increments |
| TC-6.9 | End live session | P0 | End from owner UI | Session marked ended; final route saved |
| TC-6.10 | Post-trip route view | P1 | Open ended trip | Static polyline + summary (distance, duration) |
| TC-6.11 | Offline map download | P2 | Pre-download tiles for an area; go offline | Tiles still render |
| TC-6.12 | Cron expires stale sessions | P1 | Hit `/api/cron/expire-live-sessions` with cron secret | Sessions older than threshold marked ended |

### Suite 7 — Reports & Spends (Epic 07)

| TC | Title | Severity | Steps | Expected |
|---|---|---|---|---|
| TC-7.1 | Per-vehicle report | P0 | `/reports/vehicles/[id]` | Spend breakdown by category, time-series chart |
| TC-7.2 | Overall report | P1 | `/reports` | Aggregates across all vehicles |
| TC-7.3 | Currency formatting | P2 | Switch user currency in settings; reload report | All amounts re-formatted correctly |
| TC-7.4 | AI report generation | P1 | `/reports/ai` → generate | Job created; status transitions queued→running→done |
| TC-7.5 | AI report quota enforcement | P1 | Exceed monthly quota | 429 / friendly quota-exhausted message |
| TC-7.6 | View past AI report | P2 | Open `/reports/ai/[id]` | Renders saved markdown / sections |

### Suite 8 — Notifications (Epic 08)

| TC | Title | Severity | Steps | Expected |
|---|---|---|---|---|
| TC-8.1 | Subscribe to push | P0 | Profile › settings › enable push; grant browser permission | Subscription stored in `push_subscriptions` |
| TC-8.2 | Push delivered | P0 | Trigger document-expiry cron with a doc inside window | Push notification arrives on device |
| TC-8.3 | Email notification | P1 | Same as above with email enabled | Email arrives via Resend |
| TC-8.4 | In-app bell counter | P1 | Trigger any notification | `/api/notifications/unread-count` increments; bell badge updates |
| TC-8.5 | Mark all read | P2 | Click mark-all-read | Badge clears; rows marked read |
| TC-8.6 | Unsubscribe push | P1 | Disable push in settings | Subscription removed; no further pushes |
| TC-8.7 | Cron auth | P0 | Hit `/api/cron/document-expiry` without secret | 401 |

### Suite 9 — Community (Epic 09)

| TC | Title | Severity | Steps | Expected |
|---|---|---|---|---|
| TC-9.1 | Create post | P0 | `/community/new` → text + optional image | Post visible on feed |
| TC-9.2 | Post image upload | P1 | Attach image | R2 upload; rendered in card |
| TC-9.3 | Like / dislike | P1 | React on a post | Counts update; second click toggles |
| TC-9.4 | Comment on post | P1 | Add comment | Visible under post; counts update |
| TC-9.5 | Edit own post | P2 | Edit a post you authored | Updated content saved |
| TC-9.6 | Delete own post | P2 | Delete | Post + comments removed |
| TC-9.7 | Report post | P1 | Report a post | Report logged; admin sees in queue |
| TC-9.8 | Cannot edit/delete others' posts | P0 | Try to edit a post you don't own | 403 |

### Suite 10 — Vehicle Sharing & Invites (Epic 10)

| TC | Title | Severity | Steps | Expected |
|---|---|---|---|---|
| TC-10.1 | Send invite | P0 | Vehicle › sharing › invite by email | Email arrives with `/invites/[token]` link |
| TC-10.2 | Accept invite (existing user) | P0 | Invitee logged in, opens link | Vehicle appears in their garage as view-only |
| TC-10.3 | Accept invite (new user) | P1 | Invitee not signed up; accepts after onboarding | Cookie persists invite through OAuth; access granted |
| TC-10.4 | View-only access | P0 | Invitee opens shared vehicle | Read-only — no edit/delete buttons |
| TC-10.5 | Revoke access | P1 | Owner removes invitee | Invitee loses access on next request |
| TC-10.6 | Invalid / expired token | P2 | Open malformed token URL | Friendly error page |

### Suite 11 — Admin Dashboard (Epic 11)

| TC | Title | Severity | Steps | Expected |
|---|---|---|---|---|
| TC-11.1 | Admin login | P0 | `/admin/login` with valid creds | Session set; redirected to `/admin` |
| TC-11.2 | Admin login fails on bad creds | P0 | Wrong password | 401; no session |
| TC-11.3 | Non-admin route protection | P0 | Visit `/admin/users` without admin session | Redirect to `/admin/login` |
| TC-11.4 | Reported posts queue | P1 | View `/admin/reported` | Lists reported posts with reasons |
| TC-11.5 | Pin / unpin post | P2 | Toggle pin from admin posts list | Pinned flag persisted; pinned posts surface on feed |
| TC-11.6 | Delete user post (admin) | P1 | Delete a flagged post | Removed from feed |
| TC-11.7 | User management | P1 | Suspend / ban / warn a user | `users.status` updated; user-side restrictions apply |
| TC-11.8 | Admin invite users | P1 | Send admin-initiated invite | Invitee receives email and onboards normally |
| TC-11.9 | Analytics dashboard | P2 | Open `/admin` | Counts (users, vehicles, posts) render correctly |
| TC-11.10 | Admin logout | P1 | Click logout | Session cleared |

### Suite 12 — Profile & Settings (Epic 12)

| TC | Title | Severity | Steps | Expected |
|---|---|---|---|---|
| TC-12.1 | Edit profile | P0 | `/profile/edit` change name/bio/IG/image | Saved; reflected in header |
| TC-12.2 | Profile image upload | P1 | Upload new avatar | R2 upload; old image cleaned |
| TC-12.3 | Currency switch | P1 | Settings › currency → save | New currency applied across reports + expenses |
| TC-12.4 | Notification preferences | P1 | Toggle email + push, change window days | Persists; takes effect on next cron run |
| TC-12.5 | Account deletion | P0 | Settings › delete account → confirm | All user data hard-deleted (vehicles, docs, expenses, trips, posts, comments, subs); session cleared |
| TC-12.6 | Privacy page | P3 | `/privacy` | Renders content |

### Suite 13 — Cross-Cutting & Non-Functional

| TC | Title | Severity | Steps | Expected |
|---|---|---|---|---|
| TC-13.1 | Mobile viewport | P0 | DevTools mobile emulator, exercise top 5 flows | No layout breakage; tap targets ≥ 44 px |
| TC-13.2 | Browser matrix | P1 | Run smoke on Chrome / Edge / Safari (iOS) / Firefox | All core flows pass |
| TC-13.3 | Server cache invalidation | P1 | Edit an expense → navigate to `/reports` | Updated values appear (no stale cache) |
| TC-13.4 | Form input validation | P1 | Submit each form with boundary inputs (empty, over-long, special chars, XSS payload) | Server + client validation reject; no script execution |
| TC-13.5 | Authorization (IDOR) | P0 | As user A, try to GET/PATCH/DELETE user B's vehicle/doc/expense/trip/post by id | 403/404 — never 200 |
| TC-13.6 | Rate limiting on uploads | P2 | Spam upload endpoint | Throttled (429) or queued — does not crash server |
| TC-13.7 | File-type / size restrictions | P1 | Upload .exe; upload 50 MB JPG | Rejected with clear error |
| TC-13.8 | Logging contains no secrets | P1 | Inspect Pino logs after a session | No tokens, keys, or PII leaked |
| TC-13.9 | Lighthouse PWA score | P2 | Run Lighthouse on staging | PWA installable ≥ 90, perf ≥ 75 mobile |
| TC-13.10 | Accessibility smoke | P2 | axe-core on top 5 pages | No critical violations |

---

## 4. Critical End-to-End Journeys (Smoke)

These are the **golden paths** to run before every release. If all 5 pass, the build is releasable for smoke purposes.

1. **New user → first vehicle → first document parsed → first expense → see in report**
   (TC-2.1, 2.2, 2.4, 3.1, 4.1, 4.2, 5.1, 7.1)

2. **Live trip start → second user joins → guest views → end → post-trip view**
   (TC-6.5, 6.6, 6.7, 6.8, 6.9, 6.10)

3. **Document expiry pipeline**
   Add doc with near-future expiry → enable push + email → trigger cron → receive both → bell badge updates.
   (TC-4.1, 4.2, 8.1, 8.2, 8.3, 8.4)

4. **Vehicle sharing**
   Owner invites email → invitee onboards or signs in → sees view-only vehicle → owner revokes → invitee loses access.
   (TC-10.1, 10.2, 10.3, 10.4, 10.5)

5. **Account deletion**
   Create rich profile (vehicles, docs, expenses, posts) → delete account → verify zero residue in DB and in feed.
   (TC-12.5, 13.5)

---

## 5. Test Execution Tracker

Use one row per run. Suggested format (copy into a spreadsheet or `qa/runs/YYYY-MM-DD.md`):

| Date | Build / SHA | Tester | Env | Suite | Total | Pass | Fail | Blocked | Notes |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |

For each failed test, capture:
- Steps to reproduce
- Expected vs actual
- Browser / device / OS
- Screenshot or screen recording
- Network/console logs
- Link to created bug ticket

---

## 6. Automation Recommendations

The repo already has Playwright wired (`pnpm test:e2e`). Prioritize automating, in this order:

1. **Auth + onboarding happy path** (TC-2.1 → 2.6) — blocks every other test
2. **Vehicle CRUD** (Suite 3)
3. **Expense CRUD + report recompute** (Suite 5 + TC-7.1)
4. **Authorization / IDOR matrix** (TC-13.5) — security regression net
5. **Live-trip session lifecycle** (TC-6.5 → 6.9) using mocked geolocation

Manual-only (for now): AI parse output quality, push notification delivery on real devices, email rendering across clients, accessibility deep dives.

---

## 7. Known Gaps & Open Questions

These should be clarified with the PM/owner before sign-off:

- **Quota numbers** for AI reports (TC-7.5) — not specified in the test plan; pull from `adminSettings`.
- **Live-session expiry threshold** (TC-6.12) — confirm value (hours of inactivity).
- **Notification window default** is 30 days per schema; confirm this is the product expectation.
- **Cascade rules** when a vehicle is deleted with active live session — verify behavior is defined.
- **Guest viewer counter** semantics (TC-6.8) — unique vs total views?

---

## 8. Sign-off Criteria

A release is **ready to ship** when:

- ✅ 100 % of P0 tests pass
- ✅ ≥ 95 % of P1 tests pass (with documented mitigation for any failures)
- ✅ All 5 smoke journeys (Section 4) pass on staging
- ✅ Lighthouse PWA + perf thresholds met
- ✅ No open security bugs (especially IDOR/auth)
- ✅ DB migrations applied cleanly on a copy of production

---

*End of E2E Test Plan v1.0 — generated by Mary, Business Analyst, 2026-04-29.*
