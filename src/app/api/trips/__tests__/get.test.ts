import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockGetSession, mockTripServiceListByUser } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockTripServiceListByUser: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/services/tripService", () => ({
  tripService: { listByUser: mockTripServiceListByUser },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET } from "../route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-uuid-1" } };

const TRIP_STUB = {
  id: "trip-uuid-1",
  userId: SESSION.user.id,
  title: "Pune to Mumbai",
  startDate: "2026-03-20",
  breakdown: [],
  totalCost: 0,
  createdAt: "2026-03-20T00:00:00.000Z",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/trips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/trips"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(mockTripServiceListByUser).not.toHaveBeenCalled();
  });

  it("returns 200 with trips array for authenticated user", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockTripServiceListByUser.mockResolvedValue([TRIP_STUB]);

    const res = await GET(new Request("http://localhost/api/trips"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(TRIP_STUB.id);
    expect(mockTripServiceListByUser).toHaveBeenCalledWith(SESSION.user.id);
  });

  it("returns 200 with empty array when user has no trips", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockTripServiceListByUser.mockResolvedValue([]);

    const res = await GET(new Request("http://localhost/api/trips"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});
