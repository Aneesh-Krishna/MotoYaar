import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Drizzle select chain for trips: .select().from().where().orderBy()
const mockTripsOrderBy = vi.fn();
const mockTripsWhere = vi.fn(() => ({ orderBy: mockTripsOrderBy }));
const mockTripsFrom = vi.fn(() => ({ where: mockTripsWhere }));

// Drizzle select chain for vehicles batch: .select({}).from().where()
const mockVehiclesWhere = vi.fn();
const mockVehiclesFrom = vi.fn(() => ({ where: mockVehiclesWhere }));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { db } from "@/lib/db/client";
import { tripService } from "../tripService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-uuid-1";
const VEHICLE_ID = "vehicle-uuid-1";
const TRIP_ID_1 = "trip-uuid-1";
const TRIP_ID_2 = "trip-uuid-2";

function makeTripRow(
  overrides: { id?: string; startDate?: string; vehicleId?: string | null } = {}
) {
  return {
    id: overrides.id ?? TRIP_ID_1,
    userId: USER_ID,
    vehicleId: overrides.vehicleId !== undefined ? overrides.vehicleId : null,
    title: "Test Trip",
    description: null,
    startDate: overrides.startDate ?? "2026-03-20",
    endDate: null,
    routeText: null,
    mapsLink: null,
    timeTaken: null,
    breakdown: [{ category: "Fuel", amount: 500 }],
    createdAt: new Date("2026-03-20T10:00:00Z"),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("tripService.listByUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Use mockImplementation (not mockReturnValueOnce) to avoid queue bleed between tests.
    // First call → trips chain, second call → vehicles chain.
    let callCount = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? { from: mockTripsFrom } : { from: mockVehiclesFrom };
    });
    // Restore chain implementations cleared by clearAllMocks
    mockTripsFrom.mockImplementation(() => ({ where: mockTripsWhere }));
    mockTripsWhere.mockImplementation(() => ({ orderBy: mockTripsOrderBy }));
    mockVehiclesFrom.mockImplementation(() => ({ where: mockVehiclesWhere }));
  });

  it("returns empty array when no trips", async () => {
    mockTripsOrderBy.mockResolvedValue([]);

    const result = await tripService.listByUser(USER_ID);

    expect(result).toEqual([]);
    expect(mockVehiclesFrom).not.toHaveBeenCalled();
  });

  it("returns trips sorted by startDate DESC", async () => {
    const row1 = makeTripRow({ id: TRIP_ID_1, startDate: "2026-03-20" });
    const row2 = makeTripRow({ id: TRIP_ID_2, startDate: "2026-02-10" });
    mockTripsOrderBy.mockResolvedValue([row1, row2]);

    const result = await tripService.listByUser(USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(TRIP_ID_1);
    expect(result[1].id).toBe(TRIP_ID_2);
  });

  it("includes vehicle name in results when vehicleId is set", async () => {
    const row = makeTripRow({ vehicleId: VEHICLE_ID });
    mockTripsOrderBy.mockResolvedValue([row]);
    mockVehiclesWhere.mockResolvedValue([
      { id: VEHICLE_ID, name: "Royal Enfield Meteor", registrationNumber: "MH02AB1234" },
    ]);

    const result = await tripService.listByUser(USER_ID);

    expect(result[0].vehicle).toEqual({
      id: VEHICLE_ID,
      name: "Royal Enfield Meteor",
      registrationNumber: "MH02AB1234",
    });
  });

  it("sets vehicle to undefined when vehicleId is null", async () => {
    const row = makeTripRow({ vehicleId: null });
    mockTripsOrderBy.mockResolvedValue([row]);

    const result = await tripService.listByUser(USER_ID);

    expect(result[0].vehicle).toBeUndefined();
    expect(result[0].vehicleId).toBeUndefined();
    expect(mockVehiclesFrom).not.toHaveBeenCalled();
  });

  it("computes totalCost from breakdown", async () => {
    const row = makeTripRow();
    mockTripsOrderBy.mockResolvedValue([row]);

    const result = await tripService.listByUser(USER_ID);

    expect(result[0].totalCost).toBe(500);
  });

  it("sets totalCost to 0 when breakdown is empty", async () => {
    const row = { ...makeTripRow(), breakdown: [] };
    mockTripsOrderBy.mockResolvedValue([row]);

    const result = await tripService.listByUser(USER_ID);

    expect(result[0].totalCost).toBe(0);
  });
});
