import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockFindFirstTrip,
  mockFindManyExpenses,
  mockTxWhere,
  mockTxDelete,
  mockDbTransaction,
  mockLoggerInfo,
} = vi.hoisted(() => ({
  mockFindFirstTrip: vi.fn(),
  mockFindManyExpenses: vi.fn(),
  mockTxWhere: vi.fn(),
  mockTxDelete: vi.fn(),
  mockDbTransaction: vi.fn(),
  mockLoggerInfo: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      trips: { findFirst: mockFindFirstTrip },
      expenses: { findMany: mockFindManyExpenses },
    },
    transaction: mockDbTransaction,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: mockLoggerInfo, error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/services/vehicleService", () => ({
  vehicleService: { getWithAccessCheck: vi.fn() },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { tripService } from "../tripService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-uuid-1";
const OTHER_USER_ID = "user-uuid-2";
const TRIP_ID = "trip-uuid-1";

function makeTripRow(overrides: Partial<{ userId: string }> = {}) {
  return {
    id: TRIP_ID,
    userId: overrides.userId ?? USER_ID,
    vehicleId: null,
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

function makeExpenseRow(id = "expense-uuid-1") {
  return {
    id,
    userId: USER_ID,
    tripId: TRIP_ID,
    vehicleId: null,
    price: "500",
    currency: "INR",
    date: "2026-03-20",
    reason: "Trip",
    whereText: "Pune to Mumbai",
    comment: null,
    receiptUrl: null,
    receiptKey: null,
    createdAt: new Date(),
  };
}

// Runs the transaction callback with a mock tx object
function setupTransaction() {
  mockTxWhere.mockResolvedValue(undefined);
  mockTxDelete.mockReturnValue({ where: mockTxWhere });
  mockDbTransaction.mockImplementation(
    async (fn: (tx: { delete: typeof mockTxDelete }) => unknown) =>
      fn({ delete: mockTxDelete })
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("tripService.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTransaction();
  });

  it("deletes trip for owner when no linked expenses", async () => {
    mockFindFirstTrip.mockResolvedValue(makeTripRow());
    mockFindManyExpenses.mockResolvedValue([]);

    await tripService.delete(TRIP_ID, USER_ID);

    expect(mockDbTransaction).toHaveBeenCalledOnce();
    // Only the trip delete inside tx — no expense delete
    expect(mockTxDelete).toHaveBeenCalledTimes(1);
    expect(mockLoggerInfo).not.toHaveBeenCalled();
  });

  it("deletes all linked expenses before deleting the trip", async () => {
    mockFindFirstTrip.mockResolvedValue(makeTripRow());
    mockFindManyExpenses.mockResolvedValue([makeExpenseRow(), makeExpenseRow("expense-uuid-2")]);

    await tripService.delete(TRIP_ID, USER_ID);

    // expenses delete + trip delete = 2 tx.delete calls
    expect(mockTxDelete).toHaveBeenCalledTimes(2);
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      { tripId: TRIP_ID, count: 2 },
      "Cascade-deleted trip expenses"
    );
  });

  it("throws NotFoundError when trip does not exist", async () => {
    mockFindFirstTrip.mockResolvedValue(undefined);

    await expect(tripService.delete(TRIP_ID, USER_ID)).rejects.toThrow(NotFoundError);

    expect(mockDbTransaction).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError for non-owner", async () => {
    mockFindFirstTrip.mockResolvedValue(makeTripRow({ userId: OTHER_USER_ID }));

    await expect(tripService.delete(TRIP_ID, USER_ID)).rejects.toThrow(ForbiddenError);

    expect(mockDbTransaction).not.toHaveBeenCalled();
  });
});
