# Epic 11 — Admin Dashboard

**Status:** Not Started
**Priority:** P1 — Required before public launch for moderation + beta seeding
**Depends On:** Epic 09 (Community), Epic 02 (Auth)

## Goal
Admins can moderate community content, manage users, seed the community feed, and monitor platform health metrics. The admin dashboard is a hidden URL, separate from the main app, with its own login.

---

## Stories

### STORY-11-01: Admin Authentication
**As an** admin,
**I want** to log in with dedicated admin credentials (not Google SSO),
**so that** the admin panel is completely separate from the user-facing app.

**Acceptance Criteria:**
- [ ] Admin dashboard accessible at a hidden, unlisted URL (e.g. `/admin-[random-slug]`)
- [ ] Login form: username + password (predefined credentials; not Google SSO)
- [ ] Default admin account seeded to DB on initial setup (credentials set via env vars)
- [ ] Admin session separate from user session
- [ ] Admins can create additional admin accounts from dashboard
- [ ] Admin routes protected by admin middleware; non-admin access → 404 (not 403, to avoid revealing the URL)

---

### STORY-11-02: Community Moderation (Reported Posts)
**As an** admin,
**I want** to review reported posts and take action,
**so that** the community stays safe and on-topic.

**Acceptance Criteria:**
- [ ] Moderation queue shows all auto-hidden posts (report count >= threshold) and flagged posts awaiting review
- [ ] Each entry shows: post title, report count, reasons breakdown, reporter list, post content preview
- [ ] Actions per post:
  - **Restore** — removes auto-hidden flag; post returns to feed
  - **Remove post** — permanent deletion; post removed from all feeds
  - **Warn user** — in-app + email notification sent to post author; warning logged on user record
  - **Suspend user** — admin inputs suspension duration (days); user account suspended for that period; in-app + email notification sent
  - **Ban user** — permanent; cannot be undone from dashboard; banned user cannot log in; existing posts stay visible unless removed separately
- [ ] Action log maintained (what action, by which admin, when)

---

### STORY-11-03: User Management
**As an** admin,
**I want** to look up and manage user accounts,
**so that** I can handle support requests and abuse cases.

**Acceptance Criteria:**
- [ ] User search by email, username, or name
- [ ] User detail view: registration date, vehicle count, post count, current account status (active / warned / suspended / banned)
- [ ] Actions: Warn / Suspend / Ban / Lift suspension (early unsuspend) / Unban
- [ ] Re-link Google account: admin can update a user's `google_id` to a new Google account (for lost-account recovery support requests)
- [ ] All actions logged with timestamp and acting admin

---

### STORY-11-04: Admin Content Seeding (Community Cold-Start)
**As an** admin,
**I want** to post and pin content in the community feed,
**so that** new users land on a populated, engaging feed from day one.

**Acceptance Criteria:**
- [ ] Admins can create posts attributed to a special "MotoYaar" admin account (visible in feed with a verified/admin badge)
- [ ] Same post creation form as users (title, description, images, tags)
- [ ] Admin posts can be **pinned** to appear at the top of the feed regardless of trending score
- [ ] Pinned posts shown with a "Pinned" indicator in the feed
- [ ] Multiple pinned posts supported; pinned order manageable from admin dashboard
- [ ] Admins can unpin posts at any time

---

### STORY-11-05: Admin Invite Users (Beta Seeding)
**As an** admin,
**I want** to send invite emails to prospective users,
**so that** I can seed the beta with targeted users before going fully public.

**Acceptance Criteria:**
- [ ] Admin dashboard → "Invite users" section
- [ ] Input: one or multiple email addresses (comma-separated or one per line)
- [ ] On submit: invite emails sent via Resend; each email includes a direct sign-up link with a pre-applied invite flag
- [ ] Invite status tracked: sent / signed up
- [ ] No invite expiry for admin-sent invites (unlike vehicle share invites)

---

### STORY-11-06: Admin Analytics Dashboard
**As an** admin/founder,
**I want** to see key platform metrics at a glance,
**so that** I can monitor growth and health without querying the database manually.

**Acceptance Criteria:**
- [ ] Dashboard shows the following metrics:
  - Total registered users (all-time)
  - New users this week + this month
  - Total vehicles added (all-time)
  - Total posts + total comments (all-time)
  - AI reports generated this month (across all users)
  - Document parsing success rate: % of documents where AI extracted a date vs. manual fallback required (rolling 30 days)
- [ ] Metrics displayed as cards with simple number + trend indicator (↑/↓ vs. previous period)
- [ ] Data refreshed on page load (no real-time required for MVP)
- [ ] Moderation queue count shown as an alert badge if any posts are awaiting review