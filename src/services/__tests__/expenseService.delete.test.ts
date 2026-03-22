import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockFindFirst, mockDeleteObject, mockLoggerError } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockDeleteObject: vi.fn().mockResolvedValue(undefined),
  mockLoggerError: vi.fn(),
}));

const mockDeleteChain = {
  where: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      expenses: { findFirst: mockFindFirst },
    },
    delete: vi.fn(() => mockDeleteChain),
  },
}));

vi.mock("@/lib/r2", () => ({
  deleteObject: mockDeleteObject,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: mockLoggerError },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { expenseService } from "../expenseService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EXPENSE_ID = "expense-uuid-1";
const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const RECEIPT_KEY = "user-1/receipts/expense-uuid-1/abc.jpg";

function makeDbRow(overrides: Partial<{
  userId: string;
  tripId: string | null;
  receiptUrl: string | null;
  receiptKey: string | null;
}> = {}) {
  return {
    id: EXPENSE_ID,
    userId: overrides.userId ?? USER_ID,
    vehicleId: "vehicle-1",
    tripId: overrides.tripId ?? null,
    price: "500.00",
    currency: "INR",
    date: "2026-03-21",
    reason: "Service",
    whereText: null,
    comment: null,
    receiptUrl: overrides.receiptUrl ?? null,
    receiptKey: overrides.receiptKey ?? null,
    createdAt: new Date("2026-03-21T10:00:00Z"),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("expenseService.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteChain.where.mockResolvedValue(undefined);
    mockDeleteObject.mockResolvedValue(undefined);
  });

  it("deletes expense for owner", async () => {
    mockFindFirst.mockResolvedValue(makeDbRow());

    await expect(expenseService.delete(EXPENSE_ID, USER_ID)).resolves.toBeUndefined();

    expect(mockDeleteChain.where).toHaveBeenCalled();
  });

  it("throws NotFoundError when expense does not exist", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(expenseService.delete(EXPENSE_ID, USER_ID)).rejects.toThrow(NotFoundError);

    expect(mockDeleteChain.where).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError for non-owner", async () => {
    mockFindFirst.mockResolvedValue(makeDbRow({ userId: USER_ID }));

    await expect(expenseService.delete(EXPENSE_ID, OTHER_USER_ID)).rejects.toThrow(ForbiddenError);

    expect(mockDeleteChain.where).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError for trip-linked expense", async () => {
    mockFindFirst.mockResolvedValue(makeDbRow({ tripId: "trip-uuid-1" }));

    await expect(expenseService.delete(EXPENSE_ID, USER_ID)).rejects.toThrow(ForbiddenError);

    expect(mockDeleteChain.where).not.toHaveBeenCalled();
  });

  it("deletes receipt from R2 before removing expense record", async () => {
    mockFindFirst.mockResolvedValue(
      makeDbRow({ receiptKey: RECEIPT_KEY, receiptUrl: RECEIPT_KEY })
    );

    await expenseService.delete(EXPENSE_ID, USER_ID);

    expect(mockDeleteObject).toHaveBeenCalledWith(RECEIPT_KEY);
    expect(mockDeleteChain.where).toHaveBeenCalled();
  });

  it("still deletes expense record when R2 deletion fails", async () => {
    mockFindFirst.mockResolvedValue(
      makeDbRow({ receiptKey: RECEIPT_KEY, receiptUrl: RECEIPT_KEY })
    );
    mockDeleteObject.mockRejectedValue(new Error("R2 error"));

    await expenseService.delete(EXPENSE_ID, USER_ID);

    expect(mockLoggerError).toHaveBeenCalled();
    expect(mockDeleteChain.where).toHaveBeenCalled();
  });

  it("skips R2 deletion when expense has no receipt", async () => {
    mockFindFirst.mockResolvedValue(makeDbRow());

    await expenseService.delete(EXPENSE_ID, USER_ID);

    expect(mockDeleteObject).not.toHaveBeenCalled();
    expect(mockDeleteChain.where).toHaveBeenCalled();
  });
});
