import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import type { OfflineNavCache, RouteInstruction, PlannedStop } from "@/types"

// ─── Mocks ────────────────────────────────────────────────────────────────────

// mockDbGet must be defined inside the factory to avoid hoisting issues
const mockDbGet = vi.hoisted(() => vi.fn())

vi.mock("idb", () => ({
  openDB: vi.fn().mockResolvedValue({ get: mockDbGet }),
}))

vi.mock("@/utils/navigation", () => ({
  announce: vi.fn(),
  buildAnnouncementText: vi.fn((dist: string, inst: RouteInstruction) => `${dist} ${inst.manoeuvre}`),
  closestPointOnRoute: vi.fn().mockReturnValue(10), // on route by default
  rerouteFromCurrentPosition: vi.fn().mockResolvedValue(null),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { useNavigation } from "@/hooks/useNavigation"
import { announce, closestPointOnRoute, rerouteFromCurrentPosition } from "@/utils/navigation"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeInstruction(overrides: Partial<RouteInstruction> = {}): RouteInstruction {
  return {
    stepIndex: 0,
    manoeuvre: "turn-left",
    streetName: "MG Road",
    distanceToNext: 500,
    durationToNext: 60,
    triggerLat: 12.971,
    triggerLng: 77.591,
    bearing: 90,
    ...overrides,
  }
}

function makeStop(order: number, lat: number, lng: number): PlannedStop {
  return { order, name: `Stop ${order}`, lat, lng }
}

function makeCache(overrides: Partial<OfflineNavCache> = {}): OfflineNavCache {
  return {
    tripId: "trip-1",
    routeGeometry: [
      { lat: 12.97, lng: 77.59 },
      { lat: 12.98, lng: 77.60 },
    ],
    instructions: [
      makeInstruction({ stepIndex: 0, triggerLat: 12.971, triggerLng: 77.591 }),
      makeInstruction({ stepIndex: 1, manoeuvre: "arrive", triggerLat: 12.98, triggerLng: 77.60 }),
    ],
    stops: [
      makeStop(0, 12.97, 77.59),
      makeStop(1, 12.98, 77.60),
    ],
    savedAt: Date.now(),
    ...overrides,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const POS_ON_ROUTE = { lat: 12.970, lng: 77.590 }
const POS_AT_STEP0_TRIGGER = { lat: 12.971, lng: 77.591 } // exactly at step 0 trigger
const POS_OFF_ROUTE = { lat: 13.100, lng: 78.100 }

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(closestPointOnRoute).mockReturnValue(10) // on route
    vi.mocked(rerouteFromCurrentPosition).mockResolvedValue(null)
    Object.defineProperty(navigator, "onLine", { value: true, writable: true })
  })

  describe("hasNavigation", () => {
    it("is false when IndexedDB has no cache", async () => {
      mockDbGet.mockResolvedValue(undefined)
      const { result } = renderHook(() => useNavigation("trip-1", null))
      await waitFor(() => expect(result.current.hasNavigation).toBe(false))
    })

    it("is true when cache is loaded from IndexedDB", async () => {
      mockDbGet.mockResolvedValue(makeCache())
      const { result } = renderHook(() => useNavigation("trip-1", null))
      await waitFor(() => expect(result.current.hasNavigation).toBe(true))
    })

    it("returns null nextInstruction when no cache", async () => {
      mockDbGet.mockResolvedValue(undefined)
      const { result } = renderHook(() => useNavigation("trip-1", POS_ON_ROUTE))
      await waitFor(() => expect(result.current.nextInstruction).toBeNull())
    })
  })

  describe("step advancement", () => {
    it("shows first instruction when at start", async () => {
      mockDbGet.mockResolvedValue(makeCache())
      const { result } = renderHook(() => useNavigation("trip-1", POS_ON_ROUTE))
      await waitFor(() => expect(result.current.hasNavigation).toBe(true))
      expect(result.current.nextInstruction?.stepIndex).toBe(0)
      expect(result.current.currentStepIndex).toBe(0)
    })

    it("advances step when within 20m of trigger", async () => {
      mockDbGet.mockResolvedValue(makeCache())
      // POS_AT_STEP0_TRIGGER is exactly at lat 12.971, lng 77.591 — same as step 0 trigger
      // haversineDistance will return ~0 → <= 20m threshold met
      const { result, rerender } = renderHook(
        ({ pos }) => useNavigation("trip-1", pos),
        { initialProps: { pos: POS_ON_ROUTE } }
      )
      await waitFor(() => expect(result.current.hasNavigation).toBe(true))

      act(() => {
        rerender({ pos: POS_AT_STEP0_TRIGGER })
      })

      await waitFor(() => expect(result.current.currentStepIndex).toBe(1))
    })

    it("fires 'at' announcement when advancing step", async () => {
      mockDbGet.mockResolvedValue(makeCache())
      const { result, rerender } = renderHook(
        ({ pos }) => useNavigation("trip-1", pos),
        { initialProps: { pos: POS_ON_ROUTE } }
      )
      await waitFor(() => expect(result.current.hasNavigation).toBe(true))

      act(() => { rerender({ pos: POS_AT_STEP0_TRIGGER }) })
      await waitFor(() => expect(result.current.currentStepIndex).toBe(1))

      expect(announce).toHaveBeenCalled()
    })
  })

  describe("mute toggle", () => {
    it("starts unmuted", async () => {
      mockDbGet.mockResolvedValue(makeCache())
      const { result } = renderHook(() => useNavigation("trip-1", null))
      await waitFor(() => expect(result.current.hasNavigation).toBe(true))
      expect(result.current.isMuted).toBe(false)
    })

    it("toggles mute state", async () => {
      mockDbGet.mockResolvedValue(makeCache())
      const { result } = renderHook(() => useNavigation("trip-1", null))
      await waitFor(() => expect(result.current.hasNavigation).toBe(true))

      act(() => { result.current.toggleMute() })
      expect(result.current.isMuted).toBe(true)

      act(() => { result.current.toggleMute() })
      expect(result.current.isMuted).toBe(false)
    })
  })

  describe("off-route detection", () => {
    it("stays on route when closest point <= 50m", async () => {
      vi.mocked(closestPointOnRoute).mockReturnValue(30)
      mockDbGet.mockResolvedValue(makeCache())
      const { result, rerender } = renderHook(
        ({ pos }) => useNavigation("trip-1", pos),
        { initialProps: { pos: POS_ON_ROUTE } }
      )
      await waitFor(() => expect(result.current.hasNavigation).toBe(true))

      act(() => { rerender({ pos: { lat: 12.971, lng: 77.591 } }) })
      await waitFor(() => {})
      expect(result.current.isOffRoute).toBe(false)
    })

    it("sets isOffRoute after 2 consecutive ticks > 50m", async () => {
      vi.mocked(closestPointOnRoute).mockReturnValue(100) // always off route
      mockDbGet.mockResolvedValue(makeCache())
      const { result, rerender } = renderHook(
        ({ pos }) => useNavigation("trip-1", pos),
        { initialProps: { pos: POS_ON_ROUTE } }
      )
      await waitFor(() => expect(result.current.hasNavigation).toBe(true))

      // First tick — off route but not flagged yet (1 tick)
      act(() => { rerender({ pos: POS_OFF_ROUTE }) })
      await waitFor(() => {})

      // Second tick — should now flag isOffRoute
      act(() => { rerender({ pos: { lat: 13.101, lng: 78.101 } }) })
      await waitFor(() => expect(result.current.isOffRoute).toBe(true))
    })
  })

  describe("rerouting", () => {
    it("sets rerouteFailed when reroute returns null", async () => {
      vi.mocked(closestPointOnRoute).mockReturnValue(100)
      vi.mocked(rerouteFromCurrentPosition).mockResolvedValue(null)
      mockDbGet.mockResolvedValue(makeCache())
      const { result, rerender } = renderHook(
        ({ pos }) => useNavigation("trip-1", pos),
        { initialProps: { pos: POS_ON_ROUTE } }
      )
      await waitFor(() => expect(result.current.hasNavigation).toBe(true))

      // Trigger 2 ticks to set isOffRoute
      act(() => { rerender({ pos: POS_OFF_ROUTE }) })
      act(() => { rerender({ pos: { lat: 13.101, lng: 78.101 } }) })
      await waitFor(() => expect(result.current.isOffRoute).toBe(true))
      await waitFor(() => expect(result.current.rerouteFailed).toBe(true))
    })

    it("resets step index and clears isOffRoute on successful reroute", async () => {
      vi.mocked(closestPointOnRoute).mockReturnValue(100)
      const newInstructions = [makeInstruction({ stepIndex: 0, manoeuvre: "straight" })]
      vi.mocked(rerouteFromCurrentPosition).mockResolvedValue(newInstructions)
      mockDbGet.mockResolvedValue(makeCache())
      const { result, rerender } = renderHook(
        ({ pos }) => useNavigation("trip-1", pos),
        { initialProps: { pos: POS_ON_ROUTE } }
      )
      await waitFor(() => expect(result.current.hasNavigation).toBe(true))

      act(() => { rerender({ pos: POS_OFF_ROUTE }) })
      act(() => { rerender({ pos: { lat: 13.101, lng: 78.101 } }) })
      await waitFor(() => expect(result.current.isOffRoute).toBe(false)) // cleared on success
      expect(result.current.currentStepIndex).toBe(0)
    })
  })

  describe("distanceToEachStop", () => {
    it("returns empty array when no cache", async () => {
      mockDbGet.mockResolvedValue(undefined)
      const { result } = renderHook(() => useNavigation("trip-1", POS_ON_ROUTE))
      await waitFor(() => expect(result.current.hasNavigation).toBe(false))
      expect(result.current.distanceToEachStop).toEqual([])
    })

    it("returns array of distances when cache and position available", async () => {
      mockDbGet.mockResolvedValue(makeCache())
      const { result } = renderHook(() => useNavigation("trip-1", POS_ON_ROUTE))
      await waitFor(() => expect(result.current.hasNavigation).toBe(true))
      expect(result.current.distanceToEachStop).toHaveLength(2)
      expect(result.current.distanceToEachStop[0]).toBeGreaterThanOrEqual(0)
    })

    it("returns zeros when position is null", async () => {
      mockDbGet.mockResolvedValue(makeCache())
      const { result } = renderHook(() => useNavigation("trip-1", null))
      await waitFor(() => expect(result.current.hasNavigation).toBe(true))
      expect(result.current.distanceToEachStop).toEqual([0, 0])
    })
  })
})
