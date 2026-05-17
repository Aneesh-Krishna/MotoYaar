# Epic 14 — Growth & Engagement Features

**Source:** [growth-features-outcomes.md](../growth-features-outcomes.md)
**Priority:** P0–P2
**Created:** 2026-04-28
**Depends On:** Epics 01–06, 13 (foundation, vehicles, expenses, trips, live tracking)

---

## Epic Goal

Introduce features that deepen weekly habit loops and create organic acquisition through shareable content — turning MotoYaar from a "set it and forget it" utility into an app users actively open every time they fuel up, complete a ride, or hit a milestone.

---

## Stories

| Story | Title | Priority | Depends On |
|-------|-------|----------|-----------|
| 14.1 | Public Trip Route Sharing | P0 | Epic 13 (live trip with saved route) |
| 14.2 | Per-Fill-Up Fuel Efficiency Tracking | P1 | Epic 05 (expense form) |
| 14.3 | Service Reminders (km + date-based) | P1 | Epics 03, 05 (vehicles, expenses) |
| 14.4 | Gamification — Riding Milestones & Badges | P2 | Epics 03, 06, 13 (vehicles, trips, live tracking) |

---

## Build Order

```
14.1 Public Route Sharing     ← depends on Epic 13 route data existing
14.2 Fuel Efficiency          ← standalone expense form enhancement
14.3 Service Reminders        ← depends on vehicle + expense data
14.4 Gamification             ← depends on trip + live session data
```

14.2 and 14.3 can be built in parallel.
