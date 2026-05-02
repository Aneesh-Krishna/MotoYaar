import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
  mockPostFindFirst,
  mockUserFindFirst,
  mockDelete,
  mockDeleteWhere,
  mockNotificationCreate,
  mockUserServiceGetById,
  mockSendEmail,
  mockDeleteObject,
} = vi.hoisted(() => {
  const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
  const mockPostFindFirst = vi.fn();
  const mockUserFindFirst = vi.fn();
  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
  const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });
  const mockNotificationCreate = vi.fn().mockResolvedValue({});
  const mockUserServiceGetById = vi.fn();
  const mockSendEmail = vi.fn().mockResolvedValue(undefined);
  const mockDeleteObject = vi.fn().mockResolvedValue(undefined);

  return {
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
    mockPostFindFirst,
    mockUserFindFirst,
    mockDelete,
    mockDeleteWhere,
    mockNotificationCreate,
    mockUserServiceGetById,
    mockSendEmail,
    mockDeleteObject,
  };
});

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      adminAccounts: { findFirst: vi.fn() },
      posts: { findFirst: mockPostFindFirst },
      users: { findFirst: mockUserFindFirst },
    },
    update: mockUpdate,
    delete: mockDelete,
  },
}));

vi.mock("bcryptjs", () => ({ default: { compare: vi.fn() } }));

vi.mock("@/services/notificationService", () => ({
  notificationService: { create: mockNotificationCreate },
}));

vi.mock("@/services/userService", () => ({
  userService: { getById: mockUserServiceGetById },
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: mockSendEmail,
}));

vi.mock("@/lib/r2", () => ({
  deleteObject: mockDeleteObject,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { adminService } from "../adminService";
import { NotFoundError } from "@/lib/errors";

const fakeUser = { id: "user-1", name: "Test User", email: "test@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
  mockUserServiceGetById.mockResolvedValue(fakeUser);
});

describe("adminService.suspendUser", () => {
  it("sets status=suspended and suspended_until to correct date", async () => {
    const before = Date.now();
    await adminService.suspendUser("user-1", 7, "admin-1");
    const after = Date.now();

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "suspended",
        suspendedUntil: expect.any(Date),
      })
    );

    const callArg = mockUpdateSet.mock.calls[0][0] as {
      status: string;
      suspendedUntil: Date;
    };
    const suspendedUntil = callArg.suspendedUntil.getTime();
    expect(suspendedUntil).toBeGreaterThanOrEqual(before + 7 * 86_400_000);
    expect(suspendedUntil).toBeLessThanOrEqual(after + 7 * 86_400_000);
  });

  it("sends notification and email to suspended user", async () => {
    await adminService.suspendUser("user-1", 3, "admin-1");

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      "user-1",
      "admin_suspension",
      "Account suspended",
      "Your account has been suspended for 3 days.",
      "/community"
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      fakeUser.email,
      "Account suspended — MotoYaar",
      expect.stringContaining("3 days")
    );
  });

  it("uses singular 'day' for 1-day suspension in both notification and email", async () => {
    await adminService.suspendUser("user-1", 1, "admin-1");

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      "user-1",
      "admin_suspension",
      "Account suspended",
      "Your account has been suspended for 1 day.",
      "/community"
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      fakeUser.email,
      "Account suspended — MotoYaar",
      expect.stringContaining("1 day")
    );
  });

  it("skips email when user has no email address", async () => {
    mockUserServiceGetById.mockResolvedValue({ ...fakeUser, email: null });
    await adminService.suspendUser("user-1", 7, "admin-1");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("adminService.banUser", () => {
  it("sets status=banned permanently", async () => {
    await adminService.banUser("user-1", "admin-1");

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenCalledWith({ status: "banned" });
  });

  it("sends ban notification and email to user", async () => {
    await adminService.banUser("user-1", "admin-1");

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      "user-1",
      "admin_ban",
      "Account banned",
      "Your account has been permanently banned for violating community guidelines.",
      "/community"
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      fakeUser.email,
      "Account banned — MotoYaar",
      expect.stringContaining("permanently banned")
    );
  });

  it("skips email when banned user has no email address", async () => {
    mockUserServiceGetById.mockResolvedValue({ ...fakeUser, email: null });
    await adminService.banUser("user-1", "admin-1");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("adminService.restorePost", () => {
  it("sets is_hidden=false", async () => {
    await adminService.restorePost("post-1", "admin-1");

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenCalledWith({ isHidden: false });
  });
});

describe("adminService.removePost", () => {
  it("throws NotFoundError when post does not exist", async () => {
    mockPostFindFirst.mockResolvedValue(null);
    await expect(adminService.removePost("missing-post", "admin-1")).rejects.toThrow(NotFoundError);
  });

  it("deletes post and cleans up R2 images", async () => {
    mockPostFindFirst.mockResolvedValue({
      id: "post-1",
      images: ["key/img1.jpg", "key/img2.jpg"],
    });

    await adminService.removePost("post-1", "admin-1");

    expect(mockDeleteObject).toHaveBeenCalledWith("key/img1.jpg");
    expect(mockDeleteObject).toHaveBeenCalledWith("key/img2.jpg");
    expect(mockDelete).toHaveBeenCalledOnce();
  });

  it("deletes post with no images without calling deleteObject", async () => {
    mockPostFindFirst.mockResolvedValue({ id: "post-1", images: [] });

    await adminService.removePost("post-1", "admin-1");

    expect(mockDeleteObject).not.toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledOnce();
  });
});
