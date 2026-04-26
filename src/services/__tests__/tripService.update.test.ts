import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockTripsQueryFindFirst,
  mockExpensesQueryFindFirst,
  mockTripUpdateSet,
  mockTripUpdateReturning,
  mockExpenseUpdateSet,
  mockTxUpdate,
  mockDbTransaction,
} = vi.hoisted(() => {
  const mockTripUpdateReturning = vi.fn();
  const mockTripUpdateWhere = { returning: mockTripUpdateReturning };
  const mockTripUpdateSet = vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(mockTripUpdateWhere) });

  const mockExpenseUpdateWhere = vi.fn().mockResolvedValue(undefined);
  const mockExpenseUpdateSet = vi.fn().mockReturnValue({ where: mockExpenseUpdateWhere });

  let updateCallCount = 0;
  const mockTxUpdate = vi.fn().mockImplementation(() => {
    updateCallCount++;
    if (updateCallCount === 1) return { set: mockTripUpdateSet };
    return { set: mockExpenseUpdateSet };
  });

  const mockDbTransaction = vi.fn();

  return {
    mockTripsQueryFindFirst: vi.fn(),
    mockExpensesQueryFindFirst: vi.fn(),
    mockTripUpdateSet,
    mockTripUpdateReturning,
    mockExpenseUpdateSet,
    mockTxUpdate,
    mockDbTransaction,
  };
});

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      trips: { findFirst: mockTripsQueryFindFirst },
      expenses: { findFirst: mockExpensesQueryFindFirst },
    },
    transaction: mockDbTransaction,
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { tripService } from "../tripService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-uuid-1";
const OTHER_USER_ID = "user-uuid-2";
const VEHICLE_ID = "vehicle-uuid-1";
const NEW_VEHICLE_ID = "vehicle-uuid-2";
const TRIP_ID = "trip-uuid-1";
const EXPENSE_ID = "expense-uuid-1";

function makeTripRow(overrides: Partial<{ vehicleId: string | null }> = {}) {
  return {
    id: TRIP_ID,
    userId: USER_ID,
    vehicleId: overrides.vehicleId !== undefined ? overrides.vehicleId : VEHICLE_ID,
    title: "Pune to Mumbai",
    description: null,
    startDate: "2026-03-20",
    endDate: null,
    routeText: null,
    mapsLink: null,
    timeTaken: null,
    breakdown: [{ category: "Fuel", amount: 500 }],
    createdAt: new Date("2026-03-20T10:00:00Z"),
  };
}

