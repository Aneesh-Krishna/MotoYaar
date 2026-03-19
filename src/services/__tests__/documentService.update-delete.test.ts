import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

// ─── Mocks ────────────────────────────────────────────────────────────────────

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
      documents: { findFirst: vi.fn() },
      vehicles: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
    },
    update: vi.fn(() => mockUpdate),
    delete: vi.fn(() => mockDelete),
  },
}));

vi.mock("@/services/storageService", () => ({
  storageService: {
    deleteFile: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/services/vehicleService", () => ({
  vehicleService: {
    getWithAccessCheck: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { db } from "@/lib/db/client";
import { storageService } from "@/services/storageService";
import { logger } from "@/lib/logger";
import { documentService } from "../documentService";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const VEHICLE_ID = "vehicle-1";
const DOC_ID = "doc-1";
const STORAGE_KEY = `${USER_ID}/documents/${VEHICLE_ID}/file.jpg`;

const DB_USER = {
  id: USER_ID,
  notificationWindowDays: 30,
};

const DB_VEHICLE_OWNED = {
  id: VEHICLE_ID,
  userId: USER_ID,
};

const DB_VEHICLE_OTHER = {
  id: VEHICLE_ID,
  userId: OTHER_USER_ID,
};

const DB_DOC = {
  id: DOC_ID,
  vehicleId: VEHICLE_ID,
  userId: USER_ID,
  type: "Insurance",
  label: null,
  expiryDate: "2027-06-01",
  storageUrl: null,
  storageKey: STORAGE_KEY,
  parseStatus: "parsed",
  status: "valid",
  expiryWarningNotifiedAt: null,
  expiryNotifiedAt: null,
  createdAt: new Date("2026-03-19"),
};

const UPDATED_DOC_ROW = {
  ...DB_DOC,
  type: "RC",
  expiryDate: "2028-01-01",
  parseStatus: "manual",
  status: "valid",
};

// ─── documentService.update() ─────────────────────────────────────────────────

describe("documentService.update()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.returning.mockResolvedValue([UPDATED_DOC_ROW]);
  });

  it("updates type and expiryDate for vehicle document owner", async () => {
    vi.mocked(db.query.documents.findFirst).mockResolvedValue(DB_DOC as any);
    vi.mocked(db.query.vehicles.findFirst).mockResolvedValue(DB_VEHICLE_OWNED as any);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER as any);

    const result = await documentService.update(DOC_ID, USER_ID, {
      type: "RC",
      expiryDate: "2028-01-01",
    });

    expect(mockUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ type: "RC", expiryDate: "2028-01-01" })
    );
    expect(result.type).toBe("RC");
  });

  it("throws ForbiddenError for non-owner of vehicle document", async () => {
    vi.mocked(db.query.documents.findFirst).mockResolvedValue(DB_DOC as any);
    vi.mocked(db.query.vehicles.findFirst).mockResolvedValue(DB_VEHICLE_OTHER as any);

    await expect(
      documentService.update(DOC_ID, USER_ID, { type: "RC" })
    ).rejects.toThrow(ForbiddenError);

    expect(mockUpdate.set).not.toHaveBeenCalled();
  });

  it("recomputes status from effectiveExpiryDate — preserves status on type-only update", async () => {
    // expiryDate not in payload — should preserve existing "2027-06-01" and compute valid status
    const docWithValidDate = {
      ...DB_DOC,
      expiryDate: "2099-01-01",
      status: "valid",
    };
    const updatedRow = { ...docWithValidDate, type: "RC", parseStatus: "manual", status: "valid" };

    vi.mocked(db.query.documents.findFirst).mockResolvedValue(docWithValidDate as any);
    vi.mocked(db.query.vehicles.findFirst).mockResolvedValue(DB_VEHICLE_OWNED as any);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER as any);
    mockUpdate.returning.mockResolvedValue([updatedRow]);

    await documentService.update(DOC_ID, USER_ID, { type: "RC" });

    // effectiveExpiryDate = "2099-01-01" (preserved) → status should be "valid", not "incomplete"
    expect(mockUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({
        expiryDate: "2099-01-01",
        parseStatus: "manual",
        status: "valid",
      })
    );
  });

  it("throws NotFoundError when document does not exist", async () => {
    vi.mocked(db.query.documents.findFirst).mockResolvedValue(undefined as any);

    await expect(
      documentService.update(DOC_ID, USER_ID, { type: "RC" })
    ).rejects.toThrow(NotFoundError);
  });
});

// ─── documentService.delete() ─────────────────────────────────────────────────

describe("documentService.delete()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.where.mockResolvedValue(undefined);
  });

  it("deletes document record for vehicle owner", async () => {
    vi.mocked(db.query.documents.findFirst).mockResolvedValue(DB_DOC as any);
    vi.mocked(db.query.vehicles.findFirst).mockResolvedValue(DB_VEHICLE_OWNED as any);

    await documentService.delete(DOC_ID, USER_ID);

    expect(db.delete).toHaveBeenCalled();
    expect(mockDelete.where).toHaveBeenCalled();
  });

  it("calls storageService.deleteFile when storageKey exists", async () => {
    vi.mocked(db.query.documents.findFirst).mockResolvedValue(DB_DOC as any);
    vi.mocked(db.query.vehicles.findFirst).mockResolvedValue(DB_VEHICLE_OWNED as any);

    await documentService.delete(DOC_ID, USER_ID);

    expect(storageService.deleteFile).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("does not throw when R2 deletion fails — logs error and deletes DB record", async () => {
    vi.mocked(db.query.documents.findFirst).mockResolvedValue(DB_DOC as any);
    vi.mocked(db.query.vehicles.findFirst).mockResolvedValue(DB_VEHICLE_OWNED as any);
    vi.mocked(storageService.deleteFile).mockRejectedValueOnce(new Error("R2 unavailable"));

    await expect(documentService.delete(DOC_ID, USER_ID)).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalled();
    expect(db.delete).toHaveBeenCalled();
  });

  it("throws ForbiddenError for non-owner", async () => {
    vi.mocked(db.query.documents.findFirst).mockResolvedValue(DB_DOC as any);
    vi.mocked(db.query.vehicles.findFirst).mockResolvedValue(DB_VEHICLE_OTHER as any);

    await expect(
      documentService.delete(DOC_ID, USER_ID)
    ).rejects.toThrow(ForbiddenError);

    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });

  it("skips R2 deletion when storageKey is null", async () => {
    const docNoStorage = { ...DB_DOC, storageKey: null };
    vi.mocked(db.query.documents.findFirst).mockResolvedValue(docNoStorage as any);
    vi.mocked(db.query.vehicles.findFirst).mockResolvedValue(DB_VEHICLE_OWNED as any);

    await documentService.delete(DOC_ID, USER_ID);

    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(db.delete).toHaveBeenCalled();
  });
});
