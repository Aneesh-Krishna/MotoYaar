# MotoYaar — Live Trip Tracking PRD (Post-MVP)

**Version:** 1.1
**Status:** Draft
**Date:** 2026-05-03
**Author:** Mary (Analyst Agent) · MotoYaar
**Sources:** [Brainstorming Session Results](brainstorming-session-results.md) · [PRD v1.0](prd.md) · [Architecture](architecture.md)

**Changelog v1.1:** Replaced Leaflet + OpenStreetMap with Mappls (MapMyIndia) SDK as the map platform. Added multi-stop route planning, turn-by-turn voice navigation, POI/place search, and India-specific hazard overlays to Phase 1 scope.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Phasing](#4-phasing)
5. [User Personas & JTBD](#5-user-personas--jtbd)
6. [Scope — Phase 1](#6-scope--phase-1)
7. [Feature Requirements](#7-feature-requirements)
   - 7.1 Live Trip Mode (Start / Stop)
   - 7.2 GPS Route Recording
   - 7.3 Map Visualization
   - 7.4 Offline Mode (Pre-download Map & Route)
   - 7.5 Route Planning & Navigation
   - 7.6 Multi-user Live Session
   - 7.7 Session Management
8. [Data Model](#8-data-model)
9. [Technical Architecture](#9-technical-architecture)
10. [Key Data Flow Rules](#10-key-data-flow-rules)
11. [Edge Cases & Resolutions](#11-edge-cases--resolutions)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [New Dependencies](#13-new-dependencies)
14. [Out of Scope — Phase 2 (In-trip Chat)](#14-out-of-scope--phase-2-in-trip-chat)
15. [Open Questions](#15-open-questions)

---

## 1. Executive Summary

This document defines the requirements for Live Trip Tracking — a post-MVP expansion to MotoYaar's existing static trip logging feature. The MVP records trips after-the-fact (title, dates, route text, expense breakdown). Live Trip Tracking upgrades this to real-time GPS recording with route visualization on a map, offline-capable operation for areas with poor connectivity, and a group live-location sharing mode that lets multiple riders or drivers see each other's position on a shared map in real time.

This work is split into two sequential phases:

| Phase | Scope |
|-------|-------|
| **Phase 1 (this PRD)** | Live GPS tracking · Offline map + route download · Multi-user live location sharing |
| **Phase 2 (future PRD)** | In-trip text/voice chat room for live session participants |

---

## 2. Problem Statement

The MVP trip feature is retrospective — users log a trip *after* it happens. This misses two high-value use cases for vehicle enthusiasts:

1. **"I want to record exactly where I went"** — Riders and road-trippers want an automatic GPS trace of their route, not a manual text description. Post-trip, this becomes a shareable, visually rich record of the journey.

2. **"I'm on a group ride — where is everyone?"** — Group rides are a core part of the motorcycle enthusiast experience. Riders spread out, take wrong turns, or fall behind. There is no lightweight, vehicle-contextual tool for real-time group location on a ride. WhatsApp location sharing is ad-hoc, not trip-aware, and not integrated with vehicle or expense data.

India-specific dimension: Many popular riding routes (Ladakh, Northeast, Himachal) have poor or no mobile connectivity. A tracking tool that breaks offline is useless for exactly the trips enthusiasts care about most.

---

## 3. Goals & Success Metrics

### Goals

- Enable real-time GPS route recording during a trip, with the recorded route saved as a visual artifact
- Support full offline operation: map tiles and route data pre-downloadable so the trip can be tracked without any internet connection
- Enable group live-location sharing for multi-user trip sessions, visible on a shared map in real time
- Keep battery and data impact low enough to be practical on a full-day ride

### Success Metrics

| Metric | Target |
|--------|--------|
| Live trips started per active user per month | ≥ 1 |
| Trips with a recorded GPS route (vs. text-only) | ≥ 40% of new trips within 3 months of launch |
| Multi-user sessions created | ≥ 20% of live trips |
| Offline mode activations | Tracked; baseline TBD |
| Battery drain during 4-hour live trip | < 15% additional drain vs. background |
| Crash / data loss rate during live trip | < 1% |

---

## 4. Phasing

### Phase 1 — Covered by This PRD

- Start and stop a live trip with real-time GPS tracking
- Route recorded as a sequence of waypoints; saved at trip end
- Map view (Mappls SDK) showing current position, traced route, and India-specific hazard overlays
- Multi-stop route planning: search for places/POIs, add multiple stops in order, reorder or remove stops before departing
- Turn-by-turn voice navigation via Mappls Navigation SDK during a live trip
- Offline mode: pre-download map tiles and planned route; GPS + local buffering when internet unavailable; auto-sync waypoints on reconnection
- Multi-user live session: invite other MotoYaar users; all participants see each other's live location on a shared map; host ends session to clear all

### Phase 2 — Out of Scope (Future PRD)

- In-trip text/voice chat room for live session participants
- Operates online only
- Does not begin until Phase 1 is fully shipped and stable

---

## 5. User Personas & JTBD

These extend the personas defined in the main PRD.

| Persona | Situation | Job to Be Done | Outcome |
|---------|-----------|----------------|---------|
| **The Solo Rider** | Setting off on a long solo highway run | Start tracking so the route is recorded automatically | A rich, accurate visual record of the ride with speed and distance, requiring zero manual input |
| **The Group Ride Organizer** | Leading a 10-bike mountain ride | Create a live session so every rider sees the group on a map | No rider gets lost; everyone can see who's ahead and who's fallen behind without spamming the WhatsApp group |
| **The Participant Rider** | Joining a group ride organized by someone else | Join a live session via a link | See all other riders' positions in real time; feel connected to the group even when riding at different speeds |
| **The Off-Grid Adventurer** | Heading into Spiti Valley with no cell coverage | Pre-download the map and planned route the night before | GPS tracking continues even in a dead zone; route is saved locally and synced to the server when signal returns |

---

## 6. Scope — Phase 1

### In Scope

- Live trip mode: start, pause (browser close / app backgrounded), resume, stop
- GPS waypoint recording via browser Geolocation API
- Map display using Mappls SDK (MapMyIndia) — India-accurate tiles with POI data and hazard overlays
- Multi-stop route planning: search destinations/POIs, add multiple stops, reorder or remove, preview full route before departing
- Turn-by-turn voice navigation active during live trip (Mappls Navigation SDK)
- India-specific hazard overlays: potholes, speed breakers, sharp curves, accident-prone zones
- Offline map tile pre-download for a user-defined area or planned route corridor
- Offline GPS recording with local IndexedDB buffering; sync on reconnection
- Multi-user live session: create session → share invite link → participants join → real-time location visible to all using Supabase Realtime Broadcast
- Session participant list visible during live session
- Host can end session; any participant can leave
- Completed live trip route visible in trip detail page as a map with polyline trace
- Post-trip stats: total distance, duration, average speed, elevation chart (derived from recorded waypoints)

### Not in Scope (Phase 1)

- In-trip chat (Phase 2)
- Live trip sharing with non-MotoYaar users (Phase 1 requires a MotoYaar account to join)
- Exporting GPX / KML files (post-Phase 1 enhancement)
- Motorcycle-specific route preference (twisty roads / scenic routing) — post-Phase 1 enhancement

---

## 7. Feature Requirements

### 7.1 Live Trip Mode (Start / Stop)

**Entry Points:**
- "Start Live Trip" button on the Trips list page (FAB or top CTA)
- "Start Live Trip" option in the kebab menu on an existing trip's detail page (converts a pre-created trip into a live trip)

**Start Flow:**
1. User taps "Start Live Trip"
2. System requests Geolocation permission if not already granted
   - If denied → show message: "Location permission is required to track your trip. Please enable it in your browser settings." — do not start
3. User selects or creates a trip to attach the live session to
   - Option A: Pick an existing trip from their list
   - Option B: Create a new trip inline (title + vehicle only; rest filled in later)
4. **Route Planning screen** (see Section 7.5 for full detail):
   - User searches for a destination (POI / place name / address via Mappls Places API)
   - User optionally adds multiple stops in between
   - Mappls renders the full multi-stop route on the map with ETA and total distance
   - User can skip this step ("Skip — just track my GPS") and depart without a pre-planned route
5. System checks for offline map download for this trip's area; if none exists, show a banner: "No offline map downloaded. Live tracking will require an internet connection. [Download now]"
6. Live tracking starts + navigation begins → user is taken to the live map view with turn-by-turn active

**Active Live Trip:**
- Full-screen map view (Mappls) showing current position (animated pulsing marker)
- **Navigation banner at top:** next turn instruction + distance (e.g., "In 300m, turn left onto NH3") — voice announcement plays automatically
- Route trace drawn in real time as a polyline in brand colour
- Pre-planned route shown as a faded overlay; deviation from planned route shows a "Re-routing…" indicator
- Hazard overlays visible on map (potholes, speed breakers, sharp curves, accident zones)
- Stats bar at bottom: distance covered, time elapsed, current speed
- Stop list (collapsible): shows upcoming stops with distance to each
- "Stop Trip" button (prominent, requires confirmation tap to prevent accidental stop)
- "Share Session" button → opens multi-user session flow (Section 7.6)

**Stop Flow:**
1. User taps "Stop Trip" → confirmation modal: "End live trip? Your route will be saved."
2. On confirm → recording stops; waypoints flushed from IndexedDB to server; route saved to `trip_routes`
3. User returned to trip detail page with route map visible

**Pause Behaviour (Browser Close / Background):**
- On PWA, when the app is backgrounded or the tab is closed, recording suspends
- On resume (user reopens the tab/app within the same session), live trip can be resumed
- Session persists in IndexedDB with status `paused`; resumed automatically on app open if within 24 hours

---

### 7.2 GPS Route Recording

**Mechanism:** `navigator.geolocation.watchPosition()` — continuous stream of position updates.

**Waypoint Schema (stored per point):**
```
{
  lat: number,       // degrees
  lng: number,       // degrees
  timestamp: number, // Unix ms
  accuracy: number,  // metres
  speed: number | null,  // m/s, null if unavailable
  altitude: number | null
}
```

**Recording Interval:** New waypoint recorded only when distance from last point exceeds 10 metres OR 10 seconds have elapsed — whichever comes first. This prevents GPS jitter from generating noise while stationary.

**Local Buffer:** All waypoints written to IndexedDB in real time. On "Stop Trip" or on reconnection after offline period, buffer is flushed to `trip_routes.waypoints` via `PATCH /api/trips/[id]/route`.

**Battery Optimisation:**
- Default: `enableHighAccuracy: false` — uses network/wifi-assisted GPS, lower battery drain
- High accuracy mode: user-toggled in live trip settings — enables `enableHighAccuracy: true`; display a battery drain warning when toggled on

**Route Limits:** Maximum 10,000 waypoints per trip (≈ 27 hours at one point per 10 seconds). If this limit is approached, recording interval automatically doubles. A warning is shown if the trip approaches 80% of the limit.

---

### 7.3 Map Visualization

**Platform:** Mappls SDK (MapMyIndia). India's most accurate map data, built in partnership with ISRO. Covers remote riding routes (Ladakh, Spiti, Northeast India) at zoom levels where OSM data is sparse. No alternative fallback — Mappls is the sole map provider.

**Live Trip Map View:**
- Current position: animated pulsing marker with accuracy circle
- Planned route (if set): faded overlay polyline showing the full multi-stop route
- Recorded trace: brand-colour polyline drawn incrementally as GPS waypoints arrive; overlaid on top of the planned route
- Navigation banner (top of screen): next instruction card with street name, manoeuvre icon, and distance countdown
- **Hazard overlays** (always visible, cannot be disabled): potholes, speed breakers, sharp curves, accident-prone zones — sourced natively from Mappls data layer
- "Re-routing…" indicator shown when user deviates > 50m from the planned route; Mappls re-calculates and updates the route silently
- Stop chips (bottom strip): next stop name + distance; tapping reveals all stops in order
- "Centre on me" button (top-right): re-centres map on current position; auto-disables on manual pan
- Map controls: zoom in/out, full-screen toggle, map style toggle (standard / satellite)

**Post-trip Route View (Trip Detail Page):**
- New "Route" tab on the vehicle trip detail page (alongside existing Overview, Documents, Expenses, Trips tabs)
- Displays the saved GPS trace as a static polyline on a Mappls map
- Start and end markers pinned; intermediate stops (if any) shown as waypoint markers
- Stats panel: total distance (km), trip duration, average speed, top speed
- Elevation chart: derived from waypoint `altitude` data; shown if altitude available for > 50% of waypoints
- If no live route recorded, tab shows: "Start a live trip to record your route automatically."

**Trips List:**
- Trip cards gain a small Mappls static map thumbnail if a route exists (generated via Mappls Static Maps API using route bounding box)

---

### 7.4 Offline Mode (Pre-download Map & Route)

**Why this matters:** Popular Indian riding destinations (Ladakh, Spiti, Northeast India) routinely have no mobile signal. The value of live tracking is highest on exactly these trips. Without offline support, the feature is useless for this audience.

**Pre-Download Flow:**
1. User opens a trip detail page (or the live trip start screen)
2. Taps "Download map for offline use"
3. System shows a map with the user's planned route corridor highlighted (if `route_text` / `maps_link` exists, the area is auto-centred; otherwise user pans to their destination)
4. User draws a bounding box or selects a radius around a location to define the download area
5. System calculates tile count and estimated download size (shown to user before proceeding)
   - Warning shown if > 50MB: "This is a large download. Ensure you're on Wi-Fi."
6. Tiles downloaded and cached in the Service Worker cache (CacheStorage API)
7. Download progress bar shown; download can be cancelled
8. On completion: "Map ready for offline use" — visible in trip detail under a new "Offline Maps" section

**Offline Tile Serving:**
- Service Worker intercepts Mappls tile domain requests
- Serves cached tile if available; falls back to network if not cached; shows grey tile placeholder if both fail
- Stale tile check: cached tiles expire after 30 days; user can manually refresh

**Pre-Saving the Route for Offline Navigation:**

This is the critical step that makes offline navigation possible. When the user taps "Start Trip" after planning a route (Section 7.5), and before going offline, the system must persist the route locally:

1. The Mappls Routing API response — full route geometry (polyline coordinates) + turn-by-turn instruction list — is saved to IndexedDB under key `offline_route:[trip_id]`
2. Each instruction record contains: manoeuvre type, street name, distance to next, bearing, and the lat/lng trigger point at which to announce it
3. This happens automatically at trip start while the device is online; no user action required
4. If the user planned multiple stops, each leg's instructions are saved individually so the Navigation SDK can announce each stop arrival

This saved data is what enables voice navigation to continue functioning with no internet connection — the Navigation SDK reads from IndexedDB instead of calling the Mappls API.

**Offline GPS Recording:**
- Browser Geolocation API functions without internet connection
- Waypoints written to IndexedDB as normal; `online` event listener triggers flush to server on reconnection
- Map remains usable with cached tiles; current position and route trace continue rendering
- The pre-saved route polyline continues to display as a faded overlay

**Offline Navigation Behaviour:**
- Turn-by-turn voice guidance continues using the pre-saved instruction list from IndexedDB
- The Navigation SDK matches the device's GPS position against the saved route geometry locally — no network call required
- **Re-routing is disabled offline.** If the user deviates > 50m from the planned route, the navigation banner shows: "Off route — re-routing unavailable offline. Return to your planned route to resume guidance." Voice announcements pause until the user returns within 50m of the planned route.
- GPS recording continues uninterrupted during a deviation — the trace is still captured accurately regardless of route adherence

**No Pre-Planned Route + Offline:**
- If the user skipped route planning ("Skip — just track GPS") and then goes offline, there is no navigation guidance — only GPS recording and the cached map tiles
- The live map view shows current position + recorded trace on cached tiles, with no navigation banner
- This is documented behaviour, not a bug. A prompt is shown at trip start if the user skips planning: "Without a planned route, navigation won't be available offline."

**Offline Indicator:**
- Banner at top of live map view: "You're offline. Route is being saved locally and will sync when connected."
- If re-routing was attempted and failed: "Off route — re-routing unavailable offline."

**Sync on Reconnection:**
- `online` event → flush pending IndexedDB waypoints to `PATCH /api/trips/[id]/route`
- Re-routing resumes automatically once internet is restored; if user is off-route at reconnection, Mappls recalculates immediately
- Conflict resolution: server merges waypoints by timestamp; deduplicates by proximity (< 5m, < 1s = same point)
- Toast: "Route synced — X waypoints uploaded."
- Offline route cache (`offline_route:[trip_id]`) is cleared from IndexedDB after successful trip end

**Multi-user note:** Offline participants cannot share or receive location with other session members. Their dot on the group map shows "Last seen [time]" until they reconnect.

---

### 7.5 Route Planning & Navigation

**Concept:** Before starting a live trip, the user plans their route by searching for a destination and optionally adding multiple intermediate stops. The Mappls Routing API calculates the optimal road route across all stops. During the live trip, the Mappls Navigation SDK provides active turn-by-turn voice guidance along the planned route.

---

**Route Planning Screen (pre-trip):**

1. **Origin** — auto-populated with current GPS location ("My Location"). Can be changed manually.
2. **Stop list** — starts with one destination field. User can:
   - Search for a place/POI/address using the Mappls Places API (autocomplete suggestions appear as user types)
   - Add another stop via "+ Add stop" button — a new field appears below
   - Reorder stops by drag-and-drop
   - Remove a stop via swipe or × button
   - Maximum 8 stops (origin + 7 intermediates + final destination) — matching Google Maps behaviour
3. **Route preview** — after at least one destination is set, Mappls calculates and renders the full route on the map. Shows:
   - Total distance (km)
   - Estimated total duration
   - Per-leg breakdown (Stop 1 → Stop 2: 45 km, 1h 10m)
4. **Route options** (shown when route is previewed):
   - Fastest route (default)
   - Avoid tolls toggle
   - Avoid highways toggle
5. **"Start Trip"** button — confirms route and starts GPS recording + navigation
6. **"Skip — just track GPS"** link — bypasses route planning; live trip starts immediately with no planned route

---

**Turn-by-Turn Navigation (during live trip):**

- Powered by Mappls Navigation SDK
- Voice announcements: distance to next turn, then manoeuvre instruction (e.g., "In 300 metres, turn left onto NH44")
- Announcement timing: 300m warning + 50m warning + at-manoeuvre confirmation
- Navigation banner at top of map: next instruction, street name, manoeuvre icon, distance countdown
- On approaching a stop: "Arriving at Stop 2 — [Stop Name]" announcement; stop chip on bottom strip advances to next
- On trip completion: "You have arrived at your destination" announcement
- **Re-routing:** If user deviates > 50m from planned route, Mappls recalculates silently within 5 seconds; a subtle "Re-routing…" card replaces the instruction banner during recalculation
- **Mute toggle:** user can mute/unmute voice guidance without stopping navigation; default is on
- Navigation continues to function when the screen is locked or the browser is backgrounded (audio plays via Web Audio API)

---

**Skipped Route Planning:**
- If the user skips route planning, no navigation guidance is active
- Map shows current GPS position + recorded trace only
- User can tap "Plan Route" during an active live trip to add a destination mid-ride; navigation activates immediately after route is calculated

---

**Saved Planned Route:**
- The planned route (array of stop coordinates + stop names) is saved to the `trips` record at trip start
- This is distinct from the recorded GPS trace in `trip_routes` — the planned route is the intent, the trace is the reality
- Post-trip, both are shown on the Route tab: planned route as a faded overlay, actual trace as the bold polyline

---

### 7.6 Multi-user Live Session

**Concept:** A trip owner starts a "live session" tied to their live trip. Other MotoYaar users join via an invite link. All participants — host and joiners — see each other's real-time location on a shared map for the duration of the trip. This is online-only for the sharing layer; each participant's local GPS recording still functions offline.

**Start Session Flow (Host):**
1. During an active live trip, host taps "Share Session" → "Start Group Session"
2. System creates a `live_trip_sessions` record, generates a short invite code (6-char alphanumeric) and a deep link: `motoyaar.app/trips/join/[code]`
3. Host sees a share sheet with the link and code; can share via OS share dialog or copy link
4. Session starts immediately; host's location is already visible in the session

**Join Session Flow (Participant):**
1. Participant opens the invite link on their device
2. If not logged in → redirected to login; after auth, link is re-followed
3. Participant sees: "Join [Host Name]'s live trip: [Trip Title]?" → [Join] / [Cancel]
4. On join → participant is added to `live_trip_participants`; their location starts broadcasting
5. Participant is taken to the shared live map view

**Shared Map View (All Participants):**
- All active participant positions shown as distinct coloured markers (each user gets a stable colour for the session)
- Each marker shows the user's name on tap
- Participant list panel (collapsible): shows all active members, their names, and connection status (online / last seen [time])
- "Leave session" button for participants
- Host additionally sees "End session" button

**Location Broadcasting:**
- Each participant broadcasts their current position to a Supabase Realtime Broadcast channel identified by `session_id`
- Broadcast payload: `{ userId, lat, lng, timestamp, speed }`
- Broadcast cadence: every 5 seconds while online and position has changed by > 10m (same threshold as waypoint recording)
- Broadcast is ephemeral (not persisted to DB); only current position is shared, not full route history
- When a participant joins mid-session, they do not see historical positions of others — only positions from the moment they join

**Participant Session States:**
| State | Description | Visible to others |
|-------|-------------|-------------------|
| Active | Online and broadcasting | Live position |
| Offline | Lost connection; last broadcast < 30s ago | Last known position + "offline" badge |
| Stale | No broadcast for > 30s | Greyed marker + "Last seen X min ago" |
| Left | Participant explicitly left | Removed from map |

---

### 7.7 Session Management

**Session Lifecycle:**

| Event | Result |
|-------|--------|
| Host ends session | All participants notified; session marked `ended`; map shows "Session ended by host" |
| Host ends their live trip | Session auto-ended; same notification |
| All participants leave | Session remains open until host ends it or 24h timeout |
| 24h timeout | Session auto-expired; status set to `expired` |
| Participant leaves | Removed from map; others continue |

**Rejoining:**
- Participants who were dropped (network loss) can rejoin via the same invite link as long as the session is still active
- The invite link remains valid for the duration of the session

**Access Control:**
- Only MotoYaar users with a valid account can join a session
- The host can see who has joined from the participant list
- Phase 1 does not support removing/kicking a specific participant (post-Phase 1 enhancement)

---

## 8. Data Model

### New Tables

#### `trip_routes`
Stores the full recorded GPS route for a trip.

```sql
CREATE TABLE trip_routes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  waypoints   JSONB NOT NULL DEFAULT '[]',   -- array of waypoint objects
  distance_km NUMERIC(8,3),                  -- calculated on save
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_route_per_trip UNIQUE (trip_id)
);

CREATE INDEX idx_trip_routes_trip_id ON trip_routes(trip_id);
```

#### `live_trip_sessions`
Tracks a group live-location sharing session tied to a trip.

```sql
CREATE TABLE live_trip_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code  VARCHAR(6) NOT NULL UNIQUE,
  status       VARCHAR(20) NOT NULL DEFAULT 'active', -- active | ended | expired
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at     TIMESTAMPTZ
);

CREATE INDEX idx_live_sessions_trip_id ON live_trip_sessions(trip_id);
CREATE INDEX idx_live_sessions_invite_code ON live_trip_sessions(invite_code);
```

#### `live_trip_participants`
Tracks who has joined a live session and their current state.

```sql
CREATE TABLE live_trip_participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES live_trip_sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(20) NOT NULL DEFAULT 'active', -- active | left
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at     TIMESTAMPTZ,
  CONSTRAINT unique_participant_per_session UNIQUE (session_id, user_id)
);

CREATE INDEX idx_live_participants_session_id ON live_trip_participants(session_id);
CREATE INDEX idx_live_participants_user_id ON live_trip_participants(user_id);
```

### Modified Tables

#### `trips` — new columns

```sql
ALTER TABLE trips ADD COLUMN has_live_route BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE trips ADD COLUMN planned_stops JSONB;
-- Array of stop objects: [{ name, lat, lng, order }]
-- Populated at live trip start if user completes route planning; null if skipped.
-- Example: [{ "name": "Manali", "lat": 32.24, "lng": 77.18, "order": 1 }, ...]
```

`has_live_route` is set to `true` when a `trip_routes` record is created for the trip. Used as a quick flag to render the route tab/thumbnail without querying `trip_routes` on every list load.

`planned_stops` stores the user's intended route stops. Kept on the `trips` table (not a separate table) since it is immutable after trip start and tightly coupled to the trip record.

---

## 9. Technical Architecture

### 9.1 New Packages Required

| Package | Purpose |
|---------|---------|
| `mappls-web-sdk` | Mappls (MapMyIndia) web SDK — map rendering, tile serving, Places API, Routing API, Navigation SDK, Static Maps API; loaded via CDN script tag and wrapped with a thin React integration layer |
| `idb` | Lightweight IndexedDB wrapper for offline waypoint buffering |

> **No additional real-time infrastructure needed.** Supabase Realtime Broadcast is available via the already-installed `@supabase/supabase-js` package. Offline tile caching uses the Service Worker already scaffolded via `next-pwa`.

> **Mappls SDK integration note:** Mappls does not currently publish a first-party React NPM package for the web SDK. The integration pattern is: load `mappls-web-sdk` via CDN script in `_document.tsx`, then wrap map initialisation in a React component using `useEffect` + `useRef`. A thin internal hook (`useMappls`) will abstract SDK readiness. This is the same pattern used by the official Mappls sample apps.

> **API Key:** A Mappls API key (REST + Map SDK) is required. Free developer tier available at [developer.mappls.com](https://developer.mappls.com). Key must be stored in `NEXT_PUBLIC_MAPPLS_API_KEY` env var and is safe to expose client-side (Mappls enforces domain allowlisting on the key).

### 9.2 GPS Tracking

```
Browser Geolocation API (watchPosition)
  → Waypoint filter (distance > 10m OR time > 10s)
  → IndexedDB buffer (idb)
  → [online] → PATCH /api/trips/[id]/route (flush)
  → [offline] → buffer accumulates → flush on 'online' event
```

### 9.3 Map Tiles (Offline)

```
User taps "Download map"
  → Calculate tile coords for bounding box at zoom 10–15
  → Fetch tiles from Mappls tile endpoint (authenticated with API key)
  → Store in CacheStorage via Service Worker (cache name: 'mappls-tiles-v1')
  
On map tile request:
  → Service Worker intercepts fetch to Mappls tile domain
  → Cache hit → serve from cache
  → Cache miss → fetch from network (or show grey tile if offline)
```

Tile zoom levels to cache: **10 (overview) through 15 (street level)**. Zoom 16 is dropped vs. the original spec — Mappls tiles at zoom 15 provide sufficient navigation detail for Indian roads, and capping at 15 meaningfully reduces download size (~1.5–5 MB per 20×20 km area).

> **Mappls tile caching terms:** Mappls permits offline caching of tiles for personal, non-redistributed use under their developer licence. Confirm with their enterprise team before scaling beyond the free tier.

### 9.4 Real-time Location Sharing (Supabase Realtime Broadcast)

```
Each participant:
  watchPosition → filter (distance > 10m OR 5s elapsed)
  → supabase.channel('session:[session_id]').send({
      type: 'broadcast',
      event: 'location',
      payload: { userId, lat, lng, timestamp, speed }
    })

Each participant (receive):
  supabase.channel('session:[session_id]')
    .on('broadcast', { event: 'location' }, handler)
  → update participant marker on map
  → reset "stale" timer (30s)
```

Supabase Realtime Broadcast is ephemeral — no payload is persisted to the database. This keeps the location sharing lightweight and does not accumulate data. The only DB writes for sessions are the `live_trip_sessions` and `live_trip_participants` records (metadata only).

### 9.5 API Routes (New)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/trips/[id]/route` | Fetch saved GPS trace for a trip |
| `PATCH` | `/api/trips/[id]/route` | Append / replace waypoints for a trip's route |
| `DELETE` | `/api/trips/[id]/route` | Delete route data for a trip |
| `PATCH` | `/api/trips/[id]/planned-stops` | Save the planned stops array at trip start |
| `POST` | `/api/trips/[id]/session` | Create a live session for a trip |
| `GET` | `/api/trips/[id]/session` | Get active session for a trip |
| `DELETE` | `/api/trips/[id]/session` | End a session (host only) |
| `GET` | `/api/sessions/[code]` | Resolve invite code → session info (for join flow) |
| `POST` | `/api/sessions/[code]/join` | Join a session by invite code |
| `DELETE` | `/api/sessions/[code]/leave` | Leave a session |

> **Mappls Places + Routing are called client-side** directly from the browser using the Mappls SDK and the client-side API key. They do not route through our Next.js API. The only server-side calls to Mappls are none — all map, search, and routing interactions happen browser → Mappls CDN.

### 9.6 Updated Architecture Diagram

```
Mobile Browser (PWA)
  ├── Mappls Web SDK (CDN)
  │     ├── Map tiles (network / Service Worker cache)
  │     ├── Places API — POI / address search (client-side, online only)
  │     ├── Routing API — multi-stop route calculation (client-side, online only)
  │     ├── Navigation SDK — turn-by-turn voice guidance (client-side)
  │     ├── Static Maps API — trip card thumbnails (client-side)
  │     └── Recorded trace polyline + Participant Markers
  ├── Geolocation API (GPS — works offline)
  ├── Web Audio API — voice navigation announcements
  ├── IndexedDB (idb)
  │     ├── Waypoint buffer (offline GPS recording)
  │     └── Route instruction cache (offline_route:[trip_id] — geometry + turn list)
  ├── Service Worker (next-pwa)
  │     ├── Mappls tile cache (CacheStorage: 'mappls-tiles-v1')
  │     └── Background sync (flush waypoints on reconnect)
  └── Supabase Realtime Client
        └── Broadcast channel per session_id

Vercel (Next.js API Routes)
  ├── PATCH /api/trips/[id]/route → Supabase (trip_routes)
  ├── PATCH /api/trips/[id]/planned-stops → Supabase (trips.planned_stops)
  ├── POST /api/trips/[id]/session → Supabase (live_trip_sessions)
  └── POST /api/sessions/[code]/join → Supabase (live_trip_participants)

Supabase
  ├── PostgreSQL: trips (planned_stops), trip_routes, live_trip_sessions, live_trip_participants
  └── Realtime: Broadcast channel per session_id (ephemeral, not persisted)

Mappls CDN (external)
  ├── Map tile endpoint (cached offline via Service Worker)
  ├── Places API (autocomplete, geocoding)
  ├── Routing API (multi-stop, two-wheeler mode)
  └── Static Maps API (thumbnail generation)
```

---

## 10. Key Data Flow Rules

1. **One route per trip.** A trip can have at most one `trip_routes` record. Resuming a paused live trip appends to the existing route; it does not create a new record.

2. **Session tied to live trip.** A `live_trip_sessions` record can only be created if the linked trip is actively being tracked (i.e., user has started a live trip). Users cannot create a session for a retrospective (non-live) trip.

3. **Trip delete cascades route.** Deleting a trip deletes its `trip_routes` record (ON DELETE CASCADE). The existing trip delete confirmation modal must be updated to add: "This will also delete the recorded GPS route for this trip."

4. **Session ends when trip ends.** Ending a live trip (or stopping GPS tracking) automatically ends any active `live_trip_sessions` associated with that trip.

5. **Invite code uniqueness.** `invite_code` is a 6-character alphanumeric string. Generated at session creation; enforced unique at DB level. If a collision occurs (extremely rare), retry generation once before erroring.

6. **Broadcast is not recorded.** Location broadcasts via Supabase Realtime are never written to the database. The `trip_routes` waypoints are the only persistent location record, and they come from the host's own GPS recording — not from participant broadcasts.

7. **Participant location is not stored.** Only the host's route is saved as a `trip_routes` record. Participants' location data exists only in the real-time broadcast stream. When a participant leaves or the session ends, their location data is gone.

8. **Offline participant appears stale.** When a participant's last broadcast is > 30 seconds old, their marker is shown as stale. No artificial removal — their last known position remains on the map until they leave or the session ends.

---

## 11. Edge Cases & Resolutions

| # | Scenario | Resolution |
|---|----------|------------|
| 1 | GPS permission denied | Blocked start; clear message directing user to browser settings; no partial start |
| 2 | GPS signal lost mid-trip | Last known position held; gap recorded in waypoint timestamps; no waypoints written during gap; on signal return, recording resumes seamlessly |
| 3 | User closes tab mid-trip | Session state (status: `paused`, buffered waypoints) persisted in IndexedDB; on next app open, prompt: "Resume your trip to [Destination]?" with elapsed time shown |
| 4 | Trip paused for > 24 hours | Session auto-expired; on app reopen, prompt: "Your trip was paused too long to resume. Save what was recorded?" — user can save partial route or discard |
| 5 | IndexedDB not available (private browsing) | Offline mode disabled; warning shown before live trip starts; online-only operation allowed |
| 6 | Map tile download interrupted (connectivity loss) | Partial tiles cached; download can be resumed via "Retry download" in offline maps section; partial cache not used until download is complete |
| 7 | Offline map download too large (> 100MB) | Hard cap at 100MB; if selected area exceeds this, reduce zoom cap from 15 to 13 and warn user; prompt to adjust bounding box |
| 8 | Host loses internet during session | Host's dot goes stale on participants' maps (30s threshold); host's own GPS continues recording locally; if host reconnects within 30min and session is still active, broadcast resumes; after 30min disconnection, session is ended automatically and participants are notified |
| 9 | Participant tries to join ended/expired session | Invite link resolves to: "This session has ended." — no join option |
| 10 | Same user joins session on two devices | Second join attempt on same user_id is rejected; toast: "You're already in this session on another device." |
| 11 | Very large route (> 10,000 waypoints) | Recording interval automatically doubles (10s → 20s); warning banner shown; route still saved and displayed correctly |
| 12 | Trip deleted while live | Live trip auto-stopped; route saved before cascade delete runs; user informed via toast |
| 13 | Participant revokes location permission mid-session | Their position stops updating; after 30s stale threshold, marker greyed; they are not auto-removed; they can rejoin if they re-grant permission |
| 14 | Multiple concurrent live trips (user starts two) | Not allowed; user can only have one active live trip at a time; "Stop Trip" on the first is required before starting another |
| 15 | User goes offline before route instructions are saved to IndexedDB | If the device loses connection between tapping "Start Trip" and completing the route instruction save, a toast is shown: "Couldn't save route for offline navigation. Navigation will be unavailable offline." GPS recording still starts. The pre-save is retried once on any reconnection during the trip. |
| 16 | User deviates from planned route while offline | Navigation banner shows "Off route — re-routing unavailable offline." Voice announcements pause. GPS recording continues capturing the actual path. If user returns within 50m of the planned route, voice guidance resumes from the nearest upcoming instruction. |
| 17 | User skips route planning, then goes offline mid-trip | No navigation guidance available (nothing to navigate to). Live map shows GPS trace on cached tiles only. Prompt shown at trip start when skipping: "Without a planned route, navigation won't be available offline." |
| 18 | Offline route cache (IndexedDB) is missing at trip resume | Can happen if user cleared browser storage between pause and resume. Navigation cannot resume offline. Toast: "Navigation data was cleared — re-routing will resume when you're back online." GPS recording resumes normally. |

---

## 12. Non-Functional Requirements

### Performance

- Map interaction (pan, zoom) must remain at ≥ 30fps on a mid-range Android device
- Waypoint writes to IndexedDB must be < 5ms (non-blocking)
- Route polyline rendering: up to 10,000 points must render within 500ms on initial load
- Session join flow (link → map view): < 3 seconds end-to-end on a 4G connection

### Battery

- Baseline (low accuracy, default interval): ≤ 3% battery drain per hour of active tracking
- High accuracy mode: ≤ 6% per hour — communicated to the user with a warning
- When app is backgrounded on Android, the PWA Service Worker continues recording via the Background Geolocation approach; acknowledge that iOS PWA background execution is limited and document this as a known platform constraint

### Data / Storage

- Offline map tiles: cap at 100MB per device across all downloaded areas; oldest downloads evicted first (LRU) when cap is reached, with user notification
- IndexedDB waypoint buffer: max 50,000 waypoints (~14 hours) before oldest points are evicted; this edge case only occurs if the user never regains internet
- Supabase Realtime free tier: 200 concurrent connections; adequate for MVP. Monitor and plan upgrade threshold at 150 concurrent connections

### Privacy

- Location data is only shared with session participants — not with the general community, not with other users, not publicly visible anywhere in the app
- The session invite link is a shared secret; knowing the link grants access; users should be advised not to post it publicly
- Participant location broadcasts are ephemeral (Supabase Broadcast, not persisted to DB); only the host's route is saved to `trip_routes`
- "Delete my data" option (existing in Settings) must also delete any `trip_routes` records and `live_trip_participants` records for the user

### Reliability

- Waypoint data loss rate target: < 0.1% — achieved via IndexedDB durability + sync-on-reconnect pattern
- If server sync of waypoints fails after 3 retries → waypoints remain in IndexedDB; retry triggered on next app launch

---

## 13. New Dependencies

| Dependency | Type | Justification |
|------------|------|--------------|
| `mappls-web-sdk` | CDN (script tag) | India's most accurate map platform. Replaces Leaflet + OSM. Provides tiles, Places API, Routing API (two-wheeler mode), Navigation SDK, and Static Maps API in a single SDK. Free developer tier; scales to paid. No NPM package — loaded via CDN in `_document.tsx` and wrapped with a thin `useMappls` React hook. |
| `idb` | NPM | Typed IndexedDB wrapper; minimal (3KB gzipped); replaces raw IDB boilerplate for offline waypoint buffering |
| `NEXT_PUBLIC_MAPPLS_API_KEY` | Env var | Mappls API key; domain-allowlisted on Mappls dashboard; safe to expose client-side |

**Removed vs. original PRD:** `leaflet`, `react-leaflet`, `@types/leaflet` — replaced by Mappls SDK.

**No new backend infrastructure required.** Supabase Realtime Broadcast and the existing `@supabase/supabase-js` client handle all real-time needs. The Service Worker already scaffolded by `next-pwa` handles offline tile caching.

---

## 14. Out of Scope — Phase 2 (In-trip Chat)

The following is recorded here to anchor Phase 2 planning. It is explicitly **not** included in Phase 1 and should not be built until Phase 1 is shipped and stable.

### Phase 2: In-trip Chat Room

**Concept:** Participants in an active live session can exchange text messages in a shared chat room, visible to all participants.

**Requirements (preliminary):**
- Text chat only (audio/voice is out of scope even for Phase 2)
- Chat is online-only — messages are not buffered or delivered when offline
- Messages visible to all current session participants; not stored after session ends (ephemeral)
- Suggested implementation: Supabase Realtime Broadcast (same channel as location; different event type), keeping the architecture consistent and adding no new infrastructure

**Pre-conditions for Phase 2 start:**
- Phase 1 fully shipped with < 1% crash/data loss rate
- Multi-user location sharing stable with at least 20 group sessions logged

---

## 15. Open Questions

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| 1 | Should participants' GPS routes also be saved (in addition to the host's)? Participants may want their own route record for trips they join. | PM | High — affects data model |
| 2 | iOS PWA background execution limitations mean GPS stops when the app is backgrounded on iPhone. Should we document this prominently and / or build a native app wrapper (Capacitor) to mitigate? | Architect | High |
| 3 | Should route data be shareable to the community feed? (e.g., post a trip with an embedded map) | PM | Medium — connects to Community feature |
| 4 | At what point should old offline tile caches be automatically evicted? 30 days is proposed; is that right for typical trip planning cycles? | UX | Low |
| 5 | Should non-MotoYaar users (not logged in) be able to view a session in read-only mode via the invite link? This would lower the barrier for inviting friends who aren't on the platform. | PM | Medium |
| 6 | How should the host be notified when a participant falls significantly behind (e.g., > 5km gap)? An in-session alert could be useful for safety on group rides. | UX | Medium |
| 7 | ~~Zoom levels for offline tile download~~ — **Resolved:** Zoom 10–15 confirmed (Mappls at 15 is sufficient; caps download size). | — | Closed |
| 8 | Mappls offline tile caching terms: does the developer tier permit Service Worker caching of tiles for offline use? Need confirmation from Mappls enterprise team before shipping the offline map feature. | Architect | High |
| 9 | Mappls Routing API two-wheeler mode: does it support the "avoid tolls" and "avoid highways" route options specified in Section 7.5? Verify against Mappls Routing API docs before dev starts. | Architect | Medium |
| 10 | Should the planned route (stops) be editable mid-trip? E.g., a rider decides to skip a stop or add a new one while riding. Currently spec'd as immutable after trip start — is that acceptable for Phase 1? | PM | Medium |
| 11 | Mappls API key free tier limits: what are the daily/monthly request caps for Places API (autocomplete) and Routing API calls? Need to assess if free tier is viable at MVP user volumes or if paid tier is required from launch. | Architect | High |
