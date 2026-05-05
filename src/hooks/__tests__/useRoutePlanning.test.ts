import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock @react-google-maps/api so useJsApiLoader resolves immediately
vi.mock("@react-google-maps/api", () => ({
  useJsApiLoader: () => ({ isLoaded: true }),
}))

// Mock google.maps global — tests cover state management, not SDK calls
const mockRoute = vi.fn()

class MockDirectionsService {
  route = mockRoute
}
class MockLatLng {
  constructor(public _lat: number, public _lng: number) {}
  lat() { return this._lat }
  lng() { return this._lng }
}
class MockAutocompleteService {
  getPlacePredictions = vi.fn()
}
class MockGeocoder {
  geocode = vi.fn()
}

vi.stubGlobal("google", {
  maps: {
    DirectionsService: MockDirectionsService,
    LatLng: MockLatLng,
    TravelMode: { DRIVING: "DRIVING" },
    places: {
      AutocompleteService: MockAutocompleteService,
      PlacesServiceStatus: { OK: "OK" },
    },
    Geocoder: MockGeocoder,
    geometry: {
      encoding: { decodePath: vi.fn(() => []) },
    },
  },
})

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { useRoutePlanning, MAX_STOPS } from "@/hooks/useRoutePlanning"
import type { PlaceResult } from "@/hooks/useRoutePlanning"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLACE_A: PlaceResult = { id: "a", name: "Stop A", address: "Addr A", lat: 13.0, lng: 77.5 }
const PLACE_B: PlaceResult = { id: "b", name: "Stop B", address: "Addr B", lat: 13.1, lng: 77.6 }

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useRoutePlanning", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("starts with 2 stops: origin + one empty destination", () => {
    const { result } = renderHook(() => useRoutePlanning())
    expect(result.current.stops).toHaveLength(2)
    expect(result.current.stops[0].name).toBe("My Location")
    expect(result.current.stops[0].order).toBe(0)
    expect(result.current.stops[1].order).toBe(1)
    expect(result.current.stops[1].name).toBe("")
  })

  it("setOriginFromGps updates origin coordinates", () => {
    const { result } = renderHook(() => useRoutePlanning())
    act(() => { result.current.setOriginFromGps(12.97, 77.59) })
    expect(result.current.stops[0].lat).toBe(12.97)
    expect(result.current.stops[0].lng).toBe(77.59)
    expect(result.current.stops[0].name).toBe("My Location")
  })

  it("addStop appends a stop with correct order", () => {
    const { result } = renderHook(() => useRoutePlanning())
    act(() => { result.current.addStop() })
    expect(result.current.stops).toHaveLength(3)
    expect(result.current.stops[2].order).toBe(2)
    expect(result.current.stops[2].name).toBe("")
  })

  it("addStop does not exceed MAX_STOPS", () => {
    const { result } = renderHook(() => useRoutePlanning())
    for (let i = 0; i < MAX_STOPS + 5; i++) {
      act(() => { result.current.addStop() })
    }
    expect(result.current.stops).toHaveLength(MAX_STOPS)
  })

  it("selectStop sets name and coordinates for a stop", () => {
    const { result } = renderHook(() => useRoutePlanning())
    act(() => { result.current.selectStop(1, PLACE_A) })
    expect(result.current.stops[1].name).toBe("Stop A")
    expect(result.current.stops[1].lat).toBe(13.0)
    expect(result.current.stops[1].lng).toBe(77.5)
  })

  it("removeStop removes the stop and renumbers remaining", () => {
    const { result } = renderHook(() => useRoutePlanning())
    act(() => { result.current.addStop() }) // 3 stops: indices 0, 1, 2
    act(() => { result.current.selectStop(1, PLACE_A) })
    act(() => { result.current.selectStop(2, PLACE_B) })

    act(() => { result.current.removeStop(1) }) // remove middle

    expect(result.current.stops).toHaveLength(2)
    expect(result.current.stops[0].order).toBe(0)
    expect(result.current.stops[1].order).toBe(1)
    expect(result.current.stops[1].name).toBe("Stop B")
  })

  it("reorderStops moves stop to new index and renumbers", () => {
    const { result } = renderHook(() => useRoutePlanning())
    act(() => { result.current.addStop() })
    act(() => { result.current.selectStop(1, PLACE_A) })
    act(() => { result.current.selectStop(2, PLACE_B) })

    // stops: [Origin(0), A(1), B(2)] → move B (index 2) to index 1
    act(() => { result.current.reorderStops(2, 1) })

    expect(result.current.stops[1].name).toBe("Stop B")
    expect(result.current.stops[2].name).toBe("Stop A")
    expect(result.current.stops[1].order).toBe(1)
    expect(result.current.stops[2].order).toBe(2)
  })

  it("avoidTolls toggle updates state", () => {
    const { result } = renderHook(() => useRoutePlanning())
    expect(result.current.avoidTolls).toBe(false)
    act(() => { result.current.setAvoidTolls(true) })
    expect(result.current.avoidTolls).toBe(true)
  })

  it("avoidHighways toggle updates state", () => {
    const { result } = renderHook(() => useRoutePlanning())
    expect(result.current.avoidHighways).toBe(false)
    act(() => { result.current.setAvoidHighways(true) })
    expect(result.current.avoidHighways).toBe(true)
  })

  it("sets routeResult when Directions API resolves successfully", async () => {
    mockRoute.mockResolvedValue({
      routes: [{
        legs: [
          {
            distance: { value: 15000 },
            duration: { value: 1200 },
            steps: [{
              polyline: { points: "" },
              end_location: new MockLatLng(13.0, 77.5),
              distance: { value: 15000 },
              duration: { value: 1200 },
              maneuver: "straight",
              instructions: "Head north",
            }],
          },
        ],
      }],
    })

    const { result } = renderHook(() => useRoutePlanning())
    act(() => { result.current.setOriginFromGps(12.97, 77.59) })
    act(() => { result.current.selectStop(1, PLACE_A) })

    await act(async () => {
      await new Promise(r => setTimeout(r, 600)) // wait past 500ms debounce
    })

    expect(result.current.routeResult).not.toBeNull()
    expect(result.current.routeResult?.totalDistanceKm).toBe(15)
    expect(result.current.routeResult?.totalDurationMin).toBe(20)
    expect(result.current.routeError).toBe(false)
  })

  it("sets routeError when Directions API rejects", async () => {
    mockRoute.mockRejectedValue(new Error("ZERO_RESULTS"))

    const { result } = renderHook(() => useRoutePlanning())
    act(() => { result.current.setOriginFromGps(12.97, 77.59) })
    act(() => { result.current.selectStop(1, PLACE_A) })

    await act(async () => {
      await new Promise(r => setTimeout(r, 600))
    })

    expect(result.current.routeError).toBe(true)
    expect(result.current.routeResult).toBeNull()
  })

  it("does not calculate route with fewer than 2 valid coordinate stops", async () => {
    const { result } = renderHook(() => useRoutePlanning())
    // Origin has lat:0,lng:0 (GPS not resolved) and destination is empty
    act(() => { result.current.selectStop(1, { ...PLACE_A, lat: 0, lng: 0 }) })

    await act(async () => {
      await new Promise(r => setTimeout(r, 600))
    })

    expect(mockRoute).not.toHaveBeenCalled()
    expect(result.current.routeResult).toBeNull()
  })
})
