import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDelete = {
  where: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      documents: { findMany: vi.fn() },
      expenses: { findMany: vi.fn() },
      posts: { findMany: vi.fn() },
      vehicles: { findMany: vi.fn() },
    },
    delete: vi.fn(() => mockDelete),
  },
}));

vi.mock("@/services/storageService", () => ({
  storageService: {
    deleteFile: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { db } from "@/lib/db/client";
import { storageService } from "@/services/storageService";
import { userService } from "../userService";

const USER_ID = "user-123";

function seedMocks({
  profileImageUrl = null,
  docs = [],
  expenses = [],
  posts = [],
  vehicleImages = [],
}: {
  profileImageUrl?: string | null;
  docs?: { id: string; storageKey: string | null }[];
  expenses?: { id: string; receiptKey: string | null }[];
  posts?: { id: string; images: string[] }[];
  vehicleImages?: { id: string; imageUrl: string | null }[];
}) {
  (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: USER_ID,
    profileImageUrl,
  });
  (db.query.documents.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(docs);
  (db.query.expenses.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(expenses);
  (db.query.posts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(posts);
  (db.query.vehicles.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(vehicleImages);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDelete.where.mockResolvedValue(undefined);
  (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(mockDelete);
});

describe("userService.deleteAccount", () => {
  it("deletes user record from DB", async () => {
    seedMocks({});

    await userService.deleteAccount(USER_ID);

    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(mockDelete.where).toHaveBeenCalledTimes(1);
  });

  it("deletes all R2 files (profile image, documents, receipts, post images)", async () => {
    seedMocks({
      profileImageUrl: "user-123/avatar.jpg",
      docs: [{ id: "d1", storageKey: "user-123/docs/d1.pdf" }],
      expenses: [{ id: "e1", receiptKey: "user-123/receipts/e1.jpg" }],
      posts: [{ id: "p1", images: ["user-123/posts/img1.jpg", "user-123/posts/img2.jpg"] }],
    });

    await userService.deleteAccount(USER_ID);

    expect(storageService.deleteFile).toHaveBeenCalledWith("user-123/avatar.jpg");
    expect(storageService.deleteFile).toHaveBeenCalledWith("user-123/docs/d1.pdf");
    expect(storageService.deleteFile).toHaveBeenCalledWith("user-123/receipts/e1.jpg");
    expect(storageService.deleteFile).toHaveBeenCalledWith("user-123/posts/img1.jpg");
    expect(storageService.deleteFile).toHaveBeenCalledWith("user-123/posts/img2.jpg");
  });

  it("does not throw if R2 delete fails (non-fatal)", async () => {
    seedMocks({
      profileImageUrl: "user-123/avatar.jpg",
    });
    (storageService.deleteFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("R2 unavailable")
    );

    await expect(userService.deleteAccount(USER_ID)).resolves.toBeUndefined();
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it("still deletes DB record when user has no R2 files", async () => {
    seedMocks({ docs: [], expenses: [], posts: [], vehicleImages: [] });

    await userService.deleteAccount(USER_ID);

    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it("deletes vehicle imageUrl R2 keys during account deletion", async () => {
    seedMocks({
      vehicleImages: [
        { id: "v1", imageUrl: "user-123/vehicles/v1.jpg" },
        { id: "v2", imageUrl: null },
        { id: "v3", imageUrl: "user-123/vehicles/v3.jpg" },
      ],
    });

    await userService.deleteAccount(USER_ID);

    expect(storageService.deleteFile).toHaveBeenCalledWith("user-123/vehicles/v1.jpg");
    expect(storageService.deleteFile).toHaveBeenCalledWith("user-123/vehicles/v3.jpg");
    expect(storageService.deleteFile).toHaveBeenCalledTimes(2);
  });
});
