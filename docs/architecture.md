# MotoYaar — Fullstack Architecture Document

**Version:** 1.0
**Status:** Draft
**Date:** 2026-03-15
**Author:** Winston (Architect Agent) · MotoYaar
**Sources:** [PRD](prd.md) · [Front-End Spec](front-end-spec.md)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [High Level Architecture](#2-high-level-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Data Models](#4-data-models)
5. [API Specification](#5-api-specification)
6. [Components](#6-components)
7. [External APIs](#7-external-apis)
8. [Core Workflows](#8-core-workflows)
9. [Database Schema](#9-database-schema)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Backend Architecture](#11-backend-architecture)
12. [Unified Project Structure](#12-unified-project-structure)
13. [Development Workflow](#13-development-workflow)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Security and Performance](#15-security-and-performance)
16. [Testing Strategy](#16-testing-strategy)
17. [Coding Standards](#17-coding-standards)
18. [Error Handling Strategy](#18-error-handling-strategy)
19. [Monitoring and Observability](#19-monitoring-and-observability)

---

## 1. Introduction

This document outlines the complete fullstack architecture for MotoYaar, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

### Starter Template / Existing Project

MotoYaar is a **partially-started greenfield project**. The following is already in place:
- Next.js 14 (App Router) with route groups `(auth)` and `(app)`
- Shared TypeScript types in `src/types/index.ts`
- Core UI components in `src/components/ui/` and `src/components/layout/`
- All 5 main app pages scaffolded
- shadcn/ui (via Radix UI), Tailwind CSS v3, Framer Motion, Recharts, React Hook Form, Zod, Sonner, NextAuth v4, Lucide React installed

**Not yet added:** database client (Drizzle + Supabase), Cloudflare R2 SDK, Resend SDK, Anthropic SDK, web-push, testing libraries.

This architecture document formalises the decisions already made and defines what remains to be built.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-03-15 | 1.0 | Initial draft | Winston (Architect Agent) |

---

## 2. High Level Architecture

### 2.1 Technical Summary

MotoYaar is a fullstack PWA built as a single Next.js 14 (App Router) application deployed on Vercel, with serverless API Route Handlers serving all backend logic. PostgreSQL via Supabase is the primary datastore with Row Level Security enforcing per-user data isolation. Cloudflare R2 handles opt-in document storage at zero egress cost. Authentication is managed by NextAuth.js v4 with Google OAuth as the sole provider. External integrations include the Claude API (vision parsing + AI reports), Resend (transactional email), and the Web Push API (browser push notifications). The architecture targets ~$0–10/month operating cost for a solo developer at MVP scale (~50 users), with stateless API routes enabling horizontal scale on Vercel post-MVP.

### 2.2 Platform and Infrastructure

**Selected: Vercel + Supabase + Cloudflare R2** *(specified in PRD)*

| Service | Role | Free Tier |
|---------|------|-----------|
| Vercel | App hosting, serverless API routes, Cron Jobs | 100GB bandwidth, unlimited deployments |
| Supabase | PostgreSQL + pgBouncer connection pooling + RLS | 500MB DB, 2 free projects (pauses after 1 week inactivity) |
| Cloudflare R2 | Document file storage | 10GB storage, zero egress |
| Resend | Transactional email | 3,000 emails/month |
| Claude API | Document parsing + AI reports | Pay-per-use (~$0.003/doc parse) |
| Web Push | Browser push notifications | Free (VAPID, no third-party) |

> ⚠️ **Supabase free tier pauses inactive projects after 1 week.** For MVP beta, upgrade to Pro ($25/month) or keep activity alive via the daily cron job.

### 2.3 Repository Structure

**Single repo (Next.js monolith)** — no monorepo tooling needed. Next.js App Router co-locates frontend pages and API routes.

### 2.4 High Level Architecture Diagram

```mermaid
graph TB
    User["📱 Mobile / 💻 Desktop Browser"]
    SW["Service Worker (PWA)"]

    subgraph Vercel["Vercel (Serverless)"]
        Next["Next.js 14 App Router\n(Pages + RSC)"]
        API["API Route Handlers\n/api/**"]
        Cron["Vercel Cron\n(Daily 06:00 IST)"]
    end

    subgraph Supabase["Supabase"]
        PG[("PostgreSQL 15\n+ RLS")]
        Pool["pgBouncer"]
    end

    R2[("Cloudflare R2\nDocument Storage")]

    subgraph External["External Services"]
        Claude["Claude API\n(Vision + Text)"]
        Resend["Resend\n(Email)"]
        Google["Google OAuth 2.0"]
        WebPush["Web Push\n(VAPID)"]
    end

    User --> SW --> Next
    Next --> API
    API --> Pool --> PG
    API --> R2
    API --> Claude
    API --> Resend
    API --> WebPush
    Cron --> API
    Next <--> Google
```

### 2.5 Architectural Patterns

- **Fullstack Next.js (App Router):** Single repo; React Server Components for data fetching; Client Components only where browser APIs or interactivity needed — _Rationale:_ Zero separate backend service; reduces infra complexity for solo dev
- **REST via Next.js Route Handlers:** `app/api/**` as RESTful endpoints — _Rationale:_ Simple, well-understood, sufficient at MVP scale
- **Service Layer:** API routes call typed service functions; never query DB directly in route handlers — _Rationale:_ Testability and separation of concerns
- **Serverless Functions:** Each API route runs as a Vercel serverless function — _Rationale:_ Zero server management; auto-scales; fits free tier
- **PWA (App Shell + Service Worker):** Cache-first for shell, network-first for API responses — _Rationale:_ Mobile-first offline experience without a native app
- **Async Job Pattern:** AI report generation triggered async; user notified via push + email on completion — _Rationale:_ Claude API latency is variable; async prevents request timeout
- **Row Level Security:** Supabase RLS policies enforce per-user data isolation at DB level — _Rationale:_ Defense-in-depth; protects data even if application-level auth has a bug

---

## 3. Tech Stack

> **Note:** Versions reflect what is currently installed. New packages to be added are marked with ✦.

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.4 | Type-safe UI + shared types | Full-stack type safety; catches errors at compile time |
| Frontend Framework | Next.js (App Router) | 14.2 | Pages, RSC, routing, API routes | Already in use; Vercel-native; RSC reduces client JS bundle |
| UI Components | shadcn/ui (via Radix UI) | Latest | Accessible base UI components | Already installed; unstyled-first, zero bundle bloat |
| CSS Framework | Tailwind CSS | v3.4 | Utility-first styling | Already in use; pairs with shadcn/ui |
| Icons | Lucide React | 0.400 | Icon system | Already installed; consistent with front-end spec |
| Charts | Recharts | 2.12 | Spend reports (Bar/Line/Donut) | Already installed; React-native; dynamic import |
| Animations | Framer Motion | 11.x | Bottom sheet / modal transitions | Already installed; used selectively |
| Toasts | Sonner | 1.5 | User feedback toasts | Already installed; shadcn-recommended |
| Forms | React Hook Form + Zod | 7.52 / 3.23 | Form state + schema validation | Already installed; Zod schemas shared with API validation |
| State Management | Zustand ✦ | 5.x | Client-side global state (notifications, UI) | Minimal footprint; RSC handles server state |
| Auth | NextAuth.js | v4.24 | Google OAuth + session management | Already installed; well-tested at v4 |
| ORM | Drizzle ORM ✦ | 0.x | Type-safe DB queries + migrations | Lighter than Prisma; no runtime engine; ideal for serverless cold starts |
| Database | PostgreSQL via Supabase ✦ | PG 15 | Primary datastore | Specified in PRD; RLS; connection pooling via pgBouncer |
| DB Client | @supabase/supabase-js ✦ | 2.x | Supabase client (auth helpers + storage) | Official Supabase JS client |
| File Storage | @aws-sdk/client-s3 ✦ | 3.x | Cloudflare R2 (S3-compatible) | R2 uses S3-compatible API; AWS SDK v3 is modular |
| Email | Resend SDK ✦ | 3.x | Transactional email | Specified in PRD; 3,000/month free |
| AI | @anthropic-ai/sdk ✦ | Latest | Document parsing (vision) + AI narrative reports | Specified in PRD; single API key for both use cases |
| Push | web-push ✦ | 3.x | VAPID push notification delivery | Free; no third-party service; service worker compatible |
| Frontend Testing | Vitest + React Testing Library ✦ | Latest | Component + hook unit tests | Fast; excellent DX with Next.js |
| Backend Testing | Vitest ✦ | Latest | Service unit tests | Same test runner full-stack |
| E2E Testing | Playwright ✦ | 1.x | Critical user flow tests | Reliable cross-browser; first-class Next.js support |
| Build | Next.js CLI | 14.2 | Production builds | Built-in; zero config |
| CI/CD | GitHub Actions + Vercel | — | Test gate + auto-deploy | Vercel deploys on push; GH Actions for test gate |
| Monitoring | Vercel Analytics | Free | Core Web Vitals + performance | Zero config; built into Vercel dashboard |
| Logging | pino ✦ | 9.x | Structured JSON logging in API routes | Lightweight; JSON output works with Vercel Logs |

---

## 4. Data Models

Canonical TypeScript types live in `src/types/index.ts`. The following interfaces extend and supplement what already exists, serving as the contract between frontend and backend.

> All existing types in `src/types/index.ts` are authoritative. This section documents the complete model including additions needed for the backend.

### User

```typescript
// Extends existing User in src/types/index.ts
export interface User {
  id: string;
  googleId: string;
  name: string;
  username: string;             // unique
  bio?: string;
  profileImageUrl?: string;
  instagramLink?: string;
  currency: string;             // default: "INR"
  notificationWindowDays: number; // default: 30
  documentStoragePreference: "parse_only" | "full_storage"; // default: "parse_only"
  pushNotificationsEnabled: boolean;
  walkthroughSeen: boolean;
  status: "active" | "warned" | "suspended" | "banned";
  createdAt: string;
}
```

**Relationships:** owns many `Vehicle`, `Expense`, `Trip`, `Post`, `Comment`, `Notification`; has many `VehicleAccess` (shared vehicles)

### Vehicle

```typescript
// Existing in src/types/index.ts — VehicleType uses "2-wheeler" | "4-wheeler" | "truck" | "other"
export interface Vehicle {
  id: string;
  userId: string;
  name: string;
  type: VehicleType;            // "2-wheeler" | "4-wheeler" | "truck" | "other"
  company?: string;
  model?: string;
  variant?: string;
  color?: string;
  registrationNumber: string;  // unique per user
  purchasedAt?: string;
  previousOwners: number;      // default: 0
  imageUrl?: string;
  createdAt: string;
  // Computed (joined in list queries)
  totalSpend?: number;
  nextDocumentExpiry?: string;
  nextDocumentStatus?: DocumentStatus;
}
```

### Document

```typescript
export interface Document {
  id: string;
  vehicleId?: string;           // null for Driver's License
  userId: string;
  type: DocumentType;           // "RC" | "Insurance" | "PUC" | "DL" | "Other"
  label?: string;               // for "Other" type
  expiryDate?: string;
  storageUrl?: string;          // null in parse_only mode
  parseStatus: "parsed" | "manual" | "incomplete";
  status: DocumentStatus;       // "valid" | "expiring" | "expired" | "incomplete"
  expiryWarningNotifiedAt?: string; // prevents duplicate cron notifications
  expiryNotifiedAt?: string;
  createdAt: string;
}
```

### Expense

```typescript
// Existing in src/types/index.ts
export interface Expense {
  id: string;
  vehicleId?: string;
  userId: string;
  tripId?: string;              // set when auto-created from trip
  price: number;
  currency: string;
  date: string;
  reason: ExpenseReason;        // "Service" | "Fuel" | "Trip" | "Others"
  whereText?: string;
  comment?: "Overpriced" | "Average" | "Underpriced";
  receiptUrl?: string;
  createdAt: string;
}
```

### Trip

```typescript
// Existing in src/types/index.ts
export interface Trip {
  id: string;
  userId: string;
  vehicleId?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  routeText?: string;
  mapsLink?: string;
  timeTaken?: string;
  breakdown: TripBreakdownItem[];  // stored as JSONB
  totalCost?: number;              // computed from breakdown
  createdAt: string;
  vehicle?: Pick<Vehicle, "id" | "name" | "registrationNumber">;
}
```

### Post

```typescript
export interface PostEditHistoryEntry {
  editedAt: string;
  previousTitle: string;
  previousDescription: string;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  description: string;          // max 1000 chars
  images: string[];             // max 2 URLs
  links: string[];
  tags: string[];
  edited: boolean;
  editHistory: PostEditHistoryEntry[]; // stored as JSONB
  isPinned: boolean;
  isHidden: boolean;
  score: number;                // Reddit hot score
  createdAt: string;
  updatedAt: string;
  // Joined
  author?: Pick<User, "id" | "name" | "username" | "profileImageUrl">;
  likes: number;
  dislikes: number;
  commentCount: number;
  userReaction?: PostReactionType;
}
```

### AIReport _(new — not in PRD data model, required for async flow)_

```typescript
export interface AIReport {
  id: string;
  userId: string;
  status: "pending" | "generating" | "ready" | "failed";
  periodLabel?: string;         // e.g. "March 2026"
  content?: string;             // generated narrative
  requestedAt: string;
  completedAt?: string;
}
```

### PushSubscription _(new — required for Web Push)_

```typescript
export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  createdAt: string;
}
```

---

## 5. API Specification

All routes live under `/api/`. Authentication uses NextAuth v4 `getServerSession(authOptions)`. Admin routes use separate credential-based session.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/api/auth/[...nextauth]` | — | NextAuth v4 handler (Google OAuth, session) |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/me` | Required | Get current user profile |
| PATCH | `/api/users/me` | Required | Update profile (name, username, bio, profileImageUrl, instagramLink) |
| PATCH | `/api/users/me/settings` | Required | Update settings (currency, notificationWindowDays, documentStoragePreference, pushNotificationsEnabled) |
| DELETE | `/api/users/me` | Required | Delete all user data + stored documents |

### Push Subscriptions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/push/subscribe` | Required | Save VAPID push subscription |
| DELETE | `/api/push/unsubscribe` | Required | Remove push subscription |

### Vehicles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/vehicles` | Required | List user's vehicles (includes computed totalSpend, nextDocumentExpiry) |
| POST | `/api/vehicles` | Required | Create vehicle |
| GET | `/api/vehicles/[id]` | Required | Get vehicle detail (owner or viewer) |
| PATCH | `/api/vehicles/[id]` | Required | Update vehicle (owner only) |
| DELETE | `/api/vehicles/[id]` | Required | Delete vehicle + cascade (owner only) |
| GET | `/api/vehicles/[id]/access` | Required | List viewers for vehicle (owner only) |
| DELETE | `/api/vehicles/[id]/access/[userId]` | Required | Revoke viewer access (owner only) |

**POST `/api/vehicles` request body:**
```json
{
  "name": "Royal Enfield Classic 350",
  "type": "2-wheeler",
  "company": "Royal Enfield",
  "model": "Classic",
  "variant": "350",
  "color": "Gunmetal Grey",
  "registrationNumber": "MH01AB1234",
  "purchasedAt": "2022-06-15",
  "previousOwners": 0
}
```

### Documents

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/vehicles/[id]/documents` | Required | List documents for vehicle |
| POST | `/api/vehicles/[id]/documents/parse` | Required | Upload + AI parse document; returns extracted fields |
| POST | `/api/vehicles/[id]/documents` | Required | Save document after user confirms parsed/manual data |
| GET | `/api/documents/[id]` | Required | Get document (signed URL if stored) |
| PATCH | `/api/documents/[id]` | Required | Update document (expiry date, label) |
| DELETE | `/api/documents/[id]` | Required | Delete document + R2 file if stored |
| GET | `/api/users/me/documents` | Required | Get user-level documents (Driver's License) |
| POST | `/api/users/me/documents/parse` | Required | Parse Driver's License |
| POST | `/api/users/me/documents` | Required | Save Driver's License |

**POST `/api/vehicles/[id]/documents/parse` response:**
```json
{
  "extractedExpiryDate": "2026-08-31",
  "documentType": "Insurance",
  "confidence": "high",
  "parseStatus": "parsed"
}
```

### Expenses

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/vehicles/[id]/expenses` | Required | List vehicle expenses (owner or viewer) |
| POST | `/api/vehicles/[id]/expenses` | Required | Create expense for vehicle |
| GET | `/api/expenses` | Required | List all user expenses (across vehicles + unlinked) |
| GET | `/api/expenses/[id]` | Required | Get expense |
| PATCH | `/api/expenses/[id]` | Required | Update expense (owner only; trip-linked expenses blocked) |
| DELETE | `/api/expenses/[id]` | Required | Delete expense (trip-linked expenses blocked) |

### Trips

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/trips` | Required | List user's trips |
| POST | `/api/trips` | Required | Create trip → auto-creates expense |
| GET | `/api/trips/[id]` | Required | Get trip with expense data |
| PATCH | `/api/trips/[id]` | Required | Update trip |
| DELETE | `/api/trips/[id]` | Required | Delete trip + cascade expenses (requires confirmation flag) |

**DELETE `/api/trips/[id]` requires `?confirm=true` query param** — returns 400 without it (forces frontend to show warning modal first).

### Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reports/vehicles/[id]` | Required | Vehicle-level spend report |
| GET | `/api/reports/overall` | Required | Overall spend report (all vehicles) |
| POST | `/api/reports/ai` | Required | Trigger async AI report generation |
| GET | `/api/reports/ai` | Required | List user's AI reports |
| GET | `/api/reports/ai/[id]` | Required | Get specific AI report content |

**GET `/api/reports/overall` query params:** `period=monthly|yearly|range`, `from=YYYY-MM-DD`, `to=YYYY-MM-DD`, `compareTo=YYYY-MM-DD`

### Community — Posts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/posts` | Optional | List posts (guests can read) — params: `sort=trending\|newest`, `tag=`, `page=`, `limit=20` |
| POST | `/api/posts` | Required | Create post |
| GET | `/api/posts/[id]` | Optional | Get post with comments |
| PATCH | `/api/posts/[id]` | Required | Edit post (owner only) |
| DELETE | `/api/posts/[id]` | Required | Delete post (owner only) |
| POST | `/api/posts/[id]/reactions` | Required | Add or toggle reaction (like/dislike) |
| DELETE | `/api/posts/[id]/reactions` | Required | Remove reaction |
| POST | `/api/posts/[id]/reports` | Required | Report post |

### Community — Comments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/posts/[id]/comments` | Optional | List comments (threaded, 2 levels) |
| POST | `/api/posts/[id]/comments` | Required | Add comment |
| PATCH | `/api/comments/[id]` | Required | Edit comment |
| DELETE | `/api/comments/[id]` | Required | Delete comment |

### Invites

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/invites` | Required | List invites sent by current user |
| POST | `/api/invites` | Required | Send vehicle invite email |
| GET | `/api/invites/[token]` | — | Validate invite token (used by invite link) |
| POST | `/api/invites/[token]/accept` | Required | Accept invite → creates VehicleAccess |
| DELETE | `/api/invites/[id]` | Required | Revoke invite (owner only) |

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Required | List notifications for current user |
| PATCH | `/api/notifications/[id]` | Required | Mark notification as read |
| PATCH | `/api/notifications/read-all` | Required | Mark all notifications as read |

### Cron

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/cron/document-expiry` | CRON_SECRET | Daily document expiry check + notifications |

**Secured via `Authorization: Bearer {CRON_SECRET}` header — Vercel sets this automatically for cron jobs.**

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/auth` | — | Admin credential login |
| GET | `/api/admin/analytics` | Admin | Dashboard metrics |
| GET | `/api/admin/posts/reported` | Admin | Reported posts queue |
| PATCH | `/api/admin/posts/[id]` | Admin | Restore / remove post |
| PATCH | `/api/admin/posts/[id]/pin` | Admin | Pin / unpin post |
| POST | `/api/admin/posts` | Admin | Create official post as MotoYaar |
| GET | `/api/admin/users` | Admin | User list (searchable) |
| PATCH | `/api/admin/users/[id]` | Admin | Warn / suspend / ban / relink Google account |
| POST | `/api/admin/users/invite` | Admin | Send beta invite email |
| GET | `/api/admin/settings` | Admin | Get configurable settings |
| PATCH | `/api/admin/settings` | Admin | Update settings (report threshold, notification window) |

---

## 6. Components

### Backend Services (`src/services/`)

| Service | Responsibility |
|---------|---------------|
| `userService` | Profile CRUD, settings, onboarding completion, data deletion |
| `vehicleService` | Vehicle CRUD, access control checks (owner vs. viewer) |
| `documentService` | Document CRUD, Claude API parsing call, expiry status calculation |
| `expenseService` | Expense CRUD, blocks edits/deletes on trip-linked expenses |
| `tripService` | Trip CRUD, auto-creates combined expense on create, cascade delete on delete |
| `reportService` | Spend aggregations by category/period, currency conversion, trend calculations |
| `aiReportService` | Monthly quota check, async Claude text generation, status lifecycle |
| `communityService` | Post/comment CRUD, hot score calculation, duplicate submission check, auto-hide on report threshold |
| `notificationService` | Orchestrates in-app notification insert + push send + email send |
| `pushService` | Web Push VAPID wrapper; sends to all subscriptions for a user |
| `emailService` | Resend SDK wrapper; typed email templates |
| `storageService` | Cloudflare R2 upload, delete, signed URL generation |
| `adminService` | Moderation actions, analytics queries, admin account management |
| `cronService` | Document expiry scan logic called by the cron route handler |

### Frontend Components (`src/components/`)

```
components/
├── layout/
│   ├── BottomNav.tsx          ← exists
│   ├── SidebarNav.tsx         ← exists
│   └── TopBar.tsx             ← exists
├── ui/                        ← shared design system
│   ├── VehicleCard.tsx        ← exists
│   ├── DocumentRow.tsx        ← exists
│   ├── ExpenseRow.tsx         ← exists
│   ├── TripCard.tsx           ← exists
│   ├── PostCard.tsx           ← exists
│   ├── StatusBadge.tsx        ← exists
│   ├── EmptyState.tsx         ← exists
│   ├── AlertBanner.tsx        ← exists
│   ├── BottomSheet.tsx        ← to build
│   ├── ConfirmModal.tsx       ← to build
│   └── StepWizard.tsx         ← to build
├── vehicles/
│   ├── VehicleDetail.tsx
│   ├── AddVehicleWizard.tsx
│   └── VehicleAccessList.tsx
├── documents/
│   ├── DocumentUpload.tsx
│   └── DocumentParseConfirm.tsx
├── expenses/
│   └── ExpenseForm.tsx
├── trips/
│   └── TripForm.tsx
├── community/
│   ├── PostFeed.tsx
│   ├── PostDetail.tsx
│   └── NewPostForm.tsx
├── reports/
│   ├── SpendChart.tsx
│   ├── SpendTable.tsx
│   └── AIReportCard.tsx
├── notifications/
│   └── NotificationDrawer.tsx
└── onboarding/
    └── WalkthroughModal.tsx
```

### Component Diagram

```mermaid
graph LR
    subgraph Frontend
        Pages["App Pages (RSC)"]
        Components["UI Components (Client)"]
        APIClient["API Client\n(fetch wrapper)"]
        Zustand["Zustand Stores\n(notifications, UI)"]
    end

    subgraph Backend
        Routes["API Route Handlers"]
        Services["Service Layer"]
        DB["Drizzle ORM → Supabase"]
    end

    subgraph External
        Claude["Claude API"]
        R2["Cloudflare R2"]
        Resend["Resend"]
        Push["Web Push"]
    end

    Pages --> Components
    Components --> APIClient --> Routes
    Components --> Zustand
    Routes --> Services
    Services --> DB
    Services --> Claude
    Services --> R2
    Services --> Resend
    Services --> Push
```

---

## 7. External APIs

### Claude API (Anthropic)

- **Purpose:** Document image/PDF parsing (vision) + AI spend narrative reports (text generation)
- **Auth:** `x-api-key` header (`ANTHROPIC_API_KEY`)
- **SDK:** `@anthropic-ai/sdk`
- **Key operations:**
  - `messages.create` with `model: "claude-3-haiku-20240307"` (fast, cheap) for document parsing
  - `messages.create` with `model: "claude-3-5-sonnet-20241022"` for AI report narrative
- **Rate limits:** Tier-based; at low volume no practical limit for MVP
- **Integration notes:** Document images sent as base64 in vision message. AI reports are async — Claude response streamed and saved to DB, then notification sent.

### Resend

- **Purpose:** Transactional email (document expiry alerts, AI report ready, invite links, admin notifications)
- **Auth:** `Authorization: Bearer RESEND_API_KEY`
- **SDK:** `resend` npm package
- **Key operations:** `resend.emails.send({ from, to, subject, html })`
- **Rate limits:** 3,000 emails/month free; 100/day
- **Integration notes:** All emails sent from `noreply@motoyaar.app` (requires domain DNS verification in Resend dashboard)

### Google OAuth 2.0

- **Purpose:** User authentication (only auth method for MVP)
- **Auth:** OAuth 2.0 via NextAuth v4 Google provider
- **Config:** `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` from Google Cloud Console
- **Integration notes:** NextAuth handles token exchange, session creation, and refresh. No direct Google API calls needed beyond what NextAuth manages.

### Web Push (VAPID)

- **Purpose:** Browser push notifications for document expiry, AI reports, and admin actions
- **Auth:** VAPID keypair (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- **Library:** `web-push` npm package
- **Key operations:** `webpush.sendNotification(subscription, payload)`
- **Constraints:** iOS requires PWA installed to home screen + iOS 16.4+
- **Integration notes:** Push subscription stored in `push_subscriptions` table. Permission prompt shown post-onboarding with value-first framing.

### Cloudflare R2

- **Purpose:** Opt-in document file storage
- **Auth:** `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` (S3-compatible credentials)
- **SDK:** `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
- **Key operations:**
  - `PutObjectCommand` — upload document on opt-in storage
  - `GetObjectCommand` + presigner — generate signed URL (15-min TTL) for document access
  - `DeleteObjectCommand` — delete on user request or 10 days post-expiry
- **Integration notes:** Documents are never publicly accessible. Signed URLs expire after 15 minutes and are never cached by service worker.

---

## 8. Core Workflows

### 8.1 Google SSO Login + Onboarding

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Next as Next.js
    participant NextAuth as NextAuth v4
    participant Google as Google OAuth
    participant DB as Supabase

    User->>Browser: Click "Continue with Google"
    Browser->>NextAuth: GET /api/auth/signin/google
    NextAuth->>Google: Redirect to OAuth consent
    User->>Google: Grant permission
    Google->>NextAuth: Callback with auth code
    NextAuth->>Google: Exchange code for tokens
    Google->>NextAuth: ID token + access token
    NextAuth->>DB: Upsert user (google_id, name, email)
    NextAuth->>Browser: Set session cookie → redirect to /

    Browser->>Next: GET / (RSC, session present)
    Next->>DB: Check user.walkthrough_seen

    alt First-time user (walkthroughSeen = false)
        Next->>Browser: Render onboarding page
        User->>Browser: Submit profile (name, username)
        Browser->>Next: PATCH /api/users/me
        Next->>DB: Update user + set walkthroughSeen = false
        Next->>Browser: Redirect to app → show WalkthroughModal
        User->>Browser: Complete or skip walkthrough
        Browser->>Next: PATCH /api/users/me/settings {walkthroughSeen: true}
    else Returning user
        Next->>Browser: Render dashboard
    end
```

### 8.2 Document Upload + AI Parsing

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant API as API Route
    participant Claude as Claude API
    participant R2 as Cloudflare R2
    participant DB as Supabase

    User->>Browser: Select document file (JPG/PNG/PDF)
    Browser->>API: POST /api/vehicles/{id}/documents/parse (multipart)
    API->>Claude: messages.create (vision, base64 image, extract expiry)
    Claude->>API: { expiryDate, documentType, confidence }

    alt Parsing successful
        API->>Browser: 200 { extractedExpiryDate, documentType }
        Browser->>User: Confirmation screen (editable date)
        User->>Browser: Confirm or edit → Submit
        Browser->>API: POST /api/vehicles/{id}/documents { expiryDate, type, parseStatus }

        alt User preference = full_storage
            API->>R2: PutObjectCommand (document file)
            R2->>API: storage key
        end

        API->>DB: INSERT document (expiry_date, storage_url, parse_status)
        API->>Browser: 201 { document }
    else Parsing failed
        API->>Browser: 200 { parseStatus: "failed" }
        Browser->>User: Manual entry form (enter expiry date)
        User->>Browser: Submit date
        Browser->>API: POST /api/vehicles/{id}/documents { parseStatus: "manual" }
        API->>DB: INSERT document
    end
```

### 8.3 AI Report Generation (Async)

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant API as API Route
    participant DB as Supabase
    participant Claude as Claude API
    participant Push as Web Push
    participant Email as Resend

    User->>Browser: Click "Generate AI Report"
    Browser->>API: POST /api/reports/ai

    API->>DB: COUNT ai_reports WHERE user_id = X AND requested_at >= first of month

    alt Quota available (count < 1)
        API->>DB: INSERT ai_reports { status: "pending" }
        API->>Browser: 202 { reportId, message: "Generating your report..." }
        Browser->>User: Show async banner (non-blocking)

        Note over API,Claude: Background async processing
        API->>DB: UPDATE ai_reports { status: "generating" }
        API->>DB: SELECT all expenses + trips for user
        API->>Claude: messages.create (spend narrative prompt + data)
        Claude->>API: Generated narrative text
        API->>DB: UPDATE ai_reports { status: "ready", content, completedAt }
        API->>DB: INSERT notification { type: "ai_report_ready" }
        API->>Push: sendNotification to all user subscriptions
        API->>Email: Send "Your AI report is ready" email

        User->>Browser: Receives push notification
        Browser->>API: GET /api/reports/ai/{id}
        API->>Browser: Report content
    else Quota exhausted
        API->>Browser: 403 { error: { code: "QUOTA_EXCEEDED" } }
        Browser->>User: "Come back next month for your next free report."
    else No expense data
        API->>Browser: 200 { noData: true }
        Browser->>User: "No expenses logged for this period."
    end
```

### 8.4 Daily Cron: Document Expiry Check

```mermaid
sequenceDiagram
    participant Vercel as Vercel Cron (06:00 IST daily)
    participant Cron as /api/cron/document-expiry
    participant DB as Supabase
    participant Push as Web Push
    participant Email as Resend

    Vercel->>Cron: POST (Authorization: Bearer CRON_SECRET)
    Cron->>Cron: Verify CRON_SECRET header

    Cron->>DB: SELECT documents WHERE expiry_date IS NOT NULL
    Cron->>DB: SELECT users with their notification_window_days

    loop Per user batch
        Note over Cron,DB: Evaluate each document

        alt expiry_date - today <= notification_window_days AND expiry_warning_notified_at IS NULL
            Cron->>DB: SET status = "expiring", expiry_warning_notified_at = now()
        end

        alt expiry_date = today AND expiry_notified_at IS NULL
            Cron->>DB: SET expiry_notified_at = now()
        end

        alt expiry_date < today
            Cron->>DB: SET status = "expired"
            alt storageUrl NOT NULL AND expiry_date < today - 10 days
                Cron->>R2: DeleteObjectCommand (auto-delete post-expiry)
            end
        end

        alt Any notifications pending for this user
            Note over Cron: Combine multiple docs into one notification
            Cron->>DB: INSERT notification (combined)
            Cron->>Push: sendNotification
            Cron->>Email: Send expiry alert email
        end
    end

    Cron->>Vercel: 200 { processed: N, notified: M, deleted: K }
```

---

## 9. Database Schema

Full SQL DDL for Supabase (PostgreSQL 15). Run via Drizzle migrations.

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id                     TEXT UNIQUE NOT NULL,
  name                          TEXT NOT NULL,
  username                      TEXT UNIQUE NOT NULL,
  bio                           TEXT,
  profile_image_url             TEXT,
  instagram_link                TEXT,
  currency                      TEXT NOT NULL DEFAULT 'INR',
  notification_window_days      INTEGER NOT NULL DEFAULT 30,
  document_storage_preference   TEXT NOT NULL DEFAULT 'parse_only'
                                  CHECK (document_storage_preference IN ('parse_only', 'full_storage')),
  push_notifications_enabled    BOOLEAN NOT NULL DEFAULT true,
  walkthrough_seen              BOOLEAN NOT NULL DEFAULT false,
  status                        TEXT NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'warned', 'suspended', 'banned')),
  suspended_until               TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Admin Accounts ───────────────────────────────────────────────────────────
CREATE TABLE admin_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Admin Settings ───────────────────────────────────────────────────────────
CREATE TABLE admin_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO admin_settings VALUES
  ('auto_hide_report_threshold', '10', now()),
  ('default_notification_window_days', '30', now());

-- ─── Push Subscriptions ───────────────────────────────────────────────────────
CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh_key  TEXT NOT NULL,
  auth_key    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- ─── Vehicles ─────────────────────────────────────────────────────────────────
CREATE TABLE vehicles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('2-wheeler', '4-wheeler', 'truck', 'other')),
  company             TEXT,
  model               TEXT,
  variant             TEXT,
  color               TEXT,
  registration_number TEXT NOT NULL,
  purchased_at        DATE,
  previous_owners     INTEGER NOT NULL DEFAULT 0,
  image_url           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, registration_number)
);

CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);

-- ─── Trips (before Expenses — Expenses FK to Trips) ──────────────────────────
CREATE TABLE trips (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id  UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  start_date  DATE NOT NULL,
  end_date    DATE,
  route_text  TEXT,
  maps_link   TEXT,
  time_taken  TEXT,
  breakdown   JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);

-- ─── Expenses ─────────────────────────────────────────────────────────────────
CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id     UUID REFERENCES trips(id) ON DELETE CASCADE,
  price       NUMERIC(12, 2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'INR',
  date        DATE NOT NULL,
  reason      TEXT NOT NULL CHECK (reason IN ('Service', 'Fuel', 'Trip', 'Others')),
  where_text  TEXT,
  comment     TEXT CHECK (comment IN ('Overpriced', 'Average', 'Underpriced')),
  receipt_url TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_vehicle_id ON expenses(vehicle_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX idx_expenses_date ON expenses(date);

-- ─── Documents ────────────────────────────────────────────────────────────────
CREATE TABLE documents (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id                  UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                        TEXT NOT NULL CHECK (type IN ('RC', 'Insurance', 'PUC', 'DL', 'Other')),
  label                       TEXT,
  expiry_date                 DATE,
  storage_url                 TEXT,
  parse_status                TEXT NOT NULL DEFAULT 'manual'
                                CHECK (parse_status IN ('parsed', 'manual', 'incomplete')),
  status                      TEXT NOT NULL DEFAULT 'valid'
                                CHECK (status IN ('valid', 'expiring', 'expired', 'incomplete')),
  expiry_warning_notified_at  TIMESTAMPTZ,
  expiry_notified_at          TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_vehicle_id ON documents(vehicle_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_expiry_date ON documents(expiry_date)
  WHERE expiry_date IS NOT NULL;

-- ─── Posts ────────────────────────────────────────────────────────────────────
CREATE TABLE posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  images       TEXT[] NOT NULL DEFAULT '{}',
  links        TEXT[] NOT NULL DEFAULT '{}',
  tags         TEXT[] NOT NULL DEFAULT '{}',
  is_edited    BOOLEAN NOT NULL DEFAULT false,
  edit_history JSONB NOT NULL DEFAULT '[]',
  is_pinned    BOOLEAN NOT NULL DEFAULT false,
  is_hidden    BOOLEAN NOT NULL DEFAULT false,
  score        DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_score ON posts(score DESC) WHERE is_hidden = false;
CREATE INDEX idx_posts_created_at ON posts(created_at DESC) WHERE is_hidden = false;
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);

-- ─── Comments ─────────────────────────────────────────────────────────────────
CREATE TABLE comments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id            UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_comment_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content            TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);

-- ─── Post Reactions ───────────────────────────────────────────────────────────
CREATE TABLE post_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('like', 'dislike')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_reactions_post_id ON post_reactions(post_id);

-- ─── Post Reports ─────────────────────────────────────────────────────────────
CREATE TABLE post_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason            TEXT NOT NULL CHECK (reason IN ('Spam', 'Inappropriate', 'Misinformation', 'Other')),
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, reporter_user_id)
);

CREATE INDEX idx_post_reports_post_id ON post_reports(post_id);

-- ─── Vehicle Invites ──────────────────────────────────────────────────────────
CREATE TABLE vehicle_invites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  owner_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email    TEXT NOT NULL,
  invitee_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  token            TEXT UNIQUE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_invites_vehicle_id ON vehicle_invites(vehicle_id);
CREATE INDEX idx_vehicle_invites_token ON vehicle_invites(token);
CREATE INDEX idx_vehicle_invites_invitee_email ON vehicle_invites(invitee_email);

-- ─── Vehicle Access ───────────────────────────────────────────────────────────
CREATE TABLE vehicle_access (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_level  TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('view')),
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, user_id)
);

CREATE INDEX idx_vehicle_access_vehicle_id ON vehicle_access(vehicle_id);
CREATE INDEX idx_vehicle_access_user_id ON vehicle_access(user_id);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  action_url  TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read)
  WHERE is_read = false;

-- ─── AI Reports ───────────────────────────────────────────────────────────────
CREATE TABLE ai_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  period_label  TEXT,
  content       TEXT,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_ai_reports_user_id ON ai_reports(user_id);
CREATE INDEX idx_ai_reports_monthly ON ai_reports(user_id, requested_at);
```

---

## 10. Frontend Architecture

### Component Architecture

**RSC vs. Client Component split:**

| Pattern | When to use |
|---------|------------|
| Server Component (default) | Data fetching, static content, no interactivity |
| `"use client"` | Event handlers, hooks (`useState`, `useEffect`), browser APIs (push subscription) |
| Server Action | Form submissions that can skip API round-trip (post-MVP consideration) |

**Component Template:**
```typescript
// Server Component (default) — data fetching
// src/app/(app)/garage/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { vehicleService } from "@/services/vehicleService";
import { VehicleCard } from "@/components/ui/VehicleCard";

export default async function GaragePage() {
  const session = await getServerSession(authOptions);
  const vehicles = await vehicleService.listByUser(session!.user.id);

  return (
    <main>
      {vehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}
    </main>
  );
}
```

```typescript
// Client Component — interactivity
// src/components/expenses/ExpenseForm.tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema } from "@/lib/validations/expense";

export function ExpenseForm({ vehicleId }: { vehicleId: string }) {
  const form = useForm({ resolver: zodResolver(expenseSchema) });
  // ...
}
```

### Route Organization

```
src/app/
├── (auth)/
│   ├── login/page.tsx              ← Google SSO screen
│   └── onboarding/page.tsx         ← Profile setup
├── (app)/
│   ├── layout.tsx                  ← Auth guard + bottom nav
│   ├── page.tsx                    ← Home / Dashboard
│   ├── garage/
│   │   ├── page.tsx                ← Vehicle list
│   │   ├── new/page.tsx            ← Add Vehicle wizard
│   │   └── [id]/
│   │       ├── page.tsx            ← Vehicle detail (tabs)
│   │       └── edit/page.tsx
│   ├── community/
│   │   ├── page.tsx                ← Feed
│   │   └── [id]/page.tsx           ← Post detail
│   ├── trips/
│   │   └── page.tsx
│   └── profile/
│       ├── page.tsx
│       └── settings/page.tsx
├── admin/
│   ├── layout.tsx                  ← Admin auth guard
│   ├── page.tsx                    ← Analytics
│   ├── reported/page.tsx
│   ├── users/page.tsx
│   └── settings/page.tsx
└── api/
    └── [all route handlers]
```

**Protected Route Pattern (NextAuth v4):**
```typescript
// src/app/(app)/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <>{children}</>;
}
```

**Middleware** (`src/middleware.ts`):
```typescript
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/garage/:path*", "/trips/:path*", "/profile/:path*"],
};
```

### State Management

Zustand stores handle **only** client-side ephemeral state — server data is fetched via RSC or client `fetch`.

```typescript
// src/stores/notificationStore.ts
import { create } from "zustand";

interface NotificationStore {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  decrement: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  decrement: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
}));

// src/stores/uiStore.ts
interface UIStore {
  activeSheet: "expense" | "trip" | "document" | null;
  openSheet: (type: UIStore["activeSheet"]) => void;
  closeSheet: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeSheet: null,
  openSheet: (type) => set({ activeSheet: type }),
  closeSheet: () => set({ activeSheet: null }),
}));
```

### Frontend API Client

```typescript
// src/lib/api-client.ts
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
    public status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json();
    throw new ApiError(body.error.code, body.error.message, body.error.details, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// src/services/api/vehicleApi.ts
import { apiRequest } from "@/lib/api-client";
import type { Vehicle } from "@/types";

export const vehicleApi = {
  list: () => apiRequest<Vehicle[]>("/vehicles"),
  get: (id: string) => apiRequest<Vehicle>(`/vehicles/${id}`),
  create: (data: Partial<Vehicle>) =>
    apiRequest<Vehicle>("/vehicles", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Vehicle>) =>
    apiRequest<Vehicle>(`/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiRequest<void>(`/vehicles/${id}`, { method: "DELETE" }),
};
```

---

## 11. Backend Architecture

### Route Handler Pattern

```typescript
// src/app/api/vehicles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { vehicleService } from "@/services/vehicleService";
import { createVehicleSchema } from "@/lib/validations/vehicle";
import { handleApiError } from "@/lib/errors";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return unauthorized();

    const vehicles = await vehicleService.listByUser(session.user.id);
    return NextResponse.json(vehicles);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return unauthorized();

    const body = await req.json();
    const input = createVehicleSchema.parse(body);
    const vehicle = await vehicleService.create(session.user.id, input);
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

function unauthorized() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Authentication required",
               timestamp: new Date().toISOString(), requestId: crypto.randomUUID() } },
    { status: 401 }
  );
}
```

### Service Layer Pattern

```typescript
// src/services/vehicleService.ts
import { db } from "@/lib/db/client";
import { vehicles, vehicleAccess } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/errors";

export const vehicleService = {
  async listByUser(userId: string) {
    return db.select().from(vehicles)
      .where(eq(vehicles.userId, userId))
      .orderBy(vehicles.createdAt);
  },

  async create(userId: string, input: CreateVehicleInput) {
    // Check duplicate reg number for this user
    const existing = await db.query.vehicles.findFirst({
      where: and(eq(vehicles.userId, userId), eq(vehicles.registrationNumber, input.registrationNumber)),
    });
    if (existing) throw new ConflictError("You already have a vehicle with this registration number");

    const [vehicle] = await db.insert(vehicles).values({ ...input, userId }).returning();
    return vehicle;
  },

  async getWithAccessCheck(vehicleId: string, userId: string) {
    const vehicle = await db.query.vehicles.findFirst({ where: eq(vehicles.id, vehicleId) });
    if (!vehicle) throw new NotFoundError("Vehicle not found");
    if (vehicle.userId === userId) return { vehicle, isOwner: true };

    const access = await db.query.vehicleAccess.findFirst({
      where: and(eq(vehicleAccess.vehicleId, vehicleId), eq(vehicleAccess.userId, userId)),
    });
    if (!access) throw new ForbiddenError("No access to this vehicle");
    return { vehicle, isOwner: false };
  },
};
```

### Database Client (Drizzle + Supabase)

```typescript
// src/lib/db/client.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Use connection pooling URL for serverless (pgBouncer)
const client = postgres(connectionString, { prepare: false }); // prepare: false required for pgBouncer

export const db = drizzle(client, { schema });
```

### NextAuth Configuration

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // Upsert user on Google sign-in
        await db.insert(users)
          .values({ googleId: account.providerAccountId, name: user.name!, username: "" })
          .onConflictDoNothing();
      }
      return true;
    },
    async session({ session, token }) {
      if (token.sub) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.googleId, token.sub),
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.username = dbUser.username;
          session.user.walkthroughSeen = dbUser.walkthroughSeen;
        }
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) token.sub = account.providerAccountId;
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
};
```

---

## 12. Unified Project Structure

```
motoyaar/
├── .github/
│   └── workflows/
│       └── ci.yml                    # Test + lint on PR
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx        ← exists
│   │   │   └── onboarding/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx            ← exists
│   │   │   ├── page.tsx              ← exists (Dashboard)
│   │   │   ├── garage/
│   │   │   │   ├── page.tsx          ← exists
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── edit/page.tsx
│   │   │   ├── community/
│   │   │   │   ├── page.tsx          ← exists
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── trips/page.tsx        ← exists
│   │   │   └── profile/
│   │   │       ├── page.tsx          ← exists
│   │   │       └── settings/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── reported/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── users/
│   │   │   │   └── me/route.ts
│   │   │   ├── vehicles/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── documents/
│   │   │   │       │   ├── route.ts
│   │   │   │       │   └── parse/route.ts
│   │   │   │       ├── expenses/route.ts
│   │   │   │       └── access/route.ts
│   │   │   ├── expenses/[id]/route.ts
│   │   │   ├── trips/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── posts/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── comments/route.ts
│   │   │   │       ├── reactions/route.ts
│   │   │   │       └── reports/route.ts
│   │   │   ├── comments/[id]/route.ts
│   │   │   ├── invites/
│   │   │   │   ├── route.ts
│   │   │   │   └── [token]/
│   │   │   │       ├── route.ts
│   │   │   │       └── accept/route.ts
│   │   │   ├── notifications/route.ts
│   │   │   ├── reports/
│   │   │   │   ├── overall/route.ts
│   │   │   │   ├── vehicles/[id]/route.ts
│   │   │   │   └── ai/
│   │   │   │       ├── route.ts
│   │   │   │       └── [id]/route.ts
│   │   │   ├── push/
│   │   │   │   ├── subscribe/route.ts
│   │   │   │   └── unsubscribe/route.ts
│   │   │   ├── cron/
│   │   │   │   └── document-expiry/route.ts
│   │   │   └── admin/
│   │   │       ├── auth/route.ts
│   │   │       ├── analytics/route.ts
│   │   │       ├── posts/
│   │   │       │   ├── route.ts
│   │   │       │   ├── reported/route.ts
│   │   │       │   └── [id]/route.ts
│   │   │       ├── users/
│   │   │       │   ├── route.ts
│   │   │       │   ├── invite/route.ts
│   │   │       │   └── [id]/route.ts
│   │   │       └── settings/route.ts
│   │   ├── layout.tsx                ← exists (root)
│   │   └── globals.css               ← exists
│   ├── components/
│   │   ├── layout/                   ← exists (BottomNav, SidebarNav, TopBar)
│   │   ├── ui/                       ← exists (shared design system components)
│   │   ├── vehicles/
│   │   ├── documents/
│   │   ├── expenses/
│   │   ├── trips/
│   │   ├── community/
│   │   ├── reports/
│   │   ├── notifications/
│   │   └── onboarding/
│   ├── lib/
│   │   ├── auth.ts                   # NextAuth options
│   │   ├── db/
│   │   │   ├── client.ts             # Drizzle client
│   │   │   └── schema.ts             # Drizzle schema (mirrors SQL above)
│   │   ├── errors.ts                 # Custom error classes + handleApiError
│   │   ├── validations/              # Zod schemas per domain
│   │   │   ├── vehicle.ts
│   │   │   ├── expense.ts
│   │   │   ├── trip.ts
│   │   │   ├── document.ts
│   │   │   └── post.ts
│   │   ├── r2.ts                     # Cloudflare R2 S3 client
│   │   ├── resend.ts                 # Resend client
│   │   ├── anthropic.ts              # Anthropic SDK client
│   │   ├── push.ts                   # web-push config
│   │   └── utils.ts                  ← exists
│   ├── services/                     # Backend service layer
│   │   ├── userService.ts
│   │   ├── vehicleService.ts
│   │   ├── documentService.ts
│   │   ├── expenseService.ts
│   │   ├── tripService.ts
│   │   ├── reportService.ts
│   │   ├── aiReportService.ts
│   │   ├── communityService.ts
│   │   ├── notificationService.ts
│   │   ├── storageService.ts
│   │   ├── emailService.ts
│   │   ├── pushService.ts
│   │   ├── adminService.ts
│   │   └── cronService.ts
│   ├── services/api/                 # Frontend API client wrappers
│   │   ├── vehicleApi.ts
│   │   ├── documentApi.ts
│   │   ├── expenseApi.ts
│   │   ├── tripApi.ts
│   │   ├── reportApi.ts
│   │   ├── communityApi.ts
│   │   └── notificationApi.ts
│   ├── stores/                       # Zustand client stores
│   │   ├── notificationStore.ts
│   │   └── uiStore.ts
│   ├── hooks/                        # Custom React hooks
│   │   ├── useVehicles.ts
│   │   ├── usePushSubscription.ts
│   │   └── useNotifications.ts
│   ├── types/
│   │   └── index.ts                  ← exists (canonical types)
│   └── utils/
│       ├── currency.ts               # Currency conversion
│       ├── date.ts                   # Date formatting helpers
│       └── hotScore.ts               # Reddit hot score: (likes-dislikes)/(age+2)^1.5
├── public/
│   ├── manifest.json                 ← exists
│   ├── sw.js                         # Service worker
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── drizzle/
│   └── migrations/                   # Generated Drizzle migration files
├── docs/
│   ├── prd.md
│   ├── front-end-spec.md
│   └── architecture.md               ← this file
├── vercel.json                        # Cron job config
├── .env.example
├── next.config.ts                    ← exists
├── tailwind.config.ts                ← exists
├── components.json                   ← exists
└── package.json                      ← exists
```

---

## 13. Development Workflow

### Prerequisites

```bash
node --version   # 20+
pnpm --version   # 9+
# Install pnpm if needed: npm i -g pnpm
```

### Initial Setup

```bash
# Clone and install
git clone <repo>
cd motoyaar
pnpm install

# Copy env template and fill values
cp .env.example .env.local

# Install missing packages (not yet in package.json)
pnpm add drizzle-orm postgres @supabase/supabase-js
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
pnpm add resend @anthropic-ai/sdk web-push zustand
pnpm add -D drizzle-kit @types/web-push vitest @vitejs/plugin-react
pnpm add -D @testing-library/react @testing-library/jest-dom
pnpm add -D @playwright/test

# Run DB migrations
pnpm db:migrate

# Seed admin account
pnpm db:seed
```

### Development Commands

```bash
# Start dev server (Next.js)
pnpm dev

# DB operations
pnpm db:generate    # Generate Drizzle migration from schema changes
pnpm db:migrate     # Apply migrations to Supabase
pnpm db:studio      # Open Drizzle Studio (DB browser)

# Testing
pnpm test           # Vitest unit tests
pnpm test:e2e       # Playwright E2E tests
pnpm typecheck      # tsc --noEmit
pnpm lint           # ESLint
```

### Required Environment Variables

```bash
# .env.local

# --- Auth ---
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=                        # openssl rand -base64 32
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# --- Database ---
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
# Use the pooler URL for production (port 6543, pgBouncer):
# DATABASE_URL=postgresql://postgres.[project]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# --- Cloudflare R2 ---
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=motoyaar-documents
R2_PUBLIC_URL=                          # e.g. https://documents.motoyaar.app

# --- Email ---
RESEND_API_KEY=

# --- AI ---
ANTHROPIC_API_KEY=

# --- Push Notifications (VAPID) ---
# Generate: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:support@motoyaar.app
NEXT_PUBLIC_VAPID_PUBLIC_KEY=           # Same as VAPID_PUBLIC_KEY (exposed to client)

# --- Cron Security ---
CRON_SECRET=                            # openssl rand -base64 32

# --- Admin Seed ---
ADMIN_EMAIL=admin@motoyaar.app
ADMIN_PASSWORD=                         # Set securely; hashed on seed
```

### `vercel.json` (Cron Configuration)

```json
{
  "crons": [
    {
      "path": "/api/cron/document-expiry",
      "schedule": "0 0 * * *"
    }
  ]
}
```

> 06:00 IST = 00:30 UTC. `"0 0 * * *"` runs at midnight UTC. Adjust to `"30 0 * * *"` for exact IST alignment.

---

## 14. Deployment Architecture

### Deployment Strategy

**Frontend + Backend Deployment:**
- **Platform:** Vercel
- **Build Command:** `next build`
- **Output:** Vercel auto-detects Next.js — no output directory config needed
- **CDN/Edge:** Vercel Edge Network (static assets + ISR pages)
- **Serverless Functions:** API routes deployed as Vercel Serverless Functions (Node.js 20)
- **Cron:** Vercel Cron Jobs (free tier: 1 job, daily minimum interval)

### Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Development | `http://localhost:3000` | Local development |
| Preview | `https://motoyaar-[branch]-[org].vercel.app` | Per-PR auto-deploy |
| Production | `https://motoyaar.app` | Live (main branch) |

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Unit tests
        run: pnpm test

      # Vercel deploys automatically on push to main via Vercel GitHub integration
      # Preview deploys are created automatically for each PR
```

---

## 15. Security and Performance

### Security Requirements

**Frontend Security:**
- **CSP Headers:** Configured in `next.config.ts` via `headers()` — restrict scripts to self + trusted CDNs
- **XSS Prevention:** React JSX escaping covers most cases; `dangerouslySetInnerHTML` never used
- **Secure Storage:** Session in httpOnly cookies (NextAuth default); no tokens in localStorage or sessionStorage
- **Sensitive URLs:** R2 document URLs are pre-signed (15-min TTL); never exposed publicly; never cached by service worker

**Backend Security:**
- **Auth Check:** Every protected route calls `getServerSession(authOptions)` before any logic
- **Input Validation:** Zod schemas validate all request bodies; Zod errors return `VALIDATION_ERROR` 422
- **Rate Limiting:** API routes protected via Vercel's built-in DDoS protection; add `@upstash/ratelimit` for AI report endpoint post-MVP
- **CORS:** Next.js API routes are same-origin by default — no CORS config needed for MVP
- **Cron Security:** Cron endpoint validates `Authorization: Bearer CRON_SECRET` header; returns 401 without it
- **Admin Auth:** Separate credential-based session (bcrypt password hash); completely independent of Google SSO

**Database Security:**
- **Row Level Security (RLS):** Enable RLS on all tables in Supabase; application-level auth is primary, RLS is defense-in-depth
- **Connection:** All DB connections over SSL; Supabase enforces this by default
- **No raw SQL from user input:** All queries via Drizzle ORM parameterized queries

### Performance Optimization

**Frontend:**
- **Bundle Target:** < 200KB gzipped initial JS
- **Code Splitting:** App Router automatic per-route splitting; Recharts loaded via `next/dynamic`
- **Image Optimization:** `next/image` with WebP, lazy loading, proper `sizes` prop
- **Font Loading:** `next/font/google` (Inter) — self-hosted, zero FOUT
- **Skeleton Screens:** Prevents CLS; matches content layout exactly
- **Feed Pagination:** 20 posts per page via `IntersectionObserver`

**Backend:**
- **Response Target:** < 500ms p95 for CRUD API routes
- **Database:** Index coverage reviewed in Section 9; connection pooling via pgBouncer
- **AI Routes:** Async pattern prevents any API timeout; Claude calls are background operations
- **Caching:** Next.js `unstable_cache` for expensive read-only queries (e.g. overall spend totals); 60s revalidation

**Core Web Vitals Targets:**

| Metric | Target |
|--------|--------|
| LCP | < 2.5s on 4G mobile |
| INP | < 200ms |
| CLS | < 0.1 |
| TTI | < 3.5s |
| Initial JS bundle | < 200KB gzipped |

---

## 16. Testing Strategy

### Testing Pyramid

```
        E2E (Playwright)
       /                \
    Integration Tests
   /                    \
Frontend Unit (Vitest+RTL)  Backend Unit (Vitest)
```

### Test Organization

**Frontend tests** (`src/components/**/__tests__/`):
```
src/components/
├── ui/__tests__/
│   ├── VehicleCard.test.tsx
│   ├── StatusBadge.test.tsx
│   └── DocumentRow.test.tsx
├── expenses/__tests__/
│   └── ExpenseForm.test.tsx
└── community/__tests__/
    └── PostCard.test.tsx
```

**Backend tests** (`src/services/__tests__/`):
```
src/services/__tests__/
├── tripService.test.ts        # cascade expense creation/deletion
├── reportService.test.ts      # spend calculations + currency conversion
├── communityService.test.ts   # hot score + duplicate submission check
├── documentService.test.ts    # expiry status logic
└── cronService.test.ts        # notification batching per user
```

**E2E tests** (`e2e/`):
```
e2e/
├── auth.spec.ts               # Google SSO + onboarding
├── vehicle.spec.ts            # Add vehicle wizard
├── document.spec.ts           # Upload + parse + confirm
├── expense.spec.ts            # Add expense, trip reason redirect
├── community.spec.ts          # Post, like, comment
└── report.spec.ts             # AI report quota enforcement
```

### Test Examples

**Frontend component test:**
```typescript
// src/components/ui/__tests__/StatusBadge.test.tsx
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../StatusBadge";

test("renders expired status with correct label and color class", () => {
  render(<StatusBadge status="expired" />);
  expect(screen.getByText("Expired")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveClass("text-red-600");
});

test("never shows colour alone — always includes text label", () => {
  render(<StatusBadge status="expiring" />);
  expect(screen.getByText("Expiring")).toBeInTheDocument();
});
```

**Backend service test:**
```typescript
// src/services/__tests__/tripService.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Drizzle db
vi.mock("@/lib/db/client", () => ({ db: mockDb }));

describe("tripService.delete", () => {
  it("returns 400 without confirm flag (forces frontend warning modal)", async () => {
    const res = await fetch("/api/trips/123", { method: "DELETE" });
    expect(res.status).toBe(400);
  });

  it("cascade-deletes associated expenses on confirm", async () => {
    const deletedExpenses = await tripService.delete("trip-1", "user-1");
    expect(deletedExpenses.count).toBeGreaterThan(0);
  });
});

describe("communityService.createPost", () => {
  it("blocks duplicate submission within 60 seconds", async () => {
    const input = { title: "Test", description: "Test post" };
    await communityService.createPost("user-1", input);
    await expect(communityService.createPost("user-1", input)).rejects.toThrow("CONFLICT");
  });
});
```

**E2E test:**
```typescript
// e2e/document.spec.ts
import { test, expect } from "@playwright/test";

test("document upload shows manual entry on parse failure", async ({ page }) => {
  await page.goto("/garage/[vehicleId]");
  await page.getByRole("tab", { name: "Documents" }).click();
  await page.getByRole("button", { name: "Upload RC" }).click();

  // Upload a file that will fail parsing
  await page.setInputFiles("input[type=file]", "e2e/fixtures/unreadable.jpg");

  // Should show manual entry fallback
  await expect(page.getByText("Enter expiry date manually")).toBeVisible();
  await expect(page.getByLabel("Expiry Date")).toBeVisible();
});
```

---

## 17. Coding Standards

### Critical Rules

- **Type Authority:** `src/types/index.ts` is the single source of truth for all entity types — never redefine inline or duplicate in service files
- **Service Layer Mandate:** API route handlers call service functions only — zero direct Drizzle queries in `route.ts` files
- **Zod Everywhere:** Every `POST`/`PATCH` request body passes through a Zod schema before reaching service layer; schemas live in `src/lib/validations/`
- **RSC Default:** Every page and layout is a Server Component by default; add `"use client"` only for interactive components that use hooks, event listeners, or browser APIs
- **Environment Variables:** Access only through `process.env.VARIABLE_NAME` — no wrapper abstraction needed at MVP; never expose secret vars with `NEXT_PUBLIC_` prefix
- **Auth First:** Every protected API route handler's first line is `const session = await getServerSession(authOptions)` — no exceptions
- **Error Wrapper:** Every route handler is wrapped in try/catch calling `handleApiError(error)` — no bare unhandled exceptions
- **Trip Cascade:** Never raw-delete trips — always use `tripService.delete()` which enforces the cascade expense warning + deletion logic
- **No Standalone Trip Expenses:** Expenses with `reason = "Trip"` are owned by a trip record — the route handler must redirect to trip creation, not create a standalone expense

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| React components | PascalCase | `VehicleCard.tsx` |
| Custom hooks | camelCase + `use` prefix | `useVehicles.ts` |
| Backend services | camelCase + `Service` suffix | `vehicleService.ts` |
| Frontend API wrappers | camelCase + `Api` suffix | `vehicleApi.ts` |
| Zod schemas | camelCase + `Schema` suffix | `createVehicleSchema` |
| Zustand stores | camelCase + `Store` suffix | `notificationStore.ts` |
| API route directories | kebab-case | `/api/vehicle-invites/` |
| DB tables | snake_case | `vehicle_invites` |
| DB columns | snake_case | `registration_number` |
| TypeScript interfaces | PascalCase | `VehicleInvite` |
| Environment variables | SCREAMING_SNAKE_CASE | `ANTHROPIC_API_KEY` |

---

## 18. Error Handling Strategy

### Standard Error Response Format

```typescript
// src/lib/errors.ts
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId: string;
  };
}
```

### Error Codes

| Code | HTTP Status | When |
|------|------------|------|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Session exists but no permission (e.g. not vehicle owner) |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Duplicate (registration number, username, post within 60s) |
| `VALIDATION_ERROR` | 422 | Zod schema failure; `details` contains field-level errors |
| `QUOTA_EXCEEDED` | 403 | AI report monthly limit reached |
| `AI_UNAVAILABLE` | 503 | Claude API failure |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Error Classes

```typescript
// src/lib/errors.ts
export class NotFoundError extends Error {
  constructor(message: string) { super(message); this.name = "NotFoundError"; }
}
export class ForbiddenError extends Error {
  constructor(message: string) { super(message); this.name = "ForbiddenError"; }
}
export class ConflictError extends Error {
  constructor(message: string) { super(message); this.name = "ConflictError"; }
}
export class QuotaExceededError extends Error {
  constructor(message: string) { super(message); this.name = "QuotaExceededError"; }
}
```

### `handleApiError` Function

```typescript
// src/lib/errors.ts
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function handleApiError(error: unknown): NextResponse {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const base = { timestamp, requestId };

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: error.flatten(), ...base } },
      { status: 422 }
    );
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: error.message, ...base } },
      { status: 404 }
    );
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: error.message, ...base } },
      { status: 403 }
    );
  }
  if (error instanceof ConflictError) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: error.message, ...base } },
      { status: 409 }
    );
  }
  if (error instanceof QuotaExceededError) {
    return NextResponse.json(
      { error: { code: "QUOTA_EXCEEDED", message: error.message, ...base } },
      { status: 403 }
    );
  }

  console.error("[API Error]", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", ...base } },
    { status: 500 }
  );
}
```

### Frontend Error Handling

```typescript
// In React components — catch ApiError for user-facing messages
import { ApiError } from "@/lib/api-client";
import { toast } from "sonner";

