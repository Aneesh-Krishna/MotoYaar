import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockGetSession, mockReturning } = vi.hoisted(() => {
  const mockReturning = vi.fn()
  const mockDbUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: mockReturning,
  })
  return { mockGetSession: vi.fn(), mockReturning, mockDbUpdate }
})

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }))
vi.mock("@/lib/db/client", () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: mockReturning,
    }),
  },
}))
vi.mock("@/lib/db/schema", () => ({ trips: {} }))
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn() }))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { PATCH } from "../route"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-uuid-1" } }
const TRIP_ID = "trip-uuid-1"

const VALID_STOPS = [
  { order: 0, name: "My Location", lat: 12.9, lng: 77.1 },
  { order: 1, name: "Destination", lat: 13.0, lng: 77.2 },
]

function makeRequest(body: unknown) {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/planned-stops`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PATCH /api/trips/[id]/planned-stops", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue(SESSION)
    mockReturning.mockResolvedValue([{ id: TRIP_ID }])
  })

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await PATCH(makeRequest({ plannedStops: VALID_STOPS }), { params: { id: TRIP_ID } })

    expect(res.status).toBe(401)
    expect(mockReturning).not.toHaveBeenCalled()
  })

  it("returns 400 when plannedStops is not an array", async () => {
    const res = await PATCH(makeRequest({ plannedStops: "not-an-array" }), { params: { id: TRIP_ID } })

    expect(res.status).toBe(400)
    expect(mockReturning).not.toHaveBeenCalled()
  })

  it("returns 400 when plannedStops contains invalid stop shape", async () => {
    const res = await PATCH(
      makeRequest({ plannedStops: [{ order: "bad", name: 123 }] }),
      { params: { id: TRIP_ID } }
    )

    expect(res.status).toBe(400)
    expect(mockReturning).not.toHaveBeenCalled()
  })

  it("returns 400 when body is missing plannedStops field", async () => {
    const res = await PATCH(makeRequest({}), { params: { id: TRIP_ID } })

    expect(res.status).toBe(400)
    expect(mockReturning).not.toHaveBeenCalled()
  })

  it("returns 404 when trip not found or not owned", async () => {
    mockReturning.mockResolvedValue([]) // empty = no match

    const res = await PATCH(makeRequest({ plannedStops: VALID_STOPS }), { params: { id: TRIP_ID } })

    expect(res.status).toBe(404)
  })

  it("returns 200 with trip id on success", async () => {
    const res = await PATCH(makeRequest({ plannedStops: VALID_STOPS }), { params: { id: TRIP_ID } })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(TRIP_ID)
  })
})
