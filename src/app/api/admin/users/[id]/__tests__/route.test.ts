import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAdminSession, mockUpdateUserStatus, mockGetUser } = vi.hoisted(() => ({
  mockGetAdminSession: vi.fn(),
  mockUpdateUserStatus: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock("@/lib/adminSession", () => ({ getAdminSession: mockGetAdminSession }));
vi.mock("@/services/adminService", () => ({
  adminService: {
    getUser: mockGetUser,
    updateUserStatus: mockUpdateUserStatus,
  },
}));
vi.mock("@/lib/errors", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/errors")>();
  return actual;
});

import { GET, PATCH } from "../route";

const ADMIN_SESSION = { admin: { id: "admin-uuid-1", email: "admin@motoyaar.app" } };
const USER_DETAIL = {
  id: "user-uuid-1",
  name: "Alice",
  email: "alice@example.com",
  username: "alice",
  status: "active",
  suspendedUntil: null,
  createdAt: new Date("2024-01-01"),
  vehicleCount: 2,
  postCount: 5,
};

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/admin/users/user-uuid-1", {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAdminSession.mockResolvedValue(ADMIN_SESSION);
  mockGetUser.mockResolvedValue(USER_DETAIL);
  mockUpdateUserStatus.mockResolvedValue(undefined);
});

describe("GET /api/admin/users/[id]", () => {
  it("returns 401 when not admin", async () => {
    mockGetAdminSession.mockResolvedValue({ admin: null });
    const res = await GET(makeRequest("GET"), { params: { id: "user-uuid-1" } });
    expect(res.status).toBe(401);
  });

  it("returns user detail for valid id", async () => {
    const res = await GET(makeRequest("GET"), { params: { id: "user-uuid-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("user-uuid-1");
    expect(body.vehicleCount).toBe(2);
  });
});

describe("PATCH /api/admin/users/[id]", () => {
  it("returns 401 when not admin", async () => {
    mockGetAdminSession.mockResolvedValue({ admin: null });
    const res = await PATCH(makeRequest("PATCH", { action: "warn" }), {
      params: { id: "user-uuid-1" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid action", async () => {
    const res = await PATCH(makeRequest("PATCH", { action: "nuke" }), {
      params: { id: "user-uuid-1" },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid action/i);
  });

  it("returns 400 when suspend sent without suspendDays", async () => {
    const res = await PATCH(makeRequest("PATCH", { action: "suspend" }), {
      params: { id: "user-uuid-1" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when suspend sent with suspendDays < 1", async () => {
    const res = await PATCH(makeRequest("PATCH", { action: "suspend", suspendDays: 0 }), {
      params: { id: "user-uuid-1" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when relink sent without googleId", async () => {
    const res = await PATCH(makeRequest("PATCH", { action: "relink" }), {
      params: { id: "user-uuid-1" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed request body", async () => {
    const req = new Request("http://localhost/api/admin/users/user-uuid-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await PATCH(req, { params: { id: "user-uuid-1" } });
    expect(res.status).toBe(400);
  });

  it("calls updateUserStatus and returns ok for valid warn action", async () => {
    const res = await PATCH(makeRequest("PATCH", { action: "warn" }), {
      params: { id: "user-uuid-1" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockUpdateUserStatus).toHaveBeenCalledWith(
      "user-uuid-1",
      "warn",
      expect.objectContaining({ adminId: ADMIN_SESSION.admin.id })
    );
  });

  it("calls updateUserStatus with suspendDays for suspend action", async () => {
    const res = await PATCH(makeRequest("PATCH", { action: "suspend", suspendDays: 7 }), {
      params: { id: "user-uuid-1" },
    });
    expect(res.status).toBe(200);
    expect(mockUpdateUserStatus).toHaveBeenCalledWith(
      "user-uuid-1",
      "suspend",
      expect.objectContaining({ suspendDays: 7, adminId: ADMIN_SESSION.admin.id })
    );
  });

  it("calls updateUserStatus with googleId for relink action", async () => {
    const res = await PATCH(
      makeRequest("PATCH", { action: "relink", googleId: "google-abc-123" }),
      { params: { id: "user-uuid-1" } }
    );
    expect(res.status).toBe(200);
    expect(mockUpdateUserStatus).toHaveBeenCalledWith(
      "user-uuid-1",
      "relink",
      expect.objectContaining({ googleId: "google-abc-123" })
    );
  });
});
