import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError, ForbiddenError, BadRequestError } from "@/lib/errors";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockDbQuery,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockSelect,
} = vi.hoisted(() => {
  const mockInsert = { values: vi.fn().mockReturnThis(), returning: vi.fn() };
  const mockUpdate = { set: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), returning: vi.fn() };
  const mockDelete = { where: vi.fn().mockResolvedValue(undefined) };
  const mockSelect = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  const mockDbQuery = {
    groupExpenseSessions: { findFirst: vi.fn() },
    groupExpenseSessionMembers: { findFirst: vi.fn() },
    groupExpenseItems: { findFirst: vi.fn() },
    users: { findFirst: vi.fn() },
    trips: { findFirst: vi.fn() },
  };
  return { mockDbQuery, mockInsert, mockUpdate, mockDelete, mockSelect };
});

vi.mock("@/services/notificationService", () => ({
  notificationService: { create: vi.fn().mockResolvedValue(undefined) },
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

import { groupExpenseService } from "../groupExpenseService";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CREATOR_ID = "creator-uuid";
const MEMBER_ID = "member-uuid";
const SESSION_ID = "session-uuid";
const ITEM_ID = "item-uuid";

const baseSession = {
  id: SESSION_ID,
  title: "Ladakh 2026",
  tripId: null,
  createdBy: CREATOR_ID,
  status: "active",
  currency: "INR",
  inviteCode: "ABCD1234",
  createdAt: new Date("2026-05-06"),
};

const baseItem = {
  id: ITEM_ID,
  sessionId: SESSION_ID,
  loggedBy: MEMBER_ID,
  paidBy: MEMBER_ID,
  amount: "300.00",
  description: "Juice",
  category: "Food",
  includedUserIds: [MEMBER_ID, CREATOR_ID],
  createdAt: new Date("2026-05-06"),
  updatedAt: new Date("2026-05-06"),
};

// All session members returned by the select+join in addItem/updateItem
const allMembers = [
  { userId: MEMBER_ID, name: "Alice" },
  { userId: CREATOR_ID, name: "Bob" },
];

beforeEach(() => {
  vi.resetAllMocks();
  mockInsert.values.mockReturnThis();
  mockInsert.returning.mockResolvedValue([baseItem]);
  mockUpdate.set.mockReturnThis();
  mockUpdate.where.mockReturnThis();
  mockUpdate.returning.mockResolvedValue([baseItem]);
  mockDelete.where.mockResolvedValue(undefined);
  mockSelect.from.mockReturnThis();
  mockSelect.innerJoin.mockReturnThis();
  mockSelect.where.mockResolvedValue(allMembers);
});

// ─── addItem ──────────────────────────────────────────────────────────────────

describe("groupExpenseService.addItem", () => {
  it("splits equally — perPerson = amount / includedUserIds.length", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);

    const result = await groupExpenseService.addItem(SESSION_ID, MEMBER_ID, {
      paidBy: MEMBER_ID,
      amount: 300,
      description: "Juice",
      category: "Food",
      includedUserIds: [MEMBER_ID, CREATOR_ID],
    });

    expect(result.amount).toBe(300);
    expect(result.perPerson).toBe(150); // 300 / 2
    expect(result.includedUserIds).toHaveLength(2);
  });

  it("rounds perPerson to 2dp for non-divisible amounts", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockInsert.returning.mockResolvedValue([{
      ...baseItem,
      amount: "100.00",
      includedUserIds: [MEMBER_ID, CREATOR_ID, "third-uuid"],
    }]);
    mockSelect.where.mockResolvedValue([
      { userId: MEMBER_ID, name: "Alice" },
      { userId: CREATOR_ID, name: "Bob" },
      { userId: "third-uuid", name: "Carol" },
    ]);

    const result = await groupExpenseService.addItem(SESSION_ID, MEMBER_ID, {
      paidBy: MEMBER_ID,
      amount: 100,
      description: "Dinner",
      category: "Food",
      includedUserIds: [MEMBER_ID, CREATOR_ID, "third-uuid"],
    });

    // 100 / 3 = 33.333... → rounded to 33.33
    expect(result.perPerson).toBe(33.33);
  });

  it("throws ForbiddenError (403) when requester is not a session member", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    // select returns only the two known members — outsider not present
    mockSelect.where.mockResolvedValue(allMembers);

    await expect(
      groupExpenseService.addItem(SESSION_ID, "outsider-uuid", {
        paidBy: MEMBER_ID,
        amount: 100,
        description: "Toll",
        category: "Toll",
        includedUserIds: [MEMBER_ID],
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError when session does not exist", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(undefined);

    await expect(
      groupExpenseService.addItem(SESSION_ID, MEMBER_ID, {
        paidBy: MEMBER_ID,
        amount: 100,
        description: "Fuel",
        category: "Fuel",
        includedUserIds: [MEMBER_ID],
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("throws BadRequestError when paidBy is not a session member", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);

    await expect(
      groupExpenseService.addItem(SESSION_ID, MEMBER_ID, {
        paidBy: "non-member-uuid",
        amount: 100,
        description: "Stay",
        category: "Stay",
        includedUserIds: [MEMBER_ID],
      })
    ).rejects.toThrow(BadRequestError);
  });

  it("throws BadRequestError when includedUserIds contains a non-member", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);

    await expect(
      groupExpenseService.addItem(SESSION_ID, MEMBER_ID, {
        paidBy: MEMBER_ID,
        amount: 100,
        description: "Juice",
        category: "Food",
        includedUserIds: [MEMBER_ID, "phantom-user-uuid"],
      })
    ).rejects.toThrow(BadRequestError);
  });
});

// ─── updateItem ───────────────────────────────────────────────────────────────

describe("groupExpenseService.updateItem", () => {
  it("allows logged_by user to edit their own item", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseItems.findFirst.mockResolvedValueOnce(baseItem);
    mockDbQuery.users.findFirst.mockResolvedValueOnce({ name: "Alice" });

    const result = await groupExpenseService.updateItem(SESSION_ID, ITEM_ID, MEMBER_ID, {
      description: "Updated Juice",
    });

    expect(mockUpdate.set).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("allows session creator to edit any item", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseItems.findFirst.mockResolvedValueOnce(baseItem);
    mockDbQuery.users.findFirst.mockResolvedValueOnce({ name: "Alice" });

    const result = await groupExpenseService.updateItem(SESSION_ID, ITEM_ID, CREATOR_ID, {
      description: "Creator edit",
    });

    expect(result).toBeDefined();
  });

  it("validates includedUserIds against session members on update", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseItems.findFirst.mockResolvedValueOnce(baseItem);

    await expect(
      groupExpenseService.updateItem(SESSION_ID, ITEM_ID, MEMBER_ID, {
        includedUserIds: [MEMBER_ID, "phantom-uuid"],
      })
    ).rejects.toThrow(BadRequestError);
  });

  it("throws BadRequestError when PATCH sets includedUserIds to non-member list", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseItems.findFirst.mockResolvedValueOnce(baseItem);
    mockSelect.where.mockResolvedValue(allMembers);

    await expect(
      groupExpenseService.updateItem(SESSION_ID, ITEM_ID, MEMBER_ID, {
        includedUserIds: ["completely-unknown-uuid"],
      })
    ).rejects.toThrow(BadRequestError);
  });

  it("throws ForbiddenError when non-owner non-creator tries to edit", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseItems.findFirst.mockResolvedValueOnce(baseItem);

    await expect(
      groupExpenseService.updateItem(SESSION_ID, ITEM_ID, "random-user-uuid", {
        description: "Hack edit",
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError for a missing item", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseItems.findFirst.mockResolvedValueOnce(undefined);

    await expect(
      groupExpenseService.updateItem(SESSION_ID, "missing-item", MEMBER_ID, { description: "x" })
    ).rejects.toThrow(NotFoundError);
  });
});

// ─── deleteItem ───────────────────────────────────────────────────────────────

describe("groupExpenseService.deleteItem", () => {
  it("allows logged_by user to delete their own item", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseItems.findFirst.mockResolvedValueOnce(baseItem);

    await groupExpenseService.deleteItem(SESSION_ID, ITEM_ID, MEMBER_ID);

    expect(mockDelete.where).toHaveBeenCalled();
  });

  it("allows session creator to delete any item", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseItems.findFirst.mockResolvedValueOnce(baseItem);

    await groupExpenseService.deleteItem(SESSION_ID, ITEM_ID, CREATOR_ID);

    expect(mockDelete.where).toHaveBeenCalled();
  });

  it("throws ForbiddenError when non-owner non-creator tries to delete", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseItems.findFirst.mockResolvedValueOnce(baseItem);

    await expect(
      groupExpenseService.deleteItem(SESSION_ID, ITEM_ID, "random-user-uuid")
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError for a missing item", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseItems.findFirst.mockResolvedValueOnce(undefined);

    await expect(
      groupExpenseService.deleteItem(SESSION_ID, "missing-item", MEMBER_ID)
    ).rejects.toThrow(NotFoundError);
  });
});

// ─── listItems ────────────────────────────────────────────────────────────────

describe("groupExpenseService.listItems", () => {
  it("returns items for a session member", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValueOnce({ id: "m1" });
    mockSelect.where.mockResolvedValue([
      {
        id: ITEM_ID,
        sessionId: SESSION_ID,
        loggedBy: MEMBER_ID,
        paidBy: MEMBER_ID,
        paidByName: "Alice",
        amount: "300.00",
        description: "Juice",
        category: "Food",
        includedUserIds: [MEMBER_ID, CREATOR_ID],
        createdAt: new Date("2026-05-06"),
        updatedAt: new Date("2026-05-06"),
      },
    ]);

    const result = await groupExpenseService.listItems(SESSION_ID, MEMBER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].perPerson).toBe(150);
  });

  it("returns correct perPerson for non-divisible amounts", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValueOnce({ id: "m1" });
    mockSelect.where.mockResolvedValue([
      {
        id: ITEM_ID,
        sessionId: SESSION_ID,
        loggedBy: MEMBER_ID,
        paidBy: MEMBER_ID,
        paidByName: "Alice",
        amount: "100.00",
        description: "Dinner",
        category: "Food",
        includedUserIds: [MEMBER_ID, CREATOR_ID, "third-uuid"],
        createdAt: new Date("2026-05-06"),
        updatedAt: new Date("2026-05-06"),
      },
    ]);

    const result = await groupExpenseService.listItems(SESSION_ID, MEMBER_ID);

    // 100 / 3 = 33.333... → rounded to 33.33
    expect(result[0].perPerson).toBe(33.33);
  });

  it("throws ForbiddenError for a non-member", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValueOnce(baseSession);
    mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValueOnce(undefined);

    await expect(
      groupExpenseService.listItems(SESSION_ID, "outsider-uuid")
    ).rejects.toThrow(ForbiddenError);
  });
});
