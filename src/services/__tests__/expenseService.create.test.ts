import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockCopyObject, mockDeleteObject, mockLoggerError } = vi.hoisted(() => ({
  mockCopyObject: vi.fn().mockResolvedValue(undefined),
  mockDeleteObject: vi.fn().mockResolvedValue(undefined),
  mockLoggerError: vi.fn(),
}));

const mockInsert = {
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

const mockUpdate = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

vi.mock("@/lib/db/client", () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(() => mockUpdate),
  },
}));

vi.mock("@/lib/r2", () => ({
  copyObject: mockCopyObject,
  deleteObject: mockDeleteObject,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: mockLoggerError },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { db } from "@/lib/db/client";
import { expenseService } from "../expenseService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const VEHICLE_ID = "vehicle-uuid-1";
const EXPENSE_ID = "expense-uuid-1";
const TEMP_KEY = `${USER_ID}/receipts/temp/abc123.jpg`;

const BASE_INPUT = {
  price: 500,
  date: "2026-03-21",
  reason: "Service" as const,
};

function makeDbRow(overrides: Partial<{
  vehicleId: string | null;
  receiptKey: string | null;
  receiptUrl: string | null;
}> = {}) {
  return {
    id: EXPENSE_ID,
    userId: USER_ID,
    vehicleId: overrides.vehicleId !== undefined ? overrides.vehicleId : VEHICLE_ID,
    tripId: null,
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

describe("expenseService.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(mockInsert);
    mockCopyObject.mockResolvedValue(undefined);
    mockDeleteObject.mockResolvedValue(undefined);
  });

  it("creates expense with vehicleId when provided", async () => {
    mockInsert.returning.mockResolvedValue([makeDbRow()]);

    const result = await expenseService.create(USER_ID, VEHICLE_ID, BASE_INPUT);

    const insertedValues = (mockInsert.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertedValues.vehicleId).toBe(VEHICLE_ID);
    expect(insertedValues.userId).toBe(USER_ID);
    expect(insertedValues.price).toBe("500");
    expect(insertedValues.currency).toBe("INR");

    expect(result.vehicleId).toBe(VEHICLE_ID);
    expect(result.price).toBe(500);
    expect(result.reason).toBe("Service");
    expect(result.createdAt).toBe("2026-03-21T10:00:00.000Z");
  });

  it("creates expense with null vehicleId when not provided", async () => {
    mockInsert.returning.mockResolvedValue([makeDbRow({ vehicleId: null })]);

    const result = await expenseService.create(USER_ID, undefined, BASE_INPUT);

    const insertedValues = (mockInsert.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertedValues.vehicleId).toBeNull();
    expect(result.vehicleId).toBeUndefined();
  });

  it("moves temp receipt to permanent key after create", async () => {
    const permanentKey = `${USER_ID}/receipts/${EXPENSE_ID}/finalized.jpg`;
    mockInsert.returning.mockResolvedValue([makeDbRow()]);
    mockUpdate.returning.mockResolvedValue([
      makeDbRow({ receiptKey: permanentKey, receiptUrl: permanentKey }),
    ]);

    const result = await expenseService.create(USER_ID, VEHICLE_ID, {
      ...BASE_INPUT,
      tempReceiptKey: TEMP_KEY,
    });

    expect(mockCopyObject).toHaveBeenCalledWith(TEMP_KEY, expect.stringMatching(
      new RegExp(`^${USER_ID}/receipts/${EXPENSE_ID}/.+\\.jpg$`)
    ));
    expect(mockDeleteObject).toHaveBeenCalledWith(TEMP_KEY);
    expect(result.receiptKey).toBe(permanentKey);
    expect(result.receiptUrl).toBe(permanentKey);
  });

  it("saves expense without receipt if R2 copy fails", async () => {
    mockInsert.returning.mockResolvedValue([makeDbRow()]);
    mockCopyObject.mockRejectedValue(new Error("R2 unavailable"));

    const result = await expenseService.create(USER_ID, VEHICLE_ID, {
      ...BASE_INPUT,
      tempReceiptKey: TEMP_KEY,
    });

    expect(mockLoggerError).toHaveBeenCalled();
    expect(result.receiptKey).toBeUndefined();
  });

  it("rejects tempReceiptKey not owned by the user", async () => {
    mockInsert.returning.mockResolvedValue([makeDbRow()]);

    const result = await expenseService.create(USER_ID, VEHICLE_ID, {
      ...BASE_INPUT,
      tempReceiptKey: "other-user/receipts/temp/evil.jpg",
    });

    expect(mockCopyObject).not.toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalled();
    expect(result.receiptKey).toBeUndefined();
  });
});
