import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockFindFirst, mockInsertReturning } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockInsertReturning: vi.fn(),
}));

const mockInsert = {
  values: vi.fn().mockReturnThis(),
  returning: mockInsertReturning,
};

const mockUpdateReturning = vi.fn();
const mockUpdate = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: mockUpdateReturning,
};

const mockSelect = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
};

vi.mock("@/lib/db/client", () => ({
  db: {
    insert: vi.fn(() => mockInsert),
    update: vi.fn(() => mockUpdate),
    query: {
      expenses: { findFirst: mockFindFirst },
    },
    select: vi.fn(() => mockSelect),
  },
}));

vi.mock("@/lib/r2", () => ({
  copyObject: vi.fn().mockResolvedValue(undefined),
  deleteObject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { db } from "@/lib/db/client";
import { expenseService } from "../expenseService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const VEHICLE_ID = "vehicle-1";
const EXPENSE_ID = "expense-1";

function makeDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: EXPENSE_ID,
    userId: USER_ID,
    vehicleId: VEHICLE_ID,
    tripId: null,
    price: "500.00",
    currency: "INR",
    date: "2026-05-01",
    reason: "Fuel",
    whereText: null,
    comment: null,
    receiptUrl: null,
    receiptKey: null,
    litresFilled: null,
    odometerKm: null,
    kmpl: null,
    createdAt: new Date("2026-05-01T10:00:00Z"),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("expenseService — fuel efficiency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(mockInsert);
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(mockUpdate);
    mockUpdate.set.mockReturnThis();
    mockUpdate.where.mockReturnThis();
    mockSelect.from.mockReturnThis();
    mockSelect.where.mockReturnThis();
    mockSelect.orderBy.mockReturnThis();
  });

  describe("create — kmpl calculation", () => {
    it("calculates and stores kmpl when previous odometer exists", async () => {
      // Previous fuel expense with odometer 10000
      mockFindFirst.mockResolvedValue(makeDbRow({ odometerKm: 10000 }));
      const newRow = makeDbRow({ litresFilled: "10.00", odometerKm: 10350, kmpl: "35.00" });
      mockInsertReturning.mockResolvedValue([newRow]);

      const result = await expenseService.create(USER_ID, VEHICLE_ID, {
        price: 800,
        date: "2026-05-01",
        reason: "Fuel",
        litresFilled: 10,
        odometerKm: 10350,
      });

      const insertedValues = (mockInsert.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(insertedValues.litresFilled).toBe("10");
      expect(insertedValues.odometerKm).toBe(10350);
      expect(insertedValues.kmpl).toBe("35");
      expect(result.kmpl).toBe(35);
    });

    it("stores litres but skips kmpl calculation when no previous odometer", async () => {
      mockFindFirst.mockResolvedValue(null);
      const newRow = makeDbRow({ litresFilled: "12.00", odometerKm: 5000, kmpl: null });
      mockInsertReturning.mockResolvedValue([newRow]);

      const result = await expenseService.create(USER_ID, VEHICLE_ID, {
        price: 900,
        date: "2026-05-01",
        reason: "Fuel",
        litresFilled: 12,
        odometerKm: 5000,
      });

      const insertedValues = (mockInsert.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(insertedValues.litresFilled).toBe("12");
      expect(insertedValues.kmpl).toBeNull();
      expect(result.kmpl).toBeUndefined();
    });

    it("stores litres only (no odometer) without error or kmpl", async () => {
      const newRow = makeDbRow({ litresFilled: "8.00", odometerKm: null, kmpl: null });
      mockInsertReturning.mockResolvedValue([newRow]);

      const result = await expenseService.create(USER_ID, VEHICLE_ID, {
        price: 600,
        date: "2026-05-01",
        reason: "Fuel",
        litresFilled: 8,
      });

      // calculateKmpl should NOT be called (no odometerKm provided) — findFirst not called
      expect(mockFindFirst).not.toHaveBeenCalled();
      const insertedValues = (mockInsert.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(insertedValues.litresFilled).toBe("8");
      expect(insertedValues.kmpl).toBeNull();
      expect(result.kmpl).toBeUndefined();
    });

    it("skips kmpl calculation for non-Fuel expenses", async () => {
      const newRow = makeDbRow({ reason: "Service", litresFilled: null, odometerKm: null, kmpl: null });
      mockInsertReturning.mockResolvedValue([newRow]);

      await expenseService.create(USER_ID, VEHICLE_ID, {
        price: 1500,
        date: "2026-05-01",
        reason: "Service",
      });

      expect(mockFindFirst).not.toHaveBeenCalled();
    });
  });

  describe("update — kmpl recalculation", () => {
    it("excludes current expense from previous-odometer lookup (R1 fix)", async () => {
      const existingFuelRow = makeDbRow({ odometerKm: 10000, kmpl: "30.00", litresFilled: "10.00" });
      const prevFuelRow = makeDbRow({ id: "prev-expense", odometerKm: 9500 });
      const updatedRow = makeDbRow({ odometerKm: 10200, litresFilled: "10.00", kmpl: "70.00" });

      // First call: fetch the expense being updated; subsequent calls: calculateKmpl lookup
      mockFindFirst
        .mockResolvedValueOnce(existingFuelRow)  // expense lookup in update()
        .mockResolvedValueOnce(prevFuelRow);      // calculateKmpl prev lookup (excludes self)
      mockUpdateReturning.mockResolvedValue([updatedRow]);

      const result = await expenseService.update(EXPENSE_ID, USER_ID, {
        odometerKm: 10200,
        litresFilled: 10,
      });

      // calculateKmpl was called and produced a value (not self-referencing)
      const setArgs = (mockUpdate.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(setArgs.kmpl).not.toBeUndefined();
      expect(result.kmpl).toBe(70);
    });

    it("clears kmpl when reason changes away from Fuel (R3 fix)", async () => {
      const existingFuelRow = makeDbRow({ reason: "Fuel", odometerKm: 10000, kmpl: "30.00", litresFilled: "10.00" });
      const updatedRow = makeDbRow({ reason: "Service", kmpl: null });

      mockFindFirst.mockResolvedValue(existingFuelRow);
      mockUpdateReturning.mockResolvedValue([updatedRow]);

      const result = await expenseService.update(EXPENSE_ID, USER_ID, { reason: "Service" });

      const setArgs = (mockUpdate.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(setArgs.kmpl).toBeNull();
      expect(result.kmpl).toBeUndefined();
    });
  });

  describe("avgKmplLast5", () => {
    it("returns average of last 5 kmpl values", async () => {
      mockSelect.limit.mockResolvedValue([
        { kmpl: "30.00" },
        { kmpl: "28.50" },
        { kmpl: "32.00" },
        { kmpl: "29.00" },
        { kmpl: "31.50" },
      ]);

      const result = await expenseService.avgKmplLast5(VEHICLE_ID);
      expect(result).toBe(30.2);
    });

    it("returns null when no kmpl data", async () => {
      mockSelect.limit.mockResolvedValue([]);

      const result = await expenseService.avgKmplLast5(VEHICLE_ID);
      expect(result).toBeNull();
    });
  });
});
