# MotoYaar — Maps, Live Group Tracking & Offline Navigation PRD

**Version:** 1.1
**Status:** Draft
**Date:** 2026-05-17
**Last Updated:** 2026-05-17
**Author:** Aneesh Krishna
**Source:** [Architecture Design Session — Maps, Live Tracking & Offline Navigation (2026-05-17)](../docs/architecture-maps-tracking-offline.md)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Target Users](#4-target-users)
5. [Jobs-to-be-Done](#5-jobs-to-be-done)
6. [Scope](#6-scope)
7. [Feature Requirements](#7-feature-requirements)
   - 7.1 Embedded Maps
   - 7.2 Group Rides Live Tracking
   - 7.3 Offline Route Navigation
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Tech Stack & Architecture](#9-tech-stack--architecture)
10. [Data Models](#10-data-models)
11. [API & Integration Dependencies](#11-api--integration-dependencies)
12. [Security & Privacy](#12-security--privacy)
13. [Cost Model & Optimization](#13-cost-model--optimization)
14. [Monetisation Strategy](#14-monetisation-strategy)
15. [Implementation Phases](#15-implementation-phases)
16. [Risks & Mitigations](#16-risks--mitigations)
17. [Open Questions](#17-open-questions)
18. [Out of Scope](#18-out-of-scope)

---

## 1. Executive Summary

This document specifies the product requirements for three interconnected features that complete MotoYaar's vision as the definitive app for the Indian motorcycle enthusiast:

1. **Embedded Maps** — Google Maps-parity mapping experience embedded natively inside MotoYaar, supporting search, navigation, traffic, terrain, and custom motorcycle-themed styling.

2. **Group Rides Live Tracking** — Real-time location sharing within ride groups, with distance, direction, ETA, and presence indicators for every member.

3. **Offline Route Navigation** — Corridor-based offline map download allowing full turn-by-turn navigation, voice guidance, and re-routing with zero internet connectivity.

These features move MotoYaar from a garage management tool to an active companion for every ride. Together they enable the enthusiast persona (Persona 2) to live entirely within MotoYaar — from planning the route, to riding with the group, to logging the trip on return.

**Note on removed features:** Stories 13.x (live trip tracking) were previously removed from the project. This PRD reinstates map and live location capabilities in a more focused, group-ride-centric form with explicit architecture and cost constraints. The decision to proceed was made on 2026-05-17.

---

## 2. Problem Statement

Indian motorcycle enthusiasts currently manage their rides across 3–5 separate apps:

1. **Google Maps** — for navigation. No motorcycle-specific routing, no ride community integration.
2. **WhatsApp** — to coordinate group rides and share live location. Ephemeral, no structure, location sharing stops after 15 minutes.
3. **MotoYaar** — for documents, expenses, and trip logging (post-ride, manual entry).

This creates friction at the exact moment of highest engagement — during the ride itself. The product misses the window to capture real-time data (route, group, fuel stops) and fails to serve the enthusiast's core need: riding with friends without logistical overhead.

**Specific pain points:**
- Group ride leaders have no way to see if stragglers are safe or lost.
- Riders switching between WhatsApp and Maps waste time and risk accidents.
- Trip logging after a group ride requires manual recall of route, distance, and stops.
- Offline areas (ghats, hill stations, national highways with poor cell coverage) have no navigation fallback.
- Google Maps has no motorcycle mode, no Indian highway preference, no ride-community context.

---

## 3. Goals & Success Metrics

### Feature Goals

| Goal | Metric | Target |
|------|--------|--------|
| Navigation adoption | % of trips with a route attached | ≥ 40% at 90 days post-launch |
| Group ride creation | Ride groups created per week | ≥ 10/week at 90 days |
| Group ride size | Average members per group | ≥ 4 |
| Offline usage | Offline routes downloaded per active user | ≥ 1/month for active riders |
| Battery efficiency | User complaints about excessive battery drain | < 2% of active session feedback |
| API cost | Google Maps API spend per MAU | < ₹8/MAU/month |

### Business Goals
- Increase DAU/MAU ratio — map features drive daily active use vs. weekly document check-ins
- Create a social flywheel — group rides are inherently social, driving organic invites
- Differentiate from generic navigation apps — motorcycle-first routing, community-embedded

---

## 4. Target Users

**Primary for these features: Persona 2 — The Enthusiast Rider**
- 22–35 years old; rides motorcycles regularly (weekend trips + commutes)
- Already coordinates group rides via WhatsApp
- Familiar with Google Maps; frustrated by its lack of motorcycle-specific features
- Will download offline maps for known riding routes (ghats, highways)

**Secondary: Persona 1 — The Responsible Owner**
- Uses navigation for commutes; values traffic-aware routing
- Less likely to use group ride features; will use offline navigation on road trips

**Geography:** India-first. Key riding corridors: Western Ghats, Himalayan highways, Rajasthan desert routes, Coorg, Spiti Valley — many with poor or zero cell coverage.

---

## 5. Jobs-to-be-Done

| Feature | JTBD Statement |
|---------|----------------|
| **Embedded Maps** | When I plan a ride, I want to search destinations, see traffic and terrain, and get turn-by-turn navigation — all without leaving MotoYaar — so I don't lose trip context switching between apps. |
| **Group Live Tracking** | When I ride with a group, I want to see where every member is in real time, so I know if someone has fallen behind or needs help without stopping to call. |
| **Offline Navigation** | When I ride into an area without network coverage, I want my navigation to keep working with voice guidance and re-routing, so I don't get lost on remote routes. |

---

## 6. Scope

### In Scope — Phase 1 (MVP)

**Embedded Maps:**
- Map embed with Google Maps data (`@react-google-maps/api` — already installed)
- Place search + autocomplete with session token optimization
- Current location + centering
- Turn-by-turn directions (A→B single route)
- Traffic layer toggle
- Map type toggle (roadmap / satellite / terrain)
- ETA display
- Dark mode map style
- Marker for fuel stations and rest stops (Nearby Places)

**Group Rides Live Tracking:**
- Create a ride group (name + invite code)
- Join via 6-character invite code or share link
- Real-time location of all members (Supabase Realtime Broadcast)
- Distance to each rider
- Relative bearing/direction arrow
- Presence indicators (online / offline / last seen)
- Session lifecycle: Waiting → Active → Ended
- Group size: up to 20 members

**Offline Navigation:**
- Route selection on map
- Corridor-based tile download (500m buffer, zoom 8–15)
- Full offline navigation with pre-computed route graph
- Voice guidance using pre-generated MP3 clips
- Re-routing within downloaded corridor
- Download size indicator before confirming
- Offline route management (list, delete)

### In Scope — Phase 2 (Production)

- Multi-stop routes (waypoints)
- Route alternatives
- Voice navigation via Web Speech API (online)
- Adaptive location update frequency (speed-based)
- Dead-reckoning during connectivity drops
- Mapbox GL JS render layer (custom motorcycle theme, full dark mode)
- Map tile proxy + caching (Supabase Edge Function + R2)
- PostGIS distance/bearing calculations
- Automatic trip log creation at session end
- Offline sync on reconnect (buffered location upload)
- MQTT upgrade path for >500 concurrent ride groups

### Out of Scope
See [Section 17](#17-out-of-scope).

---

## 7. Feature Requirements

### 7.1 Embedded Maps

#### 7.1.1 Map Display

- The map must render within the MotoYaar app shell — no redirect to external apps.
- Default map center: user's current GPS location on load.
- Support zoom levels 5–20 (country view → street level).
- Smooth pinch-to-zoom and pan gestures on mobile.
- Map provider: **Google Maps** via `@react-google-maps/api` (already in stack).
- Map types available: Roadmap (default), Satellite, Terrain, Hybrid.
- Dark mode map style: activated by system dark mode preference or manual toggle.
- Custom map style JSON applied to suppress irrelevant POIs (shopping, restaurants) while emphasising fuel stations, highways, and rest areas.

#### 7.1.2 Search & Autocomplete

- Search bar with Google Places Autocomplete.
- Results scoped to India by default (configurable).
- Session token management: one Google API charge per completed search, not per keystroke. This is a hard requirement — do not implement autocomplete without session tokens.
- Recent searches stored locally (IndexedDB, max 20 entries).
- Saved places: user can star/bookmark a location, stored in `saved_places` table.

#### 7.1.3 Navigation

- Point A → B routing via Google Directions API.
- ETA display prominently during navigation (large badge).
- Turn-by-turn instruction list (expandable drawer).
- Current instruction displayed as HUD overlay at top of map during active navigation.
- Distance to next turn updated as rider moves.
- Voice navigation:
  - Online: Web Speech API (`SpeechSynthesis`), locale `en-IN`.
  - Mutable via volume control or silent mode detection.
- Re-routing: when rider deviates >150m from route, automatically request new directions (online mode).
- Navigation speed display (km/h from GPS, not speedometer).

#### 7.1.4 Traffic & Live Layers

- Traffic layer: toggleable, default on during active navigation.
- Traffic data sourced from Google Maps Platform (real-time).
- Traffic-aware ETA: use `drivingOptions.trafficModel = 'bestguess'` in Directions API.

#### 7.1.5 Nearby Places

- Fuel stations within 5km of current location (Google Places Nearby Search).
- Rest stops / dhabas (category: `restaurant`, `lodging`) within 5km.
- Displayed as map markers; tappable to see name, distance, and quick directions.
- Results cached locally for 1 hour (IndexedDB) to reduce API calls.

> **⚠️ FINANCIAL RISK — NON-NEGOTIABLE CACHE REQUIREMENT**
> The Nearby Search API costs $32 per 1,000 requests — 4–6x more expensive than every other Google Maps API. A single bug that bypasses the 1-hour cache (e.g., a React component re-mounting and re-fetching on every render) can generate hundreds of dollars of unexpected charges in a single day and wipe out the $200/month Google free credit instantly.
>
> The following are hard requirements, not suggestions:
> 1. The cache must be implemented and verified **before** the Nearby Places feature is deployed to any environment with real API keys.
> 2. A dedicated integration test must assert that repeated calls within 1 hour return a cached result and do not make a second API request.
> 3. The Google Cloud budget alert must be set at **₹2,000/month (warn)** and **₹5,000/month (hard cutoff)** — not just ₹5,000 — to allow reaction time before the credit is exhausted.
> 4. The feature must be disabled behind a feature flag until caching is confirmed working end-to-end.

#### 7.1.6 Marker Clustering

- When multiple markers are close together (e.g., group members, POIs), cluster them with a count badge using `@googlemaps/markerclusterer`.
- Expand cluster on tap.

#### 7.1.7 Cost Optimization Requirements (Non-Negotiable)

- All Autocomplete requests MUST use session tokens.
- Geocoding responses MUST be cached in `map_cache` table (TTL: 7 days).
- Directions API responses MUST be cached by route hash (TTL: 30 minutes for traffic-sensitive; 24 hours for static).
- Static map tiles MUST be proxied via Supabase Edge Function + Cloudflare CDN (TTL: 1 week).
- A budget alert MUST be configured in Google Cloud Console at ₹5,000/month.

---

### 7.2 Group Rides Live Tracking

#### 7.2.1 Group Creation & Joining

- Any authenticated user can create a ride group.
- Creation requires: group name (mandatory), optional description.
- System generates a unique 6-character alphanumeric invite code (e.g., `RD7K2M`).
- Share link format: `motoyaar.app/join/RD7K2M` — opens app directly to join screen.
- Joining: enter code manually or tap share link.
- A user can be in only one active group at a time.
- Group capacity: maximum 20 members.
- Group leader is the creator; leader role is transferable.

#### 7.2.2 Real-Time Location Sharing

- Location updates published via **Supabase Realtime Broadcast** on channel `ride-group:{groupId}`.
- Broadcast is ephemeral — location data does NOT write to Postgres during active riding (reduces DB load and write costs).
- Exception: `location_snapshots` table receives one write per member every 30 seconds as an audit trail. Users may opt out of snapshots in privacy settings.
- Update frequency:
  - Moving >30 km/h: every 3 seconds.
  - Moving <30 km/h: every 5 seconds.
  - Stationary >60 seconds: every 30 seconds.
  - App backgrounded: every 15 seconds (significant-changes mode).
- Dead reckoning: if member's signal is lost, their marker extrapolates position based on last known speed + heading for up to 30 seconds, then freezes.

#### 7.2.3 Member View

Each member's map shows:

- All other members as rider icons (motorcycle silhouette) colour-coded by rider.
- Each marker labeled with the member's display name.
- **Distance** from self to each member (straight-line, in km/m).
- **Direction arrow** — compass bearing from self to each member.
- **ETA** to each member (computed client-side from speed + distance).
- **Status indicators:**
  - Green pulse: active, location fresh (<10 seconds old).
  - Yellow: location stale (10–60 seconds old).
  - Grey + "Last seen X min ago": offline or backgrounded.

#### 7.2.4 Group Panel

- Slide-up drawer listing all group members.
- Each entry: avatar, name, speed, last update time, distance from self.
- Leader badge on group leader.
- "Find on map" button per member (centers map on that member).
- "End ride" button for leader only (ends session for all).
- "Leave ride" button for non-leaders.

#### 7.2.5 Session Lifecycle

```
WAITING (group created, members joining)
  ↓ leader taps "Start Ride"
ACTIVE (location sharing live)
  ↓ leader taps "End Ride" OR all members leave
ENDED (session archived, stats available)
```

- In WAITING state: members see each other on map but updates are 15-second interval.
- Transition WAITING → ACTIVE: leader-only action.
- Transition ACTIVE → ENDED: triggered by leader ending ride, or auto-end after all members offline >5 minutes.
- On END: session summary generated (total members, duration, a static map thumbnail of the group's routes).

#### 7.2.6 Invite Management

- Invite codes expire 24 hours after group creation (configurable: 1h / 6h / 24h / never).
- Leader can regenerate invite code at any time (invalidates old code).
- Maximum invite uses: configurable (default: unlimited within group capacity).
- Private groups: leader can disable invite code to prevent new joins mid-ride.

#### 7.2.7 Battery Efficiency Requirements

- Use `navigator.geolocation.watchPosition` with adaptive accuracy:
  - High accuracy (`enableHighAccuracy: true`) when moving.
  - Low power (`enableHighAccuracy: false`) when stationary.
- Skip publish if movement < 10 metres since last publish (dead-zone filter).
- Broadcast payload kept minimal (userId, lat, lng, speed, heading, timestamp — all short-key encoded).
- Screen wake lock (`navigator.wakeLock`) only when navigation is active and user has granted permission.

---

### 7.3 Offline Route Navigation

#### 7.3.1 Route Selection & Download

- User plans a route on the map (A→B, optionally with waypoints in Phase 2).
- Before starting navigation, user sees a "Download for Offline" option.
- Download preview shows:
  - Estimated download size (MB).
  - Coverage area (bounding box on map preview).
  - Expiry date (30 days from download).
- User confirms → download begins in background.
- Download progress shown in a persistent bottom bar (dismissible once complete).

#### 7.3.2 Corridor Calculation

- Server-side Edge Function calculates corridor:
  - 500m buffer around route polyline using Turf.js.
  - Vector tiles selected for zoom levels 8–15.
  - Zoom 16–17 (street-level detail) available as "Enhanced Download" (adds ~20–30 MB; optional).
- Tiles packaged as MBTiles (SQLite-backed, gzipped PBF format).
- Package assembled on server and stored in R2/S3 as a pre-signed download URL (valid 1 hour).

#### 7.3.3 Tile Storage (Client)

- Downloaded MBTiles stored in **Origin Private File System (OPFS)** — not IndexedDB.
- Service Worker intercepts Mapbox tile requests → serves from OPFS when tile exists.
- Fallback to network if tile not in OPFS (transparent to user).
- Storage check before download: if browser quota insufficient, warn user and offer "Basic Download" (zoom 8–13 only, ~8–12 MB).

#### 7.3.4 Offline Routing Engine

- A pre-computed route graph is generated server-side at download time using OSRM.
- Graph includes: nodes (lat/lng), edges (distance, duration, road name), turn instructions.
- Graph compressed with MessagePack + gzip, stored alongside MBTiles in OPFS.
- Client-side Dijkstra implementation handles re-routing within the corridor.
- If re-routing destination falls outside corridor: display "Outside offline zone — reconnect for rerouting" message. Do not silently fail.

#### 7.3.5 Offline Voice Guidance

- Turn instructions pre-generated as MP3 audio clips (Google Cloud TTS, `en-IN` locale) at download time.
- Audio clips stored in OPFS alongside route graph.
- Triggered by distance-to-turn threshold (announce at 500m, 200m, and at turn).
- Total voice clips per route: I believe approximately 30–80 clips for a typical 100km route — exact count depends on turn density.
- Voice can be muted via UI toggle; preference persisted.

#### 7.3.6 Offline Route Management

- Dedicated "Offline Routes" screen under Maps / Navigation.
- Listed by: route name (auto-generated from origin→destination), download date, expiry date, size.
- User can delete individual routes to reclaim storage.
- Expired routes (>30 days) shown with warning badge; still usable but may have stale road data.
- Auto-reminder notification 3 days before route expiry (if user has notifications enabled).

#### 7.3.7 Sync on Reconnect

When internet is restored during a ride:

1. Upload buffered `location_snapshots` accumulated during offline period.
2. Fetch live traffic for remaining route.
3. Check if route graph has a server-side update (hash comparison).
4. Pre-fetch tiles for next 10km of route at higher zoom levels.
5. Resume live ETA calculation.

Sync is silent — no user-visible loading state unless it takes >5 seconds.

#### 7.3.8 Storage Estimates

| Route Length | Zoom 8–13 (Basic) | Zoom 8–15 (Standard) | Zoom 8–17 (Enhanced) |
|---|---|---|---|
| 50 km | ~5–8 MB | ~10–18 MB | ~30–50 MB |
| 100 km | ~8–15 MB | ~17–35 MB | ~50–80 MB |
| 200 km | ~15–25 MB | ~30–60 MB | ~80–140 MB |

*These are estimates based on typical vector tile density for Indian highway and ghat routes. Actual sizes may vary significantly — verify against real corridor downloads before communicating to users.*

Maximum stored routes: 5 (enforced by app; LRU eviction warning shown when limit reached).

---

## 8. Non-Functional Requirements

### Performance

| Requirement | Target |
|---|---|
| Map initial load time | < 2 seconds on 4G |
| Autocomplete response | < 300ms (with cache hit) |
| Location broadcast latency | < 200ms end-to-end (Supabase Realtime) |
| Offline map tile serve time | < 50ms (OPFS read) |
| Route corridor download (50km standard) | < 60 seconds on 4G |

### Reliability

- Supabase Realtime auto-reconnects within 5 seconds on connection drop.
- Last known member locations displayed for up to 60 seconds after loss of presence.
- Offline navigation must continue working with zero network — no silent failures.
- Service Worker must be registered and active before offline navigation is offered to user.

### Scalability

| Load Level | Architecture | Notes |
|---|---|---|
| MVP (< 100 concurrent groups) | Supabase Realtime | No additional infra needed |
| Growth (100–500 concurrent groups) | Supabase Realtime (monitor channel limits) | Watch Supabase plan limits |
| Scale (> 500 concurrent groups) | Migrate to MQTT (EMQX Cloud) | Pre-planned migration path |

### Battery

- Active navigation must not drain battery faster than 15%/hour on a mid-range Android device (I believe approximately Snapdragon 665-class). This is a target, not a guarantee — verify in device testing.
- Adaptive frequency and dead-zone filtering are mandatory, not optional optimizations.

### Browser / Platform Support

| Platform | Support Level |
|---|---|
| Android Chrome 90+ | Full (primary) |
| iOS Safari 15.2+ | Partial — online maps and group rides full; offline navigation available |
| iOS Safari < 15.2 | Degraded — offline navigation unavailable; OPFS not supported; warn user explicitly |
| Desktop Chrome/Firefox | Full (secondary) |
| Samsung Internet | Best effort |

> **iOS Limitations — Known and Accepted**
>
> iOS is a meaningful platform in India and these limitations must be handled gracefully, not silently:
>
> 1. **OPFS not available below iOS 15.2.** Before offering the "Download for Offline" option, the app must feature-detect OPFS availability (`navigator.storage.getDirectory`). If unavailable, show a clear message: *"Offline navigation requires iOS 15.2 or later. Update your device to use this feature."* Do not show the download button at all.
>
> 2. **Web Speech API stops on iOS screen lock.** This is a known, unfixable iOS limitation — the browser's `SpeechSynthesis` API is suspended when the screen locks, which is the default state while riding. This is exactly why pre-generated MP3 voice clips (Section 7.3.5) are the **primary** voice mechanism. Web Speech API is supplemental online-only and must never be relied upon for iOS users.
>
> 3. **Service Worker tile intercept behaviour on iOS Safari** has historically been less reliable than Chrome. The offline tile serving strategy via OPFS + Service Worker must be tested explicitly on physical iOS devices before launch, not just in desktop browser DevTools.
>
> These are accepted platform constraints, not bugs to fix. Document them in the user-facing help section at launch.

---

## 9. Tech Stack & Architecture

### Frontend

| Component | Technology |
|---|---|
| Map rendering (online) | `@react-google-maps/api` (already installed) |
| Map rendering (custom style) | MapLibre GL JS (Phase 2) |
| Offline tile intercept | Service Worker + OPFS |
| Geo math | Turf.js |
| Offline search | FlexSearch |
| App state | Zustand (already installed) |
| Offline storage index | IndexedDB via `idb` (already installed) |

### Backend

| Component | Technology |
|---|---|
| Real-time | Supabase Realtime (Broadcast + Presence) |
| Database | Supabase Postgres + PostGIS extension |
| Edge Functions | Supabase Edge Functions (Deno) |
| Tile/package storage | AWS S3 or Cloudflare R2 (already using `@aws-sdk/client-s3`) |
| Maps API proxy | Supabase Edge Function + Cloudflare CDN |
| Offline route graph | OSRM (server-side generation, MVP via API call; Phase 2 self-hosted) |
| Voice clip generation | Google Cloud TTS (`en-IN`) |

### Backend Infrastructure (Textual Diagram)

```
CLIENT (Next.js PWA)
  │
  ├── @react-google-maps/api → Google Maps Platform
  │     (Places, Directions, Geocoding, Traffic)
  │
  ├── WebSocket → Supabase Realtime
  │     Broadcast:  ride-group:{groupId}  (ephemeral location pings)
  │     Presence:   presence:{groupId}    (member online state)
  │
  └── HTTPS → Vercel Edge / Cloudflare CDN
        │
        ├── /api/maps/autocomplete   → [Supabase Edge Fn] → Google Places API
        │                                  ↓ cache in map_cache (24h TTL)
        │
        ├── /api/maps/directions     → [Supabase Edge Fn] → Google Directions API
        │                                  ↓ cache in map_cache (30min TTL)
        │
        ├── /api/offline/prepare     → [Supabase Edge Fn]
        │     → Turf.js corridor     → Mapbox Tiles API (MVT download)
        │     → OSRM route graph generation
        │     → Google Cloud TTS (voice clips)
        │     → Package → R2 Storage → Pre-signed URL
        │
        └── Supabase Postgres (PostGIS)
              ride_groups · ride_sessions · ride_invites
              location_snapshots · map_cache
              saved_places · offline_routes
```

---

## 10. Data Models

### Core Tables

```sql
-- Ride Groups
ride_groups (
  id UUID PK, name TEXT, invite_code TEXT UNIQUE,
  created_by UUID → users, status TEXT,  -- waiting|active|ended
  max_members INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ
)

-- Per-member session within a group
ride_sessions (
  id UUID PK, group_id UUID → ride_groups, user_id UUID → users,
  joined_at TIMESTAMPTZ, left_at TIMESTAMPTZ, last_seen_at TIMESTAMPTZ,
  is_leader BOOLEAN DEFAULT FALSE
)

-- Invite tokens
ride_invites (
  token TEXT PK, group_id UUID → ride_groups, created_by UUID → users,
  max_uses INTEGER DEFAULT NULL, use_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ
)

-- Audit trail (30-second snapshot, opt-out available)
location_snapshots (
  id UUID PK, session_id UUID → ride_sessions, user_id UUID → users,
  location GEOMETRY(Point, 4326),  -- PostGIS
  speed_kmh REAL, heading REAL, accuracy_m REAL,
  recorded_at TIMESTAMPTZ
)

-- API response cache
map_cache (
  cache_key TEXT PK, cache_type TEXT,  -- autocomplete|directions|geocode
  response_data JSONB, created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
  hit_count INTEGER DEFAULT 0
)

-- User's saved/bookmarked places
saved_places (
  id UUID PK, user_id UUID → users,
  name TEXT, address TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  place_id TEXT,  -- Google Place ID for re-fetching details
  created_at TIMESTAMPTZ
)

-- Offline route metadata (tiles in OPFS, not DB)
offline_routes (
  id UUID PK, user_id UUID → users,
  name TEXT, origin TEXT, destination TEXT,
  route_polyline TEXT,  -- encoded polyline
  download_size_bytes INTEGER,
  zoom_max INTEGER,  -- 13 (basic) | 15 (standard) | 17 (enhanced)
  downloaded_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
  opfs_key TEXT  -- key under which MBTiles is stored in OPFS
)
```

### Realtime Broadcast Payload (not persisted)

```typescript
interface LocationBroadcast {
  u: string;   // userId
  la: number;  // latitude
  lo: number;  // longitude
  s: number;   // speed km/h
  h: number;   // heading degrees 0–360
  t: number;   // client timestamp ms
}
```

---

## 11. API & Integration Dependencies

| Service | Usage | Billing Model | Cost Trigger |
|---|---|---|---|
| Google Maps JavaScript API | Map rendering | Per map load | Page load with map |
| Google Places Autocomplete | Search | Per session | Completed search (with session token) |
| Google Directions API | Routing | Per request | Route calculation |
| Google Geocoding API | Address lookup | Per request | Coordinate → address |
| Google Places Nearby Search | Fuel/rest stops | Per request | Nearby POI fetch |
| Mapbox Tiles API | MVT tiles for offline | Per tile request | Offline corridor download |
| OSRM API (public) | Route graph generation | Free (fair use) | Offline route download |
| Google Cloud TTS | Voice clip generation | Per character | Offline route download |
| Supabase Realtime | Group ride broadcast | Included in plan | Connection count |
| Cloudflare R2 | Offline package storage | Per GB stored + egress | Offline package download |

**Critical:** OSRM public API has fair-use limits. For >100 offline downloads/day, self-host OSRM on a small VPS (I believe approximately $5–20/month on DigitalOcean — verify current pricing). Plan this before launch.

---

## 12. Security & Privacy

### Authentication & Authorization

- All map API proxy endpoints require valid Supabase JWT.
- Ride group membership enforced via Postgres RLS:
  - A member can only read `ride_sessions` rows for groups they belong to.
  - Only the group leader can update `ride_groups.status`.
- Invite codes are single-namespace (no user enumeration possible from code alone).

### Location Privacy

- Real-time location is broadcast-only (ephemeral) — does not persist in Postgres during riding unless user opts in to snapshots.
- Snapshot opt-out available in Privacy Settings.
- Location precision in broadcast rounded to 4 decimal places (~11m resolution).
- Full precision stored only in `location_snapshots` (if opted in) and only readable by the owning user.
- Group location data automatically purged 90 days after session ends (pg_cron scheduled job).

### Offline Data

- MBTiles stored in OPFS — not accessible to other origins (browser sandbox).
- Route graphs contain no personal data.
- Pre-signed R2 download URLs expire in 1 hour.

### Invite Security

- Invite codes expire (default 24h).
- Rate limiting: max 5 join attempts per IP per hour (Supabase Edge Function middleware).
- Leader can invalidate code at any time.

---

## 13. Cost Model & Optimization

### Google Maps Platform Cost Controls

The Google Maps Platform is the primary cost risk. The following are product requirements, not suggestions:

1. **Session tokens** on all Autocomplete requests — mandatory.
2. **Tile caching** via Cloudflare CDN — vector tiles cached for 1 week.
3. **API response caching** in `map_cache` table — Directions (30 min), Geocoding (7 days), Nearby (1 hour).
4. **Lazy load** Maps JS SDK — only load on routes that render a map.
5. **Budget alert** at ₹5,000/month in Google Cloud Console — hard requirement before launch.
6. **Map load optimization** — use `libraries={['places']}` only, defer Geometry library until needed.

### Offline Package Cost

- Mapbox Tiles API charges per tile request during corridor packaging. For a standard 100km route (zoom 8–15), I believe this is approximately 800–2,000 tile requests — verify against Mapbox pricing for your plan tier.
- Voice clip generation via Google Cloud TTS: I believe approximately ₹0.10–₹0.50 per route download — verify at the Google Cloud TTS pricing page.
- R2 egress cost: free for first 10GB/month on Cloudflare Workers plan.

### Cost by User Scale (MVP Phase)

The following is based on verified current pricing (as of 2026-05-17). All Google Maps figures assume the $200/month free credit is active. Verify all figures against provider pricing before committing to a budget.

| User Scale | Google Maps | Mapbox | TTS | Supabase | R2 | **Total/month** | **Per user (INR ~₹83/$)** |
|---|---|---|---|---|---|---|---|
| < 50 (testing) | $0 (credit) | $0 (free tier) | $0 (free tier) | $0 (free tier) | $0 (free tier) | **$0** | **₹0** |
| 50–100 | $0 (credit) | $0 (free tier) | $0 (free tier) | $0 (free tier) | $0 (free tier) | **$0** | **₹0** |
| ~1,000 | $0 (credit) | ~$62.50 | $0 | $0 (free tier) | $0 | **~$62.50** | **~₹5.20/user** |
| ~5,000 | ~$162 | ~$512.50 | $0 | $0–$25* | ~$0.50 | **~$675** | **~₹11.20/user** |
| ~10,000 | ₹5,000–₹8,000 | ₹1,000–₹2,000 | ₹200–₹500 | ₹1,500–₹3,000 | ₹500–₹1,000 | **~₹8,200–₹14,500** | **~₹0.82–₹1.45/user** |

*At 5,000 users Supabase free tier may be sufficient (200 concurrent connections, 2M messages/month) — depends on peak simultaneous group rides. Upgrade to Pro ($25/month) if limits are approached.

**Critical thresholds:**
- **~300–400 users** — Mapbox exits free tier if offline adoption ≥ 30%. Delay by restricting offline to beta users initially.
- **~2,800 users** — Google Maps $200 free credit exhausted at this usage pattern.
- **~450 MB DB size** — Upgrade Supabase to Pro before hitting 500 MB free tier limit. Check Supabase dashboard → Settings → Usage regularly.

### Estimated Monthly Cost at 10k MAU (indicative, not guaranteed)

| Item | Optimized Cost |
|---|---|
| Google Maps loads + APIs | ₹5,000–₹8,000/month |
| Mapbox offline packaging | ₹1,000–₹2,000/month |
| R2 storage + egress | ₹500–₹1,000/month |
| Google Cloud TTS | ₹200–₹500/month |
| Supabase (Realtime + DB) | ₹1,500–₹3,000/month |
| OSRM VPS (self-hosted) | ₹830–₹1,660/month (~$10–20) |
| **Total** | **~₹9,000–₹16,000/month** |

*These are rough estimates. Verify all figures against current provider pricing before committing to a budget.*

---

## 14. Monetisation Strategy

### Overview

Maps, group rides, and offline navigation are premium capabilities that justify a subscription model. The goal is to keep the core app (garage management, documents, expense tracking) free forever, and gate the high-infrastructure-cost features behind a paid tier. This recovers API costs at scale without alienating users who only want the garage tool.

### Subscription Tiers

| Tier | Price | Target | Included Features |
|---|---|---|---|
| **Free** | ₹0 / $0 | All users | Garage management, documents, expenses, trip logging, community, basic maps (view-only, no navigation) |
| **Rider Pro (India)** | **₹150/year** (launch) → **₹499/year** (post-traction) | Indian enthusiasts | Full maps + navigation, group rides live tracking, offline route downloads (up to 3 routes), voice guidance |
| **Rider Pro (International)** | **$100/year** | International users | Same as Rider Pro India |

**India pricing rationale:**
- ₹150/year (~₹12.50/month effective) is the launch "early adopter" price — an easy impulse buy that rewards the first wave of users and builds goodwill.
- ₹499/year (~₹41.60/month effective) is the post-traction price, introduced once the product has demonstrated value and a stable user base.
- Communicate the price increase in advance; grandfather existing subscribers at ₹150/year for their first renewal.
- Monthly billing is intentionally not offered for India — annual-only simplifies billing, improves cashflow, and reduces churn.

*International pricing at $100/year is competitive globally and does not change between launch and post-traction phases.*

### What Stays Free

The following must always remain free to maintain the app's core value and avoid alienating the non-enthusiast user base:
- Vehicle garage (add, edit, delete vehicles)
- Document management (RC, insurance, PUC, DL)
- Expense and fuel tracking
- Trip logging (manual, post-ride)
- Community posts and clubs
- Basic map view (read-only, no navigation, no group rides)

### Payment Infrastructure — Stripe

**Stripe is the recommended payment provider.** Key verified facts (as of 2026-05-17):

- **No monthly platform fee, no setup fee.** You pay only when you process a payment.
- **Indian domestic cards (Visa/Mastercard):** 2% per transaction
- **International cards:** 3% per transaction
- **INR billing:** Fully supported (135+ currencies)
- **Recurring subscriptions:** Same per-transaction rates — no extra fee for recurring billing
- **Disputes:** ₹1,000 per dispute (refunded if you win)

**On a ₹150/year subscription (India launch):**
- Stripe takes: ₹3 (2%)
- You receive: ₹147

**On a ₹499/year subscription (India post-traction):**
- Stripe takes: ₹10 (2%)
- You receive: ₹489

**On a $100/year subscription (international):**
- Stripe takes: $3 (3%)
- You receive: $97

Stripe has no free tier in the traditional sense — but because it charges per transaction only, you pay **nothing until your first paying subscriber**. There is no cost to integrate Stripe, set up products/prices, or run test mode transactions.

### Implementation Plan

Stripe integration is **not in Phase 1 MVP scope.** Build and validate the features first; add paywall after product-market fit is established. Suggested sequencing:

| Phase | Monetisation milestone |
|---|---|
| Phase 1 MVP | All features free; no paywall; focus on adoption |
| Post Phase 1 (first 100 active users) | Integrate Stripe; introduce Rider Pro tier; grandfather early users with 3-month free Rider Pro as reward |
| Phase 2+ | Enforce paywall on group rides and offline navigation; monitor conversion rate |

### Break-Even Analysis (indicative)

Infra cost at 10k MAU: ~₹14,000/month → ~**₹1,68,000/year**

**Launch price — ₹150/year (you keep ₹147 after Stripe's 2%)**

| Conversion | Paying users | Annual revenue | vs Annual infra |
|---|---|---|---|
| 1% | 100 | ₹14,700 | Below cost |
| 5% | 500 | ₹73,500 | Below cost |
| 10% | 1,000 | ₹1,47,000 | ~Break-even |
| 15% | 1,500 | ₹2,20,500 | Profitable |

At ₹150/year, ~10–15% conversion is needed to break even. Acceptable at launch given the low ask — but this price is not meant to be sustainable long-term.

**Post-traction price — ₹499/year (you keep ₹489 after Stripe's 2%)**

| Conversion | Paying users | Annual revenue | vs Annual infra |
|---|---|---|---|
| 1% | 100 | ₹48,900 | Below cost |
| 3% | 300 | ₹1,46,700 | ~Break-even |
| 5% | 500 | ₹2,44,500 | **1.45x covered** |
| 10% | 1,000 | ₹4,89,000 | **2.9x covered** |

At ₹499/year, only ~3.5% conversion is needed to break even — a much more comfortable margin. At a realistic 5–10% conversion for a daily-use riding feature, the product is solidly profitable.

*All figures are illustrative. Actual conversion rates depend on product quality and feature gating decisions.*

---

## 15. Implementation Phases

### Phase 1 — MVP (Weeks 1–16)

**Goal:** Functional map, group ride sharing, and basic offline nav — usable in production.

> **⚠️ Timeline Realism Note**
> The original spec estimated 10 weeks for Phase 1. The offline navigation block (originally Weeks 9–10) is a separate mini-project involving: custom Service Worker tile intercept (fighting `next-pwa`'s Workbox config), OPFS storage, a net-new Supabase Edge Function, OSRM integration, Google Cloud TTS setup, Mapbox tile API, MBTiles packaging, and client-side Dijkstra re-routing. This is 4–6 weeks of work for a solo developer, not 2. Phase 1 has been revised to 16 weeks accordingly.
>
> Additionally: **prove Supabase Realtime Broadcast works with a proof-of-concept in Week 1** before building the group ride UI. Discovering an architectural issue at Week 5 would be costly. Similarly, **scaffold the Supabase Edge Function skeleton in Week 1–2** — it is the riskiest technical component and should be de-risked early.

| Week | Deliverables |
|------|-------------|
| 1–2 | Map embed, place search, autocomplete (session tokens), current location, single-route directions, ETA display. **Also: Supabase Realtime Broadcast proof-of-concept + Edge Function skeleton** |
| 3–4 | Traffic layer, map type toggle, dark mode style, nearby POIs (with cache verified end-to-end before deploy), marker clustering |
| 5–6 | Group ride: create/join, invite code + share link, Supabase Realtime Broadcast, member markers |
| 7–8 | Group ride: distance/bearing/ETA per member, presence indicators, group panel, session lifecycle |
| 9–10 | Offline: Google Cloud TTS setup, OSRM integration, Mapbox tile API account + billing confirmed, corridor download Edge Function |
| 11–12 | Offline: MBTiles packaging pipeline, OPFS tile storage, R2 pre-signed delivery |
| 13–14 | Offline: Service Worker tile intercept (Workbox custom inject), client-side route graph + Dijkstra re-routing |
| 15–16 | Offline: voice MP3 clips playback, offline navigation UI end-to-end, iOS device testing, storage quota handling |

### Phase 2 — Production Hardening (Weeks 17–26)

| Week | Deliverables |
|------|-------------|
| 11–12 | Adaptive location frequency, dead reckoning, dead-zone publish filter |
| 13–14 | Map tile proxy + R2 caching, PostGIS distance/bearing, RLS audit |
| 15–16 | Mapbox GL JS render layer + custom motorcycle theme, multi-stop routes |
| 17–18 | Reconnect sync manager, offline expiry notifications, automatic trip log on session end, offline route management screen |

### Phase 3 — Scale (Event-Driven, Not Time-Boxed)

Phase 3 is triggered by adoption metrics, not a calendar. Do not schedule it as sprint work.

| Trigger | Action |
|---|---|
| Offline downloads exceed ~100/day | Self-host OSRM (DigitalOcean/Hetzner ~$10–20/month VPS) |
| Concurrent ride groups exceed 400 | Begin MQTT migration evaluation (EMQX Cloud) |
| MAU exceeds ~3,000 | Google Maps free credit exhausted; review cost model |
| Mapbox offline adoption exceeds 50% | Re-evaluate Mapbox plan tier vs self-hosted tile server |
| Decision to ship React Native | Port hook logic; evaluate Expo + shared Zustand stores |

Deliverables when triggered: OSRM self-hosting, MQTT migration (EMQX Cloud) for >500 concurrent groups, React Native / Expo port, enhanced offline (zoom 8–17), route sharing to community feed.

---

## 16. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Nearby Search API cache bypass** | High | High | Cache is a hard requirement with integration test coverage before deploy; budget alert at ₹2,000 warn / ₹5,000 hard cutoff; feature behind flag until cache confirmed |
| Google Maps API bill spike (general) | Medium | High | All caching requirements from Section 7.1.7 are non-negotiable product requirements |
| iOS Safari OPFS gaps (< iOS 15.2) | Medium | High | Feature-detect OPFS before offering download; explicit "update your iOS" message; no silent failure |
| Web Speech API stops on iOS screen lock | High | Medium | Pre-generated MP3 clips are primary voice method; Web Speech API is supplemental online-only |
| **Supabase Realtime on free tier insufficient for group rides** | Medium | High | See Section 17 Open Question #9 — group ride feature held until confirmed; see Section 8 NFR note |
| **OSRM public API — no SLA, no guaranteed uptime** | Medium | Medium | OSRM public API is fair-use with no uptime commitment. A failure at download time means the user's offline route download fails. Self-host on a small VPS (~$10–20/month on DigitalOcean or Hetzner) from day one of offline feature launch — do not launch offline navigation relying on the public API. Budget this into infrastructure costs from Phase 1. |
| **Supabase free tier database size (500 MB)** | Medium | Medium | `location_snapshots` opt-out must be default (not opt-in) to limit write volume. On ride/session end, purge ephemeral data immediately: delete all `location_snapshots` for that session older than 24 hours, archive only the session summary. Monitor DB size in Supabase dashboard weekly; upgrade to Pro ($25/month) before hitting 450 MB. |
| **Mapbox offline adoption variance** | Medium | Medium | 30% adoption assumed in cost model. If real adoption exceeds 50%, Mapbox costs double. Monitor weekly in Mapbox dashboard for the first month post-launch. If adoption is higher than expected, evaluate self-hosted tile server before costs scale. |
| Supabase Realtime hitting plan limits at scale | Medium | High | Monitor connection count; MQTT migration path designed and documented |
| Route graph stale after 30 days | Low | Medium | 30-day TTL enforced; expiry notification + prominent UI warning |
| Users exceed browser storage quota | Medium | Medium | Storage check pre-download; Basic (zoom 8–13) fallback option |
| Battery drain complaints | Medium | Medium | Adaptive frequency + dead-zone filter mandatory; test on Snapdragon 665-class device before launch |
| Location data privacy concerns | Low | High | Broadcast-only (ephemeral) + opt-in snapshots + 90-day auto-purge + RLS |
| **Offline navigation scope underestimate** | High | Medium | Phase 1 revised to 16 weeks to account for the actual complexity of OPFS + Service Worker + OSRM + TTS + Edge Function pipeline. Do not compress this back to 2 weeks. |

---

## 17. Open Questions

| # | Question | Owner | Priority |
|---|---------|-------|---------|
| 1 | What Mapbox plan tier do we need for offline tile packaging at scale? Verify tile request costs per corridor download. | Aneesh | High — before Phase 1 launch |
| 2 | Does Supabase Pro plan support PostGIS? Confirm extension availability on current plan. | Aneesh | High — before Phase 1 |
| 3 | Should offline route download be limited to registered users only, or available to guests? | Product | Medium |
| 4 | What is the group ride size limit? 20 is spec'd but has not been load-tested against Supabase Realtime broadcast limits. | Aneesh | Medium |
| 5 | `location_snapshots` opt-out must be the **default** — snapshots off unless user explicitly enables. Privacy-first. This also directly controls DB size on the free tier. | Product | **Resolved: opt-out is default** |
| 6 | Valhalla vs OSRM for Phase 3 motorcycle-optimised routing — which supports Indian road classification better? | Aneesh (research) | Low — Phase 3 |
| 7 | At what MAU does MQTT migration become cost-effective vs Supabase Realtime plan upgrade? | Aneesh | Low — monitor at 500 groups |
| 8 | Should ended ride group route data be auto-attached to a Trip Log entry? (Recommended: yes, with user confirmation.) | Product | Medium |
| 9 | **Does Supabase free tier support Realtime Broadcast adequately for group rides?** The free tier includes 200 concurrent connections and 2,000,000 messages/month. The pricing page does not specify per-channel limits, broadcast message size limits (separately from the 256 KB max message size), or presence slot limits — these must be verified against Supabase's technical documentation and tested with a proof-of-concept before building the group ride UI. **If the free tier is insufficient, the Group Rides Live Tracking feature (Section 7.2) will be held until the project has users and funding to justify the Pro plan upgrade ($25/month).** Do not implement group rides assuming free tier works without proof. | Aneesh | **High — before Week 5** |

---

## 18. Out of Scope

The following are explicitly excluded and must not be implemented without a new PRD:

| Feature | Reason |
|---------|--------|
| Google Street View | Only available via Google Maps embed; not replicable in custom renderer; not valuable for motorcycle riding use case |
| Indoor maps | Google-only capability; no motorcycle relevance |
| Waze-style incident reporting | Requires Waze API license; separate initiative if pursued |
| Live traffic incident push alerts | Requires Google Maps Fleet product tier; prohibitively expensive |
| P2P WebRTC voice/video in group ride | Battery/complexity cost unjustified; WhatsApp serves this need |
| Map-based community post discovery | Scope belongs to community feature (Epic 09 / future epic); not maps |
| Insurance / vehicle document integration via maps (e.g., "find nearest service centre") | Separate feature set; belongs to a future service-centre epic |
| Motorcycle-specific turn restrictions | Requires custom routing data; Phase 3+ via Valhalla integration |

---

*Document prepared by Aneesh Krishna · MotoYaar · 2026-05-17*
*Last updated: 2026-05-17 — v1.1: Added monetisation strategy, cost model by user scale, revised Phase 1 timeline to 16 weeks, documented Nearby Search cache risk, iOS platform limitations, OSRM SLA risk, Supabase DB size risk, Mapbox adoption variance, Supabase Realtime free tier open question, and CLAUDE.md conflict notice.*
*Architecture reference: Maps, Live Tracking & Offline Navigation Design Session (2026-05-17)*
