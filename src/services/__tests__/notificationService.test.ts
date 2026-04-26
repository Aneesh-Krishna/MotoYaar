import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mocks (must be defined before vi.mock calls) ─────────────────────

const { mockFindMany, mockSelectWhere, mockUpdateSet, mockUpdateWhere } = vi.hoisted(() => {
  const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockSelectWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
  const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  const mockFindMany = vi.fn().mockResolvedValue([]);
  return { mockFindMany, mockSelectWhere, mockUpdateSet, mockUpdateWhere, mockSelectFrom };
});

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      notifications: {
        findMany: mockFindMany,
      },
    },
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: mockSelectWhere })) })),
    update: vi.fn(() => ({ set: mockUpdateSet })),
  },
}));

vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    ...actual,
    eq: vi.fn((_col: unknown, val: unknown) => `eq:${val}`),
    and: vi.fn((...args: unknown[]) => `and:(${args.join(",")})`),
    desc: vi.fn((col: unknown) => col),
  };
});

import { notificationService } from "../notificationService";

// ─── Tests ─────────────────────────────────────────────────────────────────────

const userId = "user-1";

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectWhere.mockResolvedValue([{ count: 0 }]);
  mockFindMany.mockResolvedValue([]);
  mockUpdateWhere.mockResolvedValue(undefined);
});

describe("notificationService.listByUser", () => {
  it("returns paginated notifications newest first", async () => {
    const fakeNotifs = [
      { id: "n2", userId, title: "B", body: "", type: "ai_report_ready", isRead: false, actionUrl: null, createdAt: new Date("2026-04-13") },
      { id: "n1", userId, title: "A", body: "", type: "document_expired", isRead: true, actionUrl: null, createdAt: new Date("2026-04-12") },
    ];
    mockFindMany.mockResolvedValue(fakeNotifs);
    mockSelectWhere.mockResolvedValue([{ count: 1 }]);

    const result = await notificationService.listByUser(userId, 1);

    expect(result.notifications).toHaveLength(2);
    expect(result.notifications[0].id).toBe("n2");
  });

  it("returns correct unreadCount", async () => {
    mockFindMany.mockResolvedValue([]);
    mockSelectWhere.mockResolvedValue([{ count: 5 }]);

    const result = await notificationService.listByUser(userId, 1);

    expect(result.unreadCount).toBe(5);
  });

  it("uses page offset correctly for page 2", async () => {
    await notificationService.listByUser(userId, 2);

    const call = mockFindMany.mock.calls[0][0];
    expect(call.offset).toBe(20);
    expect(call.limit).toBe(20);
  });
});

describe("notificationService.markAllRead", () => {
  it("sets all notifications is_read=true for user", async () => {
    await notificationService.markAllRead(userId);

    expect(mockUpdateSet).toHaveBeenCalledWith({ isRead: true });
  });

  it("does not affect other users' notifications — WHERE clause scopes to userId", async () => {
    await notificationService.markAllRead(userId);

    // eq() mock serializes as "eq:<value>", so the where arg must contain the userId
    expect(mockUpdateWhere).toHaveBeenCalledWith(
      expect.stringContaining(userId)
    );
  });
});

describe("notificationService.markRead", () => {
  it("marks a single notification as read", async () => {
    await notificationService.markRead("notif-1", userId);

    expect(mockUpdateSet).toHaveBeenCalledWith({ isRead: true });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });
});

describe("notificationService.countUnread", () => {
  it("returns the unread count from db", async () => {
    mockSelectWhere.mockResolvedValue([{ count: 3 }]);

    const count = await notificationService.countUnread(userId);

    expect(count).toBe(3);
  });

  it("returns 0 when no results", async () => {
    mockSelectWhere.mockResolvedValue([]);

    const count = await notificationService.countUnread(userId);

    expect(count).toBe(0);
  });
});
