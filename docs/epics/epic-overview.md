# MotoYaar — Epic Overview

**Source PRD:** [prd.md](../prd.md)
**Last Updated:** 2026-03-15

Epics are ordered by recommended build sequence for a solo developer. Each epic is a self-contained deliverable that can be shipped and tested independently.

---

## Epic Index

| # | Epic | Description | Stories |
|---|------|-------------|---------|
| 01 | [Foundation & Infrastructure](epic-01-foundation.md) | Project scaffold, DB, hosting, PWA, third-party services | 7 |
| 02 | [Authentication & Onboarding](epic-02-auth-onboarding.md) | Google SSO, profile setup, walkthrough modal | 5 |
| 03 | [Vehicle Management](epic-03-vehicle-management.md) | Add/edit/delete vehicles, detail page, navigation | 6 |
| 04 | [Document Management](epic-04-document-management.md) | Upload, AI parse, expiry tracking, storage options | 6 |
| 05 | [Expense Tracking](epic-05-expense-tracking.md) | Add/edit/delete expenses, receipt upload, categories | 5 |
| 06 | [Trip Logging](epic-06-trip-logging.md) | Add/edit/delete trips, cascade expense logic | 5 |
| 07 | [Reports & Spends](epic-07-reports-spends.md) | Code-calculated reports, AI report, chart UI | 6 |
| 08 | [Notifications](epic-08-notifications.md) | Daily cron, PWA push, email, in-app bell | 5 |
| 09 | [Community](epic-09-community.md) | Posts, feed, likes/dislikes, comments, reporting | 8 |
| 10 | [Vehicle Sharing & Invites](epic-10-vehicle-sharing.md) | Invite by email, view-only access, revoke | 4 |
| 11 | [Admin Dashboard](epic-11-admin-dashboard.md) | Moderation, analytics, admin content, user management | 6 |
| 12 | [User Profile & Settings](epic-12-profile-settings.md) | Edit profile, DL, currency, notifications, data deletion | 5 |

---

## Build Order Rationale

```
01 Foundation
 └── 02 Auth & Onboarding       ← first working feature
      └── 03 Vehicle Management  ← core data entity
           ├── 04 Documents       ← core value: expiry tracking
           ├── 05 Expenses        ← core value: spend tracking
           └── 06 Trips           ← depends on expenses + vehicles
                └── 07 Reports    ← depends on expense data
08 Notifications                  ← depends on documents (can build in parallel with 05-07)
09 Community                      ← largely independent; needs auth
10 Vehicle Sharing                ← depends on vehicles + auth
11 Admin Dashboard                ← depends on community + users
12 Profile & Settings             ← can be built incrementally alongside any epic
```

---

## Key Cross-Epic Dependencies

| From | Depends On | Reason |
|------|-----------|--------|
| Documents | Foundation (Claude API, R2) | AI parsing + storage |
| Expenses | Vehicles | vehicle_id FK |
| Trips | Expenses + Vehicles | cascade rules |
| Reports | Expenses + Trips | data source |
| Notifications | Documents + Foundation (cron, email, push) | expiry pipeline |
| Community | Auth | user identity |
| Vehicle Sharing | Vehicles + Auth + Email | invite flow |
| Admin Dashboard | Community + Auth | moderation targets |