# MotoYaar — API Keys & External Services Setup

This document lists every external key or secret the app needs, why it's needed, and exactly how to obtain it. Work through them in order — the first four are required to run the app at all.

---

## 1. Google OAuth (Sign-in)

**Variables:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**What it does:** Powers the "Sign in with Google" button.

**How to get it:**

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project (or select an existing one).
2. Navigate to **APIs & Services → OAuth consent screen**.
   - User Type: **External**
   - Fill in App name (`MotoYaar`), support email, and developer contact.
   - Add scopes: `email`, `profile`, `openid`.
   - Save.
3. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**
   - Authorised JavaScript origins: `http://localhost:3000` (and your production domain later)
   - Authorised redirect URIs: `http://localhost:3000/api/auth/callback/google`
4. Copy the **Client ID** → `GOOGLE_CLIENT_ID`
5. Copy the **Client Secret** → `GOOGLE_CLIENT_SECRET`

---

## 2. NextAuth Secret

**Variable:** `NEXTAUTH_SECRET`

**What it does:** Signs and encrypts session tokens. Without this, all logins fail.

**How to get it:** Run this in your terminal and paste the output:

```bash
openssl rand -base64 32
```

Also set `NEXTAUTH_URL=http://localhost:3000` for local development.

---

## 3. Supabase (Database)

**Variable:** `DATABASE_URL`

**What it does:** PostgreSQL database — stores users, vehicles, trips, documents, expenses.

**How to get it:**

