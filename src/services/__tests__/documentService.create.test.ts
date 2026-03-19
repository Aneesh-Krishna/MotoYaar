import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError } from "@/lib/errors";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockInsert = {
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => mockInsert),
  },
}));

vi.mock("@/services/storageService", () => ({
  storageService: {
    copyFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { db } from "@/lib/db/client";
import { storageService } from "@/services/storageService";
import { documentService } from "../documentService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const VEHICLE_ID = "vehicle-1";
const TEMP_KEY = `${USER_ID}/documents/temp/abc-123.jpg`;

const DB_USER_PARSE_ONLY = {
  id: USER_ID,
  documentStoragePreference: "parse_only",
  notificationWindowDays: 30,
};

const DB_USER_FULL_STORAGE = {
  id: USER_ID,
  documentStoragePreference: "full_storage",
  notificationWindowDays: 30,
};

const DB_DOC_ROW = {
  id: "doc-1",
  vehicleId: VEHICLE_ID,
  userId: USER_ID,
  type: "Insurance",
  label: null,
  expiryDate: "2027-01-01",
  storageUrl: null,
  parseStatus: "parsed",
  status: "valid",
  expiryWarningNotifiedAt: null,
  expiryNotifiedAt: null,
  createdAt: new Date("2026-03-19"),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("documentService.create()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.returning.mockResolvedValue([DB_DOC_ROW]);
  });

  describe("parse_only storage preference", () => {
    it("deletes temp R2 file and saves record with null storageUrl", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_PARSE_ONLY as any);

      const result = await documentService.create(VEHICLE_ID, USER_ID, {
        type: "Insurance",
        expiryDate: "2027-01-01",
        parseStatus: "parsed",
        tempR2Key: TEMP_KEY,
      });

      expect(storageService.deleteFile).toHaveBeenCalledWith(TEMP_KEY);
      expect(storageService.copyFile).not.toHaveBeenCalled();
      expect(result.storageUrl).toBeUndefined();
      expect(result.parseStatus).toBe("parsed");
    });

    it("still inserts record if R2 delete fails (non-blocking)", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_PARSE_ONLY as any);
      vi.mocked(storageService.deleteFile).mockRejectedValueOnce(new Error("R2 error"));

      const result = await documentService.create(VEHICLE_ID, USER_ID, {
        type: "Insurance",
        expiryDate: "2027-01-01",
        parseStatus: "parsed",
        tempR2Key: TEMP_KEY,
      });

      expect(result.id).toBe("doc-1");
    });
  });

  describe("full_storage preference", () => {
    it("copies temp file to permanent key, deletes temp, sets storageUrl", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_FULL_STORAGE as any);
      const permanentDoc = { ...DB_DOC_ROW, storageUrl: `${USER_ID}/documents/${VEHICLE_ID}/perm.jpg` };
      mockInsert.returning.mockResolvedValueOnce([permanentDoc]);

      const result = await documentService.create(VEHICLE_ID, USER_ID, {
        type: "Insurance",
        expiryDate: "2027-01-01",
        parseStatus: "parsed",
        tempR2Key: TEMP_KEY,
      });

      expect(storageService.copyFile).toHaveBeenCalledWith(TEMP_KEY, expect.stringContaining(`${USER_ID}/documents/${VEHICLE_ID}/`));
      expect(storageService.deleteFile).toHaveBeenCalledWith(TEMP_KEY);
      expect(result.storageUrl).toContain(USER_ID);
    });
  });

  describe("security: tempR2Key ownership validation", () => {
    it("throws ForbiddenError when tempR2Key does not belong to userId", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_PARSE_ONLY as any);

      await expect(
        documentService.create(VEHICLE_ID, USER_ID, {
          type: "RC",
          parseStatus: "parsed",
          tempR2Key: "other-user/documents/temp/malicious.jpg",
        })
      ).rejects.toThrow(ForbiddenError);

      expect(storageService.deleteFile).not.toHaveBeenCalled();
      expect(storageService.copyFile).not.toHaveBeenCalled();
    });

    it("allows tempR2Key that starts with userId/documents/temp/", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_PARSE_ONLY as any);

      await expect(
        documentService.create(VEHICLE_ID, USER_ID, {
          type: "RC",
          parseStatus: "parsed",
          tempR2Key: TEMP_KEY,
        })
      ).resolves.toBeDefined();
    });
  });

  describe("no tempR2Key", () => {
    it("inserts record without any R2 operations", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_PARSE_ONLY as any);

      await documentService.create(VEHICLE_ID, USER_ID, {
        type: "PUC",
        parseStatus: "manual",
      });

      expect(storageService.deleteFile).not.toHaveBeenCalled();
      expect(storageService.copyFile).not.toHaveBeenCalled();
    });
  });

  describe("user not found in DB (defaults)", () => {
    it("falls back to parse_only preference and 30-day window", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined as any);

      await documentService.create(VEHICLE_ID, USER_ID, {
        type: "RC",
        parseStatus: "parsed",
        tempR2Key: TEMP_KEY,
      });

      // Should still delete temp (parse_only default)
      expect(storageService.deleteFile).toHaveBeenCalledWith(TEMP_KEY);
    });
  });
});
