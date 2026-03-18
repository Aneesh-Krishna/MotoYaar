# Epic 08 — Notifications

**Status:** Not Started
**Priority:** P0 — Document expiry alerts are core to the product's value promise
**Depends On:** Epic 04 (Documents), Epic 01 (PWA push, cron, email)

## Goal
Users are proactively alerted before their vehicle documents expire via PWA push and email. In-app notifications provide a central place to review all alerts. The cron job runs daily and handles batching to avoid notification spam.

---

## Stories

### STORY-08-01: Daily Cron Job for Document Expiry Checking
**As a** developer,
**I want** a daily scheduled job that checks all documents and fires expiry notifications,
**so that** users are alerted automatically without any manual trigger.

**Acceptance Criteria:**
- [ ] Vercel Cron Job configured to run once daily (e.g. 09:00 IST)
- [ ] Cron hits a protected Next.js API route (`/api/cron/expiry-check`); route secured with a cron secret header
- [ ] For each document with `expiry_date` set:
  - If `expiry_date - today <= user.notification_window_days` AND no warning notification sent for this document this cycle → create warning notification + send push + email
  - If `expiry_date == today` AND no expiry notification sent → create expiry notification + send push + email
  - If `expiry_date < today` → set document `status = expired`
- [ ] Batching: if multiple documents for the same user are triggering in the same run → send ONE combined notification ("3 documents expiring soon") instead of separate notifications per document
- [ ] Notifications not re-sent if already sent (tracked via `notifications` table or a `last_warned_at` field on document)
- [ ] Cron errors logged; silent failures do not crash other users' checks

---

### STORY-08-02: PWA Push Notification Subscription
**As a** user,
**I want** to enable push notifications in my browser,
**so that** I receive document expiry alerts even when I don't have the app open.

**Acceptance Criteria:**
- [ ] After onboarding completion, prompt shown: "Enable push notifications to get expiry alerts"
- [ ] Browser permission request triggered on user action (not on page load)
- [ ] On permission granted: push subscription saved to DB linked to user
- [ ] On permission denied: prompt dismissed; user can enable later from Settings → Notifications
- [ ] Multiple devices supported: user can have push subscriptions from multiple browsers/devices
- [ ] Stale/invalid subscriptions (browser unsubscribed) handled gracefully — removed from DB on delivery failure

---

### STORY-08-03: Email Notifications for Document Expiry
**As a** user,
**I want** to receive email alerts for expiring documents,
**so that** I'm notified even if push notifications aren't enabled.

**Acceptance Criteria:**
- [ ] Warning email sent when document enters notification window
- [ ] Expiry email sent on expiry day
- [ ] Combined email for multiple documents expiring in the same cron run (one email, not one per document)
- [ ] Email content: document type, vehicle name, expiry date, CTA link to app
- [ ] Emails sent via Resend from verified domain
- [ ] User can opt out of email notifications from Settings → Notifications
- [ ] Opt-out respected immediately (no email sent if preference is off at cron run time)

---

### STORY-08-04: In-App Notification Bell & Drawer
**As a** user,
**I want** to see all my notifications in one place within the app,
**so that** I can review alerts I may have missed.

**Acceptance Criteria:**
- [ ] Bell icon in top app bar; shows unread count badge (red dot with number, max "9+")
- [ ] Tapping bell opens notification drawer (slides in from right or bottom sheet on mobile)
- [ ] Notifications listed in reverse chronological order
- [ ] Each notification shows: icon (type), title, short description, timestamp (relative: "2 hours ago")
- [ ] Unread notifications visually distinct (bold or highlighted background)
- [ ] Tap notification → marks as read + navigates to relevant page (e.g. tapping doc expiry → vehicle Documents tab)
- [ ] "Mark all as read" option at top of drawer
- [ ] Empty state: "You're all caught up."

---

### STORY-08-05: Notification Preferences in Settings
**As a** user,
**I want** to control how I receive notifications,
**so that** I only get alerts through channels that work for me.

**Acceptance Criteria:**
- [ ] Settings → Notifications section contains:
  - Document expiry window: slider or input (default 30 days; range 7–90 days)
  - Push notifications toggle (on/off); shows current permission status
  - Email notifications toggle (on/off)
- [ ] Changes saved immediately (no separate save button needed for toggles)
- [ ] Notification window change takes effect on the next cron run
- [ ] If push is toggled off: existing push subscriptions for this user are deleted from DB