import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate, mockDelete, mockTransaction } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    transaction: mockTransaction,
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { tripRouteService } from "../tripRouteService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-uuid-1";
const OTHER_USER_ID = "user-uuid-2";
const TRIP_ID = "trip-uuid-1";
const ROUTE_ID = "route-uuid-1";

const NOW = new Date("2026-04-28T10:00:00Z");

const TRIP_ROW = { id: TRIP_ID, userId: USER_ID };

const WAYPOINT_A = { lat: 12.97, lng: 77.59, timestamp: 1000, accuracy: 5, speed: null, altitude: null };
const WAYPOINT_B = { lat: 12.98, lng: 77.60, timestamp: 2000, accuracy: 5, speed: null, altitude: null };

function makeRouteRow(waypoints = [WAYPOINT_A]) {
  return {
    id: ROUTE_ID,
    tripId: TRIP_ID,
    waypoints,
    distanceKm: "1.234",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
}

function makeInsertChain(row: unknown) {
  return {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([row]),
  };
}

function makeUpdateChain(row: unknown) {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([row]),
  };
}

function makeUpdateNoReturn() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
}

function makeDeleteChain() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  };
}

function setupTx() {
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn({ insert: mockInsert, update: mockUpdate, delete: mockDelete })
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("tripRouteService.createOrAppend", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates new trip_routes record when none exists", async () => {
    let selectCall = 0;
    mockSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([TRIP_ROW]);
      return makeSelectChain([]);
    });
    const insertChain = makeInsertChain(makeRouteRow([WAYPOINT_A]));
    mockInsert.mockReturnValue(insertChain);
    mockUpdate.mockReturnValue(makeUpdateNoReturn());
    setupTx();

    const result = await tripRouteService.createOrAppend(TRIP_ID, USER_ID, [WAYPOINT_A]);

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(result.tripId).toBe(TRIP_ID);
  });

  it("sets trips.has_live_route = true on create", async () => {
    let selectCall = 0;
    mockSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([TRIP_ROW]);
      return makeSelectChain([]);
    });
    mockInsert.mockReturnValue(makeInsertChain(makeRouteRow([WAYPOINT_A])));
    const updateChain = makeUpdateNoReturn();
    mockUpdate.mockReturnValue(updateChain);
    setupTx();

    await tripRouteService.createOrAppend(TRIP_ID, USER_ID, [WAYPOINT_A]);

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(updateChain.set).toHaveBeenCalledWith({ hasLiveRoute: true });
  });

  it("appends and deduplicates waypoints correctly", async () => {
    const existing = makeRouteRow([WAYPOINT_A]);
    let selectCall = 0;
    mockSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([TRIP_ROW]);
      return makeSelectChain([existing]);
    });
    const updateChain = makeUpdateChain(makeRouteRow([WAYPOINT_A, WAYPOINT_B]));
    mockUpdate.mockReturnValue(updateChain);
    setupTx();

    await tripRouteService.createOrAppend(TRIP_ID, USER_ID, [WAYPOINT_A, WAYPOINT_B]);

    // WAYPOINT_A is a dupe of existing[0]; only WAYPOINT_B should be appended
    const setCall = updateChain.set.mock.calls[0][0];
    const mergedWaypoints = setCall.waypoints as typeof WAYPOINT_A[];
    expect(mergedWaypoints).toHaveLength(2);
    expect(mergedWaypoints.some((w) => w.timestamp === WAYPOINT_B.timestamp)).toBe(true);
  });

  it("recalculates distance_km on append", async () => {
    const existing = makeRouteRow([WAYPOINT_A]);
    let selectCall = 0;
    mockSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([TRIP_ROW]);
      return makeSelectChain([existing]);
    });
    const updateChain = makeUpdateChain(makeRouteRow([WAYPOINT_A, WAYPOINT_B]));
    mockUpdate.mockReturnValue(updateChain);
    setupTx();

    await tripRouteService.createOrAppend(TRIP_ID, USER_ID, [WAYPOINT_B]);

    const setCall = updateChain.set.mock.calls[0][0];
    expect(typeof setCall.distanceKm).toBe("string");
    expect(parseFloat(setCall.distanceKm)).toBeGreaterThan(0);
  });

  it("throws ForbiddenError for wrong user", async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ ...TRIP_ROW, userId: OTHER_USER_ID }]));

    await expect(
      tripRouteService.createOrAppend(TRIP_ID, USER_ID, [WAYPOINT_A])
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError when trip not found", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    await expect(
      tripRouteService.createOrAppend(TRIP_ID, USER_ID, [WAYPOINT_A])
    ).rejects.toThrow(NotFoundError);
  });
});

describe("tripRouteService.getByTripId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the route when trip is owned by user", async () => {
    const route = makeRouteRow([WAYPOINT_A]);
    let selectCall = 0;
    mockSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([TRIP_ROW]);
      return makeSelectChain([route]);
    });

    const result = await tripRouteService.getByTripId(TRIP_ID, USER_ID);
    expect(result.id).toBe(ROUTE_ID);
  });

  it("throws ForbiddenError when user does not own trip", async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ ...TRIP_ROW, userId: OTHER_USER_ID }]));

    await expect(tripRouteService.getByTripId(TRIP_ID, USER_ID)).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError when route does not exist", async () => {
    let selectCall = 0;
    mockSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([TRIP_ROW]);
      return makeSelectChain([]);
    });

    await expect(tripRouteService.getByTripId(TRIP_ID, USER_ID)).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when trip not found", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    await expect(tripRouteService.getByTripId(TRIP_ID, USER_ID)).rejects.toThrow(NotFoundError);
  });
});

describe("tripRouteService.deleteByTripId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes route and resets has_live_route flag", async () => {
    mockSelect.mockReturnValue(makeSelectChain([TRIP_ROW]));
    const deleteChain = makeDeleteChain();
    mockDelete.mockReturnValue(deleteChain);
    const updateChain = makeUpdateNoReturn();
    mockUpdate.mockReturnValue(updateChain);
    setupTx();

    await tripRouteService.deleteByTripId(TRIP_ID, USER_ID);

    expect(mockDelete).toHaveBeenCalledOnce();
    expect(updateChain.set).toHaveBeenCalledWith({ hasLiveRoute: false });
  });

  it("throws ForbiddenError for wrong user", async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ ...TRIP_ROW, userId: OTHER_USER_ID }]));

    await expect(tripRouteService.deleteByTripId(TRIP_ID, USER_ID)).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError when trip not found", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    await expect(tripRouteService.deleteByTripId(TRIP_ID, USER_ID)).rejects.toThrow(NotFoundError);
  });
});
