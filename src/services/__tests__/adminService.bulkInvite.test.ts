import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsertChain = {
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      adminAccounts: { findFirst: vi.fn() },
      posts: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => mockInsertChain),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
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
vi.mock("@/services/emailService", () => ({
  emailService: { sendBetaInviteEmail: vi.fn() },
}));
vi.mock("bcryptjs", () => ({ default: { compare: vi.fn() } }));

import { db } from "@/lib/db/client";
import { emailService } from "@/services/emailService";
import { adminService } from "../adminService";

const mockUsersFindFirst = db.query.users.findFirst as ReturnType<typeof vi.fn>;
const mockSendBetaInvite = emailService.sendBetaInviteEmail as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertChain.values.mockReturnThis();
  mockInsertChain.onConflictDoUpdate.mockResolvedValue(undefined);
  (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(mockInsertChain);
});

describe("adminService.bulkInviteUsers", () => {
  it("sends emails to valid unregistered addresses", async () => {
    mockUsersFindFirst.mockResolvedValue(null);
    mockSendBetaInvite.mockResolvedValue(undefined);

    const result = await adminService.bulkInviteUsers(
      ["alice@example.com", "bob@example.com"],
      "admin-1"
    );

    expect(result.sent).toBe(2);
    expect(result.alreadyRegistered).toBe(0);
    expect(result.invalid).toBe(0);
    expect(result.failed).toBe(0);
    expect(mockSendBetaInvite).toHaveBeenCalledTimes(2);
  });

  it("counts already-registered emails correctly", async () => {
    mockUsersFindFirst
      .mockResolvedValueOnce({ id: "existing-user" })
      .mockResolvedValueOnce(null);
    mockSendBetaInvite.mockResolvedValue(undefined);

    const result = await adminService.bulkInviteUsers(
      ["registered@example.com", "new@example.com"],
      "admin-1"
    );

    expect(result.sent).toBe(1);
    expect(result.alreadyRegistered).toBe(1);
    expect(mockSendBetaInvite).toHaveBeenCalledTimes(1);
  });

  it("counts invalid email formats correctly", async () => {
    mockUsersFindFirst.mockResolvedValue(null);
    mockSendBetaInvite.mockResolvedValue(undefined);

    const result = await adminService.bulkInviteUsers(
      ["not-an-email", "also-bad", "good@example.com"],
      "admin-1"
    );

    expect(result.invalid).toBe(2);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("does not throw when individual email send fails", async () => {
    mockUsersFindFirst.mockResolvedValue(null);
    mockSendBetaInvite.mockRejectedValue(new Error("SMTP error"));

    const result = await adminService.bulkInviteUsers(["fail@example.com"], "admin-1");

    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
  });

  it("returns correct counts for mixed input", async () => {
    mockUsersFindFirst
      .mockResolvedValueOnce({ id: "existing" })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockSendBetaInvite
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("fail"));

    const result = await adminService.bulkInviteUsers(
      [
        "registered@example.com",
        "good1@example.com",
        "good2@example.com",
        "bad-format",
      ],
      "admin-1"
    );

    expect(result.alreadyRegistered).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.invalid).toBe(1);
  });
});
