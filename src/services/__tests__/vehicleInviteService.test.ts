import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConflictError, ForbiddenError, BadRequestError, NotFoundError } from "@/lib/errors";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockGetByIdOwnerOnly,
  mockGetById,
  mockSendVehicleInviteEmail,
  mockFindFirstInvite,
  mockFindFirstUser,
  mockInsert,
  mockUpdate,
  mockLoggerWarn,
  mockLoggerError,
  mockSelectWhere,
  mockDelete,
} = vi.hoisted(() => ({
  mockGetByIdOwnerOnly: vi.fn(),
  mockGetById: vi.fn(),
  mockSendVehicleInviteEmail: vi.fn().mockResolvedValue(undefined),
  mockFindFirstInvite: vi.fn(),
  mockFindFirstUser: vi.fn(),
  mockInsert: {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
  },
  mockUpdate: {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  },
  mockLoggerWarn: vi.fn(),
  mockLoggerError: vi.fn(),
  mockSelectWhere: vi.fn().mockResolvedValue([]),
  mockDelete: { where: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/services/vehicleService", () => ({
  vehicleService: {
    getByIdOwnerOnly: mockGetByIdOwnerOnly,
  },
}));

vi.mock("@/services/userService", () => ({
  userService: {
    getById: mockGetById,
  },
}));

vi.mock("@/services/emailService", () => ({
  emailService: {
    sendVehicleInviteEmail: mockSendVehicleInviteEmail,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: mockLoggerWarn,
    error: mockLoggerError,
    info: vi.fn(),
  },
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      vehicleInvites: { findFirst: mockFindFirstInvite, findMany: vi.fn() },
      vehicles: { findFirst: vi.fn() },
      users: { findFirst: mockFindFirstUser },
    },
    insert: vi.fn(() => mockInsert),
    update: vi.fn(() => mockUpdate),
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: mockSelectWhere,
    })),
    delete: vi.fn(() => mockDelete),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { vehicleInviteService } from "../vehicleInviteService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VEHICLE = {
  id: "vehicle-1",
  userId: "owner-1",
  name: "Royal Enfield Classic 350",
  type: "2-wheeler" as const,
  registrationNumber: "MH12AB1234",
  previousOwners: 0,
  createdAt: new Date().toISOString(),
};

const OWNER = {
  id: "owner-1",
  email: "owner@example.com",
  name: "Owner User",
};

const INVITE_ROW = {
  id: "invite-uuid-1",
  vehicleId: "vehicle-1",
  ownerUserId: "owner-1",
  inviteeEmail: "invitee@example.com",
  token: "test-token-uuid",
  status: "pending",
  expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("vehicleInviteService.createInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByIdOwnerOnly.mockResolvedValue(VEHICLE);
    mockGetById.mockResolvedValue(OWNER);
    mockFindFirstInvite.mockResolvedValue(null);
    mockInsert.returning.mockResolvedValue([INVITE_ROW]);
  });

  it("creates invite record with 3-day expiry", async () => {
    const before = Date.now();
    const result = await vehicleInviteService.createInvite("owner-1", "vehicle-1", "invitee@example.com");
    const after = Date.now();

    expect(result.id).toBe("invite-uuid-1");
    expect(result.vehicleId).toBe("vehicle-1");
    expect(result.ownerUserId).toBe("owner-1");
    expect(result.inviteeEmail).toBe("invitee@example.com");
    expect(result.status).toBe("pending");

    // expiresAt should be approximately 3 days from now
    const expiresInMs = result.expiresAt.getTime() - before;
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    expect(expiresInMs).toBeGreaterThanOrEqual(threeDaysMs - 1000);
    expect(expiresInMs).toBeLessThanOrEqual(threeDaysMs + (after - before) + 1000);
  });

  it("throws BadRequestError when inviting self (owner email matches invitee email)", async () => {
    mockGetById.mockResolvedValue({ ...OWNER, email: "me@example.com" });

    await expect(
      vehicleInviteService.createInvite("owner-1", "vehicle-1", "ME@EXAMPLE.COM")
    ).rejects.toThrow(BadRequestError);

    await expect(
      vehicleInviteService.createInvite("owner-1", "vehicle-1", "ME@EXAMPLE.COM")
    ).rejects.toThrow("You cannot invite yourself");
  });

  it("throws ConflictError for duplicate pending invite to same email", async () => {
    mockFindFirstInvite.mockResolvedValue(INVITE_ROW);

    await expect(
      vehicleInviteService.createInvite("owner-1", "vehicle-1", "invitee@example.com")
    ).rejects.toThrow(ConflictError);

    await expect(
      vehicleInviteService.createInvite("owner-1", "vehicle-1", "invitee@example.com")
    ).rejects.toThrow("A pending invite already exists for this email");
  });

  it("sends invite email with correct vehicle name and invite URL", async () => {
    await vehicleInviteService.createInvite("owner-1", "vehicle-1", "invitee@example.com");

    expect(mockSendVehicleInviteEmail).toHaveBeenCalledTimes(1);
    const [toEmail, vehicleName, inviteUrl] = mockSendVehicleInviteEmail.mock.calls[0];
    expect(toEmail).toBe("invitee@example.com");
    expect(vehicleName).toBe("Royal Enfield Classic 350");
    expect(inviteUrl).toContain("https://motoyaar.app/invites/");
    expect(inviteUrl).toContain(INVITE_ROW.token);
  });

  it("throws ForbiddenError for non-owner (getByIdOwnerOnly rejects)", async () => {
    mockGetByIdOwnerOnly.mockRejectedValue(
      new ForbiddenError("Only the vehicle owner can edit this vehicle")
    );

    await expect(
      vehicleInviteService.createInvite("other-user", "vehicle-1", "invitee@example.com")
    ).rejects.toThrow(ForbiddenError);
  });

  it("lowercases invitee email before storing", async () => {
    await vehicleInviteService.createInvite("owner-1", "vehicle-1", "Invitee@Example.COM");

    const insertValues = mockInsert.values.mock.calls[0][0];
    expect(insertValues.inviteeEmail).toBe("invitee@example.com");
  });

  it("does not send email when invite creation fails", async () => {
    mockInsert.returning.mockRejectedValue(new Error("DB error"));

    await expect(
      vehicleInviteService.createInvite("owner-1", "vehicle-1", "invitee@example.com")
    ).rejects.toThrow("DB error");

    expect(mockSendVehicleInviteEmail).not.toHaveBeenCalled();
  });

  it("returns invite record even when email delivery fails (non-fatal)", async () => {
    mockSendVehicleInviteEmail.mockRejectedValue(new Error("SMTP timeout"));

    const result = await vehicleInviteService.createInvite("owner-1", "vehicle-1", "invitee@example.com");

    expect(result.id).toBe("invite-uuid-1");
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ inviteId: "invite-uuid-1", inviteeEmail: "invitee@example.com" }),
      expect.stringContaining("email delivery failed")
    );
  });

  it("skips self-invite check and logs warning when owner has no email", async () => {
    mockGetById.mockResolvedValue({ ...OWNER, email: null });

    const result = await vehicleInviteService.createInvite("owner-1", "vehicle-1", "anyone@example.com");

    expect(result.id).toBe("invite-uuid-1");
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ ownerUserId: "owner-1" }),
      expect.stringContaining("self-invite check skipped")
    );
  });
});

