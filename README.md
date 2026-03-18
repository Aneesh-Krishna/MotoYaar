# MotoYaar

A motorcycle ownership and community platform built with Next.js 14 (App Router).

Track your garage, manage documents, log expenses and trips, get AI-powered reports, and connect with the riding community.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript 5.4 |
| Styling | Tailwind CSS v3.4 + shadcn/ui |
| Auth | NextAuth v4 (Google OAuth) |
| Database | Supabase (PostgreSQL) + Drizzle ORM |
| Storage | Cloudflare R2 |
| Email | Resend |
| AI | Anthropic Claude |
| Push Notifications | Web Push (VAPID) |
| Package Manager | pnpm v9+ |
| Runtime | Node.js 20+ |

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Fill in .env.local (see SETUP.md for detailed instructions)

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type check |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:watch` | Run unit tests in watch mode |
| `pnpm test:e2e` | Run end-to-end tests (Playwright) |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Seed the database |

## Project Structure

```
src/
├── app/           # Next.js App Router pages and layouts
│   ├── (auth)/    # Login, onboarding
│   ├── (app)/     # Main app (garage, trips, community, profile)
│   ├── admin/     # Admin panel
│   └── api/       # API routes
├── components/    # React components (ui/, layout/, domain/)
├── lib/           # Core utilities (auth, db, errors, logger, etc.)
├── services/      # Server-side business logic
├── hooks/         # React hooks
├── stores/        # Zustand stores
├── types/         # TypeScript types (index.ts — single source of truth)
└── utils/         # Pure utility functions
```

## Setup

See [SETUP.md](SETUP.md) for full environment variable and service setup instructions.
