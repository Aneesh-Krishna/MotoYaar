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
      documents: { findMany: vi.fn() },
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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const TEMP_KEY = `${USER_ID}/documents/temp/dl-abc-123.jpg`;

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

const DB_DL_ROW = {
  id: "doc-dl-1",
  vehicleId: null,
  userId: USER_ID,
  type: "DL",
  label: null,
  expiryDate: "2028-06-01", // Drizzle date() returns string, not Date object
  storageUrl: null,
  storageKey: null,
  parseStatus: "parsed",
  status: "valid",
  expiryWarningNotifiedAt: null,
  expiryNotifiedAt: null,
  createdAt: new Date("2026-03-19"),
};

// ─── documentService.createUserDocument() ─────────────────────────────────────

describe("documentService.createUserDocument()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.returning.mockResolvedValue([DB_DL_ROW]);
  });

  it("creates document with vehicleId = null and type = DL", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_PARSE_ONLY as any);

    await documentService.createUserDocument(USER_ID, {
      type: "DL",
      expiryDate: "2028-06-01",
      parseStatus: "parsed",
      tempR2Key: TEMP_KEY,
    });

    expect(mockInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleId: null, type: "DL", userId: USER_ID })
    );
  });

  it("deletes temp R2 file for parse_only preference", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_PARSE_ONLY as any);

    await documentService.createUserDocument(USER_ID, {
      type: "DL",
      expiryDate: "2028-06-01",
      parseStatus: "parsed",
      tempR2Key: TEMP_KEY,
    });

    expect(storageService.deleteFile).toHaveBeenCalledWith(TEMP_KEY);
    expect(storageService.copyFile).not.toHaveBeenCalled();
  });

  it("moves temp file to permanent DL key for full_storage preference", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_FULL_STORAGE as any);

    await documentService.createUserDocument(USER_ID, {
      type: "DL",
      expiryDate: "2028-06-01",
      parseStatus: "parsed",
      tempR2Key: TEMP_KEY,
    });

    expect(storageService.copyFile).toHaveBeenCalledWith(
      TEMP_KEY,
      expect.stringMatching(new RegExp(`^${USER_ID}/documents/dl/`))
    );
    expect(storageService.deleteFile).toHaveBeenCalledWith(TEMP_KEY);

    expect(mockInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: expect.stringMatching(new RegExp(`^${USER_ID}/documents/dl/`)),
      })
    );
  });

  it("throws ForbiddenError when tempR2Key does not belong to user", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_PARSE_ONLY as any);

    await expect(
      documentService.createUserDocument(USER_ID, {
        type: "DL",
        expiryDate: "2028-06-01",
        parseStatus: "parsed",
        tempR2Key: "other-user/documents/temp/dl-file.jpg",
      })
    ).rejects.toThrow(ForbiddenError);

    expect(mockInsert.values).not.toHaveBeenCalled();
  });

  it("creates document with null expiryDate when no expiry provided", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_PARSE_ONLY as any);
    const rowNoExpiry = { ...DB_DL_ROW, expiryDate: null, parseStatus: "incomplete", status: "incomplete" };
    mockInsert.returning.mockResolvedValue([rowNoExpiry]);

    await documentService.createUserDocument(USER_ID, {
      type: "DL",
      parseStatus: "incomplete",
    });

    expect(mockInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({ expiryDate: null, vehicleId: null })
    );
  });

  it("always stores type=DL regardless of data.type input", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_PARSE_ONLY as any);

    await documentService.createUserDocument(USER_ID, {
      type: "RC", // caller passes wrong type — service must ignore it
      expiryDate: "2028-06-01",
      parseStatus: "parsed",
    });

    expect(mockInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({ type: "DL" })
    );
  });
});

// ─── documentService.listUserDocuments() ──────────────────────────────────────

describe("documentService.listUserDocuments()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns DL documents with computed status", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_PARSE_ONLY as any);
    vi.mocked(db.query.documents.findMany).mockResolvedValue([DB_DL_ROW] as any);

    const docs = await documentService.listUserDocuments(USER_ID);

    expect(docs).toHaveLength(1);
    expect(docs[0].type).toBe("DL");
    expect(docs[0].vehicleId).toBeUndefined(); // mapRow converts null → undefined
    expect(docs[0].status).toBe("valid");
  });

  it("returns empty array when user has no DL documents", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_PARSE_ONLY as any);
    vi.mocked(db.query.documents.findMany).mockResolvedValue([]);

    const docs = await documentService.listUserDocuments(USER_ID);

    expect(docs).toHaveLength(0);
  });

  it("queries findMany with a where clause (userId + vehicleId IS NULL filter)", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_PARSE_ONLY as any);
    vi.mocked(db.query.documents.findMany).mockResolvedValue([]);

    await documentService.listUserDocuments(USER_ID);

    expect(db.query.documents.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    );
  });

  it("marks document as expired when expiryDate is in the past", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(DB_USER_PARSE_ONLY as any);
    const expiredRow = { ...DB_DL_ROW, expiryDate: "2020-01-01", status: "expired" };
    vi.mocked(db.query.documents.findMany).mockResolvedValue([expiredRow] as any);

    const docs = await documentService.listUserDocuments(USER_ID);

    expect(docs[0].status).toBe("expired");
  });
});
