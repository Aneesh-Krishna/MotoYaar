import { describe, it, expect } from "vitest"
import { buildAnnouncementText, closestPointOnRoute, resumeNearestInstruction } from "../navigation"
import type { RouteInstruction } from "@/types"

function makeInstruction(overrides: Partial<RouteInstruction> = {}): RouteInstruction {
  return {
    stepIndex: 0,
    manoeuvre: "turn-left",
    streetName: "MG Road",
    distanceToNext: 500,
    durationToNext: 60,
    triggerLat: 12.97,
    triggerLng: 77.59,
    bearing: 90,
    ...overrides,
  }
}

describe("buildAnnouncementText", () => {
  it("returns 300m preamble with street name", () => {
    const text = buildAnnouncementText("300", makeInstruction())
    expect(text).toBe("In 300 metres, turn left onto MG Road")
  })

  it("returns 50m preamble with street name", () => {
    const text = buildAnnouncementText("50", makeInstruction())
    expect(text).toBe("In 50 metres, turn left onto MG Road")
  })

  it("returns at-point text with street name", () => {
    const text = buildAnnouncementText("at", makeInstruction())
    expect(text).toBe("turn left onto MG Road")
  })

  it("omits street name when empty", () => {
    const text = buildAnnouncementText("300", makeInstruction({ streetName: "" }))
    expect(text).toBe("In 300 metres, turn left")
  })

  it("humanises hyphenated manoeuvre", () => {
    const text = buildAnnouncementText("at", makeInstruction({ manoeuvre: "bear-right", streetName: "" }))
    expect(text).toBe("bear right")
  })

  it("returns destination text for arrive manoeuvre regardless of distance", () => {
    expect(buildAnnouncementText("300", makeInstruction({ manoeuvre: "arrive" }))).toBe(
      "You have arrived at your destination"
    )
    expect(buildAnnouncementText("at", makeInstruction({ manoeuvre: "arrive" }))).toBe(
      "You have arrived at your destination"
    )
  })

  it("handles straight manoeuvre", () => {
    const text = buildAnnouncementText("50", makeInstruction({ manoeuvre: "straight", streetName: "NH48" }))
    expect(text).toBe("In 50 metres, straight onto NH48")
  })
})

describe("closestPointOnRoute", () => {
  it("returns 0 when position is exactly on a route point", () => {
    const pos = { lat: 12.97, lng: 77.59 }
    const geometry = [pos, { lat: 12.98, lng: 77.60 }]
    expect(closestPointOnRoute(pos, geometry)).toBe(0)
  })

  it("returns Infinity for empty geometry", () => {
    expect(closestPointOnRoute({ lat: 0, lng: 0 }, [])).toBe(Infinity)
  })

  it("returns distance to the closest point among multiple points", () => {
    const pos = { lat: 12.970, lng: 77.590 }
    const nearby = { lat: 12.971, lng: 77.590 }   // ~111m away
    const faraway = { lat: 12.990, lng: 77.590 }   // ~2.2km away
    const geometry = [faraway, nearby]
    const result = closestPointOnRoute(pos, geometry)
    expect(result).toBeLessThan(200)   // picked the nearby point
    expect(result).toBeGreaterThan(50) // not zero
  })

  it("returns correct minimum when position is equidistant from two points", () => {
    const pos = { lat: 0, lng: 0 }
    const p1 = { lat: 0.001, lng: 0 }
    const p2 = { lat: -0.001, lng: 0 }
    const geometry = [p1, p2]
    const d1 = closestPointOnRoute(pos, [p1])
    const d2 = closestPointOnRoute(pos, [p2])
    const result = closestPointOnRoute(pos, geometry)
    expect(result).toBeCloseTo(Math.min(d1, d2), 5)
  })
})

describe("resumeNearestInstruction", () => {
  function makeInstructionAt(lat: number, lng: number, stepIndex = 0): RouteInstruction {
    return {
      stepIndex,
      manoeuvre: "straight",
      streetName: "",
      distanceToNext: 100,
      durationToNext: 10,
      triggerLat: lat,
      triggerLng: lng,
      bearing: 0,
    }
  }

  it("returns currentIndex when instructions array is empty", () => {
    const result = resumeNearestInstruction({ lat: 12.97, lng: 77.59 }, [], 2)
    expect(result).toBe(2)
  })

  it("returns 0 when currentIndex is 0 and single instruction", () => {
    const instructions = [makeInstructionAt(12.97, 77.59, 0)]
    const result = resumeNearestInstruction({ lat: 12.97, lng: 77.59 }, instructions, 0)
    expect(result).toBe(0)
  })

  it("returns nearest from currentIndex forward when nearest is not the first candidate", () => {
    const pos = { lat: 12.980, lng: 77.600 }
    const instructions = [
      makeInstructionAt(12.970, 77.590, 0), // ~1.5km away
      makeInstructionAt(12.975, 77.595, 1), // ~0.75km away
      makeInstructionAt(12.981, 77.601, 2), // ~0.15km away — nearest
      makeInstructionAt(12.990, 77.610, 3), // ~1.3km away
    ]
    const result = resumeNearestInstruction(pos, instructions, 0)
    expect(result).toBe(2)
  })

  it("never searches before currentIndex", () => {
    const pos = { lat: 12.970, lng: 77.590 }
    const instructions = [
      makeInstructionAt(12.970, 77.590, 0), // closest, but before currentIndex
      makeInstructionAt(12.980, 77.600, 1),
      makeInstructionAt(12.985, 77.605, 2),
    ]
    // currentIndex = 1: step 0 is excluded from search
    const result = resumeNearestInstruction(pos, instructions, 1)
    expect(result).toBe(1) // nearest from index 1 onward
  })

  it("returns currentIndex when all remaining instructions are equidistant", () => {
    const pos = { lat: 0, lng: 0 }
    const instructions = [
      makeInstructionAt(0.001, 0, 0),
      makeInstructionAt(0.001, 0, 1), // same coords — same distance
    ]
    // First match wins since minDist only updates on strictly less-than
    const result = resumeNearestInstruction(pos, instructions, 0)
    expect(result).toBe(0)
  })
})
