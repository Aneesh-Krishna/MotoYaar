# Epic 01 — Foundation & Infrastructure

**Status:** Not Started
**Priority:** P0 — Must ship first; all other epics depend on this

## Goal
Stand up the full project scaffold with all third-party services configured, a working local dev environment, and a deployed empty shell on Vercel. Nothing user-facing ships in this epic, but every subsequent epic builds on it.

---

## Stories

### STORY-01-01: Initialize Next.js Project
**As a** developer,
**I want** a Next.js (App Router) project scaffolded with TypeScript and ESLint,
**so that** I have a consistent, typed codebase from day one.

**Acceptance Criteria:**
- [ ] Next.js project created with App Router, TypeScript, ESLint, Tailwind CSS
- [ ] Git repository initialized with `.gitignore` (excludes `.env*`, `node_modules`)
- [ ] Project structure follows Next.js App Router conventions (`app/`, `components/`, `lib/`)
- [ ] `npm run dev` starts local dev server without errors

---

### STORY-01-02: Configure Supabase (Database & Auth)
**As a** developer,
**I want** a Supabase project connected with the full database schema applied,
**so that** all entities have tables and relationships ready before any feature work begins.

**Acceptance Criteria:**
- [ ] Supabase project created (free tier)
- [ ] PostgreSQL schema applied: User, Vehicle, Document, Expense, Trip, Post, Comment, PostReaction, PostReport, VehicleInvite, VehicleAccess, Notification tables
- [ ] Row Level Security (RLS) policies enabled on all user-owned tables
- [ ] Supabase environment variables configured in `.env.local`
- [ ] Supabase client (`lib/supabase.ts`) initialized and tested with a simple query

---

### STORY-01-03: Configure Cloudflare R2 (Document Storage)
**As a** developer,
**I want** Cloudflare R2 configured for document storage,
**so that** document uploads can be handled securely with auto-delete lifecycle rules.

**Acceptance Criteria:**
- [ ] R2 bucket created on Cloudflare
- [ ] S3-compatible API credentials stored in env vars
- [ ] Upload helper (`lib/storage.ts`) implemented: generates signed upload URL, returns public/private URL
- [ ] Lifecycle rule configured: delete objects 10 days after a `expires_at` tag date
- [ ] Test upload and retrieval working locally

---

### STORY-01-04: Configure Resend (Email)
**As a** developer,
**I want** Resend integrated for transactional email,
**so that** the notification and invite flows can send emails from day one.

**Acceptance Criteria:**
- [ ] Resend account created; API key stored in env vars
- [ ] Email helper (`lib/email.ts`) implemented with a generic `sendEmail(to, subject, html)` function
- [ ] Verified sending domain configured in Resend
- [ ] Test email sent and received successfully

---

### STORY-01-05: Configure Claude API (AI)
**As a** developer,
**I want** the Claude API (Anthropic) integrated,
**so that** document parsing and AI report generation can be called from server-side API routes.

**Acceptance Criteria:**
- [ ] Anthropic API key stored in env vars
- [ ] AI helper (`lib/ai.ts`) with two exported functions: `parseDocument(imageBase64): Promise<{ expiryDate: string | null }>` and `generateReport(expenseData): Promise<string>`
- [ ] Both functions called server-side only (never exposed to client)
- [ ] Basic error handling: returns `null` on parse failure, throws on report generation failure

---

### STORY-01-06: PWA Scaffold (Service Worker + Push)
**As a** developer,
**I want** PWA configuration in place from day one,
**so that** push notification support is available when the notifications epic is built.

**Acceptance Criteria:**
- [ ] `manifest.json` configured: app name, icons, theme color, `display: standalone`
- [ ] Service worker registered via `next-pwa` or custom `sw.js`
- [ ] VAPID keys generated and stored in env vars
- [ ] Push subscription helper (`lib/push.ts`) implemented: `subscribeToPush()` on client, `sendPushNotification(subscription, payload)` on server
- [ ] App installable on Android Chrome (passes PWA install prompt)

---

### STORY-01-07: Vercel Deployment Pipeline
**As a** developer,
**I want** the project deployed to Vercel with environment variables configured,
**so that** every git push to `main` triggers an automatic production deployment.

**Acceptance Criteria:**
- [ ] Vercel project linked to Git repository
- [ ] All environment variables (Supabase, R2, Resend, Claude API, VAPID) added to Vercel project settings
- [ ] `main` branch deploys automatically on push
- [ ] Production URL accessible and returns 200
- [ ] Vercel Cron Jobs enabled (will be used by Notifications epic)