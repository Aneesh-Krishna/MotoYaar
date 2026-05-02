import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockGetSession, mockGetByTripId, mockCreateOrAppend, mockDeleteByTripId } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetByTripId: vi.fn(),
  mockCreateOrAppend: vi.fn(),
  mockDeleteByTripId: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/services/tripRouteService", () => ({
  tripRouteService: {
    getByTripId: mockGetByTripId,
    createOrAppend: mockCreateOrAppend,
    deleteByTripId: mockDeleteByTripId,
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET, PATCH, DELETE } from "../route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-uuid-1" } };
const TRIP_ID = "trip-uuid-1";

const WAYPOINT = { lat: 12.97, lng: 77.59, timestamp: 1000, accuracy: 5, speed: null, altitude: null };

const ROUTE_ROW = {
  id: "route-uuid-1",
  tripId: TRIP_ID,
  waypoints: [WAYPOINT],
  distanceKm: "1.234",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function makeRequest(method: string, url: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── GET tests ────────────────────────────────────────────────────────────────

describe("GET /api/trips/[id]/route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET(
      makeRequest("GET", `http://localhost/api/trips/${TRIP_ID}/route`),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(401);
    expect(mockGetByTripId).not.toHaveBeenCalled();
  });

  it("returns route on success", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetByTripId.mockResolvedValue(ROUTE_ROW);

    const res = await GET(
      makeRequest("GET", `http://localhost/api/trips/${TRIP_ID}/route`),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(ROUTE_ROW.id);
    expect(mockGetByTripId).toHaveBeenCalledWith(TRIP_ID, SESSION.user.id);
  });

  it("returns 403 when user does not own trip", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetByTripId.mockRejectedValue(new ForbiddenError("Access denied"));

    const res = await GET(
      makeRequest("GET", `http://localhost/api/trips/${TRIP_ID}/route`),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(403);
  });

  it("returns 404 when route not found", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetByTripId.mockRejectedValue(new NotFoundError("Route not found for this trip"));

    const res = await GET(
      makeRequest("GET", `http://localhost/api/trips/${TRIP_ID}/route`),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(404);
  });
});

// ─── PATCH tests ──────────────────────────────────────────────────────────────

describe("PATCH /api/trips/[id]/route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await PATCH(
      makeRequest("PATCH", `http://localhost/api/trips/${TRIP_ID}/route`, { waypoints: [WAYPOINT] }),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(401);
    expect(mockCreateOrAppend).not.toHaveBeenCalled();
  });

  it("returns 422 for invalid waypoint schema (empty array)", async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await PATCH(
      makeRequest("PATCH", `http://localhost/api/trips/${TRIP_ID}/route`, { waypoints: [] }),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(422);
    expect(mockCreateOrAppend).not.toHaveBeenCalled();
  });

  it("returns 422 for missing waypoints field", async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await PATCH(
      makeRequest("PATCH", `http://localhost/api/trips/${TRIP_ID}/route`, {}),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(422);
  });

  it("returns updated route on success", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockCreateOrAppend.mockResolvedValue(ROUTE_ROW);

    const res = await PATCH(
      makeRequest("PATCH", `http://localhost/api/trips/${TRIP_ID}/route`, { waypoints: [WAYPOINT] }),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(ROUTE_ROW.id);
    expect(mockCreateOrAppend).toHaveBeenCalledWith(TRIP_ID, SESSION.user.id, [WAYPOINT]);
  });

  it("returns 403 when user does not own trip", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockCreateOrAppend.mockRejectedValue(new ForbiddenError("Access denied"));

    const res = await PATCH(
      makeRequest("PATCH", `http://localhost/api/trips/${TRIP_ID}/route`, { waypoints: [WAYPOINT] }),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(403);
  });
});

// ─── DELETE tests ─────────────────────────────────────────────────────────────

describe("DELETE /api/trips/[id]/route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await DELETE(
      makeRequest("DELETE", `http://localhost/api/trips/${TRIP_ID}/route?confirm=true`),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 without ?confirm=true", async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await DELETE(
      makeRequest("DELETE", `http://localhost/api/trips/${TRIP_ID}/route`),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(400);
    expect(mockDeleteByTripId).not.toHaveBeenCalled();
  });

  it("returns 204 on success", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDeleteByTripId.mockResolvedValue(undefined);

    const res = await DELETE(
      makeRequest("DELETE", `http://localhost/api/trips/${TRIP_ID}/route?confirm=true`),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(204);
    expect(mockDeleteByTripId).toHaveBeenCalledWith(TRIP_ID, SESSION.user.id);
  });

  it("returns 403 when user does not own trip", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDeleteByTripId.mockRejectedValue(new ForbiddenError("Access denied"));

    const res = await DELETE(
      makeRequest("DELETE", `http://localhost/api/trips/${TRIP_ID}/route?confirm=true`),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(403);
  });
});
