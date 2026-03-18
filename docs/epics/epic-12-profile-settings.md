# Epic 12 — User Profile & Settings

**Status:** Not Started
**Priority:** P1 — Can be built incrementally alongside other epics
**Depends On:** Epic 02 (Auth), Epic 04 (Documents for DL), Epic 08 (Notifications for preferences)

## Goal
Users can manage their identity, preferences, and data from one place. This epic rounds out the app by connecting all user-facing settings and giving users control over their data.

---

## Stories

### STORY-12-01: View & Edit Profile
**As a** user,
**I want** to view and edit my profile information,
**so that** I can keep my MotoYaar identity up to date.

**Acceptance Criteria:**
- [ ] Profile tab shows: profile image, name, username, bio, Instagram link (tappable if set)
- [ ] "Edit profile" button opens edit form pre-filled with current data
- [ ] Editable fields: name, username (re-validated for uniqueness on change), profile image, bio, Instagram link
- [ ] Profile image: upload new image (stored in R2) or remove current image
- [ ] On save: user record updated; user returned to profile view
- [ ] Username change: same uniqueness validation as onboarding

---

### STORY-12-02: Driver's License on Profile
**As a** user,
**I want** to manage my Driver's License from my profile page,
**so that** I can track its expiry alongside my vehicle documents.

**Acceptance Criteria:**
- [ ] Profile page shows a "Driver's License" section
- [ ] If no DL uploaded: "Add Driver's License" CTA; tapping opens document upload flow (STORY-04-01) with type pre-set to DL
- [ ] If DL uploaded: shows expiry date, status badge (green/amber/red), and edit/delete options
- [ ] Same AI parsing flow as vehicle documents
- [ ] DL expiry included in daily cron notification check (STORY-08-01)

---

### STORY-12-03: Currency & Display Settings
**As a** user,
**I want** to set my preferred currency,
**so that** all expense amounts and reports display in the currency I use.

**Acceptance Criteria:**
- [ ] Settings → General → Currency: dropdown of common currencies (INR default; include at minimum: INR, USD, EUR, GBP, AED, SGD)
- [ ] Change takes effect immediately for all new expense entries and report displays
- [ ] Historical expenses stored with original currency + amount; reports convert to current setting
- [ ] Currently selected currency shown next to all price inputs as a label

---

### STORY-12-04: Notification Preferences
*(Defined in Epic 08 — STORY-08-05; this story ensures the Settings page wires it in)*

**As a** user,
**I want** all notification preferences accessible from the Settings page,
**so that** I have one place to manage how MotoYaar contacts me.

**Acceptance Criteria:**
- [ ] Settings → Notifications section includes all preferences from STORY-08-05
- [ ] Settings page is a single scrollable page organized into sections: General, Notifications, Privacy & Data, Account
- [ ] All sections accessible without separate sub-page navigation on mobile

---

### STORY-12-05: Privacy, Data & Account Deletion
**As a** user,
**I want** to control my data and delete my account if I choose,
**so that** I trust MotoYaar with my personal information.

**Acceptance Criteria:**
- [ ] Settings → Privacy & Data section includes:
  - Document storage preference toggle (Parse-only / Store documents) — same as STORY-04-04
  - Link to Privacy Policy page (static page explaining storage, access, encryption)
  - "Delete all stored documents" — removes all R2-stored files immediately; parse-only docs unaffected (nothing to delete)
  - "Delete my account" — triggers full account deletion
- [ ] "Delete my account" flow:
  - Confirmation dialog: "This will permanently delete your account, all vehicles, documents, expenses, trips, and community posts. This cannot be undone. Type DELETE to confirm."
  - User must type "DELETE" (case-sensitive) to enable the confirm button
  - On confirm: all user data deleted (cascade: vehicles, documents, expenses, trips, posts, comments, reactions, notifications, invites, access records); R2 files deleted; Google session invalidated
  - User redirected to landing page with message: "Your account has been deleted."