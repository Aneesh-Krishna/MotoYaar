import { describe, it, expect, vi, beforeEach } from "vitest"
import type { PlannedStop } from "@/types"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDecodePath = vi.fn()

vi.stubGlobal("google", {
  maps: {
    geometry: {
      encoding: { decodePath: mockDecodePath },
    },
  },
})

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { buildOfflineNavCache } from "@/lib/navCacheDb"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-123"

const STOPS: PlannedStop[] = [
  { order: 0, name: "My Location", lat: 12.9, lng: 77.1 },
  { order: 1, name: "Destination", lat: 13.0, lng: 77.2 },
]

function makeLatLng(lat: number, lng: number) {
  return { lat: () => lat, lng: () => lng }
}

const ROUTE_DATA = {
  routes: [{
    legs: [{
      steps: [
        {
          polyline: { points: "encoded1" },
          end_location: makeLatLng(12.9, 77.1),
          maneuver: "depart",
          instructions: "Head north on MG Road",
          distance: { value: 300 },
          duration: { value: 30 },
        },
        {
          polyline: { points: "encoded2" },
          end_location: makeLatLng(12.95, 77.15),
          maneuver: "turn-left",
          instructions: "Turn left onto Brigade Road",
          distance: { value: 700 },
          duration: { value: 60 },
        },
      ],
    }],
  }],
  request: {},
} as unknown as google.maps.DirectionsResult

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("buildOfflineNavCache", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDecodePath
      .mockReturnValueOnce([makeLatLng(12.9, 77.1), makeLatLng(12.92, 77.12)])
      .mockReturnValueOnce([makeLatLng(12.92, 77.12), makeLatLng(12.95, 77.15)])
  })

  it("maps route geometry from decoded polylines", () => {
    const cache = buildOfflineNavCache(TRIP_ID, ROUTE_DATA, STOPS)
    expect(cache.routeGeometry).toHaveLength(4)
    expect(cache.routeGeometry[0]).toEqual({ lat: 12.9, lng: 77.1 })
    expect(cache.routeGeometry[3]).toEqual({ lat: 12.95, lng: 77.15 })
  })

  it("maps route instructions from steps with correct shape", () => {
    const cache = buildOfflineNavCache(TRIP_ID, ROUTE_DATA, STOPS)
    expect(cache.instructions).toHaveLength(2)

    expect(cache.instructions[0]).toMatchObject({
      stepIndex: 0,
      manoeuvre: "depart",
      streetName: "Head north on MG Road",
      distanceToNext: 300,
      durationToNext: 30,
      triggerLat: 12.9,
      triggerLng: 77.1,
    })

    expect(cache.instructions[1]).toMatchObject({
      stepIndex: 1,
      manoeuvre: "turn-left",
      streetName: "Turn left onto Brigade Road",
      distanceToNext: 700,
      durationToNext: 60,
      triggerLat: 12.95,
      triggerLng: 77.15,
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
    const cache = buildOfflineNavCache(
      TRIP_ID,
      { routes: [], request: {} } as unknown as google.maps.DirectionsResult,
      STOPS
    )
    expect(cache.routeGeometry).toHaveLength(0)
    expect(cache.instructions).toHaveLength(0)
  })

  it("handles steps with missing optional fields gracefully", () => {
    mockDecodePath.mockReset().mockReturnValue([])
    const sparseData = {
      routes: [{
        legs: [{
          steps: [{
            end_location: makeLatLng(0, 0),
            instructions: "Go straight",
            distance: { value: 100 },
            duration: { value: 10 },
          }],
        }],
      }],
      request: {},
    } as unknown as google.maps.DirectionsResult

    const cache = buildOfflineNavCache(TRIP_ID, sparseData, STOPS)
    expect(cache.instructions[0].manoeuvre).toBe("straight")
    expect(cache.instructions[0].triggerLat).toBe(0)
    expect(cache.instructions[0].triggerLng).toBe(0)
  })
})
