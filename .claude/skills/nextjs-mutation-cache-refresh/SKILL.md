---
name: nextjs-mutation-cache-refresh
description: >
  Enforces correct cache invalidation in Next.js App Router after any mutation (create, update, delete).
  Use this skill automatically whenever writing or reviewing client components that perform a mutation
  (API POST/PATCH/PUT/DELETE) followed by navigation (router.push, router.replace, router.back).
  Without router.refresh(), the destination Server Component renders stale cached data, requiring the
  user to manually refresh the page to see their changes.
---

# Next.js Mutation Cache Refresh

## The Problem

Next.js App Router caches Server Component renders in the client-side router cache. When a Client Component mutates data then navigates, the destination page renders from cache — not from the server — so the user sees stale data until they manually refresh.

## The Rule

**After every successful mutation + navigation, always call `router.refresh()` immediately after `router.push()` / `router.replace()`.**

```ts
// WRONG — destination page shows stale data
await saveVehicle(data);
router.push("/garage/123");

// CORRECT — cache invalidated, destination re-fetches from server
await saveVehicle(data);
router.push("/garage/123");
router.refresh();
```

`router.refresh()` does not cancel or conflict with `router.push()`. They work together: `push` navigates, `refresh` invalidates the cache so the new page fetches fresh server data.

## When to Apply

Apply `router.refresh()` after navigation in these situations:

| Mutation | Example navigation |
|---|---|
| Create resource | `router.push("/resource/[newId]")` or back to list |
| Update resource | `router.push("/resource/[id]")` (detail view) |
| Delete resource | `router.push("/list")` |
| Any form save that navigates away | any destination |

## When NOT to Apply

- `router.refresh()` alone (no navigation) — refreshes current page in place, fine as-is
- Navigation with no prior mutation (e.g. cancel buttons) — no data changed, no need
- Client-only state (no Server Components involved) — not applicable

## Checklist After Writing a Mutation + Navigation

Before finishing any component with `router.push/replace` after a mutation:

- [ ] Is the destination page a Server Component that fetches data? → add `router.refresh()`
- [ ] Does the current page also need to reflect the change without navigation? → add `router.refresh()` alone
- [ ] On error paths — does the mutation succeed before the catch? → only refresh on success
