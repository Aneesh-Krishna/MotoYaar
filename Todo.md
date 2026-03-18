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

## Known Dev Shortcuts / Deferred Decisions

| Item | Deferred From | Notes |
|------|--------------|-------|
| Resend domain verification | Story 1.4 (AC2) | Domain unregistered; dev uses `onboarding@resend.dev` |
