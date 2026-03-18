# Epic 10 — Vehicle Sharing & Invites

**Status:** Not Started
**Priority:** P1 — Targets family/household use case
**Depends On:** Epic 03 (Vehicles), Epic 02 (Auth), Epic 01 (Email)

## Goal
Vehicle owners can invite other users to view a specific vehicle's details, documents, and expense history. Invitees get read-only access. Owners can revoke access at any time.

---

## Stories

### STORY-10-01: Invite User to View a Vehicle
**As a** vehicle owner,
**I want** to invite someone to view my vehicle by email,
**so that** family members or trusted people can see the vehicle's documents and history without me manually relaying information.

**Acceptance Criteria:**
- [ ] "Invite to view" option accessible from vehicle detail page kebab menu → "Sharing" or vehicle Settings
- [ ] Input: email address of invitee
- [ ] Submit creates a `VehicleInvite` record (status: pending, expires_at: now + 3 days)
- [ ] Invite email sent via Resend: subject "You've been invited to view [Vehicle Name] on MotoYaar", includes accept link (signed URL with invite token)
- [ ] Owner sees list of pending and active invites for the vehicle
- [ ] Owner cannot invite themselves; cannot send duplicate pending invite to same email

---

### STORY-10-02: Accept Invite (Existing MotoYaar User)
**As an** existing MotoYaar user who received an invite,
**I want** to accept the invite and gain view access to the shared vehicle,
**so that** I can see its documents and expense history.

**Acceptance Criteria:**
- [ ] Clicking invite link in email: if user is logged into MotoYaar → invite accepted automatically; `VehicleAccess` record created; user redirected to the vehicle detail page
- [ ] If invite is expired (> 3 days old): page shown: "This invite has expired. Ask the vehicle owner to send a new one."
- [ ] If invite is already used: page shown: "This invite has already been accepted."
- [ ] Accepted vehicle appears in invitee's Garage tab under a "Shared with me" section
- [ ] Invitee sees vehicle in view-only mode: all tabs visible (Overview, Documents, Expenses, Trips); no edit/delete/add actions

---

### STORY-10-03: Accept Invite (New User)
**As a** new user who received an invite but doesn't have a MotoYaar account,
**I want** to sign up and automatically get access to the shared vehicle,
**so that** I don't have to ask the owner to re-invite me after signing up.

**Acceptance Criteria:**
- [ ] Clicking invite link: if not logged in → redirected to login page with invite token preserved in URL/session
- [ ] After Google SSO login + onboarding completion → invite token resolved → `VehicleAccess` record created automatically
- [ ] User redirected to the shared vehicle detail page
- [ ] If invite expires during the signup flow (edge case): friendly message + prompt to ask owner for a new invite

---

### STORY-10-04: Manage Access (Owner: View & Revoke)
**As a** vehicle owner,
**I want** to see who has access to my vehicle and revoke it if needed,
**so that** I stay in control of who can view my vehicle's information.

**Acceptance Criteria:**
- [ ] Vehicle sharing management accessible from vehicle detail → kebab menu → "Manage sharing"
- [ ] Lists: active access (name/email, access level: View, date granted) + pending invites (email, expiry countdown)
- [ ] "Revoke access" button per active access entry; confirmation dialog; on confirm: `VehicleAccess` record deleted; revoked user receives in-app notification: "Your access to [Vehicle Name] has been removed."
- [ ] "Cancel invite" button per pending invite; on confirm: invite record deleted; no email sent
- [ ] "Invite another person" CTA inline on the management page