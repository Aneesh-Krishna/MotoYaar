# Epic 17 — Maps, Group Rides & Offline Navigation

**Source PRD:** [prd-maps-tracking-offline.md](../prd-maps-tracking-offline.md)
**Last Updated:** 2026-05-17
**Status:** Draft

---

## Overview

This epic delivers the three interconnected features that complete MotoYaar's vision as the definitive app for the Indian motorcycle enthusiast: embedded Google Maps navigation, real-time group ride location sharing via Supabase Realtime Broadcast, and corridor-based offline route navigation with voice guidance.

These features are gated behind the **Rider Pro** subscription tier (Phase 2), but are shipped free in Phase 1 MVP to validate adoption before paywall is introduced.

---

## Goals

- Navigation adoption: ≥ 40% of trips with a route attached at 90 days post-launch
- Group ride creation: ≥ 10 groups/week at 90 days
- Offline usage: ≥ 1 downloaded route per active rider per month
- API cost: Google Maps spend < ₹8/MAU/month

---

## Key Dependencies

| Dependency | Reason |
|---|---|
| Epic 01 Foundation | Supabase client, R2 SDK, Service Worker (PWA) infrastructure |
| Epic 02 Auth | User identity for group membership and ride sessions |
| Epic 06 Trips | Trip entity for potential auto-attach of group ride routes |
| PostGIS extension | `location_snapshots` uses `GEOMETRY(Point, 4326)` |
| `@react-google-maps/api` | Already installed — map rendering |
| `@supabase/supabase-js` | Supabase Realtime Broadcast for group rides |
| Google Maps Platform API key | Places, Directions, Geocoding, Nearby Search APIs |

---

## New Environment Variables Required

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client-side Google Maps JS API |
| `GOOGLE_MAPS_SERVER_KEY` | Server-side Directions / Places / Nearby Search API calls |
| `MAPBOX_ACCESS_TOKEN` | Offline tile packaging (Mapbox Tiles API) |
| `GOOGLE_CLOUD_TTS_KEY` | Voice clip generation for offline navigation |

---

## New DB Tables

```sql
ride_groups, ride_sessions, ride_invites,
location_snapshots, map_cache, saved_places, offline_routes
```

See PRD Section 10 for full schema.

---

## Tech Additions

| Package | Purpose |
|---|---|
| `@googlemaps/markerclusterer` | Marker clustering for group member + POI markers |
| `turf` (Turf.js) | Corridor buffer calculation for offline tile packaging |
| `flexsearch` | Offline place search within downloaded corridor |
| `idb` | IndexedDB wrapper for search history + API cache |
| `messagepack` (msgpackr) | Route graph compression |

Service Worker tile intercept must be wired via custom Workbox inject (fights `next-pwa` defaults — see PRD Section 15 warning).

---

## Stories

| Story | Title | PRD Weeks | Status |
|---|---|---|---|
| 17.1 | Map Embed, Place Search & Directions | Weeks 1–2 | Draft |
| 17.2 | Traffic Layer, Nearby POIs & Marker Clustering | Weeks 3–4 | Draft |
| 17.3 | Group Ride: Create, Join & Live Broadcast | Weeks 5–6 | Draft |
| 17.4 | Group Ride: Member View, Panel & Session Lifecycle | Weeks 7–8 | Draft |
| 17.5 | Offline: TTS Setup, OSRM & Corridor Download Edge Function | Weeks 9–10 | Draft |
| 17.6 | Offline: MBTiles Packaging, OPFS Storage & R2 Delivery | Weeks 11–12 | Draft |
| 17.7 | Offline: Service Worker Tile Intercept & Client Route Graph | Weeks 13–14 | Draft |
| 17.8 | Offline: Voice Guidance, Navigation UI & iOS Device Testing | Weeks 15–16 | Draft |

---

## Critical Pre-Implementation Requirements

1. **Supabase Realtime PoC** — Before building group ride UI (Story 17.3), verify that Supabase free tier Broadcast supports group rides adequately. See PRD Open Question #9. If free tier is insufficient, Story 17.3+ are held pending Pro plan decision.

2. **Nearby Places cache** — Must be verified end-to-end with integration test before Story 17.2 deploys to any environment with real API keys. See PRD Section 7.1.5 financial risk warning.

3. **Google Cloud budget alert** — Set at ₹2,000/month (warn) and ₹5,000/month (hard cutoff) in Google Cloud Console before Story 17.1 goes to production.

4. **OSRM self-hosting** — Do NOT launch Story 17.5+ relying on the public OSRM API. Self-host on a $10–20/month VPS from day one of offline feature launch.

---

## Out of Scope (This Epic)

See PRD Section 18. Key exclusions: Street View, indoor maps, Waze-style incident reporting, P2P WebRTC voice/video in group rides.

Phase 2 features (adaptive frequency, PostGIS distance/bearing, Mapbox GL JS render layer, automatic trip log on session end, multi-stop routes) are NOT in this epic.