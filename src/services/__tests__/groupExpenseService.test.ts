import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from "@/lib/errors";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockNotificationCreate,
  mockDbQuery,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockSelect,
} = vi.hoisted(() => {
  const mockInsert = { values: vi.fn().mockResolvedValue(undefined) };
  const mockUpdate = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
  const mockDelete = { where: vi.fn().mockResolvedValue(undefined) };
  const mockSelect = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  const mockDbQuery = {
    groupExpenseSessions: { findFirst: vi.fn() },
    groupExpenseSessionMembers: { findFirst: vi.fn() },
    trips: { findFirst: vi.fn() },
    users: { findFirst: vi.fn() },
  };
  return {
    mockNotificationCreate: vi.fn().mockResolvedValue(undefined),
    mockDbQuery,
    mockInsert,
    mockUpdate,
    mockDelete,
    mockSelect,
  };
});

vi.mock("@/services/notificationService", () => ({
  notificationService: { create: mockNotificationCreate },
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    query: mockDbQuery,
    insert: vi.fn(() => mockInsert),
    update: vi.fn(() => mockUpdate),
    delete: vi.fn(() => mockDelete),
    select: vi.fn(() => mockSelect),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { groupExpenseService } from "../groupExpenseService";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CREATOR_ID = "creator-uuid";
const SESSION_ID = "session-uuid";
const INVITEE_ID = "invitee-uuid";
const TRIP_ID = "trip-uuid";
const INVITE_CODE = "ABCD1234";

const baseSession = {
  id: SESSION_ID,
  title: "Ladakh 2026",
  tripId: null as string | null,
  createdBy: CREATOR_ID,
  status: "active",
  currency: "INR",
  inviteCode: INVITE_CODE,
  createdAt: new Date("2026-05-06"),
};

const baseTrip = {
  id: TRIP_ID,
  userId: CREATOR_ID,
  title: "Ladakh 2026",
};

beforeEach(() => {
  vi.resetAllMocks();
  mockInsert.values.mockReturnValue(mockInsert);
  (mockInsert as any).returning = vi.fn().mockResolvedValue([baseSession]);
  mockUpdate.set.mockReturnThis();
  mockUpdate.where.mockResolvedValue(undefined);
  mockDelete.where.mockResolvedValue(undefined);
  mockSelect.from.mockReturnThis();
  mockSelect.innerJoin.mockReturnThis();
  mockSelect.where.mockResolvedValue([]);
});

// ─── create ───────────────────────────────────────────────────────────────────

describe("groupExpenseService.create", () => {
  it("creates a standalone session and adds creator as member", async () => {
    mockDbQuery.groupExpenseSessions.findFirst
      .mockResolvedValueOnce(undefined)   // invite code uniqueness check
      .mockResolvedValueOnce(baseSession); // getSessionWithMembers
    mockSelect.where.mockResolvedValue([]);

    const result = await groupExpenseService.create(CREATOR_ID, { title: "Ladakh 2026", currency: "INR" });

    expect(result.createdBy).toBe(CREATOR_ID);
    expect(result.title).toBe("Ladakh 2026");
  });

  it("inherits trip title when tripId provided and no title given", async () => {
    mockDbQuery.trips.findFirst.mockResolvedValueOnce(baseTrip);
    mockDbQuery.groupExpenseSessions.findFirst
      .mockResolvedValueOnce(undefined)                        // invite code check
      .mockResolvedValueOnce({ ...baseSession, tripId: TRIP_ID }); // getSessionWithMembers
    mockSelect.where.mockResolvedValue([]);

    await groupExpenseService.create(CREATOR_ID, { tripId: TRIP_ID });

    const insertCall = mockInsert.values.mock.calls[0][0];
    expect(insertCall.title).toBe("Ladakh 2026");
    expect(insertCall.tripId).toBe(TRIP_ID);
  });

  it("throws ForbiddenError if trip belongs to another user", async () => {
    mockDbQuery.trips.findFirst.mockResolvedValueOnce({ ...baseTrip, userId: "other-user" });

    await expect(
      groupExpenseService.create(CREATOR_ID, { tripId: TRIP_ID })
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError if trip not found", async () => {
    mockDbQuery.trips.findFirst.mockResolvedValueOnce(undefined);

    await expect(
      groupExpenseService.create(CREATOR_ID, { tripId: TRIP_ID })
    ).rejects.toThrow(NotFoundError);
  });

  // T1: creator member insert is called
  it("adds creator as first member after session insert", async () => {
    mockDbQuery.groupExpenseSessions.findFirst
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(baseSession);
    mockSelect.where.mockResolvedValue([]);

    await groupExpenseService.create(CREATOR_ID, { title: "Test", currency: "INR" });

    const creatorMemberInsert = mockInsert.values.mock.calls.find(
      (c: any[]) => c[0]?.userId === CREATOR_ID && c[0]?.sessionId === SESSION_ID
    );
    expect(creatorMemberInsert).toBeDefined();
  });
});

// ─── joinByCode ───────────────────────────────────────────────────────────────

describe("groupExpenseService.joinByCode", () => {
  it("adds user as member when joining via valid code", async () => {
    mockDbQuery.groupExpenseSessions.findFirst
      .mockResolvedValueOnce(baseSession)  // code lookup
      .mockResolvedValueOnce(baseSession); // getSessionWithMembers
    mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValueOnce(undefined);
    mockSelect.where.mockResolvedValue([]);

    await groupExpenseService.joinByCode(INVITE_CODE, INVITEE_ID);

    const memberInsertCall = mockInsert.values.mock.calls.find(
      (c: any[]) => c[0]?.userId === INVITEE_ID
    );
    expect(memberInsertCall).toBeDefined();
  });

  it("is idempotent — does not insert when already a member", async () => {
    mockDbQuery.groupExpenseSessions.findFirst
      .mockResolvedValueOnce(baseSession)
      .mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValueOnce({ id: "m1" });
    mockSelect.where.mockResolvedValue([]);

    await groupExpenseService.joinByCode(INVITE_CODE, INVITEE_ID);

    const memberInsertCall = mockInsert.values.mock.calls.find(
      (c: any[]) => c[0]?.userId === INVITEE_ID
    );
    expect(memberInsertCall).toBeUndefined();
  });

  it("throws NotFoundError for invalid code", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(undefined);

    await expect(
      groupExpenseService.joinByCode("BADCODE1", INVITEE_ID)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws BadRequestError if session is archived", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce({
      ...baseSession,
      status: "archived",
    });

    await expect(
      groupExpenseService.joinByCode(INVITE_CODE, INVITEE_ID)
    ).rejects.toThrow(BadRequestError);
  });
});

// ─── inviteMember ─────────────────────────────────────────────────────────────

describe("groupExpenseService.inviteMember", () => {
  it("sends notification when creator invites a new user", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.users.findFirst
      .mockResolvedValueOnce({ id: INVITEE_ID, name: "Jane" })
      .mockResolvedValueOnce({ name: "John" });
    mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValueOnce(undefined);

    await groupExpenseService.inviteMember(SESSION_ID, CREATOR_ID, INVITEE_ID);

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: INVITEE_ID,
        type: "group_expense_invite",
      })
    );
  });

  it("throws ForbiddenError if non-creator attempts invite", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);

    await expect(
      groupExpenseService.inviteMember(SESSION_ID, "other-user", INVITEE_ID)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws ConflictError if user is already a member", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.users.findFirst.mockResolvedValueOnce({ id: INVITEE_ID, name: "Jane" });
    mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValueOnce({ id: "m1" });

    await expect(
      groupExpenseService.inviteMember(SESSION_ID, CREATOR_ID, INVITEE_ID)
    ).rejects.toThrow(ConflictError);
  });

  // T2: invitee userId does not exist
  it("throws NotFoundError when invitee user does not exist", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.users.findFirst.mockResolvedValueOnce(undefined);

    await expect(
      groupExpenseService.inviteMember(SESSION_ID, CREATOR_ID, INVITEE_ID)
    ).rejects.toThrow(NotFoundError);
  });

  // C3: self-invite guard
  it("throws BadRequestError when creator invites themselves", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);

    await expect(
      groupExpenseService.inviteMember(SESSION_ID, CREATOR_ID, CREATOR_ID)
    ).rejects.toThrow(BadRequestError);
  });
});

