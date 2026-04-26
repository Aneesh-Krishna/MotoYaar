import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockGetSession, mockAcceptInvite } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockAcceptInvite: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/services/vehicleInviteService", () => ({
  vehicleInviteService: { acceptInvite: mockAcceptInvite },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { POST } from "../route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-uuid-1", username: "rider" } };
const TOKEN = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function makeRequest() {
  return new Request(`http://localhost/api/invites/${TOKEN}/accept`, { method: "POST" });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/invites/[token]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(makeRequest(), { params: { token: TOKEN } });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(mockAcceptInvite).not.toHaveBeenCalled();
  });

  it("returns 200 with vehicleId on successful accept", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockAcceptInvite.mockResolvedValue({ vehicleId: "vehicle-uuid-1" });

    const res = await POST(makeRequest(), { params: { token: TOKEN } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.vehicleId).toBe("vehicle-uuid-1");
    expect(mockAcceptInvite).toHaveBeenCalledWith(TOKEN, SESSION.user.id);
  });

  it("returns 410 when invite is expired", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockAcceptInvite.mockRejectedValue(
      new ConflictError("This invite has expired. Ask the vehicle owner to send a new one.")
    );

    const res = await POST(makeRequest(), { params: { token: TOKEN } });

    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error.code).toBe("EXPIRED");
  });

  it("returns 409 for already-accepted invite (not treated as expired)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockAcceptInvite.mockRejectedValue(
      new ConflictError("This invite has already been accepted.")
    );

    const res = await POST(makeRequest(), { params: { token: TOKEN } });

    expect(res.status).toBe(409);
  });

  it("returns 404 for non-existent token", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockAcceptInvite.mockRejectedValue(new NotFoundError("Invite not found"));

    const res = await POST(makeRequest(), { params: { token: TOKEN } });

    expect(res.status).toBe(404);
  });

  it("returns 403 when user email does not match invitee", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockAcceptInvite.mockRejectedValue(
      new ForbiddenError("This invite was sent to a different email address.")
    );

    const res = await POST(makeRequest(), { params: { token: TOKEN } });

    expect(res.status).toBe(403);
  });
});
