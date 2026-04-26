import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockGetSession, mockTripServiceDelete } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockTripServiceDelete: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/services/tripService", () => ({
  tripService: { delete: mockTripServiceDelete },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { DELETE } from "../route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-uuid-1" } };
const TRIP_ID = "trip-uuid-1";

function makeRequest(url: string) {
  return new Request(url, { method: "DELETE" });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DELETE /api/trips/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 without ?confirm=true", async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await DELETE(
      makeRequest(`http://localhost/api/trips/${TRIP_ID}`),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("CONFIRMATION_REQUIRED");
    expect(mockTripServiceDelete).not.toHaveBeenCalled();
  });

  it("returns 204 with ?confirm=true for owner", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockTripServiceDelete.mockResolvedValue(undefined);

    const res = await DELETE(
      makeRequest(`http://localhost/api/trips/${TRIP_ID}?confirm=true`),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(204);
    expect(mockTripServiceDelete).toHaveBeenCalledWith(TRIP_ID, SESSION.user.id);
  });

  it("returns 403 for non-owner", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockTripServiceDelete.mockRejectedValue(new ForbiddenError("You do not own this trip"));

    const res = await DELETE(
      makeRequest(`http://localhost/api/trips/${TRIP_ID}?confirm=true`),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await DELETE(
      makeRequest(`http://localhost/api/trips/${TRIP_ID}?confirm=true`),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(401);
    expect(mockTripServiceDelete).not.toHaveBeenCalled();
  });

  it("returns 404 when trip does not exist", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockTripServiceDelete.mockRejectedValue(new NotFoundError("Trip not found"));

    const res = await DELETE(
      makeRequest(`http://localhost/api/trips/${TRIP_ID}?confirm=true`),
      { params: { id: TRIP_ID } }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
