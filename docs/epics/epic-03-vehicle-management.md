# Epic 03 — Vehicle Management

**Status:** Not Started
**Priority:** P0 — Core data entity; Expenses, Documents, and Trips all depend on it
**Depends On:** Epic 02 (Auth)

## Goal
Users can add, view, edit, and delete vehicles. The vehicle detail page becomes the central hub for all vehicle-related data. Bottom navigation is implemented in this epic as it's required for all subsequent navigation.

---

## Stories

### STORY-03-01: Bottom Navigation (Mobile)
**As a** mobile user,
**I want** a persistent bottom navigation bar,
**so that** I can switch between the app's main sections with one tap.

**Acceptance Criteria:**
- [ ] Bottom nav visible on all main pages (authenticated)
- [ ] 5 tabs: Home (Dashboard), Garage, Community, Trips, Profile
- [ ] Active tab highlighted
- [ ] On desktop: nav moves to sidebar or top nav
- [ ] Bell icon in top app bar; tapping opens notification drawer (drawer empty for now — populated in Epic 08)

---

### STORY-03-02: Dashboard (Home Tab)
**As a** user,
**I want** a dashboard showing my vehicles and recent activity,
**so that** I can quickly see what matters when I open the app.

**Acceptance Criteria:**
- [ ] Horizontal scrollable vehicle cards (each card: vehicle name, type badge, reg number, next doc expiry alert if within 30 days)
- [ ] "Add vehicle" card always visible at end of horizontal scroll
- [ ] Recent activity section: last 3 expense entries + last 2 community post highlights
- [ ] Empty state if no vehicles added: prompt to add first vehicle
- [ ] Community highlights section (static for now — populated properly in Epic 09)

---

### STORY-03-03: Add Vehicle (6-Step Flow)
**As a** user,
**I want** to add a vehicle through a step-by-step form,
**so that** I can set up my vehicle's profile with all relevant details without feeling overwhelmed.

**Acceptance Criteria:**
- [ ] Step 1: Vehicle name (required), Type dropdown (2-wheeler / 4-wheeler / Truck / Other)
- [ ] Step 2: Company, Model, Variant, Color (all optional except required fields noted), Registration Number (required)
- [ ] Step 3: Purchase date (date picker), Previous owners (number input, default 0)
- [ ] Step 4: Vehicle image upload (optional); preview shown
- [ ] Step 5: Document upload — RC, Insurance, PUC (optional; "Skip for now" available); document parsing deferred to Epic 04
- [ ] Step 6: Review screen showing all entered data; "Edit" link per section; "Save vehicle" CTA
- [ ] Validation: same user cannot add duplicate registration number (server-side check on save)
- [ ] On save: vehicle record created in DB; user redirected to vehicle detail page
- [ ] Progress indicator (step X of 6) shown throughout

---

### STORY-03-04: Vehicle Detail Page
**As a** user,
**I want** to view all information about a vehicle in one place,
**so that** I have a single digital home for everything related to that vehicle.

**Acceptance Criteria:**
- [ ] Header: vehicle image (placeholder if none), Name, Reg Number, Vehicle Type badge, "Owned since" date, Previous owners count, kebab menu (Edit / Delete)
- [ ] Tab 1 — Overview: total spend (sum of all expenses), last service date, next doc expiry alert (nearest upcoming)
- [ ] Tab 2 — Documents: placeholder list (populated in Epic 04)
- [ ] Tab 3 — Expenses: placeholder list + "Add Expense" CTA (populated in Epic 05)
- [ ] Tab 4 — Trips: placeholder list + "Add Trip" CTA (populated in Epic 06)
- [ ] Default tab on open: Overview
- [ ] Tabs accessible by tap; URL param or state reflects active tab

---

### STORY-03-05: Edit Vehicle
**As a** vehicle owner,
**I want** to edit my vehicle's details,
**so that** I can correct mistakes or update information over time.

**Acceptance Criteria:**
- [ ] Edit accessible via kebab menu on vehicle detail page header
- [ ] Pre-populated form with all current vehicle data
- [ ] Same validation rules as Add Vehicle (registration number uniqueness checked on change)
- [ ] On save: vehicle record updated; user returned to vehicle detail page
- [ ] Cancel returns to vehicle detail page without saving

---

### STORY-03-06: Delete Vehicle
**As a** vehicle owner,
**I want** to delete a vehicle,
**so that** I can remove vehicles I no longer own.

**Acceptance Criteria:**
- [ ] Delete accessible via kebab menu on vehicle detail page
- [ ] Confirmation dialog: "Deleting this vehicle will also delete all its documents, expenses, and trips. This cannot be undone. Continue?"
- [ ] On confirm: cascade delete vehicle + all linked documents, expenses, trips; user redirected to Garage tab
- [ ] Invited viewers of the deleted vehicle receive an in-app notification: "A vehicle shared with you has been removed."
- [ ] Cancel closes dialog without action