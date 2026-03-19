import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";

// ─── Mock DB client ────────────────────────────────────────────────────────────

const mockInsert = {
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

const mockUpdate = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

const mockDelete = {
  where: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      vehicles: {
        findFirst: vi.fn(),
      },
      vehicleAccess: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      documents: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/services/storageService", () => ({
  storageService: {
    deleteFile: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/services/notificationService", () => ({
  notificationService: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { db } from "@/lib/db/client";
import { storageService } from "@/services/storageService";
import { notificationService } from "@/services/notificationService";
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

describe("vehicleService.getWithAccessCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns vehicle for owner", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(DB_VEHICLE_ROW);

    const result = await vehicleService.getWithAccessCheck("vehicle-uuid-1", "user-1");

    expect(result.id).toBe("vehicle-uuid-1");
    expect(result.name).toBe("My Bike");
    // vehicleAccess should NOT be queried for owner
    expect(db.query.vehicleAccess.findFirst).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for non-existent vehicle", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      vehicleService.getWithAccessCheck("non-existent-id", "user-1")
    ).rejects.toThrow(NotFoundError);

    await expect(
      vehicleService.getWithAccessCheck("non-existent-id", "user-1")
    ).rejects.toThrow("Vehicle not found");
  });

  it("returns vehicle for non-owner with valid access record", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(DB_VEHICLE_ROW);
    (db.query.vehicleAccess.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "access-uuid-1",
      vehicleId: "vehicle-uuid-1",
      userId: "viewer-user",
    });

    const result = await vehicleService.getWithAccessCheck("vehicle-uuid-1", "viewer-user");
    expect(result.id).toBe("vehicle-uuid-1");
    expect(result.name).toBe("My Bike");
  });

  it("throws ForbiddenError for non-owner without access record", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(DB_VEHICLE_ROW);
    (db.query.vehicleAccess.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      vehicleService.getWithAccessCheck("vehicle-uuid-1", "other-user")
    ).rejects.toThrow(ForbiddenError);

    await expect(
      vehicleService.getWithAccessCheck("vehicle-uuid-1", "other-user")
    ).rejects.toThrow("You do not have access to this vehicle");
  });
});

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

describe("vehicleService.getByIdOwnerOnly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns vehicle for owner", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(DB_VEHICLE_ROW);

    const result = await vehicleService.getByIdOwnerOnly("vehicle-uuid-1", "user-1");
    expect(result.id).toBe("vehicle-uuid-1");
    expect(result.name).toBe("My Bike");
  });

  it("throws NotFoundError when vehicle does not exist", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      vehicleService.getByIdOwnerOnly("non-existent-id", "user-1")
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when caller is not the owner", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(DB_VEHICLE_ROW);

    await expect(
      vehicleService.getByIdOwnerOnly("vehicle-uuid-1", "other-user")
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("vehicleService.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(mockUpdate);
  });

  it("updates vehicle fields for owner", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(DB_VEHICLE_ROW);
    const updatedRow = { ...DB_VEHICLE_ROW, name: "Updated Bike" };
    mockUpdate.returning.mockResolvedValue([updatedRow]);

    const result = await vehicleService.update("vehicle-uuid-1", "user-1", { name: "Updated Bike" });

    expect(result.name).toBe("Updated Bike");
    expect(mockUpdate.set).toHaveBeenCalled();
  });

  it("throws ForbiddenError when non-owner calls update", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(DB_VEHICLE_ROW);

    await expect(
      vehicleService.update("vehicle-uuid-1", "other-user", { name: "Hacked" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError when vehicle does not exist", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      vehicleService.update("non-existent-id", "user-1", { name: "Doesn't Matter" })
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError when registration number duplicated", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(DB_VEHICLE_ROW)       // ownership check
      .mockResolvedValueOnce({ id: "other-vehicle", registrationNumber: "DL01AB9999" }); // duplicate check

    await expect(
      vehicleService.update("vehicle-uuid-1", "user-1", { registrationNumber: "DL01AB9999" })
    ).rejects.toThrow(ConflictError);
  });

  it("does not check uniqueness when reg number is unchanged", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(DB_VEHICLE_ROW);
    mockUpdate.returning.mockResolvedValue([DB_VEHICLE_ROW]);

    await vehicleService.update("vehicle-uuid-1", "user-1", {
      registrationNumber: "MH12AB1234", // same as DB_VEHICLE_ROW
    });

    // findFirst should only be called once (ownership check), not twice
    expect(db.query.vehicles.findFirst).toHaveBeenCalledTimes(1);
  });

  it("normalises registration number to uppercase before uniqueness check and update", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(DB_VEHICLE_ROW)   // ownership check
      .mockResolvedValueOnce(null);             // uniqueness check — no duplicate
    mockUpdate.returning.mockResolvedValue([{ ...DB_VEHICLE_ROW, registrationNumber: "DL01XY9999" }]);

    await vehicleService.update("vehicle-uuid-1", "user-1", {
      registrationNumber: "dl01xy9999",
    });

    const setCall = (mockUpdate.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setCall.registrationNumber).toBe("DL01XY9999");
  });

  it("strips imageKey before updating DB", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(DB_VEHICLE_ROW);
    mockUpdate.returning.mockResolvedValue([DB_VEHICLE_ROW]);

    await vehicleService.update("vehicle-uuid-1", "user-1", {
      imageKey: "user-1/vehicles/images/new.jpg",
      imageUrl: "https://cdn.example.com/user-1/vehicles/images/new.jpg",
    });

    const setCall = (mockUpdate.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setCall).not.toHaveProperty("imageKey");
  });
});

