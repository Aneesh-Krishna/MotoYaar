# MotoYaar — Setup Guide

This guide walks you through obtaining every environment variable required to run MotoYaar locally and in production.

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- A Google account (for OAuth)
- A Supabase account (free tier works)
- A Cloudflare account (for R2 storage)
- A Resend account (for email)
- An Anthropic account (for AI features)

---

## 1. Copy the env file

```bash
cp .env.example .env.local
```

All variables below go into `.env.local`.

---

## 2. Auth — NextAuth

### `NEXTAUTH_URL`
Set to your app's base URL.
- Local: `http://localhost:3000`
- Production: `https://yourdomain.com`

### `NEXTAUTH_SECRET`
A random secret used to sign JWTs and cookies. Generate one:

```bash
openssl rand -base64 32
```

### `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://yourdomain.com/api/auth/callback/google` (production)
7. Copy the **Client ID** and **Client Secret**

---

## 3. Database — Supabase (PostgreSQL)

### `DATABASE_URL`

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Navigate to **Settings > Database**
3. Under **Connection string**, select **URI** tab
4. Copy the connection string and replace `[YOUR-PASSWORD]` with your database password

**Local / direct connection (port 5432):**
```
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

**Production / pooled connection (recommended for serverless — port 6543):**
```
postgresql://postgres.[project-ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

> Use the direct connection locally and the pooler URL in production (Vercel).

---

## 4. Cloudflare R2 Storage

Used for document uploads (insurance, RC, permits).

### `R2_ACCOUNT_ID`
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Your Account ID is shown in the right sidebar on the home page

### `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`
1. In Cloudflare Dashboard, go to **R2 > Manage R2 API tokens**
2. Click **Create API token**
3. Give it **Object Read & Write** permissions
4. Copy the **Access Key ID** and **Secret Access Key** (secret shown only once)

### `R2_BUCKET_NAME`
1. In Cloudflare Dashboard, go to **R2**
2. Click **Create bucket**
3. Name it `motoyaar-documents` (or update the value if you choose a different name)

### `R2_PUBLIC_URL`
1. In your R2 bucket settings, enable **Public access** or set up a **Custom domain**
2. Set this to the public base URL, e.g. `https://documents.motoyaar.app`
3. For local dev without a custom domain, you can leave this empty and use signed URLs instead

---

## 5. Email — Resend

### `RESEND_API_KEY`
1. Go to [resend.com](https://resend.com) and create an account
2. Navigate to **API Keys**
3. Click **Create API Key**
4. Copy the key (shown only once)

> For local dev you can use Resend's test mode — emails are captured in their dashboard.

---

## 6. AI — Anthropic

### `ANTHROPIC_API_KEY`
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Navigate to **API Keys**
3. Click **Create Key**
4. Copy the key

---

## 7. Push Notifications — VAPID Keys

Used for browser push notifications.

### `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

Generate a VAPID key pair:

```bash
npx web-push generate-vapid-keys
```

This outputs a public and private key. Set:
- `VAPID_PUBLIC_KEY` = the public key
- `VAPID_PRIVATE_KEY` = the private key
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = same value as `VAPID_PUBLIC_KEY` (exposed to the browser)

### `VAPID_EMAIL`
The contact email shown in push notification requests. Format: `mailto:you@example.com`

---

## 8. Cron Security

### `CRON_SECRET`
A secret used to authenticate Vercel cron job requests to your API. Generate:

```bash
openssl rand -base64 32
```

Add this same value to your Vercel environment variables so the cron scheduler can pass it as a header.

---

## 9. Admin Seed

Used only when running `pnpm db:seed` to create the initial admin user.

### `ADMIN_EMAIL`
The email address for the seeded admin account.

### `ADMIN_PASSWORD`
A strong password — it will be hashed before storage. Only needed for the seed script.

---

## Final `.env.local` checklist

| Variable | Required for local dev | Notes |
|----------|----------------------|-------|
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Yes | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | Google Cloud Console |
| `DATABASE_URL` | Yes | Supabase direct URL |
| `R2_ACCOUNT_ID` | When testing uploads | Cloudflare Dashboard |
| `R2_ACCESS_KEY_ID` | When testing uploads | Cloudflare R2 API token |
| `R2_SECRET_ACCESS_KEY` | When testing uploads | Cloudflare R2 API token |
| `R2_BUCKET_NAME` | When testing uploads | `motoyaar-documents` |
| `R2_PUBLIC_URL` | When testing uploads | R2 public/custom domain |
| `RESEND_API_KEY` | When testing email | resend.com |
| `ANTHROPIC_API_KEY` | When testing AI reports | console.anthropic.com |
| `VAPID_PUBLIC_KEY` | When testing push | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | When testing push | same command |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | When testing push | same as `VAPID_PUBLIC_KEY` |
| `VAPID_EMAIL` | When testing push | `mailto:you@example.com` |
| `CRON_SECRET` | When testing cron | `openssl rand -base64 32` |
| `ADMIN_EMAIL` | When seeding DB | any email |
| `ADMIN_PASSWORD` | When seeding DB | any strong password |

> Minimum required to start the dev server: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DATABASE_URL`.
