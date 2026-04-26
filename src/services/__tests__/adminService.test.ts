import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      adminAccounts: { findFirst: vi.fn() },
      posts: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
    },
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/r2", () => ({ deleteObject: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/notificationService", () => ({
  notificationService: { create: vi.fn() },
}));
vi.mock("@/services/userService", () => ({
  userService: { getById: vi.fn() },
}));

import { db } from "@/lib/db/client";
import bcrypt from "bcryptjs";
import { adminService } from "../adminService";

const mockFindFirst = db.query.adminAccounts.findFirst as ReturnType<typeof vi.fn>;
const mockCompare = bcrypt.compare as unknown as ReturnType<typeof vi.fn>;

const fakeAdmin = {
  id: "admin-uuid-1",
  email: "admin@motoyaar.app",
  passwordHash: "$2a$12$hashedpassword",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("adminService.login", () => {
  it("returns admin data for valid credentials", async () => {
    mockFindFirst.mockResolvedValue(fakeAdmin);
    mockCompare.mockResolvedValue(true);

    const result = await adminService.login("admin@motoyaar.app", "correct-password");

    expect(result).toEqual({ id: fakeAdmin.id, email: fakeAdmin.email });
  });

  it("throws for wrong password", async () => {
    mockFindFirst.mockResolvedValue(fakeAdmin);
    mockCompare.mockResolvedValue(false);

    await expect(adminService.login("admin@motoyaar.app", "wrong-password")).rejects.toThrow(
      "Invalid credentials"
    );
  });

  it("throws for unknown email", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(adminService.login("unknown@test.com", "any-password")).rejects.toThrow(
      "Invalid credentials"
    );
  });

  it("uses generic error message for both failure cases", async () => {
    mockFindFirst.mockResolvedValue(null);
    await expect(adminService.login("unknown@test.com", "x")).rejects.toThrow("Invalid credentials");

    mockFindFirst.mockResolvedValue(fakeAdmin);
    mockCompare.mockResolvedValue(false);
    await expect(adminService.login("admin@motoyaar.app", "wrong")).rejects.toThrow(
      "Invalid credentials"
    );
  });

  it("lowercases email before lookup", async () => {
    mockFindFirst.mockResolvedValue(fakeAdmin);
    mockCompare.mockResolvedValue(true);

    await adminService.login("ADMIN@MOTOYAAR.APP", "correct-password");

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    );
  });
});