describe("vehicleService.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(mockDelete);
    (db.query.documents.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.query.vehicleAccess.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("deletes vehicle for owner", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(DB_VEHICLE_ROW);

    await vehicleService.delete("vehicle-uuid-1", "user-1");

    expect(db.delete).toHaveBeenCalled();
    expect(mockDelete.where).toHaveBeenCalled();
  });

  it("throws ForbiddenError when non-owner attempts delete", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(DB_VEHICLE_ROW);

    await expect(
      vehicleService.delete("vehicle-uuid-1", "other-user")
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError for non-existent vehicle", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      vehicleService.delete("non-existent-id", "user-1")
    ).rejects.toThrow(NotFoundError);
  });

  it("calls storageService.deleteFile for vehicle image", async () => {
    const vehicleWithImage = { ...DB_VEHICLE_ROW, imageUrl: "https://cdn.example.com/img.jpg" };
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(vehicleWithImage);

    await vehicleService.delete("vehicle-uuid-1", "user-1");

    expect(storageService.deleteFile).toHaveBeenCalledWith("https://cdn.example.com/img.jpg");
  });

  it("calls storageService.deleteFile for each stored document", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(DB_VEHICLE_ROW);
    (db.query.documents.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "doc-1", storageUrl: "https://cdn.example.com/doc1.pdf" },
      { id: "doc-2", storageUrl: "https://cdn.example.com/doc2.pdf" },
    ]);

    await vehicleService.delete("vehicle-uuid-1", "user-1");

    expect(storageService.deleteFile).toHaveBeenCalledWith("https://cdn.example.com/doc1.pdf");
    expect(storageService.deleteFile).toHaveBeenCalledWith("https://cdn.example.com/doc2.pdf");
  });

  it("notifies each viewer after deletion", async () => {
    (db.query.vehicles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(DB_VEHICLE_ROW);
    (db.query.vehicleAccess.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "access-1", vehicleId: "vehicle-uuid-1", userId: "viewer-1", accessLevel: "view" },
      { id: "access-2", vehicleId: "vehicle-uuid-1", userId: "viewer-2", accessLevel: "view" },
    ]);

    await vehicleService.delete("vehicle-uuid-1", "user-1");

    expect(notificationService.create).toHaveBeenCalledTimes(2);
    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "viewer-1", type: "vehicle_removed" })
    );
    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "viewer-2", type: "vehicle_removed" })
    );
  });
});
