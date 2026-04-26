import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockFindFirst, mockListByUserAndRange, mockListByUser } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockListByUserAndRange: vi.fn(),
  mockListByUser: vi.fn(),
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
    listByUser: mockListByUser,
  },
}));

vi.mock("@/services/expenseService", () => ({
  expenseService: {
    listByUserAndRange: mockListByUserAndRange,
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { reportService } from "../reportService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const VEHICLE_1 = { id: "v1", name: "Bike", userId: USER_ID, type: "2-wheeler" as const, registrationNumber: "MH01", previousOwners: 0, createdAt: "2026-01-01T00:00:00.000Z" };
const VEHICLE_2 = { id: "v2", name: "Car", userId: USER_ID, type: "4-wheeler" as const, registrationNumber: "MH02", previousOwners: 0, createdAt: "2026-01-01T00:00:00.000Z" };

function makeExpense(overrides: {
  id?: string;
  vehicleId?: string;
  date?: string;
  price?: number;
  currency?: string;
} = {}) {
  return {
    id: overrides.id ?? "exp-1",
    userId: USER_ID,
    vehicleId: overrides.vehicleId ?? "v1",
    tripId: undefined,
    price: overrides.price ?? 500,
    currency: overrides.currency ?? "INR",
    date: overrides.date ?? "2026-03-15",
    reason: "Service" as const,
    createdAt: "2026-03-15T10:00:00.000Z",
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("reportService.getOverallReport()", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFindFirst.mockResolvedValue({ id: USER_ID, currency: "INR" });
    mockListByUser.mockResolvedValue({ owned: [VEHICLE_1, VEHICLE_2], shared: [] });
    mockListByUserAndRange.mockResolvedValue([]);
  });

  it("aggregates expenses across all vehicles for a user", async () => {
    mockListByUserAndRange
      .mockResolvedValueOnce([
        makeExpense({ id: "e1", vehicleId: "v1", price: 1000 }),
        makeExpense({ id: "e2", vehicleId: "v2", price: 500 }),
      ])
      .mockResolvedValueOnce([]);

    const report = await reportService.getOverallReport(USER_ID, { type: "monthly", month1: "2026-03", month2: "2026-02" });

    expect(report.totalSpend).toBe(1500);
    expect(report.perVehicle).toHaveLength(2);
    expect(report.perVehicle.find((v) => v.vehicleId === "v1")!.total).toBe(1000);
    expect(report.perVehicle.find((v) => v.vehicleId === "v2")!.total).toBe(500);
  });

  it("monthly filter resolves correct month boundaries", async () => {
    await reportService.getOverallReport(USER_ID, { type: "monthly", month1: "2026-03", month2: "2026-02" });

    expect(mockListByUserAndRange).toHaveBeenNthCalledWith(1, USER_ID, "2026-03-01", "2026-03-31");
    expect(mockListByUserAndRange).toHaveBeenNthCalledWith(2, USER_ID, "2026-02-01", "2026-02-28");
  });

  it("date range filter auto-generates comparison range", async () => {
    await reportService.getOverallReport(USER_ID, {
      type: "range",
      from: "2026-03-01",
      to: "2026-03-31",
    });

    // Primary: 2026-03-01 → 2026-03-31 (31 days)
    expect(mockListByUserAndRange).toHaveBeenNthCalledWith(1, USER_ID, "2026-03-01", "2026-03-31");
    // Comparison: prev 31 days ending 2026-02-28
    expect(mockListByUserAndRange).toHaveBeenNthCalledWith(2, USER_ID, "2026-01-29", "2026-02-28");
  });

  it("respects user-overridden comparison range", async () => {
    await reportService.getOverallReport(USER_ID, {
      type: "range",
      from: "2026-03-01",
      to: "2026-03-31",
      compFrom: "2025-03-01",
      compTo: "2025-03-31",
    });

    expect(mockListByUserAndRange).toHaveBeenNthCalledWith(2, USER_ID, "2025-03-01", "2025-03-31");
  });

  it("yearly filter compares current year to previous year", async () => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    await reportService.getOverallReport(USER_ID, { type: "yearly" });

    expect(mockListByUserAndRange).toHaveBeenNthCalledWith(1, USER_ID, `${currentYear}-01-01`, expect.any(String));
    expect(mockListByUserAndRange).toHaveBeenNthCalledWith(2, USER_ID, `${lastYear}-01-01`, `${lastYear}-12-31`);
  });

  it("builds correct comparisonLabel for monthly mode", async () => {
    const report = await reportService.getOverallReport(USER_ID, {
      type: "monthly",
      month1: "2026-03",
      month2: "2026-02",
    });

    expect(report.comparisonLabel).toBe("Mar 2026 vs Feb 2026");
  });

  it("builds correct YTD label for yearly mode", async () => {
    const currentYear = new Date().getFullYear();
    const report = await reportService.getOverallReport(USER_ID, { type: "yearly" });

    expect(report.comparisonLabel).toBe(`${currentYear} YTD vs ${currentYear - 1}`);
  });

  it("builds ComparisonMonthlyDataPoint[] correctly", async () => {
    mockListByUserAndRange
      .mockResolvedValueOnce([
        makeExpense({ date: "2026-03-10", price: 1000 }),
        makeExpense({ date: "2026-03-20", price: 500 }),
      ])
      .mockResolvedValueOnce([
        makeExpense({ date: "2026-02-15", price: 800 }),
      ]);

    const report = await reportService.getOverallReport(USER_ID, {
      type: "monthly",
      month1: "2026-03",
      month2: "2026-02",
    });

    expect(report.monthlyData).toHaveLength(2);
    const mar = report.monthlyData.find((d) => d.month === "Mar 2026")!;
    expect(mar.primary).toBe(1500);
    expect(mar.comparison).toBe(0);
    const feb = report.monthlyData.find((d) => d.month === "Feb 2026")!;
    expect(feb.primary).toBe(0);
    expect(feb.comparison).toBe(800);
  });

  it("sets hadCurrencyConversion when any primary expense has different currency", async () => {
    mockFindFirst.mockResolvedValue({ id: USER_ID, currency: "INR" });
    mockListByUserAndRange
      .mockResolvedValueOnce([makeExpense({ currency: "USD" })])
      .mockResolvedValueOnce([]);

    const report = await reportService.getOverallReport(USER_ID, { type: "monthly" });

    expect(report.hadCurrencyConversion).toBe(true);
  });

  it("converts USD expenses to INR totalSpend correctly", async () => {
    // 12 USD / 0.012 = 1000 INR
    mockFindFirst.mockResolvedValue({ id: USER_ID, currency: "INR" });
    mockListByUserAndRange
      .mockResolvedValueOnce([makeExpense({ currency: "USD", price: 12 })])
      .mockResolvedValueOnce([]);

    const report = await reportService.getOverallReport(USER_ID, { type: "monthly" });

    expect(report.totalSpend).toBeCloseTo(1000, 0);
    expect(report.currency).toBe("INR");
  });

  it("returns zero totalSpend and empty arrays when no expenses", async () => {
    const report = await reportService.getOverallReport(USER_ID, { type: "monthly" });

    expect(report.totalSpend).toBe(0);
    expect(report.prevTotalSpend).toBe(0);
    expect(report.byCategory).toHaveLength(0);
    expect(report.monthlyData).toHaveLength(0);
    expect(report.hadCurrencyConversion).toBe(false);
  });
});