async function handleSubmit(data: FormData) {
  try {
    await vehicleApi.create(data);
    toast.success("Vehicle added successfully");
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === "CONFLICT") {
        toast.error("You already have a vehicle with this registration number");
      } else if (error.code === "VALIDATION_ERROR") {
        // Set form errors from error.details
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  }
}
```

### Error Flow

```mermaid
sequenceDiagram
    participant Client
    participant Route as API Route Handler
    participant Service
    participant DB

    Client->>Route: HTTP Request
    Route->>Route: getServerSession() → check auth
    Route->>Service: call service function
    Service->>DB: query

    alt DB / logic error
        DB->>Service: throws or returns null
        Service->>Route: throws NotFoundError / ConflictError / etc.
        Route->>Route: handleApiError(error)
        Route->>Client: { error: { code, message, ... } }
        Client->>Client: ApiError caught → toast or form error
    else Zod validation failure
        Route->>Route: schema.parse() throws ZodError
        Route->>Route: handleApiError(ZodError)
        Route->>Client: 422 VALIDATION_ERROR + field details
    else Success
        Service->>Route: returns data
        Route->>Client: 200/201 JSON response
    end
```

---

## 19. Monitoring and Observability

### Monitoring Stack

- **Frontend Monitoring:** Vercel Analytics — Core Web Vitals (LCP, INP, CLS), page views, performance by route
- **Backend Monitoring:** Vercel Logs — serverless function invocation logs, errors, cold start times
- **Structured Logging:** `pino` in API route handlers — JSON logs, searchable in Vercel Log Drains
- **Error Tracking:** Console errors captured by Vercel Logs at MVP scale; add Sentry post-MVP for alerting
- **Cron Monitoring:** Cron route returns `{ processed, notified, deleted }` — logged and visible in Vercel Function Logs

### Key Metrics to Monitor

**Frontend:**
- Core Web Vitals per page (Vercel Analytics dashboard)
- JavaScript error rate

**Backend:**
- API route p95 response time (Vercel Analytics)
- Error rate by route (Vercel Logs)
- AI report generation success rate (tracked via `ai_reports.status` column)
- Document parsing success rate (tracked via `documents.parse_status` distribution)
- Daily cron execution success (Vercel Cron logs)

**Business Metrics (query from DB):**
- Registered users (all-time + this week)
- Vehicles per active user
- AI reports generated this month
- Parse success rate = `COUNT(parse_status='parsed') / COUNT(*)` on documents

### Logging Pattern

```typescript
// src/lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  ...(process.env.NODE_ENV !== "production" && {
    transport: { target: "pino-pretty" },
  }),
});

// Usage in API route:
// logger.info({ userId, vehicleId }, "Vehicle created");
// logger.error({ error, requestId }, "AI report generation failed");
```

---

*Document prepared by Winston (Architect Agent) · MotoYaar · 2026-03-15*