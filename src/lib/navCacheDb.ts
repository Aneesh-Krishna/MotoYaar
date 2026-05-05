import { openDB } from "idb"
import type { OfflineNavCache, PlannedStop, RouteInstruction } from "@/types"

export function buildOfflineNavCache(
  tripId: string,
  routeData: google.maps.DirectionsResult,
  stops: PlannedStop[]
): OfflineNavCache {
  const route = routeData.routes?.[0]
  if (!route) return { tripId, routeGeometry: [], instructions: [], stops, savedAt: Date.now() }

  const routeGeometry: Array<{ lat: number; lng: number }> = []
  for (const leg of route.legs) {
    for (const step of leg.steps) {
      const points = step.polyline?.points
      if (points) {
        google.maps.geometry.encoding
          .decodePath(points)
          .forEach(p => routeGeometry.push({ lat: p.lat(), lng: p.lng() }))
      }
    }
  }

  const instructions: RouteInstruction[] = []
  for (const leg of route.legs) {
    for (const step of leg.steps) {
      const endLoc = step.end_location
      instructions.push({
        stepIndex: instructions.length,
        manoeuvre: step.maneuver ?? "straight",
        streetName: step.instructions.replace(/<[^>]+>/g, ""),
        distanceToNext: step.distance?.value ?? 0,
        durationToNext: step.duration?.value ?? 0,
        triggerLat: endLoc.lat(),
        triggerLng: endLoc.lng(),
        bearing: 0,
      })
    }
  }

  return { tripId, routeGeometry, instructions, stops, savedAt: Date.now() }
}

export async function saveOfflineNavCache(cache: OfflineNavCache): Promise<void> {
  const db = await openDB("motoyaar-nav", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("nav-cache")) {
        db.createObjectStore("nav-cache")
      }
    },
  })
  await db.put("nav-cache", cache, `offline_route:${cache.tripId}`)
}
