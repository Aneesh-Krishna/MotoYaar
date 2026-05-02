import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError } from "@/lib/errors";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockGetWithAccessCheck } = vi.hoisted(() => ({
  mockGetWithAccessCheck: vi.fn(),
}));

vi.mock("@/services/vehicleService", () => ({
  vehicleService: {
    getWithAccessCheck: mockGetWithAccessCheck,
  },
}));

// Shared mock tx insert chain
const mockTripInsert = {
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

const mockExpenseInsert = {
  values: vi.fn().mockResolvedValue(undefined),
};

const mockTx = {
  insert: vi.fn(),
};

vi.mock("@/lib/db/client", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { db } from "@/lib/db/client";
import { tripService } from "../tripService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-uuid-1";
const VEHICLE_ID = "vehicle-uuid-1";
const TRIP_ID = "trip-uuid-1";

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
    breakdown: [],
    createdAt: new Date("2026-03-20T10:00:00Z"),
  };
}

function setupTransaction(tripRow: ReturnType<typeof makeTripRow>) {
  mockTripInsert.returning.mockResolvedValue([tripRow]);

  // tx.insert() returns different chains depending on the table
  // First call → trips insert chain, subsequent calls → expenses insert chain
  let insertCallCount = 0;
  mockTx.insert.mockImplementation(() => {
    insertCallCount++;
    if (insertCallCount === 1) return mockTripInsert;
    return mockExpenseInsert;
  });

  (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx)
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("tripService.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWithAccessCheck.mockResolvedValue({ id: VEHICLE_ID, userId: USER_ID });
    mockExpenseInsert.values.mockResolvedValue(undefined);
  });

  it("creates trip with no expense when breakdown is empty", async () => {
    const tripRow = makeTripRow();
    setupTransaction(tripRow);

    const result = await tripService.create(USER_ID, {
      title: "Pune to Mumbai",
      startDate: "2026-03-20",
      breakdown: [],
    });

    expect(db.transaction).toHaveBeenCalledOnce();
    // Trip insert should happen
    expect(mockTx.insert).toHaveBeenCalledTimes(1);
    // No expense insert
    expect(mockExpenseInsert.values).not.toHaveBeenCalled();

    expect(result.id).toBe(TRIP_ID);
    expect(result.userId).toBe(USER_ID);
    expect(result.title).toBe("Pune to Mumbai");
  });

  it("creates trip + vehicle expense when vehicle linked and breakdown has amounts", async () => {
    const tripRow = makeTripRow({ vehicleId: VEHICLE_ID });
    setupTransaction(tripRow);

    await tripService.create(USER_ID, {
      title: "Pune to Mumbai",
      startDate: "2026-03-20",
      vehicleId: VEHICLE_ID,
      breakdown: [
        { category: "Fuel", amount: 500 },
        { category: "Food", amount: 300 },
      ],
    });

    // Vehicle access check called
    expect(mockGetWithAccessCheck).toHaveBeenCalledWith(VEHICLE_ID, USER_ID);

    // Both trip and expense inserts
    expect(mockTx.insert).toHaveBeenCalledTimes(2);

    // Verify expense insert values
    const expenseValues = (mockExpenseInsert.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(expenseValues.price).toBe("800");
    expect(expenseValues.reason).toBe("Trip");
    expect(expenseValues.vehicleId).toBe(VEHICLE_ID);
    expect(expenseValues.whereText).toBe("Pune to Mumbai");
  });

  it("creates trip + general expense when createGeneralExpense=true and no vehicle", async () => {
    const tripRow = makeTripRow({ vehicleId: null });
    setupTransaction(tripRow);

    await tripService.create(USER_ID, {
      title: "Solo Walk",
      startDate: "2026-03-20",
      breakdown: [{ category: "Food", amount: 200 }],
      createGeneralExpense: true,
    });

    // No vehicle → no access check
    expect(mockGetWithAccessCheck).not.toHaveBeenCalled();

    // Both trip and expense inserts
    expect(mockTx.insert).toHaveBeenCalledTimes(2);

    const expenseValues = (mockExpenseInsert.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(expenseValues.vehicleId).toBeNull();
    expect(expenseValues.price).toBe("200");
    expect(expenseValues.reason).toBe("Trip");
  });

  it("trip-created expense has tripId set to the new trip's id", async () => {
    const tripRow = makeTripRow({ vehicleId: VEHICLE_ID });
    setupTransaction(tripRow);

    await tripService.create(USER_ID, {
      title: "Pune to Mumbai",
      startDate: "2026-03-20",
      vehicleId: VEHICLE_ID,
      breakdown: [{ category: "Toll", amount: 150 }],
    });

    const expenseValues = (mockExpenseInsert.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(expenseValues.tripId).toBe(TRIP_ID);
  });

  it("throws ForbiddenError when vehicleId does not belong to user", async () => {
    mockGetWithAccessCheck.mockRejectedValue(
      new ForbiddenError("You do not have access to this vehicle")
    );

    await expect(
      tripService.create(USER_ID, {
        title: "Hijacked Trip",
        startDate: "2026-03-20",
        vehicleId: "other-users-vehicle-id",
        breakdown: [{ category: "Fuel", amount: 500 }],
      })
    ).rejects.toThrow(ForbiddenError);

    // Transaction must NOT be called if access check fails
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("does not create expense when breakdown has amounts but createGeneralExpense is false", async () => {
    const tripRow = makeTripRow({ vehicleId: null });
    setupTransaction(tripRow);

    await tripService.create(USER_ID, {
      title: "No Expense Trip",
      startDate: "2026-03-20",
      breakdown: [{ category: "Fuel", amount: 500 }],
      createGeneralExpense: false,
    });

    // Only trip insert, no expense
    expect(mockTx.insert).toHaveBeenCalledTimes(1);
    expect(mockExpenseInsert.values).not.toHaveBeenCalled();
  });
});
