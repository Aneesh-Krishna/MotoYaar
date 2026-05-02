import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpdate = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      documents: { findMany: vi.fn() },
    },
    update: vi.fn(() => mockUpdate),
  },
}));

vi.mock("@/services/storageService", () => ({
  storageService: {
    deleteFile: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/services/vehicleService", () => ({
  vehicleService: {},
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { db } from "@/lib/db/client";
import { storageService } from "@/services/storageService";
import { documentService } from "../documentService";

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdate.set.mockReturnThis();
  mockUpdate.where.mockResolvedValue(undefined);
  (db.update as ReturnType<typeof vi.fn>).mockReturnValue(mockUpdate);
});

describe("documentService.deleteAllStoredFiles", () => {
  it("deletes R2 files and sets storage_url/storage_key to null", async () => {
    const docs = [
      { id: "doc-1", storageKey: "user1/documents/doc-1.pdf", storageUrl: "user1/documents/doc-1.pdf" },
      { id: "doc-2", storageKey: "user1/documents/doc-2.pdf", storageUrl: "user1/documents/doc-2.pdf" },
    ];
    (db.query.documents.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(docs);

    const count = await documentService.deleteAllStoredFiles("user-1");

    expect(storageService.deleteFile).toHaveBeenCalledTimes(2);
    expect(storageService.deleteFile).toHaveBeenCalledWith("user1/documents/doc-1.pdf");
    expect(storageService.deleteFile).toHaveBeenCalledWith("user1/documents/doc-2.pdf");
    expect(db.update).toHaveBeenCalledTimes(2);
    expect(count).toBe(2);
  });

  it("returns count of deleted files", async () => {
    const docs = [
      { id: "doc-1", storageKey: "user1/docs/a.pdf" },
      { id: "doc-2", storageKey: "user1/docs/b.pdf" },
      { id: "doc-3", storageKey: "user1/docs/c.pdf" },
    ];
    (db.query.documents.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(docs);

    const count = await documentService.deleteAllStoredFiles("user-1");
    expect(count).toBe(3);
  });

  it("skips documents with no storage_key (findMany already filters, but handles empty result)", async () => {
    (db.query.documents.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const count = await documentService.deleteAllStoredFiles("user-1");

    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });

  it("still nulls db record even when R2 delete throws", async () => {
    const docs = [{ id: "doc-1", storageKey: "user1/docs/a.pdf" }];
    (db.query.documents.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(docs);
    (storageService.deleteFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("R2 error"));

    const count = await documentService.deleteAllStoredFiles("user-1");

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(count).toBe(0);
  });
});
