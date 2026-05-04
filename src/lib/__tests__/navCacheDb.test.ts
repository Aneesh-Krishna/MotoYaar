import { describe, it, expect } from "vitest"
import { buildOfflineNavCache } from "@/lib/navCacheDb"
import type { PlannedStop } from "@/types"

const TRIP_ID = "trip-123"

const STOPS: PlannedStop[] = [
  { order: 0, name: "My Location", lat: 12.9, lng: 77.1 },
  { order: 1, name: "Destination", lat: 13.0, lng: 77.2 },
]

const ROUTE_DATA = {
  routes: [{
    geometry: {
      coordinates: [
        [77.1, 12.9],
        [77.15, 12.95],
        [77.2, 13.0],
      ],
    },
    legs: [{
      steps: [
        {
          maneuver: { type: "depart", location: [77.1, 12.9], bearing_after: 45 },
          name: "MG Road",
          distance: 300,
          duration: 30,
        },
        {
          maneuver: { type: "turn-left", location: [77.15, 12.95], bearing_after: 90 },
          name: "Brigade Road",
          distance: 700,
          duration: 60,
        },
      ],
    }],
  }],
}

describe("buildOfflineNavCache", () => {
  it("maps geometry coordinates correctly (lng,lat → {lat,lng})", () => {
    const cache = buildOfflineNavCache(TRIP_ID, ROUTE_DATA, STOPS)
    expect(cache.routeGeometry).toHaveLength(3)
    expect(cache.routeGeometry[0]).toEqual({ lat: 12.9, lng: 77.1 })
    expect(cache.routeGeometry[1]).toEqual({ lat: 12.95, lng: 77.15 })
    expect(cache.routeGeometry[2]).toEqual({ lat: 13.0, lng: 77.2 })
  })

  it("maps route instructions from steps with correct shape", () => {
    const cache = buildOfflineNavCache(TRIP_ID, ROUTE_DATA, STOPS)
    expect(cache.instructions).toHaveLength(2)

    expect(cache.instructions[0]).toMatchObject({
      stepIndex: 0,
      manoeuvre: "depart",
      streetName: "MG Road",
      distanceToNext: 300,
      durationToNext: 30,
      triggerLat: 12.9,
      triggerLng: 77.1,
      bearing: 45,
    })

    expect(cache.instructions[1]).toMatchObject({
      stepIndex: 1,
      manoeuvre: "turn-left",
      streetName: "Brigade Road",
      distanceToNext: 700,
      durationToNext: 60,
      triggerLat: 12.95,
      triggerLng: 77.15,
      bearing: 90,
    })
  })

  it("preserves tripId, stops, and sets savedAt timestamp", () => {
    const before = Date.now()
    const cache = buildOfflineNavCache(TRIP_ID, ROUTE_DATA, STOPS)
    const after = Date.now()

    expect(cache.tripId).toBe(TRIP_ID)
    expect(cache.stops).toEqual(STOPS)
    expect(cache.savedAt).toBeGreaterThanOrEqual(before)
    expect(cache.savedAt).toBeLessThanOrEqual(after)
  })

  it("returns empty geometry and instructions for missing route data", () => {
    const cache = buildOfflineNavCache(TRIP_ID, {}, STOPS)
    expect(cache.routeGeometry).toHaveLength(0)
    expect(cache.instructions).toHaveLength(0)
  })

  it("handles steps with missing optional maneuver fields gracefully", () => {
    const sparseData = {
      routes: [{
        geometry: { coordinates: [[77.1, 12.9]] },
        legs: [{ steps: [{ name: "Unknown", distance: 100, duration: 10 }] }],
      }],
    }
    const cache = buildOfflineNavCache(TRIP_ID, sparseData, STOPS)
    expect(cache.instructions[0].manoeuvre).toBe("straight")
    expect(cache.instructions[0].triggerLat).toBe(0)
    expect(cache.instructions[0].triggerLng).toBe(0)
    expect(cache.instructions[0].bearing).toBe(0)
  })
})
