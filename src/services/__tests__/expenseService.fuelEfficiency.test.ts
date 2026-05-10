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

vi.mock("@/services/serviceReminderService", () => ({
  serviceReminderService: {
    checkKmRemindersForVehicle: vi.fn().mockResolvedValue(undefined),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { db } from "@/lib/db/client";
import { expenseService } from "../expenseService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const VEHICLE_ID = "vehicle-1";
const EXPENSE_ID = "expense-1";
const PREV_EXPENSE_ID = "prev-expense-1";

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
    serviceCenterId: null,
    deletedAt: null,
    deletedByOwner: null,
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

  describe("create — kmpl saved on previous expense", () => {
    it("calculates kmpl and saves it on the previous expense, not the new one", async () => {
      const prevRow = makeDbRow({ id: PREV_EXPENSE_ID, odometerKm: 1, litresFilled: "11.00" });
      mockFindFirst.mockResolvedValue(prevRow);
      const newRow = makeDbRow({ id: "expense-2", litresFilled: "10.00", odometerKm: 501, kmpl: null });
      mockInsertReturning.mockResolvedValue([newRow]);
      mockUpdateReturning.mockResolvedValue([{ ...prevRow, kmpl: "50.00" }]);

      const result = await expenseService.create(USER_ID, VEHICLE_ID, {
        price: 800,
        date: "2026-05-10",
        reason: "Fuel",
        litresFilled: 10,
        odometerKm: 501,
      });

      // New expense inserted with kmpl = null
      const insertedValues = (mockInsert.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(insertedValues.kmpl).toBeNull();

      // Previous expense updated with calculated kmpl: (501 - 1) / 10 = 50
      const updateCalls = (db.update as ReturnType<typeof vi.fn>).mock.calls;
      expect(updateCalls.length).toBe(1);
      const setArgs = (mockUpdate.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(setArgs.kmpl).toBe("50");

      // Returned expense has no kmpl
      expect(result.kmpl).toBeUndefined();
    });

    it("stores litres and odometer but does not update any expense when no previous fuel expense", async () => {
      mockFindFirst.mockResolvedValue(null);
      const newRow = makeDbRow({ litresFilled: "12.00", odometerKm: 5000, kmpl: null });
      mockInsertReturning.mockResolvedValue([newRow]);

      await expenseService.create(USER_ID, VEHICLE_ID, {
        price: 900,
        date: "2026-05-01",
        reason: "Fuel",
        litresFilled: 12,
        odometerKm: 5000,
      });

      const insertedValues = (mockInsert.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(insertedValues.kmpl).toBeNull();
      // No update to previous expense
      expect((db.update as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    });

    it("stores litres only (no odometer) without error or kmpl side effects", async () => {
      const newRow = makeDbRow({ litresFilled: "8.00", odometerKm: null, kmpl: null });
      mockInsertReturning.mockResolvedValue([newRow]);

      await expenseService.create(USER_ID, VEHICLE_ID, {
        price: 600,
        date: "2026-05-01",
        reason: "Fuel",
        litresFilled: 8,
      });

      expect(mockFindFirst).not.toHaveBeenCalled();
      const insertedValues = (mockInsert.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(insertedValues.kmpl).toBeNull();
      expect((db.update as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
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
      expect((db.update as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    });
  });

  describe("update — kmpl recalculated on previous expense", () => {
    it("updates kmpl on previous expense when odometer changes, excludes self from lookup", async () => {
      const existingFuelRow = makeDbRow({ id: EXPENSE_ID, odometerKm: 10000, litresFilled: "10.00", kmpl: null });
      const prevFuelRow = makeDbRow({ id: PREV_EXPENSE_ID, odometerKm: 9500, litresFilled: "8.00", kmpl: null });
      const updatedRow = makeDbRow({ id: EXPENSE_ID, odometerKm: 10200, litresFilled: "10.00", kmpl: null });

      mockFindFirst
        .mockResolvedValueOnce(existingFuelRow)  // expense lookup in update()
        .mockResolvedValueOnce(prevFuelRow);      // findPrevFuelExpense (excludes self)
      mockUpdateReturning.mockResolvedValue([updatedRow]);

      await expenseService.update(EXPENSE_ID, USER_ID, { odometerKm: 10200 });

      // kmpl on previous expense: (10200 - 9500) / 10 = 70
      const setArgsCalls = (mockUpdate.set as ReturnType<typeof vi.fn>).mock.calls;
      // First update is the expense itself (kmpl: undefined), second is the prev expense
      const prevUpdateSet = setArgsCalls.find((c: Record<string, unknown>[]) => c[0].kmpl !== undefined);
      expect(prevUpdateSet?.[0].kmpl).toBe("70");
    });

    it("clears kmpl on previous expense when reason changes away from Fuel", async () => {
      const existingFuelRow = makeDbRow({ reason: "Fuel", odometerKm: 10000, litresFilled: "10.00", kmpl: null });
      const prevFuelRow = makeDbRow({ id: PREV_EXPENSE_ID, odometerKm: 9500, litresFilled: "8.00", kmpl: "87.50" });
      const updatedRow = makeDbRow({ reason: "Service", kmpl: null });

      mockFindFirst
        .mockResolvedValueOnce(existingFuelRow)
        .mockResolvedValueOnce(prevFuelRow);
      mockUpdateReturning.mockResolvedValue([updatedRow]);

      await expenseService.update(EXPENSE_ID, USER_ID, { reason: "Service" });

      const setArgsCalls = (mockUpdate.set as ReturnType<typeof vi.fn>).mock.calls;
      const clearSet = setArgsCalls.find((c: Record<string, unknown>[]) => c[0].kmpl === null);
      expect(clearSet).toBeDefined();
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
