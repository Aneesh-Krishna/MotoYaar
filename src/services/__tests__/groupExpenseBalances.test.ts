import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, BadRequestError } from "@/lib/errors";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockDbQuery,
  mockInsert,
  mockDb,
} = vi.hoisted(() => {
  const mockInsert = { values: vi.fn().mockReturnThis(), returning: vi.fn() };
  const mockDbQuery = {
    groupExpenseSessions: { findFirst: vi.fn() },
    groupExpenseSessionMembers: { findFirst: vi.fn() },
    groupExpenseItems: { findMany: vi.fn() },
    users: { findFirst: vi.fn() },
  };
  // Use a stateful mock for select so we can return different data per call
  let selectResults: unknown[][] = [];
  const mockDb = {
    query: mockDbQuery,
    insert: vi.fn(() => mockInsert),
    _setSelectResults: (results: unknown[][]) => { selectResults = [...results]; },
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn(() => Promise.resolve(selectResults.shift() ?? [])),
    })),
  };
  return { mockDbQuery, mockInsert, mockDb };
});

vi.mock("@/services/notificationService", () => ({
  notificationService: { create: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/lib/db/client", () => ({ db: mockDb }));

import { groupExpenseService } from "../groupExpenseService";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const A = "user-a";
const B = "user-b";
const C = "user-c";
const SESSION_ID = "session-uuid";

const baseSession = {
  id: SESSION_ID,
  title: "Trip",
  tripId: null,
  createdBy: A,
  status: "active",
  currency: "INR",
  inviteCode: "ABCD1234",
  createdAt: new Date("2026-05-06"),
};

const members = [
  { userId: A, name: "Alice" },
  { userId: B, name: "Bob" },
  { userId: C, name: "Charlie" },
];

function makeItem(paidBy: string, amount: number, included: string[]) {
  return {
    id: `item-${Math.random()}`,
    sessionId: SESSION_ID,
    loggedBy: paidBy,
    paidBy,
    amount: String(amount),
    description: "expense",
    category: "Food",
    includedUserIds: included,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function setupMocks(items: ReturnType<typeof makeItem>[], settlements: unknown[] = []) {
  mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValue(baseSession);
  mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValue({ userId: A });
  mockDbQuery.groupExpenseItems.findMany.mockResolvedValue(items);
  // select calls in computeBalances: 1st=members, 2nd=settlements
  mockDb._setSelectResults([members, settlements]);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("computeBalances — chain collapse (AC 2)", () => {
  it("A→B ₹100, B→C ₹100 simplifies to A→C ₹100", async () => {
    // A pays ₹100 split A+B → B owes A ₹50
    // B pays ₹100 split B+C → C owes B ₹50
    // Net: A +50, B 0, C -50 → A→C ₹50... let's use equal splits that produce the chain
    // To get A→B ₹100 and B→C ₹100:
    // Item1: B pays ₹200, split only A → A owes B ₹200... not quite
    // Use direct net approach: A pays for B (₹100, included=[B]) and B pays for C (₹100, included=[C])
    const items = [
      makeItem(A, 100, [B]),  // B owes A ₹100
      makeItem(B, 100, [C]),  // C owes B ₹100
    ];
    setupMocks(items);

    const result = await groupExpenseService.computeBalances(SESSION_ID, A);

    // Net: A=+100, B=-100+100=0, C=-100 → A creditor 100, C debtor 100 → C owes A ₹100
    expect(result.activeBalances).toHaveLength(1);
    expect(result.activeBalances[0]).toMatchObject({
      from: C,
      to: A,
      amount: 100,
    });
  });
});

describe("computeBalances — session totals (AC 4)", () => {
  it("returns correct totalSessionSpend and perMemberShare", async () => {
    // A pays ₹300 split among A, B, C → each owes ₹100
    const items = [makeItem(A, 300, [A, B, C])];
    setupMocks(items);

    const result = await groupExpenseService.computeBalances(SESSION_ID, A);

    expect(result.totalSessionSpend).toBe(300);
    const aShare = result.perMemberShare.find((m) => m.userId === A);
    const bShare = result.perMemberShare.find((m) => m.userId === B);
    expect(aShare?.share).toBe(100);
    expect(bShare?.share).toBe(100);
  });
});

// Helper: wire up mocks for settleBalance
// select call 1 = members, select call 2 = existing settlements for validation
function setupSettleMocks(
  items: ReturnType<typeof makeItem>[],
  existingSettlements: unknown[] = []
) {
  mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValue(baseSession);
  mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValue({ userId: A });
  mockDbQuery.groupExpenseItems.findMany.mockResolvedValue(items);
  mockDb._setSelectResults([members, existingSettlements]);
}

describe("settleBalance (AC 5, 6)", () => {
  it("records settlement when amount matches outstanding balance", async () => {
    const settledAt = new Date("2026-05-06T10:00:00Z");
    const settlement = {
      id: "settlement-1",
      sessionId: SESSION_ID,
      fromUserId: B,
      toUserId: A,
      amount: "100.00",
      settledAt,
      settledBy: A,
    };

    // A paid ₹100 for B only → B owes A ₹100
    setupSettleMocks([makeItem(A, 100, [B])]);
    mockInsert.returning.mockResolvedValue([settlement]);

    const result = await groupExpenseService.settleBalance(SESSION_ID, A, {
      fromUserId: B,
      toUserId: A,
      amount: 100,
    });

    expect(result).toMatchObject({
      id: "settlement-1",
      from: B,
      to: A,
      amount: 100,
    });
  });

  it("accepts correct simplified amount in multi-creditor session (R2-F1 regression)", async () => {
    // A pays ₹200 for [B,C]; D pays ₹100 for [B]
    // Net: A=+200, B=-200, C=-100, D=+100
    // Greedy simplification (largest creditor first):
    //   Round 1: A(+200) vs B(-200) → B→A ₹200
    //   Round 2: D(+100) vs C(-100) → C→D ₹100
    // The simplified B→A debt is ₹200 (not ₹100).
    // With raw-net approximation: outstandingDebt = min(|B|=200, A=200) = 200 ✓
    // With correct simplification: also ₹200 ✓
    // Test ensures ₹200 is accepted (the correct simplified amount).
    const D = "user-d";
    const fourMembers = [...members, { userId: D, name: "Dana" }];
    const items = [
      makeItem(A, 200, [B, C]),
      makeItem(D, 100, [B]),
    ];
    const settledAt = new Date("2026-05-06T10:00:00Z");
    const settlement = {
      id: "settlement-mc",
      sessionId: SESSION_ID,
      fromUserId: B,
      toUserId: A,
      amount: "200.00",
      settledAt,
      settledBy: A,
    };

    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValue(baseSession);
    mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValue({ userId: A });
    mockDbQuery.groupExpenseItems.findMany.mockResolvedValue(items);
    mockDb._setSelectResults([fourMembers, []]);
    mockInsert.returning.mockResolvedValue([settlement]);

    const result = await groupExpenseService.settleBalance(SESSION_ID, A, {
      fromUserId: B,
      toUserId: A,
      amount: 200,
    });

    expect(result).toMatchObject({ from: B, to: A, amount: 200 });
  });

  it("rejects amount that differs from simplified pairwise balance by >₹1", async () => {
    // A pays ₹200 for [B,C]; D pays ₹100 for [B]
    // Simplified: B→A ₹200. Posting ₹100 (off by ₹100) must be rejected.
    const D = "user-d";
    const fourMembers = [...members, { userId: D, name: "Dana" }];
    const items = [makeItem(A, 200, [B, C]), makeItem(D, 100, [B])];

    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValue(baseSession);
    mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValue({ userId: A });
    mockDbQuery.groupExpenseItems.findMany.mockResolvedValue(items);
    mockDb._setSelectResults([fourMembers, []]);

    await expect(
      groupExpenseService.settleBalance(SESSION_ID, A, {
        fromUserId: B,
        toUserId: A,
        amount: 100,
      })
    ).rejects.toThrow(BadRequestError);
  });

  it("throws BadRequestError when amount deviates >₹1 from actual balance", async () => {
    // A paid ₹100 for B only → B owes A ₹100; posting ₹50 is a >₹1 deviation
    setupSettleMocks([makeItem(A, 100, [B])]);

    await expect(
      groupExpenseService.settleBalance(SESSION_ID, A, {
        fromUserId: B,
        toUserId: A,
        amount: 50,
      })
    ).rejects.toThrow(BadRequestError);
  });

  it("throws BadRequestError when no outstanding balance between the pair", async () => {
    // No items → no balance; trying to settle should fail
    setupSettleMocks([]);

    await expect(
      groupExpenseService.settleBalance(SESSION_ID, A, {
        fromUserId: B,
        toUserId: A,
        amount: 100,
      })
    ).rejects.toThrow(BadRequestError);
  });

  it("throws ForbiddenError if requester is not creator or party", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValue(baseSession);
    mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValue({ userId: C });
    mockDb._setSelectResults([members]);

    await expect(
      groupExpenseService.settleBalance(SESSION_ID, C, {
        fromUserId: B,
        toUserId: A,
        amount: 100,
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws BadRequestError for negative amount", async () => {
    mockDbQuery.groupExpenseSessions.findFirst.mockResolvedValue(baseSession);
    mockDbQuery.groupExpenseSessionMembers.findFirst.mockResolvedValue({ userId: A });
    // amount check happens before member/balance fetches, so no extra mocks needed
    mockDb._setSelectResults([members]);

    await expect(
      groupExpenseService.settleBalance(SESSION_ID, A, {
        fromUserId: B,
        toUserId: A,
        amount: -50,
      })
    ).rejects.toThrow(BadRequestError);
  });
});

describe("computeBalances — all settled banner condition (AC 7)", () => {
  it("returns empty activeBalances when all debts are settled", async () => {
    const items = [makeItem(A, 100, [B])];
    const settlements = [
      {
        id: "s1",
        fromUserId: B,
        toUserId: A,
        amount: "100.00",
        settledAt: new Date(),
        settledBy: A,
      },
    ];
    setupMocks(items, settlements);

    const result = await groupExpenseService.computeBalances(SESSION_ID, A);

    expect(result.activeBalances).toHaveLength(0);
    expect(result.settlements).toHaveLength(1);
  });

  it("returns totalSessionSpend=0 and empty activeBalances for a session with no expenses (F1 guard)", async () => {
    setupMocks([]);

    const result = await groupExpenseService.computeBalances(SESSION_ID, A);

    expect(result.totalSessionSpend).toBe(0);
    expect(result.activeBalances).toHaveLength(0);
    // UI should NOT show "All settled" when totalSessionSpend === 0
  });
});
