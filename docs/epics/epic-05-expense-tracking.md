# Epic 05 — Expense Tracking

**Status:** Not Started
**Priority:** P0 — Core value; feeds Reports epic
**Depends On:** Epic 03 (Vehicles)

## Goal
Users can log, view, edit, and delete vehicle expenses. Expenses are categorized, dated, and optionally linked to a vehicle. Receipt uploads are supported. This epic provides the raw data that powers all spend reports.

---

## Stories

### STORY-05-01: Add Expense
**As a** vehicle owner,
**I want** to log an expense for my vehicle,
**so that** I have a record of every cost associated with it.

**Acceptance Criteria:**
- [ ] Expense form accessible from: Vehicle Detail → Expenses tab → "Add Expense" CTA; and from Garage tab
- [ ] Fields:
  - Price (required; numeric; uses user's currency setting, default INR)
  - Date (required; date picker; defaults to today)
  - Reason (required; dropdown: Service / Fuel / Trip / Others)
  - Where (optional; free-text)
  - Comments (optional; dropdown: Overpriced / Average / Underpriced)
  - Receipt upload (optional)
- [ ] If Reason = "Trip": user redirected to Trip creation form (STORY-06-01); expense is not created directly
- [ ] If date is more than 1 year in the past: inline warning shown ("This date seems far in the past — double check?"); user can proceed regardless
- [ ] On save: expense record created; user returned to Expenses tab or previous screen
- [ ] Vehicle context pre-filled if opened from vehicle detail page

---

### STORY-05-02: Expense List per Vehicle
**As a** vehicle owner,
**I want** to see all expenses for a vehicle in one list,
**so that** I can review what I've spent on it over time.

**Acceptance Criteria:**
- [ ] Expenses tab on vehicle detail page lists all expenses for that vehicle
- [ ] Each entry shows: price (formatted with currency), date, reason badge, where (if entered), receipt icon if receipt attached
- [ ] List sorted by date descending (newest first)
- [ ] Tap on expense entry → opens expense detail / edit view
- [ ] "Add Expense" CTA always visible
- [ ] Empty state: "No expenses yet. Start tracking what you spend on this vehicle."
- [ ] "See Spends" button links to vehicle-level report (Epic 07)

---

### STORY-05-03: Edit Expense
**As a** user,
**I want** to edit an expense I've logged,
**so that** I can fix mistakes or add missing information.

**Acceptance Criteria:**
- [ ] Edit accessible by tapping an expense entry
- [ ] Pre-populated form with all current expense data
- [ ] All fields editable except Reason cannot be changed to/from "Trip" (trip-linked expenses editable only through the trip)
- [ ] Trip-linked expenses: show read-only indicator "This expense is linked to a trip. Edit it from the trip." with link to the trip
- [ ] On save: expense record updated; user returned to expense list
- [ ] Receipt: can be replaced or removed

---

### STORY-05-04: Delete Expense
**As a** user,
**I want** to delete an expense,
**so that** I can remove entries I logged in error.

**Acceptance Criteria:**
- [ ] Delete accessible from expense detail / edit view (trash icon or kebab menu)
- [ ] Confirmation dialog: "Delete this expense? This cannot be undone."
- [ ] Trip-linked expenses cannot be independently deleted; user shown: "This expense belongs to a trip. Delete the trip to remove it."
- [ ] On confirm: expense record deleted; user returned to expense list
- [ ] Stored receipt file deleted from R2 if applicable

---

### STORY-05-05: Receipt Upload
**As a** user,
**I want** to attach a receipt photo to an expense,
**so that** I have proof of what I paid.

**Acceptance Criteria:**
- [ ] Receipt upload available on Add and Edit expense forms
- [ ] File types: JPG, PNG, PDF; max 5MB
- [ ] Receipt stored in Cloudflare R2 (not parse-only — receipts are always stored)
- [ ] Receipt accessible via signed URL from expense detail view
- [ ] Receipt can be replaced (new upload replaces old; old file deleted from R2)
- [ ] Receipt can be removed (file deleted from R2; field set to null)