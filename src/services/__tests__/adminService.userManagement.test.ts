import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
  mockUserFindMany,
  mockUserFindFirst,
  mockSelectFrom,
  mockSelectWhere,
  mockSelect,
} = vi.hoisted(() => {
  const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
  const mockUserFindMany = vi.fn();
  const mockUserFindFirst = vi.fn();
  const mockSelectWhere = vi.fn().mockResolvedValue([{ count: "0" }]);
  const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

  return {
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
    mockUserFindMany,
    mockUserFindFirst,
    mockSelectFrom,
    mockSelectWhere,
    mockSelect,
  };
});

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      adminAccounts: { findFirst: vi.fn() },
      posts: { findFirst: vi.fn() },
      users: {
        findFirst: mockUserFindFirst,
        findMany: mockUserFindMany,
      },
    },
    update: mockUpdate,
    select: mockSelect,
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
  },
}));

vi.mock("bcryptjs", () => ({ default: { compare: vi.fn() } }));
vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/r2", () => ({ deleteObject: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/notificationService", () => ({
  notificationService: { create: vi.fn() },
}));
vi.mock("@/services/userService", () => ({
  userService: { getById: vi.fn().mockResolvedValue({ id: "user-1", email: null }) },
}));

import { adminService } from "../adminService";
import { NotFoundError } from "@/lib/errors";

const fakeUsers = [
  {
    id: "u1",
    name: "Alice Smith",
    email: "alice@example.com",
    username: "alice",
    status: "active",
    suspendedUntil: null,
    createdAt: new Date("2024-01-01"),
    vehicleCount: 2,
    postCount: 5,
  },
  {
    id: "u2",
    name: "Bob Jones",
    email: "bob@example.com",
    username: "bob",
    status: "warned",
    suspendedUntil: null,
    createdAt: new Date("2024-02-01"),
    vehicleCount: 0,
    postCount: 3,
  },
];

const fakeUserBase = {
  id: "u1",
  name: "Alice Smith",
  email: "alice@example.com",
  username: "alice",
  status: "active",
  suspendedUntil: null,
  createdAt: new Date("2024-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindMany.mockResolvedValue(fakeUsers);
  mockSelectWhere.mockResolvedValue([{ count: "0" }]);
});

describe("adminService.searchUsers", () => {
  it("returns users matching email ILIKE with vehicleCount and postCount", async () => {
    mockUserFindMany.mockResolvedValue([fakeUsers[0]]);
    const result = await adminService.searchUsers("alice@example.com");
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("alice@example.com");
    expect(result[0].vehicleCount).toBe(2);
    expect(result[0].postCount).toBe(5);
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    );
  });

  it("returns users matching name ILIKE with counts", async () => {
    mockUserFindMany.mockResolvedValue([fakeUsers[1]]);
    const result = await adminService.searchUsers("Bob");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bob Jones");
    expect(result[0].vehicleCount).toBe(0);
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    );
  });

  it("returns all users (up to 50) when q is empty, with extras for counts", async () => {
    mockUserFindMany.mockResolvedValue(fakeUsers);
    const result = await adminService.searchUsers("");
    expect(result).toHaveLength(2);
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined, limit: 50, extras: expect.anything() })
    );
  });
});

describe("adminService.getUser", () => {
  it("throws NotFoundError when user does not exist", async () => {
    mockUserFindFirst.mockResolvedValue(null);
    await expect(adminService.getUser("missing-id")).rejects.toThrow(NotFoundError);
  });

  it("returns user with vehicle and post counts from aggregation", async () => {
    mockUserFindFirst.mockResolvedValue(fakeUserBase);
    mockSelectWhere
      .mockResolvedValueOnce([{ count: "3" }])
      .mockResolvedValueOnce([{ count: "7" }]);

    const result = await adminService.getUser("u1");
    expect(result.vehicleCount).toBe(3);
    expect(result.postCount).toBe(7);
    expect(result.email).toBe("alice@example.com");
  });
});

describe("adminService.updateUserStatus", () => {
  it("lift suspension clears suspended_until and resets status to active", async () => {
    await adminService.updateUserStatus("user-1", "lift", { adminId: "admin-1" });

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenCalledWith({ status: "active", suspendedUntil: null });
  });

  it("unban sets status to active", async () => {
    await adminService.updateUserStatus("user-1", "unban", { adminId: "admin-1" });

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenCalledWith({ status: "active" });
  });

  it("relink updates google_id", async () => {
    await adminService.updateUserStatus("user-1", "relink", {
      googleId: "new-google-id-123",
      adminId: "admin-1",
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenCalledWith({ googleId: "new-google-id-123" });
  });

  it("throws when relink is called without googleId", async () => {
    await expect(
      adminService.updateUserStatus("user-1", "relink", { adminId: "admin-1" })
    ).rejects.toThrow("googleId required");
  });

  it("throws when suspend is called without suspendDays", async () => {
    await expect(
      adminService.updateUserStatus("user-1", "suspend", { adminId: "admin-1" })
    ).rejects.toThrow("suspendDays required");
  });
});
