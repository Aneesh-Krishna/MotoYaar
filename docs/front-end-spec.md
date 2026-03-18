# MotoYaar — Front-End Specification

**Version:** 1.0
**Status:** Draft
**Date:** 2026-03-15
**Author:** Sally (UX Expert) · MotoYaar
**Source:** [Product Requirements Document](prd.md)

---

## Table of Contents

1. [Project Overview & UX Goals](#1-project-overview--ux-goals)
2. [Information Architecture & Navigation](#2-information-architecture--navigation)
3. [Visual Design & Branding](#3-visual-design--branding)
4. [Core Screen Specifications](#4-core-screen-specifications)
5. [Component Library & UI Patterns](#5-component-library--ui-patterns)
6. [Responsive Design & PWA Considerations](#6-responsive-design--pwa-considerations)
7. [Accessibility & Performance](#7-accessibility--performance)
8. [Admin Dashboard UI](#8-admin-dashboard-ui)

---

## 1. Project Overview & UX Goals

**Project Summary:**
MotoYaar is a mobile-first PWA for Indian vehicle owners. The UI must feel fast, trustworthy, and approachable to non-tech-savvy users on mid-range Android smartphones over 4G.

**UX North Stars:**
1. **Speed of action** — Logging an expense or adding a document must feel instant (≤2 taps to reach the form)
2. **Trust at first sight** — Document upload is sensitive; the UI must communicate privacy and security clearly
3. **Glanceability** — Document expiry statuses, vehicle health, spend at a glance — no digging
4. **Community as discovery** — Guest users land on community; friction to sign up must be near-zero

**Platform priority:** Mobile-first (375–430px viewport). Desktop is a supported secondary surface.

**Accessibility baseline:** WCAG 2.1 AA.

---

## 2. Information Architecture & Navigation

### App Structure

**Bottom Navigation (5 tabs — Mobile Primary):**

| Tab | Icon | Label | Primary Content |
|-----|------|-------|-----------------|
| 1 | 🏠 | Home | Dashboard: vehicle cards (horizontal scroll) + recent activity + community highlights |
| 2 | 🚗 | Garage | My Vehicles list → Vehicle Detail (tabs: Overview / Documents / Expenses / Trips) |
| 3 | 👥 | Community | Feed, search, trending posts |
| 4 | 🗺️ | Trips | All trips list + Add Trip CTA |
| 5 | 👤 | Profile | Profile page, Settings, Reports, Driver's License, Invites |

**Active state:** Icon + label highlighted; inactive tabs show icon + muted label.

**FAB (Floating Action Button):**
- Context-sensitive quick-add per tab:
  - Garage → Add Vehicle
  - Community → New Post
  - Trips → Add Trip
  - Home/Profile → hidden (no primary add action)

### Key Navigation Flows

```
Home
├── Vehicle Card tap → Vehicle Detail Page
│     ├── Tab: Overview
│     ├── Tab: Documents → Upload Document
│     ├── Tab: Expenses → Add Expense
│     └── Tab: Trips → Add Trip
├── Recent Activity item → relevant detail page
└── Community highlight → Community tab / post detail

Profile
├── Reports → Overall Spends Report
├── Driver's License → DL document page
├── Invite Users → Invite flow
└── Settings → Settings page
```

### Overlay & Modal Patterns
- **Add Vehicle:** Full-screen step wizard (6 steps), not modal
- **Add Expense / Trip:** Bottom sheet slide-up on mobile
- **Document Upload:** Bottom sheet → confirmation screen
- **Onboarding Walkthrough:** Full-screen modal cards (5 cards), dismissible
- **Notifications:** Slide-down drawer from bell icon in top bar

---

## 3. Visual Design & Branding

### Brand Personality
**Tone:** Confident, clean, India-rooted. Not sterile corporate — warm and enthusiast-friendly.
**Feel:** Like a well-organized garage, not a bank app. Functional but with personality.

### Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Deep Saffron-Orange | `#F97316` | CTAs, active nav, FAB, key highlights |
| Primary Dark | Burnt Orange | `#C2571A` | Pressed states, headers, body text on white |
| Surface | Off-White / Warm White | `#FAFAF8` | App background |
| Card Surface | White | `#FFFFFF` | Vehicle cards, expense rows |
| Text Primary | Near-Black | `#1A1A1A` | Headings, body |
| Text Secondary | Cool Gray | `#6B7280` | Subtitles, metadata |
| Success / Valid | Green | `#16A34A` | Document status: valid |
| Warning / Amber | Amber | `#D97706` | Document status: expiring soon |
| Danger / Expired | Red | `#DC2626` | Document status: expired, destructive actions |
| Border / Divider | Light Gray | `#E5E7EB` | Cards, list separators |

> ⚠️ **Contrast rule:** Primary orange `#F97316` is 3.0:1 on white — AA Large only. Never use as background for small body text. Use `#C2571A` (Primary Dark) for body copy requiring full AA compliance.

### Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| App Font | Inter (via `next/font/google`) | — | — |
| H1 (Page title) | Inter | 24px / 1.5rem | 700 |
| H2 (Section title) | Inter | 20px / 1.25rem | 600 |
| H3 (Card title) | Inter | 16px / 1rem | 600 |
| Body | Inter | 14px / 0.875rem | 400 |
| Caption / Meta | Inter | 12px / 0.75rem | 400 |
| CTA / Button | Inter | 14px / 0.875rem | 600 |

### Iconography
- Library: **Lucide Icons** (open-source, Tailwind/shadcn ecosystem)
- Size: 20px standard, 24px for bottom nav
- Style: Outline for inactive; filled or colored for active states

### Spacing & Layout
- Base unit: **4px** (Tailwind default scale)
- Screen horizontal padding: **16px** (mobile), **24px** (desktop)
- Card border-radius: **12px**
- Button border-radius: **8px**
- Bottom nav height: **64px** (with `pb-safe` for iOS/Android)

### Dark Mode
Not in scope for MVP. Light mode only.

### Document Status Color System
Used consistently across all document indicators, badges, and list rows — always colour + icon + text label:

| Status | Colour | Icon | Label |
|--------|--------|------|-------|
| Valid | Green `#16A34A` | ✓ | "Valid" |
| Expiring soon | Amber `#D97706` | ⚠ | "Expiring" |
| Expired | Red `#DC2626` | ✗ | "Expired" |
| Incomplete | Gray `#6B7280` | — | "Incomplete" |

---

## 4. Core Screen Specifications

### 4.1 — Onboarding & Auth

**Google SSO Screen:**
- Full-screen centered layout
- MotoYaar logo + tagline: *"Your garage, organized."*
- Single CTA: `Continue with Google` (Google-branded button)
- Subtext: *"By continuing, you agree to our Privacy Policy"*
- Community preview teaser below fold (ghost/blurred feed) — reduces signup anxiety

**Onboarding Profile Setup (single screen):**
- Name (required), Username (required, real-time uniqueness check with inline ✓/✗/spinner — debounced 400ms)
- Profile image upload (optional, circular crop)
- Bio + Instagram link (optional, collapsible "Add more details" section)
- Single `Complete Setup` CTA at bottom

**Walkthrough Modal Tour (5 cards):**
- Full-screen overlay, card-style with progress dots
- Each card: illustration (top 50%) + section name + one-line copy (bottom 50%)
- Copy: *"Your garage, organized." / "Every rupee, accounted for." / "Log every journey." / "Connect with your tribe." / "All of it, in your pocket."*
- Nav: `Next` / `Skip` — back chevron on cards 2–5
- Re-accessible from Settings

---

### 4.2 — Home / Dashboard

**Layout (top → bottom):**
1. **Top bar:** MotoYaar logo (left) + Bell icon with unread badge (right)
2. **Greeting:** *"Good morning, Rahul 👋"* + date
3. **Vehicle Cards:** Horizontal scroll — each card shows vehicle image, name, reg number, next document expiry (color-coded badge)
   - `+ Add Vehicle` card at end of scroll
4. **Alerts Strip:** Amber/red banner if any document expiring — *"2 documents expiring soon →"*
5. **Recent Activity:** Vertical list — last 5 expense/trip entries across all vehicles
6. **Community Highlights:** 2–3 top community post previews with `See all` link

---

### 4.3 — Garage / Vehicle List

- List of vehicle cards (vertical scroll)
- Each card: thumbnail, name, reg number, doc expiry status badge, total spend
- Empty state: illustration + *"Add your first vehicle to get started"* + `Add Vehicle` CTA
- FAB: `+ Add Vehicle`

**Vehicle Detail Page — 4 Tabs:**

**Header (persistent across tabs):**
- Vehicle image (hero, full-width, 200px height, `object-cover`)
- Overlay: Name, Reg Number badge, Vehicle Type badge
- Kebab menu (⋮): Edit / Delete / Manage Viewers

| Tab | Key Content |
|-----|-------------|
| **Overview** | Total spend, Last service date, Next document expiry (with color badge), Owned since, Previous owners |
| **Documents** | Document rows (RC / Insurance / PUC / Other) — each with type, expiry date, status badge, `Upload` / `View` / `Replace` actions |
| **Expenses** | Expense list (date, reason chip, amount), `Add Expense` CTA, `See Full Report` link |
| **Trips** | Trip cards (title, date, route, total cost), `Add Trip` CTA |

---

### 4.4 — Add Vehicle Wizard (6 Steps)

Full-screen step flow with progress bar (Step X of 6):

| Step | Fields |
|------|--------|
| 1 | Vehicle name, Type selector (2-wheeler / 4-wheeler / Truck / Other) |
| 2 | Company, Model, Variant, Color, Registration Number* |
| 3 | Purchase date, Previous owners (number input, default 0) |
| 4 | Vehicle image upload (optional, skip available) |
| 5 | Document upload: RC / Insurance / PUC (each optional, skip available) |
| 6 | Review summary → `Save Vehicle` |

- Back navigation available on all steps
- Registration number validated for uniqueness on Step 6 `Save` (not real-time)

---

### 4.5 — Document Upload Flow

**Trigger:** Vehicle Detail → Documents tab, or Add Vehicle Step 5

1. **Upload screen:** Tap-to-upload area + camera capture option. Supported: JPG, PNG, PDF. Max file size shown.
2. **Parsing screen:** Loading state — *"Reading your document…"* with subtle animation (`aria-live="polite"`)
3. **Confirmation screen:**
   - Extracted fields shown (expiry date, document type) — editable inline
   - Storage preference reminder: *"Parse-only mode: your document won't be stored after this."*
   - `Confirm & Save` / `Edit` / `Cancel`
4. **Fallback:** If parsing fails → manual expiry date entry form

---

### 4.6 — Expense Entry (Bottom Sheet)

Slide-up bottom sheet (mobile) / modal (desktop):

| Field | UI Component |
|-------|-------------|
| Price | Large number input + ₹ prefix (auto-format on blur) |
| Date | Date picker (defaults to today) |
| Reason | Chip selector: Service / Fuel / Trip / Others |
| Where | Text input (plain, MVP) |
| Comments | Dropdown: Overpriced / Average / Underpriced |
| Receipt | Attachment button |

- If Reason = `Trip` → dismiss sheet + open Add Trip flow with contextual note

---

### 4.7 — Trip Logging

Bottom sheet (short form) → expands to full screen:

- Title (required), Description (optional)
- Date: single day or date range toggle
- Vehicle selector (optional) — dropdown of user's vehicles
- Route: free text + optional maps link
- Time taken: duration input
- **Expense Breakdown:** expandable section — add rows for Food / Fuel / Stay / Other with amounts
- `Save Trip` → triggers expense auto-creation per PRD rules
- If no vehicle selected → prompt: *"This trip has no vehicle linked. Add as a general expense?"*

---

### 4.8 — Reports & Spends

**Vehicle-Level Report:**
- Tab switcher: `Chart` / `Table`
- Chart tab: chart type selector (Bar / Line / Donut) → full-width chart render
- Table tab: sortable list by date / amount / category

**Overall Report (All Vehicles):**
- Filter bar: `Monthly` / `Date Range` / `Yearly` toggle
- Comparison period shown clearly: *"Comparing Nov 2025 → Oct 2025"*
- Same Chart / Table tab layout as vehicle-level
- `Generate AI Report` button (prominent)
  - After trigger: async banner — *"Your AI report is being generated. We'll notify you when it's ready."*
  - Quota exhausted: *"Come back next month for your next free report."*
  - No data: *"No expenses logged for this period."* (free quota not consumed)

---

### 4.9 — Community Feed

**Feed Screen:**
- Top bar: Search icon + `New Post` button
- Sort chips: `Trending` (default) / `Newest`
- Tag filter strip (horizontal scroll): All / Bikes / Cars / Mods / Travel / Maintenance / Fuel / Roads / Events / Help
- Post cards: author avatar + name, title, description snippet (2 lines), image thumbnail, tag chips, 👍 count / 👎 count, 💬 count, timestamp
- Guest banner (not logged in): *"Join to post and interact →"*
- Infinite scroll — 20 posts per page, `IntersectionObserver`

**Post Detail:**
- Full post content + images
- Threaded comments (2 levels deep, MVP)
- Like / Dislike buttons
- Report via ⋮ menu
- `Edited` label shown if post was modified

**New Post Form:**
- Title, Description (1000 char counter), Image upload (max 2), Link, Tags (multi-select chips + custom tag input)

---

### 4.10 — Profile & Settings

**Profile Page:**
- Avatar (editable) + Name + Username + Bio + Instagram link
- Stats row: Vehicles count / Trips count / Posts count
- Action cards: Reports / Driver's License / Invite Users

**Settings Page:**
- Default currency selector
- Notification window (X days before expiry, configurable)
- Push notification toggle
- Document storage preference (parse-only vs. full storage) — with privacy explanation tooltip
- `Delete All My Data` (red destructive button, confirmation modal required)
- `View Walkthrough Again`
- App version / Privacy Policy / Terms

---

## 5. Component Library & UI Patterns

### Component Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Base components | **shadcn/ui** | Unstyled-first, copy-paste, Tailwind-native, no bundle bloat |
| Styling | **Tailwind CSS v4** | Utility-first, pairs with shadcn, excellent mobile DX |
| Charts | **Recharts** (dynamic import) | React-native, supports Bar/Line/Donut out of box |
| Forms | **React Hook Form + Zod** | Minimal re-renders, schema validation |
| Date pickers | **shadcn/ui Calendar** | Consistent with design system |
| Toasts | **sonner** | Lightweight, shadcn-recommended |
| Animations | **Tailwind transitions + Framer Motion (selective)** | Framer only for bottom sheet / modal transitions |

### Core Reusable Components

**VehicleCard**
```
[Vehicle Image / Placeholder]
[Name]                [Type Badge]
[Reg Number]
[Doc Expiry: 🟢 Valid / 🟡 30 days / 🔴 Expired]
[Total Spend: ₹12,450]
```

**DocumentRow**
```
[Doc Type Icon]  [RC / Insurance / PUC / Other]
[Expiry: DD MMM YYYY]             [🟢🟡🔴 Badge]
[Upload / View / Replace — contextual]
```

**ExpenseRow**
```
[Reason Chip]   [Date]
[Where]                        [₹ Amount]
```

**TripCard**
```
[Title]                    [Date / Date Range]
[Route text]               [Vehicle name]
[Total cost: ₹ X]
```

**PostCard**
```
[Avatar] [Name] [Timestamp]              [⋮ Menu]
[Title]
[Description snippet — 2 lines, truncated]
[Image thumbnail — if present]
[Tag chips]
[👍 24  👎 3  💬 7 comments]
```

**StatusBadge**
- Props: `status: 'valid' | 'expiring' | 'expired' | 'incomplete'`
- Renders colored pill with icon + label
- Used across DocumentRow, VehicleCard, notification items

**BottomSheet**
- Slide-up overlay on mobile; drag handle at top; backdrop dismiss
- Used for: Add Expense, Add Trip (short form), Document Upload

**StepWizard**
- Progress bar (Step X of N); Back / Next / Skip navigation
- Used for: Add Vehicle (6 steps)

**ConfirmModal**
- Title, description, destructive action button (red), cancel
- Required for: Delete Vehicle, Delete Trip (cascade warning), Delete All My Data, Admin ban

**EmptyState**
- Illustration slot + heading + subtext + optional CTA
- Used on: Garage, Community, Trips, Reports (no data)

**AlertBanner**
- Full-width strip, amber/red, dismissible
- Used for: Dashboard document expiry alerts, AI report async status

### Form Patterns

- **Inline validation:** Error shown below field on blur (not on submit)
- **Real-time feedback:** Username uniqueness — debounced 400ms, ✓ / ✗ / spinner inline
- **Required fields:** Asterisk (*) in label
- **Currency inputs:** ₹ prefix fixed, right-aligned number, auto-format on blur
- **Date inputs:** Native picker on mobile; shadcn Calendar on desktop
- **Character counters:** Shown for Community post description (1000 chars)

### Loading & Empty States

| State | Pattern |
|-------|---------|
| Page loading | Skeleton screens matching content layout |
| Action loading (save, upload) | Button spinner + disabled state |
| AI document parsing | Full-screen loading card — *"Reading your document…"* |
| AI report generating | Async banner — non-blocking, user can navigate away |
| Empty list | EmptyState component with illustration and CTA |
| No data for report | Inline message — quota not consumed |

### Toast Patterns

- Position: bottom-center mobile, top-right desktop
- Types: success (green) / error (red) / info (neutral) / warning (amber)
- Auto-dismiss: 4s; errors persist until dismissed
- Duplicate post: info toast — *"Your post was already submitted."*

---

## 6. Responsive Design & PWA Considerations

### Breakpoints

| Name | Range | Layout |
|------|-------|--------|
| Mobile (primary) | 0 – 767px | Single column, bottom nav, full-width cards |
| Tablet | 768px – 1023px | 2-column grid for lists, bottom nav retained |
| Desktop | 1024px+ | Sidebar nav, max-width 1280px centered |

### Mobile-First Layout Rules

- All base styles written for mobile; tablet/desktop override via `md:` / `lg:` prefixes
- Bottom nav: fixed, 64px height, `pb-safe` for iOS home indicator
- Horizontal scrolls: `-mx-4 px-4` bleed pattern for vehicle cards and tag filters
- Hero images: `aspect-video` or 200px fixed height, `object-cover`
- Bottom sheets: max-height 85vh, scrollable content inside

### Desktop Adaptation

- **Sidebar nav** (left, 240px fixed): replaces bottom nav; same 5 items, vertical
- **Two-column layouts:**
  - Garage list: vehicle cards in 2-col grid
  - Community feed: posts (65%) + trending/tag sidebar (35%)
  - Vehicle Detail: header left + tabs right
- **Modals** replace bottom sheets (centered, max-width 480px)
- **Reports charts:** wider canvas, legend beside chart (not below)

### PWA Configuration

**`manifest.json`:**
```json
{
  "name": "MotoYaar",
  "short_name": "MotoYaar",
  "theme_color": "#F97316",
  "background_color": "#FAFAF8",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "purpose": "maskable" }
  ]
}
```

**Service Worker Cache Strategy:**

| Asset Type | Strategy |
|------------|----------|
| App shell (HTML, JS, CSS) | Cache-first (stale-while-revalidate) |
| API responses (vehicles, expenses) | Network-first with cache fallback |
| Images (vehicle photos) | Cache-first, max 50 entries |
| Document uploads | Network-only — never cached |

**Offline behaviour:**
- Cached data shown with banner: *"You're offline — showing last synced data"*
- Add/edit actions blocked: *"You're offline. Please reconnect to save changes."*
- No offline write queue at MVP

**Push Notifications (Web Push API):**
- Permission prompt deferred until after onboarding completion
- Value-first framing: *"Get alerts before your documents expire"*
- iOS Safari: Web Push requires iOS 16.4+ and PWA installed to home screen
- In-app "Add to Home Screen" prompt shown on iOS Safari after first login

### Touch & Interaction

- Minimum tap target: **44×44px** (WCAG 2.5.5)
- Swipe-to-dismiss: bottom sheets
- Pull-to-refresh: Community feed and Dashboard
- No hover-dependent interactions — all tap-first

---

## 7. Accessibility & Performance

### Accessibility (WCAG 2.1 AA)

**Colour Contrast:**

| Pairing | Ratio | Status |
|---------|-------|--------|
| Primary `#F97316` on White | 3.0:1 | ⚠️ AA Large only (≥18px/bold) |
| Primary Dark `#C2571A` on White | 4.6:1 | ✅ AA |
| Near-Black `#1A1A1A` on White | 17.1:1 | ✅ AAA |
| Gray `#6B7280` on White | 4.6:1 | ✅ AA |
| Green `#16A34A` on White | 4.5:1 | ✅ AA |
| Red `#DC2626` on White | 4.5:1 | ✅ AA |

**Semantic HTML:**
- `<nav>` for bottom navigation
- `<main>` per page, `<section aria-label>` for dashboard regions
- `<button>` (never `<div>`) for all interactive elements
- `<h1>` per page; hierarchical `<h2>` / `<h3>` within sections

**ARIA Patterns:**
- Bottom nav: `role="tablist"`, `role="tab"`, `aria-selected`
- Status badges: `aria-label="Document status: Expiring soon"` (never colour alone)
- Modals: `role="dialog"`, `aria-modal="true"`, focus trap, `aria-labelledby`
- Loading states: `aria-live="polite"` for async results
- Icon-only buttons: `aria-label` always present

**Keyboard Navigation (Desktop):**
- Full tab order through all interactive elements
- Escape closes modals and bottom sheets
- Focus ring: `focus-visible:ring-2 ring-orange-500` — hidden for mouse, visible for keyboard

**Colour-blind Considerations:**
- Document status always: colour + icon + text label (never colour alone)

**Reduced Motion:**
- All animations wrapped in `@media (prefers-reduced-motion: reduce)`

### Performance Targets

| Metric | Target |
|--------|--------|
| LCP | < 2.5s on 4G mobile |
| INP | < 200ms |
| CLS | < 0.1 |
| TTI | < 3.5s |
| Initial JS bundle | < 200KB gzipped |

**Performance Strategies:**

| Strategy | Implementation |
|----------|---------------|
| Image optimisation | Next.js `<Image>` — WebP, lazy load, `sizes` prop |
| Code splitting | App Router automatic per-route splitting |
| Recharts | Dynamic import via `next/dynamic` — loaded only on Reports tab |
| Font loading | `next/font/google` — self-hosted Inter, zero FOUT |
| Skeleton screens | Matches content layout — prevents CLS |
| Prefetching | `<Link>` prefetch on hover/focus for Garage and Community |
| Feed pagination | 20 posts per page, infinite scroll via `IntersectionObserver` |
| Sensitive images | Signed URLs, short TTL — never cached in browser or service worker |

---

## 8. Admin Dashboard UI

### Access & Layout

- **URL:** `/admin` — hidden, not linked in main app
- **Auth:** Separate credential-based login (email + password), independent of Google SSO
- **Layout:** Desktop-first — left sidebar (240px) + main content area (max-width 1440px)

### Admin Sidebar Navigation

```
MotoYaar Admin
─────────────
📊  Dashboard (Analytics)
🚩  Reported Posts
👥  Users
📌  Community (Post & Pin)
⚙️  Settings
─────────────
[Logout]
```

### Analytics Dashboard

**Metric Cards (top row):**

| Card | Metric |
|------|--------|
| Total Users | All-time registered count |
| New This Week | Growth signal |
| New This Month | Growth signal |
| Total Vehicles | Activation signal |

**Charts:**
- User growth line chart (weekly, last 12 weeks)
- Community health bar chart (posts + comments per week, last 8 weeks)

**Summary Table:**

| Metric | Value |
|--------|-------|
| AI Reports generated this month | X |
| Document parsing success rate | X% |
| Total posts | X |
| Total comments | X |

### Reported Posts Queue

- Filterable table: All / Pending Review / Resolved
- Columns: Post title (linked), Reporter count, Reason, Auto-hidden (Y/N), Date first reported
- Expanded row / side panel: full post + all reports + action buttons:

| Action | Style | Confirmation |
|--------|-------|-------------|
| Restore post | Secondary | No |
| Remove post | Destructive (red) | Yes |
| Warn user | Warning (amber) | Yes + optional message |
| Suspend user | Warning (amber) | Yes + duration (days) + optional message |
| Ban user | Destructive (red) | Yes — *"This cannot be undone."* |

### Users Table

- Searchable by name / username / email
- Columns: Avatar, Name, Username, Email, Joined, Vehicles, Status (Active / Warned / Suspended / Banned)
- Row actions: View / Warn / Suspend / Ban / Re-link Google Account
- `Send Invite Email` button (top right) — admin-initiated beta invite

### Community (Post & Pin)

- Admin can create posts as `MotoYaar Official`
- Pin toggle on any post — pinned posts appear at top of feed regardless of score
- Pinned posts show 📌 badge on feed cards

### Admin Settings

| Setting | Control |
|---------|---------|
| Auto-hide report threshold | Number input (default: 10) |
| Default notification window | Number input (default: 30 days) |
| Manage admin accounts | List + Add Admin button |

---

*Document prepared by Sally (UX Expert Agent) · MotoYaar · 2026-03-15*