// ─── removeMember ─────────────────────────────────────────────────────────────

describe("groupExpenseService.removeMember", () => {
  it("removes a member from the session", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValueOnce({ id: "m1" });

    await groupExpenseService.removeMember(SESSION_ID, CREATOR_ID, INVITEE_ID);

    expect(mockDelete.where).toHaveBeenCalled();
  });

  it("throws ForbiddenError if non-creator tries to remove", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);

    await expect(
      groupExpenseService.removeMember(SESSION_ID, "other-user", INVITEE_ID)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws BadRequestError if creator tries to remove themselves", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);

    await expect(
      groupExpenseService.removeMember(SESSION_ID, CREATOR_ID, CREATOR_ID)
    ).rejects.toThrow(BadRequestError);
  });

  it("throws NotFoundError if target is not a member", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(undefined);
    mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValueOnce(undefined);

    await expect(
      groupExpenseService.removeMember(SESSION_ID, CREATOR_ID, INVITEE_ID)
    ).rejects.toThrow(NotFoundError);
  });

  // T3: archived session blocks removal
  it("throws BadRequestError when session is archived", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce({
      ...baseSession,
      status: "archived",
    });

    await expect(
      groupExpenseService.removeMember(SESSION_ID, CREATOR_ID, INVITEE_ID)
    ).rejects.toThrow(BadRequestError);
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe("groupExpenseService.getById", () => {
  // T4: full coverage for getById
  it("returns session with members for a valid member", async () => {
    mockDbQuery.groupExpenseSessions.findFirst
      .mockResolvedValueOnce(baseSession)  // initial session fetch in getById
      .mockResolvedValueOnce(baseSession); // second fetch inside getSessionWithMembers
    mockDbQuery.groupExpenseSessionMembers.findFirst
      .mockResolvedValueOnce({ id: "m1" }); // membership check passes
    mockSelect.where.mockResolvedValue([]);

    const result = await groupExpenseService.getById(SESSION_ID, CREATOR_ID);

    expect(result.id).toBe(SESSION_ID);
  });

  it("throws ForbiddenError for a non-member", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValueOnce(undefined);

    await expect(
      groupExpenseService.getById(SESSION_ID, "outsider-uuid")
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError for a missing session", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(undefined);

    await expect(
      groupExpenseService.getById(SESSION_ID, CREATOR_ID)
    ).rejects.toThrow(NotFoundError);
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe("groupExpenseService.update", () => {
  // T5: full coverage for update
  it("allows creator to update title", async () => {
    mockDbQuery.groupExpenseSessions.findFirst
      .mockResolvedValueOnce(baseSession)
      .mockResolvedValueOnce({ ...baseSession, title: "New Title" });
    mockSelect.where.mockResolvedValue([]);

    await groupExpenseService.update(SESSION_ID, CREATOR_ID, { title: "New Title" });

    expect(mockUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New Title" })
    );
  });

  it("throws ForbiddenError for non-creator", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);

    await expect(
      groupExpenseService.update(SESSION_ID, "other-user", { title: "X" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError for missing session", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(undefined);

    await expect(
      groupExpenseService.update(SESSION_ID, CREATOR_ID, { title: "X" })
    ).rejects.toThrow(NotFoundError);
  });

  // C4: un-archive guard
  it("throws BadRequestError when attempting to reactivate an archived session", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce({
      ...baseSession,
      status: "archived",
    });

    await expect(
      groupExpenseService.update(SESSION_ID, CREATOR_ID, { status: "active" })
    ).rejects.toThrow(BadRequestError);
  });
});
