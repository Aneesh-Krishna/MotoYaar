import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      trips: { findFirst: vi.fn() },
      vehicles: { findFirst: vi.fn() },
    },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { db } from "@/lib/db/client";
import { tripService } from "../tripService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-uuid-1";
const OTHER_USER_ID = "user-uuid-2";
const VEHICLE_ID = "vehicle-uuid-1";
const TRIP_ID = "trip-uuid-1";

function makeTripRow(overrides: Partial<{ userId: string; vehicleId: string | null }> = {}) {
  return {
    id: TRIP_ID,
    userId: overrides.userId ?? USER_ID,
    vehicleId: overrides.vehicleId !== undefined ? overrides.vehicleId : null,
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("tripService.getById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns trip for owner (no vehicle)", async () => {
    (db.query.trips.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeTripRow());

    const result = await tripService.getById(TRIP_ID, USER_ID);

    expect(result.id).toBe(TRIP_ID);
    expect(result.userId).toBe(USER_ID);
    expect(result.vehicle).toBeUndefined();
    expect(db.query.vehicles.findFirst).not.toHaveBeenCalled();
  });

  it("returns trip with vehicle when vehicleId is set", async () => {
    (db.query.trips.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeTripRow({ vehicleId: VEHICLE_ID })
    );
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VEHICLE_ID,
      name: "My Bike",
      registrationNumber: "MH12AB1234",
    });

    const result = await tripService.getById(TRIP_ID, USER_ID);

    expect(result.vehicle).toEqual({
      id: VEHICLE_ID,
      name: "My Bike",
      registrationNumber: "MH12AB1234",
    });
  });

  it("throws NotFoundError when trip does not exist", async () => {
    (db.query.trips.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await expect(tripService.getById(TRIP_ID, USER_ID)).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when trip belongs to another user", async () => {
    (db.query.trips.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeTripRow({ userId: OTHER_USER_ID })
    );

    await expect(tripService.getById(TRIP_ID, USER_ID)).rejects.toThrow(ForbiddenError);
  });
});