function makeExpenseRow(overrides: Partial<{ vehicleId: string | null }> = {}) {
  return {
    id: EXPENSE_ID,
    userId: USER_ID,
    vehicleId: overrides.vehicleId !== undefined ? overrides.vehicleId : VEHICLE_ID,
    tripId: TRIP_ID,
    price: "500",
    currency: "INR",
    date: "2026-03-20",
    reason: "Trip",
    whereText: "Pune to Mumbai",
    comment: null,
    receiptUrl: null,
    receiptKey: null,
    createdAt: new Date("2026-03-20T10:00:00Z"),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("tripService.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset call-order tracking by re-implementing mockTxUpdate
    let updateCallCount = 0;
    const mockTripUpdateWhere = { returning: mockTripUpdateReturning };
    mockTripUpdateSet.mockReturnValue({ where: vi.fn().mockReturnValue(mockTripUpdateWhere) });

    const mockExpenseUpdateWhere = vi.fn().mockResolvedValue(undefined);
    mockExpenseUpdateSet.mockReturnValue({ where: mockExpenseUpdateWhere });

    mockTxUpdate.mockImplementation(() => {
      updateCallCount++;
      if (updateCallCount === 1) return { set: mockTripUpdateSet };
      return { set: mockExpenseUpdateSet };
    });

    // Transaction calls the callback with a mock tx object
    const mockTx = { update: mockTxUpdate };
    mockDbTransaction.mockImplementation(
      async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx)
    );

    // Default: trip update returns the default trip row
    mockTripUpdateReturning.mockResolvedValue([makeTripRow()]);
  });

  it("updates trip fields for owner", async () => {
    mockTripsQueryFindFirst.mockResolvedValue(makeTripRow());
    mockExpensesQueryFindFirst.mockResolvedValue(null);

    const result = await tripService.update(TRIP_ID, USER_ID, {
      title: "Updated Title",
      routeText: "New Route",
    });

    expect(mockDbTransaction).toHaveBeenCalledOnce();
    expect(mockTxUpdate).toHaveBeenCalledTimes(1); // trip only, no expense
    expect(mockTripUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Updated Title", routeText: "New Route" })
    );
    expect(result.id).toBe(TRIP_ID);
  });

  it("re-links expense to new vehicle when vehicleId changes", async () => {
    mockTripsQueryFindFirst.mockResolvedValue(makeTripRow({ vehicleId: VEHICLE_ID }));
    mockExpensesQueryFindFirst.mockResolvedValue(makeExpenseRow({ vehicleId: VEHICLE_ID }));
    mockTripUpdateReturning.mockResolvedValue([makeTripRow({ vehicleId: NEW_VEHICLE_ID })]);

    await tripService.update(TRIP_ID, USER_ID, { vehicleId: NEW_VEHICLE_ID });

    expect(mockDbTransaction).toHaveBeenCalledOnce();
    expect(mockTxUpdate).toHaveBeenCalledTimes(2); // trip + expense
    expect(mockExpenseUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleId: NEW_VEHICLE_ID })
    );
  });

  it("sets expense vehicleId to null when vehicle explicitly removed", async () => {
    mockTripsQueryFindFirst.mockResolvedValue(makeTripRow({ vehicleId: VEHICLE_ID }));
    mockExpensesQueryFindFirst.mockResolvedValue(makeExpenseRow({ vehicleId: VEHICLE_ID }));
    mockTripUpdateReturning.mockResolvedValue([makeTripRow({ vehicleId: null })]);

    // vehicleId: null = explicit removal (schema now accepts null for update)
    await tripService.update(TRIP_ID, USER_ID, { vehicleId: null });

    expect(mockDbTransaction).toHaveBeenCalledOnce();
    expect(mockTxUpdate).toHaveBeenCalledTimes(2); // trip + expense
    expect(mockExpenseUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleId: null })
    );
  });

  it("recalculates expense price when breakdown changes", async () => {
    mockTripsQueryFindFirst.mockResolvedValue(makeTripRow());
    mockExpensesQueryFindFirst.mockResolvedValue(makeExpenseRow());

    const newBreakdown = [
      { category: "Fuel" as const, amount: 700 },
      { category: "Food" as const, amount: 300 },
    ];
    mockTripUpdateReturning.mockResolvedValue([{ ...makeTripRow(), breakdown: newBreakdown }]);

    await tripService.update(TRIP_ID, USER_ID, { breakdown: newBreakdown });

    expect(mockDbTransaction).toHaveBeenCalledOnce();
    expect(mockTxUpdate).toHaveBeenCalledTimes(2); // trip + expense
    expect(mockExpenseUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ price: "1000" })
    );
  });

  it("does not update expense when neither vehicle nor breakdown changed", async () => {
    mockTripsQueryFindFirst.mockResolvedValue(makeTripRow());
    mockExpensesQueryFindFirst.mockResolvedValue(makeExpenseRow());
    mockTripUpdateReturning.mockResolvedValue([makeTripRow()]);

    await tripService.update(TRIP_ID, USER_ID, { title: "Just a title change" });

    expect(mockDbTransaction).toHaveBeenCalledOnce();
    expect(mockTxUpdate).toHaveBeenCalledTimes(1); // trip only, no expense
  });

  it("throws ForbiddenError for non-owner", async () => {
    mockTripsQueryFindFirst.mockResolvedValue(makeTripRow());

    await expect(
      tripService.update(TRIP_ID, OTHER_USER_ID, { title: "Hijack" })
    ).rejects.toThrow(ForbiddenError);

    expect(mockDbTransaction).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when trip does not exist", async () => {
    mockTripsQueryFindFirst.mockResolvedValue(null);

    await expect(
      tripService.update("nonexistent-id", USER_ID, { title: "Ghost" })
    ).rejects.toThrow(NotFoundError);

    expect(mockDbTransaction).not.toHaveBeenCalled();
  });
});