1. Go to [supabase.com](https://supabase.com) and create a new project.
   - Choose region **ap-south-1 (Mumbai)** for lowest latency in India.
   - Set a strong database password and save it.
2. Go to **Project Settings → Database → Connection string**.
3. Copy the **URI** format: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
   - Replace `[YOUR-PASSWORD]` with the password you set.

> **Production note:** Use the pooler URL (port 6543) in production to avoid connection exhaustion. It's shown just below the direct URL on the same page.

---

## 4. Cloudflare R2 (File Storage)

**Variables:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

**What it does:** Stores document scans, vehicle photos, and receipt images. R2 has no egress fees, which is why it's used over S3.

**How to get it:**

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign in.
2. In the left sidebar, click **R2 Object Storage → Create bucket**.
   - Name it `motoyaar-documents` (or your preferred name → `R2_BUCKET_NAME`).
3. Go to **R2 → Manage R2 API tokens → Create API Token**.
   - Permissions: **Object Read & Write**
   - Specify bucket: the one you just created.
   - Create token.
4. Copy:
   - **Account ID** (shown in the right sidebar on the R2 overview page) → `R2_ACCOUNT_ID`
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
5. To make files publicly readable (required for document/image URLs):
   - Open your bucket → **Settings → Public Access → Allow Access**.
   - Your public URL will be `https://[bucket-name].[account-id].r2.cloudflarestorage.com` or a custom domain → `R2_PUBLIC_URL`

---

## 5. Resend (Transactional Email)

**Variable:** `RESEND_API_KEY`

**What it does:** Sends invitation emails and any transactional notifications.

**How to get it:**

1. Go to [resend.com](https://resend.com) and create an account.
2. Navigate to **API Keys → Create API Key**.
   - Name: `motoyaar-production` (or `motoyaar-dev` for local)
   - Permission: **Sending access**
3. Copy the key → `RESEND_API_KEY`

> **Note:** You'll also need to verify a sending domain in Resend → **Domains → Add Domain** and add the DNS records they give you. For local testing, Resend lets you send to your own verified email without a domain.

---

## 6. Anthropic (AI Document Parsing)

**Variable:** `ANTHROPIC_API_KEY`

**What it does:** Reads uploaded document photos (RC, driving licence, insurance) and extracts structured data automatically.

**How to get it:**

1. Go to [console.anthropic.com](https://console.anthropic.com) and create an account.
2. Navigate to **API Keys → Create Key**.
3. Copy the key → `ANTHROPIC_API_KEY`

> **Cost note:** You only pay per document parsed. Typical document extraction costs a fraction of a rupee. Add a billing limit under **Plans & Billing** to avoid surprises.

---

## 7. Web Push Notifications (VAPID Keys)

**Variables:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_EMAIL`

**What it does:** Sends push notifications to users' devices (trip reminders, session invites, etc.).

**How to get it:** These are generated locally — no account needed.

```bash
npx web-push generate-vapid-keys
```

Copy the output:
- **Public Key** → both `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- **Private Key** → `VAPID_PRIVATE_KEY`
- Set `VAPID_EMAIL=mailto:your-email@example.com`

---

## 8. Google Maps (Live Trip & Route Planning)

> **Status: Migration pending.** The app currently uses the Mappls (MapMyIndia) SDK for maps. We are migrating to Google Maps. The keys below will be needed once that migration is done.

**Variables:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

**What it does:** Powers the live trip map, route recording polylines, route planning, and static route previews on trip detail pages.

**How to get it:**

1. Go to [console.cloud.google.com](https://console.cloud.google.com) — use the same project you created for Google OAuth above.
2. Navigate to **APIs & Services → Library** and enable these APIs:
   - **Maps JavaScript API** (interactive map on mobile)
   - **Directions API** (route planning between stops)
   - **Geocoding API** (search locations by name — for the route planner)
3. Navigate to **APIs & Services → Credentials → Create Credentials → API Key**.
4. Click **Edit API key**:
   - Under **Application restrictions**: set **HTTP referrers** and add `localhost:3000/*` and your production domain.
   - Under **API restrictions**: restrict to the three APIs above.
5. Copy the key → `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

> **Billing note:** Google Maps requires a billing-enabled GCP project. However, there is a **$200/month free credit** which covers roughly 28,000 map loads or 40,000 Directions API calls per month — more than enough for development and early production.

---

## 9. Cron Secret

**Variable:** `CRON_SECRET`

**What it does:** Secures the `/api/cron/*` endpoints (e.g. expiring old live sessions) so only your cron runner (Vercel Cron, etc.) can call them.

**How to get it:** Generate locally:

```bash
openssl rand -base64 32
```

Paste the same value as a secret in your hosting provider's environment variables and in your cron job's `Authorization: Bearer <secret>` header.

---

## 10. Admin Seed Credentials

**Variables:** `ADMIN_EMAIL`, `ADMIN_PASSWORD`

**What it does:** Seeds the first admin user when you run `pnpm db:seed`. Not used at runtime.

**How to set it:** Choose any email and a strong password. These are hashed before being stored — only used once during initial database seeding.

---

## Quick Reference — All Variables

| Variable | Required | Service |
|---|---|---|
| `NEXTAUTH_URL` | Yes | NextAuth |
| `NEXTAUTH_SECRET` | Yes | NextAuth |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth |
| `DATABASE_URL` | Yes | Supabase (PostgreSQL) |
| `R2_ACCOUNT_ID` | Yes | Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | Yes | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | Yes | Cloudflare R2 |
| `R2_BUCKET_NAME` | Yes | Cloudflare R2 |
| `R2_PUBLIC_URL` | Yes | Cloudflare R2 |
| `RESEND_API_KEY` | Yes | Resend |
| `ANTHROPIC_API_KEY` | Yes | Anthropic Claude |
| `VAPID_PUBLIC_KEY` | Yes | Web Push |
| `VAPID_PRIVATE_KEY` | Yes | Web Push |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Yes | Web Push (client) |
| `VAPID_EMAIL` | Yes | Web Push |
| `CRON_SECRET` | Yes | Cron security |
| `ADMIN_EMAIL` | Seed only | Admin setup |
| `ADMIN_PASSWORD` | Seed only | Admin setup |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Pending migration | Google Maps |
| `NEXT_PUBLIC_MAPPLS_API_KEY` | Until migration | Mappls (current maps) |
