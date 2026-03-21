# MotoYaar — Todo / Deferred Tracking

Items here are not story blockers but must be resolved before production deployment or at a specified milestone.

---

## Pre-Production Checklist

### Email (Resend)
- [ ] Register domain `motoyaar.app` with a registrar (Cloudflare, Namecheap, Porkbun, etc.)
- [ ] Add and verify `motoyaar.app` as a sending domain in Resend dashboard (DNS TXT/DKIM/DMARC records)
- [ ] Add `RESEND_API_KEY` to Vercel environment variables
- [ ] Update `FROM_ADDRESS` usage — confirm `MotoYaar <noreply@motoyaar.app>` works post-verification

> Required before any production email is sent. Affects Stories: 8.3, 7.5, 10.1, 11.2, 11.5

---

### Storage (Cloudflare R2)
- [ ] Configure `R2_PUBLIC_URL` with a proper custom domain (currently using default `.r2.dev` URL)

---

### Infrastructure
- [ ] Add all environment variables to Vercel production environment (see `SETUP.md` for full list)
- [ ] Switch `DATABASE_URL` to pooler URL (port 6543) for Vercel serverless deployment

---

### AI Parsing (Anthropic API)
- [ ] Top up Anthropic API credits at console.anthropic.com → Plans & Billing **OR** migrate to Gemini (see below)
- [ ] Add `ANTHROPIC_API_KEY` to Vercel production environment variables (if staying on Anthropic)

> **Current status:** API key out of credits — document parsing returns `api_error` and falls through to manual date entry. All other features unaffected.

#### Free alternative: Google Gemini 1.5 Flash
If staying free, Gemini is the recommended drop-in replacement:
- Free tier: 15 RPM, 1M tokens/day — no billing required for testing
- Supports vision (image input) — compatible with the same parse flow
- Migration: replace `@anthropic-ai/sdk` calls in `src/lib/anthropic.ts` with `@google/generative-ai`
- Add `GEMINI_API_KEY` env var (get from Google AI Studio — free, no card needed)
- Works in both local dev and Vercel deployed environments

Other options: Ollama + LLaVA (local dev only, unlimited), OpenRouter (free credits), Mistral Pixtral

---

## Known Dev Shortcuts / Deferred Decisions

| Item | Deferred From | Notes |
|------|--------------|-------|
| Resend domain verification | Story 1.4 (AC2) | Domain unregistered; dev uses `onboarding@resend.dev` |
| Anthropic API credits | Epic 04 (AI parsing) | Key exhausted 2026-03-21; falls back to manual entry gracefully |
