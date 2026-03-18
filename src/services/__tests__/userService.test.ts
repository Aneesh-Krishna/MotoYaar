import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConflictError, NotFoundError } from "@/lib/errors";

// Mock the DB client
vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
  },
}));

import { db } from "@/lib/db/client";
import { userService } from "../userService";

const mockUpdate = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  (db.update as ReturnType<typeof vi.fn>).mockReturnValue(mockUpdate);
});

describe("userService.update", () => {
  it("throws ConflictError when username is taken by another user", async () => {
    (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "other-user-id",
      username: "takenname",
    });

    await expect(
      userService.update("my-user-id", { username: "takenname" })
    ).rejects.toThrow(ConflictError);
  });

  it("does not throw when username belongs to the same user", async () => {
    (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "my-user-id",
      username: "samename",
    });
    mockUpdate.returning.mockResolvedValue([{ id: "my-user-id", username: "samename" }]);

    const result = await userService.update("my-user-id", { username: "samename" });
    expect(result).toMatchObject({ id: "my-user-id" });
  });

  it("throws NotFoundError when user does not exist in DB", async () => {
    (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mockUpdate.returning.mockResolvedValue([]);

    await expect(
      userService.update("nonexistent-id", { name: "Test" })
    ).rejects.toThrow(NotFoundError);
  });

  it("returns updated user on success", async () => {
    (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const updatedUser = { id: "user-1", name: "New Name", username: "user1" };
    mockUpdate.returning.mockResolvedValue([updatedUser]);

    const result = await userService.update("user-1", { name: "New Name" });
    expect(result).toEqual(updatedUser);
  });
});

describe("userService.getById", () => {
  it("throws NotFoundError when user not found", async () => {
    (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(userService.getById("missing-id")).rejects.toThrow(NotFoundError);
  });

  it("returns user when found", async () => {
    const user = { id: "user-1", username: "rider1" };
    (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(user);

    const result = await userService.getById("user-1");
    expect(result).toEqual(user);
  });
});
