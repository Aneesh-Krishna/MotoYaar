import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError } from "@/lib/errors";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockFindFirst, mockListByVehicleAndRange } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockListByVehicleAndRange: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      users: { findFirst: mockFindFirst },
    },
  },
}));

vi.mock("@/services/vehicleService", () => ({
  vehicleService: {
    getWithAccessCheck: vi.fn().mockResolvedValue({ id: "vehicle-1", name: "My Bike", userId: "user-1" }),
  },
}));

vi.mock("@/services/expenseService", () => ({
  expenseService: {
    listByVehicleAndRange: mockListByVehicleAndRange,
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { reportService } from "../reportService";
import { vehicleService } from "@/services/vehicleService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const VEHICLE_ID = "vehicle-1";

function makeExpense(overrides: {
  id?: string;
  date?: string;
  price?: number;
  reason?: string;
  currency?: string;
} = {}) {
  return {
    id: overrides.id ?? "exp-1",
    userId: USER_ID,
    vehicleId: VEHICLE_ID,
    tripId: undefined,
    price: overrides.price ?? 500,
    currency: overrides.currency ?? "INR",
    date: overrides.date ?? "2026-03-15",
    reason: overrides.reason ?? "Service",
    createdAt: "2026-03-15T10:00:00.000Z",
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("reportService.getVehicleReport()", () => {
  beforeEach(() => {
    vi.resetAllMocks(); // also clears mockResolvedValueOnce queue, not just calls
    mockFindFirst.mockResolvedValue({ id: USER_ID, currency: "INR" });
    mockListByVehicleAndRange.mockResolvedValue([]);
    vi.mocked(vehicleService.getWithAccessCheck).mockResolvedValue({
      id: VEHICLE_ID,
      name: "My Bike",
      userId: USER_ID,
      type: "2-wheeler",
      registrationNumber: "MH01AB1234",
      previousOwners: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("throws ForbiddenError when user does not own or have access to vehicle", async () => {
    vi.mocked(vehicleService.getWithAccessCheck).mockRejectedValueOnce(
      new ForbiddenError("Access denied")
    );

    await expect(
      reportService.getVehicleReport(VEHICLE_ID, "other-user", { filter: "all" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("aggregates expenses by category correctly", async () => {
    mockListByVehicleAndRange.mockResolvedValueOnce([
      makeExpense({ id: "e1", reason: "Fuel", price: 1000 }),
      makeExpense({ id: "e2", reason: "Fuel", price: 500 }),
      makeExpense({ id: "e3", reason: "Service", price: 2000 }),
    ]).mockResolvedValueOnce([]);

    const report = await reportService.getVehicleReport(VEHICLE_ID, USER_ID, { filter: "all" });

    expect(report.totalSpend).toBe(3500);
    expect(report.byCategory).toHaveLength(2);

    const service = report.byCategory.find((c) => c.category === "Service")!;
    expect(service.amount).toBe(2000);
    expect(service.count).toBe(1);
    expect(service.percentage).toBe(57); // Math.round(2000/3500*100)

    const fuel = report.byCategory.find((c) => c.category === "Fuel")!;
    expect(fuel.amount).toBe(1500);
    expect(fuel.count).toBe(2);

    // byCategory sorted descending by amount
    expect(report.byCategory[0].category).toBe("Service");
    expect(report.mostExpensiveCategory).toBe("Service");
  });

  it("returns correct monthly series for line chart", async () => {
    mockListByVehicleAndRange.mockResolvedValueOnce([
      makeExpense({ id: "e1", date: "2026-01-10", price: 500 }),
      makeExpense({ id: "e2", date: "2026-01-25", price: 300 }),
      makeExpense({ id: "e3", date: "2026-03-05", price: 1000 }),
    ]).mockResolvedValueOnce([]);

    const report = await reportService.getVehicleReport(VEHICLE_ID, USER_ID, { filter: "all" });

    expect(report.monthlyData).toHaveLength(2);
    expect(report.monthlyData[0]).toEqual({ month: "Jan 2026", amount: 800 });
    expect(report.monthlyData[1]).toEqual({ month: "Mar 2026", amount: 1000 });
  });

  it("respects date filter range — passes from/to to expenseService", async () => {
    await reportService.getVehicleReport(VEHICLE_ID, USER_ID, {
      filter: "custom",
      from: "2026-01-01",
      to: "2026-01-31",
    });

    // First call is current period
    expect(mockListByVehicleAndRange).toHaveBeenCalledWith(
      VEHICLE_ID,
      USER_ID,
      "2026-01-01",
      "2026-01-31"
    );
  });

  it("computes delta vs previous period", async () => {
    // current period: 3000, prev period: 2000
    mockListByVehicleAndRange
      .mockResolvedValueOnce([makeExpense({ price: 3000 })])
      .mockResolvedValueOnce([makeExpense({ price: 2000 })]);

    const report = await reportService.getVehicleReport(VEHICLE_ID, USER_ID, { filter: "month" });

    expect(report.totalSpend).toBe(3000);
    expect(report.prevTotalSpend).toBe(2000);
  });

  it("returns zero avgMonthlySpend when no expenses", async () => {
    mockListByVehicleAndRange.mockResolvedValue([]);

    const report = await reportService.getVehicleReport(VEHICLE_ID, USER_ID, { filter: "all" });

    expect(report.avgMonthlySpend).toBe(0);
    expect(report.totalSpend).toBe(0);
    expect(report.mostExpensiveCategory).toBeNull();
    expect(report.byCategory).toHaveLength(0);
    expect(report.monthlyData).toHaveLength(0);
  });

  it("sets hadCurrencyConversion true when any expense currency differs from user currency", async () => {
    mockFindFirst.mockResolvedValue({ id: USER_ID, currency: "INR" });
    mockListByVehicleAndRange
      .mockResolvedValueOnce([
        makeExpense({ currency: "INR" }),
        makeExpense({ currency: "USD" }),
      ])
      .mockResolvedValueOnce([]);

    const report = await reportService.getVehicleReport(VEHICLE_ID, USER_ID, { filter: "all" });

    expect(report.hadCurrencyConversion).toBe(true);
  });

  it("sets hadCurrencyConversion=false when all expenses are in user currency (INR)", async () => {
    mockFindFirst.mockResolvedValue({ id: USER_ID, currency: "INR" });
    mockListByVehicleAndRange
      .mockResolvedValueOnce([
        makeExpense({ currency: "INR", price: 1000 }),
        makeExpense({ currency: "INR", price: 500 }),
      ])
      .mockResolvedValueOnce([]);

    const report = await reportService.getVehicleReport(VEHICLE_ID, USER_ID, { filter: "all" });

    expect(report.hadCurrencyConversion).toBe(false);
  });

  it("converts USD expenses to INR totals correctly", async () => {
    // 1 USD = 1/0.012 INR ≈ 83.33 INR; 12 USD ≈ 1000 INR
    mockFindFirst.mockResolvedValue({ id: USER_ID, currency: "INR" });
    mockListByVehicleAndRange
      .mockResolvedValueOnce([makeExpense({ currency: "USD", price: 12 })])
      .mockResolvedValueOnce([]);

    const report = await reportService.getVehicleReport(VEHICLE_ID, USER_ID, { filter: "all" });

    expect(report.totalSpend).toBeCloseTo(1000, 0);
    expect(report.currency).toBe("INR");
  });

  it("sets hadCurrencyConversion=true when mixed currencies present", async () => {
    mockFindFirst.mockResolvedValue({ id: USER_ID, currency: "INR" });
    mockListByVehicleAndRange
      .mockResolvedValueOnce([
        makeExpense({ currency: "INR", price: 500 }),
        makeExpense({ currency: "USD", price: 12 }),
        makeExpense({ currency: "EUR", price: 10 }),
      ])
      .mockResolvedValueOnce([]);

    const report = await reportService.getVehicleReport(VEHICLE_ID, USER_ID, { filter: "all" });

    expect(report.hadCurrencyConversion).toBe(true);
  });
});