// ─── acceptInvite ────────────────────────────────────────────────────────────

describe("vehicleInviteService.acceptInvite", () => {
  const PENDING_INVITE = {
    id: "invite-uuid-1",
    vehicleId: "vehicle-1",
    ownerUserId: "owner-1",
    inviteeEmail: "invitee@example.com",
    token: "valid-token",
    status: "pending",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirstInvite.mockResolvedValue(PENDING_INVITE);
    mockFindFirstUser.mockResolvedValue({ id: "user-2", email: "invitee@example.com" });
    mockInsert.values.mockReturnThis();
    mockInsert.onConflictDoNothing.mockResolvedValue(undefined);
    mockUpdate.set.mockReturnThis();
    mockUpdate.where.mockResolvedValue(undefined);
  });

  it("creates VehicleAccess record on valid token", async () => {
    await vehicleInviteService.acceptInvite("valid-token", "user-2");

    expect(mockInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleId: "vehicle-1", userId: "user-2", accessLevel: "view" })
    );
    expect(mockInsert.onConflictDoNothing).toHaveBeenCalled();
  });

  it("marks invite as accepted", async () => {
    await vehicleInviteService.acceptInvite("valid-token", "user-2");

    expect(mockUpdate.set).toHaveBeenCalledWith({ status: "accepted" });
    expect(mockUpdate.where).toHaveBeenCalled();
  });

  it("returns vehicleId on success", async () => {
    const result = await vehicleInviteService.acceptInvite("valid-token", "user-2");

    expect(result).toEqual({ vehicleId: "vehicle-1" });
  });

  it("throws ConflictError for already-accepted invite", async () => {
    mockFindFirstInvite.mockResolvedValue({ ...PENDING_INVITE, status: "accepted" });

    await expect(
      vehicleInviteService.acceptInvite("valid-token", "user-2")
    ).rejects.toThrow(ConflictError);

    await expect(
      vehicleInviteService.acceptInvite("valid-token", "user-2")
    ).rejects.toThrow("already been accepted");
  });

  it("throws ConflictError for expired invite", async () => {
    mockFindFirstInvite.mockResolvedValue({
      ...PENDING_INVITE,
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
    });

    await expect(
      vehicleInviteService.acceptInvite("valid-token", "user-2")
    ).rejects.toThrow(ConflictError);

    await expect(
      vehicleInviteService.acceptInvite("valid-token", "user-2")
    ).rejects.toThrow("expired");
  });

  it("throws NotFoundError for non-existent token", async () => {
    mockFindFirstInvite.mockResolvedValue(null);

    await expect(
      vehicleInviteService.acceptInvite("bad-token", "user-2")
    ).rejects.toThrow(NotFoundError);

    await expect(
      vehicleInviteService.acceptInvite("bad-token", "user-2")
    ).rejects.toThrow("Invite not found");
  });

  it("throws ForbiddenError when user email does not match inviteeEmail", async () => {
    mockFindFirstUser.mockResolvedValue({ id: "user-2", email: "other@example.com" });

    await expect(
      vehicleInviteService.acceptInvite("valid-token", "user-2")
    ).rejects.toThrow(ForbiddenError);

    await expect(
      vehicleInviteService.acceptInvite("valid-token", "user-2")
    ).rejects.toThrow("different email address");
  });

  it("throws ForbiddenError when user has no email", async () => {
    mockFindFirstUser.mockResolvedValue({ id: "user-2", email: null });

    await expect(
      vehicleInviteService.acceptInvite("valid-token", "user-2")
    ).rejects.toThrow(ForbiddenError);
  });

  it("accepts invite when user email matches invite email case-insensitively", async () => {
    mockFindFirstUser.mockResolvedValue({ id: "user-2", email: "Invitee@Example.COM" });

    const result = await vehicleInviteService.acceptInvite("valid-token", "user-2");

    expect(result).toEqual({ vehicleId: "vehicle-1" });
  });
});

