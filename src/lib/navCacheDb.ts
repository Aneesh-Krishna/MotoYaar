import { openDB } from "idb"
import type { OfflineNavCache, PlannedStop, RouteInstruction } from "@/types"

export function buildOfflineNavCache(
  tripId: string,
  routeData: any,
  stops: PlannedStop[]
): OfflineNavCache {
  const routeGeometry: Array<{ lat: number; lng: number }> = (
    routeData.routes?.[0]?.geometry?.coordinates ?? []
  ).map(([lng, lat]: number[]) => ({ lat, lng }))

  const instructions: RouteInstruction[] = []
  for (const leg of routeData.routes?.[0]?.legs ?? []) {
    for (const step of leg.steps ?? []) {
      instructions.push({
        stepIndex: instructions.length,
        manoeuvre: step.maneuver?.type ?? "straight",
        streetName: step.name ?? "",
        distanceToNext: step.distance ?? 0,
        durationToNext: step.duration ?? 0,
        triggerLat: step.maneuver?.location?.[1] ?? 0,
        triggerLng: step.maneuver?.location?.[0] ?? 0,
        bearing: step.maneuver?.bearing_after ?? 0,
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
