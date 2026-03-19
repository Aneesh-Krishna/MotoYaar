import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConflictError } from "@/lib/errors";

// ─── Mock DB client ────────────────────────────────────────────────────────────

const mockInsert = {
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      vehicles: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { db } from "@/lib/db/client";
import { vehicleService } from "../vehicleService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_INPUT = {
  name: "My Bike",
  type: "2-wheeler" as const,
  registrationNumber: "MH12AB1234",
  previousOwners: 0,
};

const DB_VEHICLE_ROW = {
  id: "vehicle-uuid-1",
  userId: "user-1",
  name: "My Bike",
  type: "2-wheeler",
  registrationNumber: "MH12AB1234",
  previousOwners: 0,
  company: null,
  model: null,
  variant: null,
  color: null,
  purchasedAt: null,
  imageUrl: null,
  createdAt: new Date("2026-03-19T10:00:00Z"),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("vehicleService.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(mockInsert);
  });

  it("throws ConflictError when registration number already exists for user", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "existing-vehicle",
      registrationNumber: "MH12AB1234",
    });

    await expect(
      vehicleService.create("user-1", BASE_INPUT)
    ).rejects.toThrow(ConflictError);

    await expect(
      vehicleService.create("user-1", BASE_INPUT)
    ).rejects.toThrow("You already have a vehicle with this registration number");
  });

  it("normalises registration number to uppercase before duplicate check and insert", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mockInsert.returning.mockResolvedValue([DB_VEHICLE_ROW]);

    await vehicleService.create("user-1", {
      ...BASE_INPUT,
      registrationNumber: "mh12ab1234",
    });

    // findFirst should have been called with the uppercased value
    const findFirstCall = (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findFirstCall).toBeDefined();

    // insert values should have uppercased reg number
    const insertValuesCall = (mockInsert.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertValuesCall.registrationNumber).toBe("MH12AB1234");
  });

  it("strips imageKey before inserting into DB", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mockInsert.returning.mockResolvedValue([DB_VEHICLE_ROW]);

    await vehicleService.create("user-1", {
      ...BASE_INPUT,
      imageKey: "user-1/vehicles/images/abc.jpg",
      imageUrl: "https://cdn.example.com/user-1/vehicles/images/abc.jpg",
    });

    const insertValuesCall = (mockInsert.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertValuesCall).not.toHaveProperty("imageKey");
  });

  it("returns a mapped Vehicle object on successful insert", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mockInsert.returning.mockResolvedValue([DB_VEHICLE_ROW]);

    const result = await vehicleService.create("user-1", BASE_INPUT);

    expect(result).toMatchObject({
      id: "vehicle-uuid-1",
      userId: "user-1",
      name: "My Bike",
      type: "2-wheeler",
      registrationNumber: "MH12AB1234",
      previousOwners: 0,
    });
    expect(result.createdAt).toBe("2026-03-19T10:00:00.000Z");
    expect(result.company).toBeUndefined();
    expect(result.imageUrl).toBeUndefined();
  });

  it("does not check for duplicate when called for a different user", async () => {
    // Two separate users can have the same reg number
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mockInsert.returning.mockResolvedValue([{ ...DB_VEHICLE_ROW, userId: "user-2" }]);

    const result = await vehicleService.create("user-2", BASE_INPUT);
    expect(result.userId).toBe("user-2");
  });
});