// ─── revokeAccess ────────────────────────────────────────────────────────────

const ACCESS_ROW = {
  id: "access-uuid-1",
  userId: "user-2",
  vehicleName: "Royal Enfield Classic 350",
  vehicleOwnerId: "owner-1",
};

describe("vehicleInviteService.revokeAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectWhere.mockResolvedValue([ACCESS_ROW]);
    mockDelete.where.mockResolvedValue(undefined);
  });

  it("deletes VehicleAccess record when owner revokes", async () => {
    await vehicleInviteService.revokeAccess("access-uuid-1", "owner-1");

    expect(mockDelete.where).toHaveBeenCalled();
  });

  it("returns vehicleName and revokedUserId for notification", async () => {
    const result = await vehicleInviteService.revokeAccess("access-uuid-1", "owner-1");

    expect(result).toEqual({
      vehicleName: "Royal Enfield Classic 350",
      revokedUserId: "user-2",
    });
  });

  it("throws NotFoundError for invalid accessId", async () => {
    mockSelectWhere.mockResolvedValue([]);

    await expect(
      vehicleInviteService.revokeAccess("bad-id", "owner-1")
    ).rejects.toThrow(NotFoundError);

    await expect(
      vehicleInviteService.revokeAccess("bad-id", "owner-1")
    ).rejects.toThrow("Access record not found");
  });

  it("throws ForbiddenError when non-owner revokes", async () => {
    mockSelectWhere.mockResolvedValue([{ ...ACCESS_ROW, vehicleOwnerId: "someone-else" }]);

    await expect(
      vehicleInviteService.revokeAccess("access-uuid-1", "owner-1")
    ).rejects.toThrow(ForbiddenError);

    await expect(
      vehicleInviteService.revokeAccess("access-uuid-1", "owner-1")
    ).rejects.toThrow("You do not own this vehicle");
  });
});

// ─── cancelInvite ─────────────────────────────────────────────────────────────

const PENDING_INVITE_FOR_CANCEL = {
  id: "invite-uuid-1",
  vehicleId: "vehicle-1",
  ownerUserId: "owner-1",
  inviteeEmail: "invitee@example.com",
  token: "test-token-uuid",
  status: "pending",
  expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
};

describe("vehicleInviteService.cancelInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirstInvite.mockResolvedValue(PENDING_INVITE_FOR_CANCEL);
    mockDelete.where.mockResolvedValue(undefined);
  });

  it("deletes pending invite when owner cancels", async () => {
    await vehicleInviteService.cancelInvite("invite-uuid-1", "owner-1");

    expect(mockDelete.where).toHaveBeenCalled();
  });

  it("throws NotFoundError for non-existent invite", async () => {
    mockFindFirstInvite.mockResolvedValue(null);

    await expect(
      vehicleInviteService.cancelInvite("bad-id", "owner-1")
    ).rejects.toThrow(NotFoundError);

    await expect(
      vehicleInviteService.cancelInvite("bad-id", "owner-1")
    ).rejects.toThrow("Invite not found");
  });

  it("throws ForbiddenError for non-owner", async () => {
    mockFindFirstInvite.mockResolvedValue({ ...PENDING_INVITE_FOR_CANCEL, ownerUserId: "other-user" });

    await expect(
      vehicleInviteService.cancelInvite("invite-uuid-1", "owner-1")
    ).rejects.toThrow(ForbiddenError);

    await expect(
      vehicleInviteService.cancelInvite("invite-uuid-1", "owner-1")
    ).rejects.toThrow("Not your invite");
  });

  it("throws BadRequestError when invite is not pending (e.g. already accepted)", async () => {
    mockFindFirstInvite.mockResolvedValue({ ...PENDING_INVITE_FOR_CANCEL, status: "accepted" });

    await expect(
      vehicleInviteService.cancelInvite("invite-uuid-1", "owner-1")
    ).rejects.toThrow(BadRequestError);

    await expect(
      vehicleInviteService.cancelInvite("invite-uuid-1", "owner-1")
    ).rejects.toThrow("Only pending invites can be cancelled");
  });
});
