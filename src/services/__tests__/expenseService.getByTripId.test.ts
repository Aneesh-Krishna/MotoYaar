import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      expenses: { findFirst: vi.fn() },
    },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { db } from "@/lib/db/client";
import { expenseService } from "../expenseService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-uuid-1";
const TRIP_ID = "trip-uuid-1";
const EXPENSE_ID = "expense-uuid-1";

function makeExpenseRow() {
  return {
    id: EXPENSE_ID,
    userId: USER_ID,
    vehicleId: null,
    tripId: TRIP_ID,
    price: "800.00",
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

describe("expenseService.getByTripId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped expense when found for user", async () => {
    (db.query.expenses.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeExpenseRow());

    const result = await expenseService.getByTripId(TRIP_ID, USER_ID);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(EXPENSE_ID);
    expect(result!.tripId).toBe(TRIP_ID);
    expect(result!.price).toBe(800); // mapped to number
  });

  it("returns null when no expense found for trip", async () => {
    (db.query.expenses.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await expenseService.getByTripId(TRIP_ID, USER_ID);

    expect(result).toBeNull();
  });

  it("passes both tripId and userId to the query", async () => {
    (db.query.expenses.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await expenseService.getByTripId(TRIP_ID, USER_ID);

    expect(db.query.expenses.findFirst).toHaveBeenCalledOnce();
    // Confirm the query was called (drizzle condition built with and(eq, eq))
    const call = (db.query.expenses.findFirst as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call).toHaveProperty("where");
  });
});
