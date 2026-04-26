import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError } from "@/lib/errors";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockFindMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      expenses: { findMany: mockFindMany },
    },
  },
}));

vi.mock("@/services/vehicleService", () => ({
  vehicleService: {
    getWithAccessCheck: vi.fn().mockResolvedValue({ id: "vehicle-1", userId: "user-1" }),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { expenseService } from "../expenseService";
import { vehicleService } from "@/services/vehicleService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const VEHICLE_ID = "vehicle-1";

function makeExpenseRow(overrides: {
  id?: string;
  date?: string;
  price?: string;
  reason?: string;
  whereText?: string | null;
  receiptUrl?: string | null;
} = {}) {
  return {
    id: overrides.id ?? "expense-1",
    userId: USER_ID,
    vehicleId: VEHICLE_ID,
    tripId: null,
    price: overrides.price ?? "500.00",
    currency: "INR",
    date: overrides.date ?? "2026-03-21",
    reason: overrides.reason ?? "Service",
    whereText: overrides.whereText ?? null,
    comment: null,
    receiptUrl: overrides.receiptUrl ?? null,
    createdAt: new Date("2026-03-21T10:00:00Z"),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("expenseService.listByVehicle()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns expenses sorted by date DESC", async () => {
    const newer = makeExpenseRow({ id: "exp-newer", date: "2026-03-21" });
    const older = makeExpenseRow({ id: "exp-older", date: "2026-01-10" });
    // Drizzle orderBy is applied DB-side; mock returns already-sorted rows
    mockFindMany.mockResolvedValue([newer, older]);

    const result = await expenseService.listByVehicle(VEHICLE_ID, USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("exp-newer");
    expect(result[1].id).toBe("exp-older");
  });

  it("throws ForbiddenError for non-owner without access", async () => {
    vi.mocked(vehicleService.getWithAccessCheck).mockRejectedValueOnce(
      new ForbiddenError("Access denied")
    );

    await expect(expenseService.listByVehicle(VEHICLE_ID, "other-user")).rejects.toThrow(
      ForbiddenError
    );
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});
