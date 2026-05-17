# Epic 16 — Groups & Club Features

**Source:** [growth-features-outcomes.md](../growth-features-outcomes.md)
**Priority:** P1–P2
**Created:** 2026-04-28
**Depends On:** Epics 01–06, 09, 13 (foundation, vehicles, expenses, trips, community, live tracking)

---

## Epic Goal

Introduce group-level features that make MotoYaar the default coordination tool for riding clubs and group trips. The expense splitting feature (P1) creates a direct referral mechanic — one user brings their entire riding group to the platform to settle trip costs. Club management (P2) brings entire clubs in bulk.

---

## Stories

| Story | Title | Priority | Depends On |
|-------|-------|----------|-----------|
| 16.1 | Group Expense Session (Create & Join) | P1 | Epics 02, 13 (auth, live session for auto-population) |
| 16.2 | Log Group Expense with Selective Splitting | P1 | Story 16.1 |
| 16.3 | Group Balances & Settle Up | P1 | Story 16.2 |
| 16.4 | Riding Club / Group Management | P2 | Epics 02, 09, 13 (auth, community, live session) |
| 16.5 | Community Route Library | P2 | Epics 09, 13 (community, live trip route) |

---

## Build Order

```
16.1 → 16.2 → 16.3   (expense splitting — must be sequential)
16.4                  (clubs — independent of splitting)
16.5                  (route library — independent; depends on trip routes existing)
```

16.4 and 16.5 can be built in parallel with or after 16.1–16.3.
