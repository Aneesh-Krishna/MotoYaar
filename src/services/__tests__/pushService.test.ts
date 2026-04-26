import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB client ──────────────────────────────────────────────────────────

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      pushSubscriptions: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  pushSubscriptions: {
    userId: "userId",
    endpoint: "endpoint",
    p256dhKey: "p256dhKey",
    authKey: "authKey",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

import { db } from "@/lib/db/client";
import { pushService } from "@/services/pushService";

const mockDb = db as unknown as {
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe("pushService.subscribe", () => {
  const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });

  beforeEach(() => {
    vi.clearAllMocks();
    mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({ values: mockValues });
  });

  it("inserts a new subscription record", async () => {
    await pushService.subscribe("user-1", {
      endpoint: "https://push.example.com/sub/abc",
      p256dh: "key-p256dh",
      auth: "key-auth",
    });

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      userId: "user-1",
      endpoint: "https://push.example.com/sub/abc",
      p256dhKey: "key-p256dh",
      authKey: "key-auth",
    });
    expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: { p256dhKey: "key-p256dh", authKey: "key-auth" },
      })
    );
  });

  it("upserts when endpoint already exists (calls onConflictDoUpdate with new keys)", async () => {
    await pushService.subscribe("user-1", {
      endpoint: "https://push.example.com/sub/existing",
      p256dh: "new-p256dh",
      auth: "new-auth",
    });

    expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: { p256dhKey: "new-p256dh", authKey: "new-auth" },
      })
    );
  });
});

describe("pushService.deleteSubscription", () => {
  const mockWhere = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockResolvedValue(undefined);
    mockDb.delete.mockReturnValue({ where: mockWhere });
  });

  it("removes subscription by endpoint", async () => {
    await pushService.deleteSubscription("https://push.example.com/sub/abc");

    expect(mockDb.delete).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
  });
});

describe("pushService.deleteAllForUser", () => {
  const mockWhere = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockResolvedValue(undefined);
    mockDb.delete.mockReturnValue({ where: mockWhere });
  });

  it("deletes all push subscriptions for the authenticated user", async () => {
    await pushService.deleteAllForUser("user-42");

    expect(mockDb.delete).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
  });

  it("does not affect subscriptions of other users (where clause uses correct userId)", async () => {
    const { eq } = await import("drizzle-orm");
    const { pushSubscriptions } = await import("@/lib/db/schema");

    await pushService.deleteAllForUser("user-42");

    expect(eq).toHaveBeenCalledWith(pushSubscriptions.userId, "user-42");
  });
});
