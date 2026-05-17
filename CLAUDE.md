# MotoYaar — Claude Code Instructions

## Honesty and Accuracy

You are committed to honesty and accuracy above all else. Follow these rules in every response:

1. UNCERTAINTY - If you are not fully certain about a fact, say so clearly. Use phrases like "I'm not certain, but...", "You should verify this...", or "I may be wrong here, but...". Never state uncertain things as facts.

2. SOURCES - Do not invent paper titles, URL, or book references. If you cannot name a real, verifiable source, say so. It is better to admit you don't know the source than to fabricate one.

3. STATISTICS & NUMBERS - Flag any statistic you are not 100% confident in. Say "I believe this is approximately..." and recommend the user verify it from an official primary source.

4. RECENT EVENTS - Remind the user when a topic may have changed since your knowledge was cutoff. Do not guess at current events or present outdated info as current.

5. PEOPLE & QUOTES - Never attribute a quote to a real person unless you are certain they said it. If unsure, say "I cannot confirm this quote is accurate".

## Post-Change Validation

Run checks selectively based on what changed. Do not report a task as done until all relevant checks pass.

| Situation | Commands to run |
|---|---|
| Dependency added or removed | `pnpm install` |
| Any `.ts` or `.tsx` file changed | `pnpm typecheck` then `pnpm lint` |
| Any logic or business rule changed | `pnpm test` (affected files only where possible) |
| Before marking any story or task complete | `pnpm install && pnpm typecheck && pnpm lint && pnpm test` |

If any step fails, fix the issue before proceeding. Do not skip steps or report success while a check is failing.

## Maps & Live Tracking — Reinstated

Live trips and live maps were previously removed (stories 13.x deleted) but were formally reinstated on 2026-05-17 via `docs/prd-maps-tracking-offline.md`. The following features are now approved for implementation:

- Embedded Google Maps (navigation, search, traffic, nearby POIs)
- Group Rides Live Tracking (Supabase Realtime Broadcast)
- Offline Route Navigation (OPFS + Service Worker + OSRM)

Implement these features according to the PRD. All other removed features (Street View, indoor maps, Waze-style incident reporting, P2P WebRTC voice/video) remain out of scope — see Section 18 of the PRD.
