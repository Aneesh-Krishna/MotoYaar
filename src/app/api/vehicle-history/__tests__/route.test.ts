import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockGetSession, mockGetByReg } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetByReg: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/services/vehicleHistoryService", () => ({
  vehicleHistoryService: { getByReg: mockGetByReg },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET } from "../route";
import { NextRequest } from "next/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-uuid-1" } };

function makeRequest(reg?: string) {
  const url = reg
    ? `http://localhost/api/vehicle-history?reg=${encodeURIComponent(reg)}`
    : "http://localhost/api/vehicle-history";
  return new NextRequest(url);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/vehicle-history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET(makeRequest("MH12AB1234"));

    expect(res.status).toBe(401);
  });

  it("returns 400 when reg param is missing", async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await GET(makeRequest());

    expect(res.status).toBe(400);
  });

  it("returns history entries for authenticated request", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const entries = [
      { id: "exp-1", reason: "Service", date: "2026-01-15", serviceCenterName: null, odometerKm: null, deletedByOwner: false },
    ];
    mockGetByReg.mockResolvedValue(entries);

    const res = await GET(makeRequest("MH12AB1234"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].id).toBe("exp-1");
  });

  it("returns empty entries array when no history found", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetByReg.mockResolvedValue([]);

    const res = await GET(makeRequest("XX00ZZ0000"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.entries).toHaveLength(0);
  });
});
