# Epic 06 — Trip Logging

**Status:** Not Started
**Priority:** P1 — Builds on Expenses; complex cascade logic
**Depends On:** Epic 05 (Expenses), Epic 03 (Vehicles)

## Goal
Users can log trips with route, duration, and expense breakdowns. The cascade logic (trip → expense → vehicle) is the most complex data flow in MotoYaar — this epic gets it right before building reports on top of it.

---

## Stories

### STORY-06-01: Add Trip
**As a** user,
**I want** to log a trip with all relevant details,
**so that** I have a complete record of my journeys and their cost.

**Acceptance Criteria:**
- [ ] Trip form accessible from: Trips tab → "Add Trip" CTA; Vehicle Detail → Trips tab → "Add Trip" CTA; and when Reason = "Trip" is selected in expense form
- [ ] Fields:
  - Title (required)
  - Description (optional)
  - Date: single day or date range with start and end date picker (required)
  - Route: free-text field (e.g. "Delhi to Manali") and/or maps link field (both optional)
  - Time taken (optional; HH:MM input)
  - Vehicle (optional; dropdown of user's vehicles; pre-filled if opened from vehicle detail page)
  - Expense breakdown (optional; repeatable rows: category dropdown [Food / Fuel / Stay / Toll / Other] + amount)
- [ ] On save with vehicle linked: one combined expense entry auto-created under that vehicle (sum of all breakdown amounts; reason = Trip)
- [ ] On save with no vehicle linked and breakdown has amounts: prompt shown: "This trip has no vehicle linked. Add it as a general expense?" — Yes creates expense with `vehicle_id = null`; No skips expense creation
- [ ] On save: trip record created; user redirected to trip detail page

---

### STORY-06-02: Trip Detail Page
**As a** user,
**I want** to view the full details of a trip,
**so that** I can recall and review any journey I've logged.

**Acceptance Criteria:**
- [ ] Shows: title, description, date(s), route text + maps link (tappable), time taken, linked vehicle (tappable → vehicle detail page)
- [ ] Expense breakdown table: category, amount, currency
- [ ] Total trip cost shown prominently
- [ ] Link to the auto-created vehicle expense entry (if one was created)
- [ ] Edit and Delete actions (kebab menu)

---

### STORY-06-03: Edit Trip
**As a** user,
**I want** to edit a trip I've logged,
**so that** I can correct details or add information I missed.

**Acceptance Criteria:**
- [ ] Pre-populated form with all current trip data
- [ ] All fields editable
- [ ] If vehicle changes: previously auto-created expense is re-linked to new vehicle (or moved to general if vehicle removed)
- [ ] If breakdown amounts change: auto-created expense amount is recalculated and updated
- [ ] On save: trip record + linked expense updated; user returned to trip detail page

---

### STORY-06-04: Delete Trip with Cascade Warning
**As a** user,
**I want** to delete a trip,
**so that** I can remove journeys I logged in error.

**Acceptance Criteria:**
- [ ] Delete accessible from trip detail page (kebab menu)
- [ ] Confirmation dialog: "Deleting this trip will also delete its associated expense entries. This cannot be undone. Continue?"
- [ ] On confirm: trip record deleted; all linked expense records cascade-deleted; user returned to Trips tab
- [ ] Cancel closes dialog without action

---

### STORY-06-05: Trips List (All Vehicles)
**As a** user,
**I want** to see all my logged trips in one list,
**so that** I can browse and access any trip quickly.

**Acceptance Criteria:**
- [ ] Trips tab shows all trips across all vehicles, sorted by date descending
- [ ] Each entry shows: title, date(s), linked vehicle name (or "No vehicle"), total trip cost
- [ ] Tap on entry → trip detail page
- [ ] "Add Trip" CTA always visible
- [ ] Filter by vehicle (dropdown) — optional but recommended for usability
- [ ] Empty state: "No trips logged yet. Record your first journey."