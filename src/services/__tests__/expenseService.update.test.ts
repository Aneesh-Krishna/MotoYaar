import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockFindFirst, mockReturning, mockCopyObject, mockDeleteObject } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockReturning: vi.fn(),
  mockCopyObject: vi.fn().mockResolvedValue(undefined),
  mockDeleteObject: vi.fn().mockResolvedValue(undefined),
}));

const mockUpdate = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: mockReturning,
};

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      expenses: { findFirst: mockFindFirst },
    },
    update: vi.fn(() => mockUpdate),
  },
}));

vi.mock("@/lib/r2", () => ({
  copyObject: mockCopyObject,
  deleteObject: mockDeleteObject,
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { expenseService } from "../expenseService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EXPENSE_ID = "expense-uuid-1";
const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const OLD_RECEIPT_KEY = `${USER_ID}/receipts/${EXPENSE_ID}/old.jpg`;
const TEMP_KEY = `${USER_ID}/receipts/temp/new-uuid.jpg`;

function makeDbRow(overrides: Partial<{
  id: string;
  userId: string;
  tripId: string | null;
  price: string;
  reason: string;
  whereText: string | null;
  comment: string | null;
  receiptKey: string | null;
  receiptUrl: string | null;
}> = {}) {
  return {
    id: overrides.id ?? EXPENSE_ID,
    userId: overrides.userId ?? USER_ID,
    vehicleId: "vehicle-1",
    tripId: overrides.tripId ?? null,
    price: overrides.price ?? "500.00",
    currency: "INR",
    date: "2026-03-21",
    reason: overrides.reason ?? "Service",
    whereText: overrides.whereText ?? null,
    comment: overrides.comment ?? null,
    receiptUrl: overrides.receiptUrl ?? null,
    receiptKey: overrides.receiptKey ?? null,
    createdAt: new Date("2026-03-21T10:00:00Z"),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("expenseService.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.set.mockReturnThis();
    mockUpdate.where.mockReturnThis();
    mockCopyObject.mockResolvedValue(undefined);
    mockDeleteObject.mockResolvedValue(undefined);
  });

  it("updates expense fields for owner", async () => {
    const existingRow = makeDbRow();
    const updatedRow = makeDbRow({ price: "750.00", whereText: "New place" });

    mockFindFirst.mockResolvedValue(existingRow);
    mockReturning.mockResolvedValue([updatedRow]);

    const result = await expenseService.update(EXPENSE_ID, USER_ID, {
      price: 750,
      whereText: "New place",
    });

    expect(result.price).toBe(750);
    expect(result.whereText).toBe("New place");
    expect(result.createdAt).toBe("2026-03-21T10:00:00.000Z");
  });

  it("throws NotFoundError when expense does not exist", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      expenseService.update(EXPENSE_ID, USER_ID, { price: 100 })
    ).rejects.toThrow(NotFoundError);

    expect(mockUpdate.set).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError for non-owner", async () => {
    mockFindFirst.mockResolvedValue(makeDbRow({ userId: USER_ID }));

    await expect(
      expenseService.update(EXPENSE_ID, OTHER_USER_ID, { price: 100 })
    ).rejects.toThrow(ForbiddenError);

    expect(mockUpdate.set).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError for trip-linked expense", async () => {
    mockFindFirst.mockResolvedValue(makeDbRow({ tripId: "trip-uuid-1" }));

    await expect(
      expenseService.update(EXPENSE_ID, USER_ID, { price: 100 })
    ).rejects.toThrow(ForbiddenError);

    expect(mockUpdate.set).not.toHaveBeenCalled();
  });

  it("deletes old receipt and moves new temp to permanent on replace", async () => {
    const permanentKey = `${USER_ID}/receipts/${EXPENSE_ID}/finalized.jpg`;
    mockFindFirst.mockResolvedValue(
      makeDbRow({ receiptKey: OLD_RECEIPT_KEY, receiptUrl: OLD_RECEIPT_KEY })
    );
    mockReturning.mockResolvedValue([
      makeDbRow({ receiptKey: permanentKey, receiptUrl: permanentKey }),
    ]);

    const result = await expenseService.update(EXPENSE_ID, USER_ID, {
      tempReceiptKey: TEMP_KEY,
    });

    expect(mockDeleteObject).toHaveBeenCalledWith(OLD_RECEIPT_KEY);
    expect(mockCopyObject).toHaveBeenCalledWith(TEMP_KEY, expect.stringMatching(
      new RegExp(`^${USER_ID}/receipts/${EXPENSE_ID}/.+\\.jpg$`)
    ));
    expect(mockDeleteObject).toHaveBeenCalledWith(TEMP_KEY);
    expect(result.receiptKey).toBe(permanentKey);
  });

  it("attaches receipt when no previous receipt existed", async () => {
    const permanentKey = `${USER_ID}/receipts/${EXPENSE_ID}/first.jpg`;
    mockFindFirst.mockResolvedValue(makeDbRow());
    mockReturning.mockResolvedValue([
      makeDbRow({ receiptKey: permanentKey, receiptUrl: permanentKey }),
    ]);

    await expenseService.update(EXPENSE_ID, USER_ID, { tempReceiptKey: TEMP_KEY });

    expect(mockDeleteObject).not.toHaveBeenCalledWith(OLD_RECEIPT_KEY);
    expect(mockCopyObject).toHaveBeenCalledWith(TEMP_KEY, expect.any(String));
  });

  it("deletes receipt from R2 and clears DB fields on removeReceipt", async () => {
    mockFindFirst.mockResolvedValue(
      makeDbRow({ receiptKey: OLD_RECEIPT_KEY, receiptUrl: OLD_RECEIPT_KEY })
    );
    mockReturning.mockResolvedValue([makeDbRow()]);

    const result = await expenseService.update(EXPENSE_ID, USER_ID, {
      removeReceipt: true,
    });

    expect(mockDeleteObject).toHaveBeenCalledWith(OLD_RECEIPT_KEY);
    expect(result.receiptKey).toBeUndefined();
  });

  it("throws ForbiddenError when tempReceiptKey does not belong to user", async () => {
    mockFindFirst.mockResolvedValue(makeDbRow());

    await expect(
      expenseService.update(EXPENSE_ID, USER_ID, {
        tempReceiptKey: "other-user/receipts/temp/evil.jpg",
      })
    ).rejects.toThrow(ForbiddenError);

    expect(mockCopyObject).not.toHaveBeenCalled();
  });
});
