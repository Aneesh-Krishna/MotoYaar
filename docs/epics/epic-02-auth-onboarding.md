# Epic 02 — Authentication & Onboarding

**Status:** Not Started
**Priority:** P0 — First user-facing feature; all personalized features depend on auth
**Depends On:** Epic 01 (Foundation)

## Goal
Users can sign in with Google, complete their profile, and receive an oriented walkthrough of the app. After this epic, MotoYaar has a working login flow and a persistent user identity.

---

## Stories

### STORY-02-01: Google SSO Login / Logout
**As a** visitor,
**I want** to sign in with my Google account,
**so that** I can access MotoYaar without creating a separate username and password.

**Acceptance Criteria:**
- [ ] "Sign in with Google" button on landing/login page
- [ ] NextAuth.js configured with Google OAuth provider
- [ ] On successful auth: session created, user record upserted in `users` table (google_id, name, email)
- [ ] Authenticated users redirected to Dashboard
- [ ] Unauthenticated users attempting to access protected routes redirected to login
- [ ] "Sign out" option available in profile menu; session cleared on sign-out
- [ ] Community feed is accessible to unauthenticated users (view-only)

---

### STORY-02-02: Onboarding Form (New User Profile Setup)
**As a** new user signing in for the first time,
**I want** to set up my profile (name, username, bio, photo, Instagram),
**so that** my MotoYaar identity is established before I start using the app.

**Acceptance Criteria:**
- [ ] Onboarding form shown immediately after first Google login (one-time only)
- [ ] Fields: Name (pre-filled from Google, editable, required), Username (required), Profile image (optional), Bio (optional), Instagram link (optional)
- [ ] Username: real-time uniqueness check as user types (debounced API call); shows green tick or "Username taken" inline
- [ ] Username: alphanumeric + underscores only, 3–30 characters
- [ ] Form cannot be submitted with an empty Name or non-unique Username
- [ ] On submit: user record updated in DB; user redirected to walkthrough
- [ ] Returning users skip onboarding entirely

---

### STORY-02-03: Onboarding Walkthrough Modal
**As a** new user who just completed profile setup,
**I want** a brief tour of the app's key sections,
**so that** I know where everything is before I start exploring.

**Acceptance Criteria:**
- [ ] 5-card modal shown after onboarding form completion
- [ ] Cards cover: Dashboard, Garage, Community, Trips, Profile — one per card
- [ ] Each card: section name (heading) + one-line description + icon/illustration placeholder
- [ ] Copy tone: casual-friendly, e.g. *"Your garage, organized."* / *"Every rupee, accounted for."* / *"Your crew is here."*
- [ ] Navigation: "Next" / "Back" / "Skip" (skip closes modal immediately)
- [ ] Final card has "Get started" button instead of "Next"
- [ ] Walkthrough completion state saved to user record (`onboarding_completed = true`)
- [ ] Walkthrough never auto-shows again after completion or skip

---

### STORY-02-04: Re-access Walkthrough from Settings
**As a** user who skipped or wants to revisit the walkthrough,
**I want** to access it again from Settings,
**so that** I can re-orient myself at any time.

**Acceptance Criteria:**
- [ ] "App tour" or "How it works" option visible in Settings page
- [ ] Tapping it opens the same 5-card walkthrough modal
- [ ] Works identically to the first-time flow

---

### STORY-02-05: Auth-Gated Route Protection
**As a** developer,
**I want** all non-community routes protected by auth middleware,
**so that** unauthenticated users cannot access personal data pages.

**Acceptance Criteria:**
- [ ] Next.js middleware protects all routes except `/login`, `/community` (view-only), and public static pages
- [ ] Unauthenticated access to protected routes → redirect to `/login` with `callbackUrl` param
- [ ] After login, user is redirected back to the originally requested URL
- [ ] New users (no username set) who bypass onboarding are redirected back to onboarding