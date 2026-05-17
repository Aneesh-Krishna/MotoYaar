# Project Rename Guide

This document tracks every place the current name **MotoYaar** appears and exactly what to do when a new name is chosen. Do not start the rename until the new name is finalised.

---

## Before You Start

1. Decide the new name. For this guide, `[NewName]` = PascalCase (e.g. `RideYaar`), `[newname]` = all-lowercase (e.g. `rideyaar`), `[new-name]` = kebab-case (e.g. `ride-yaar`).
2. Check the new name is clean:
   - Search Google Play and App Store for the exact name
   - Search Google for `"[NewName]" site:tracxn.com` to check for deadpooled companies
   - Check domain availability: `[newname].app`, `[newname].com`, `[newname].in`
3. Create a new git branch: `git checkout -b chore/rename-to-[new-name]`
4. Work through this checklist top to bottom. Each section says exactly what to change and how.

---

## 1. Package & Manifest (Do First — Unblocks Typecheck)

### `package.json`
```
"name": "motoyaar"  →  "name": "[newname]"
```

### `public/manifest.json`
```json
"name": "MotoYaar"        →  "[NewName]"
"short_name": "MotoYaar"  →  "[NewName]"
```

---

## 2. Environment Variables & Config

### `.env.example` (and `.env.local` on your machine)
```
R2_BUCKET_NAME=motoyaar-documents        →  [newname]-documents
R2_PUBLIC_URL=https://documents.motoyaar.app  →  https://documents.[newdomain]
VAPID_EMAIL=mailto:support@motoyaar.app  →  mailto:support@[newdomain]
ADMIN_EMAIL=admin@motoyaar.app           →  admin@[newdomain]
```

### `.claude/settings.local.json`
No functional change needed — the project path reference (`MotoYaar` folder name) is the OS folder name. Update if you rename the folder itself.

---

## 3. External Systems (Require Manual Action — No Code Change)

| System | What to do |
|--------|-----------|
| **Vercel** | Project Settings → General → Project Name → rename |
| **Vercel** | Update all env vars that reference `motoyaar.app` |
| **Supabase** | Dashboard → Project Settings → General → rename project display name |
| **Cloudflare R2** | Buckets cannot be renamed — create a new bucket `[newname]-documents`, migrate objects, update env var, delete old bucket |
| **Resend** | Dashboard → Domain or From address → update sender domain if using `@motoyaar.app` |
| **GitHub repo** | Settings → Repository name → rename (GitHub auto-redirects old URL) |

---

## 4. Source Code Files

### `src/app/layout.tsx`
- App title / metadata `title` field
- Any hardcoded `"MotoYaar"` strings in `<title>` or `<meta>` tags

### `src/app/(auth)/login/page.tsx` & `onboarding/page.tsx`
- Brand name shown in the UI (logo text, welcome copy)

### `src/app/privacy/page.tsx`
- "MotoYaar Privacy Policy" heading and all body references

### `src/components/layout/SidebarNav.tsx` & `TopBar.tsx`
- App name displayed in the nav bar / sidebar header

### `src/app/trips/join/[code]/GuestLiveMapView.tsx`
- "Join MotoYaar to share your location" banner text

### `src/app/admin/community/AdminCommunityClient.tsx` & `src/app/admin/settings/page.tsx`
- Admin UI labels

### `src/services/emailService.ts`
- Email subject lines, body copy, and From address that mention MotoYaar

### `src/services/vehicleInviteService.ts` & `adminService.ts`
- Any invite/notification email copy referencing the app name

### `src/lib/resend.ts`
- From address / sender name

### `src/lib/adminSession.ts` & `src/lib/liveTripDb.ts`
- Any hardcoded strings (comments or log messages)

### `src/lib/anthropic.ts`
- System prompt or context strings that name the app

### `src/scripts/seed.ts`
- Seed data display names

### `src/app/api/admin/posts/route.ts`
- Any hardcoded app name in response copy

### `tailwind.config.ts` & `src/app/globals.css`
- CSS custom property names or comments referencing MotoYaar (functional impact unlikely but keep it clean)

---

## 5. Test Files

### `src/services/__tests__/emailService.test.ts`
- Test descriptions and expected string assertions that mention "MotoYaar"

### `src/services/__tests__/vehicleInviteService.test.ts`
### `src/services/__tests__/adminService.moderation.test.ts`
- Same — update assertions and descriptions

### `src/app/api/admin/users/[id]/__tests__/route.test.ts`
- Same pattern

---

## 6. Documentation Files

Run a global find-and-replace across the entire `docs/` directory:

| Find | Replace |
|------|---------|
| `MotoYaar` | `[NewName]` |
| `motoyaar` | `[newname]` |
| `motoyaar.app` | `[newdomain]` |

Files affected (non-exhaustive — use find-replace, don't update manually):

- `docs/prd.md`
- `docs/prd-live-trip-tracking.md`
- `docs/architecture.md`
- `docs/front-end-spec.md`
- `docs/brainstorming-session-results.md`
- `docs/growth-features-outcomes.md`
- `docs/epics/*.md` (all epic docs)
- `docs/stories/*.story.md` (all stories — 30+ files)
- `docs/qa/` (all QA docs and gates)
- `README.md`
- `CLAUDE.md`
- `SETUP.md`
- `Todo.md`
- `MotoYaar.txt` → rename file to `[NewName].txt` and update contents

---

## 7. QA Gate Files

```
qa/gates/*.yml — all files
```

Global find-replace same as above. These files contain test descriptions and expected strings.

---

## 8. Build Scripts

### `scripts/generate-icons.mjs`
- Any app name string passed to icon generation

---

## 9. Recommended Execution Order

1. ✅ Rename Vercel project + update all Vercel env vars
2. ✅ Create new Cloudflare R2 bucket, migrate, update `.env.local` + `.env.example`
3. ✅ `package.json` + `public/manifest.json`
4. ✅ Global find-replace in `docs/` and `qa/`
5. ✅ Update each source file listed in Section 4 manually (to avoid breaking string logic)
6. ✅ Update test files (Section 5)
7. ✅ `pnpm typecheck && pnpm lint && pnpm test` — must all pass
8. ✅ Update Supabase project name (cosmetic — no code impact)
9. ✅ Rename GitHub repo
10. ✅ Rename `MotoYaar.txt` file
11. ✅ Commit: `git commit -m "chore: rename project to [NewName]"`
12. ✅ Open PR, merge, redeploy on Vercel

---

## 10. After Rename — Verify

- [ ] App loads at new Vercel URL with correct name in browser tab
- [ ] PWA install prompt shows new name
- [ ] Email sends show correct From name and subject
- [ ] R2 file uploads and retrieval work with new bucket
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] No remaining `motoyaar` or `MotoYaar` strings in codebase (`grep -ri "motoyaar" src/` returns empty)
