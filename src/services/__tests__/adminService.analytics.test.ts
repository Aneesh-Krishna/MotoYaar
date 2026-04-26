import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn(),
    execute: vi.fn(),
  },
}));

vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/r2", () => ({ deleteObject: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/notificationService", () => ({
  notificationService: { create: vi.fn() },
}));
vi.mock("@/services/userService", () => ({
  userService: { getById: vi.fn() },
}));
vi.mock("@/services/emailService", () => ({
  emailService: { sendBetaInviteEmail: vi.fn() },
}));
vi.mock("bcryptjs", () => ({ default: { compare: vi.fn() } }));

import { db } from "@/lib/db/client";
import { adminService } from "../adminService";

const mockSelect = db.select as ReturnType<typeof vi.fn>;
const mockExecute = db.execute as ReturnType<typeof vi.fn>;

// Creates a self-referential fluent chain that resolves to `value` at any .then() call.
// Supports: .from(x).then(), .from(x).where(y).then(), .from(x).innerJoin(y).where(z).then()
function makeChain(value: Array<{ count: string | number }>) {
  const chain: any = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.then = (fn: (v: typeof value) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(value).then(fn as any, rej);
  chain.catch = (fn: (e: unknown) => unknown) => Promise.resolve(value).catch(fn);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("adminService.getAnalytics", () => {
  // db.select is called 8 times in getAnalytics() when helpers are spied:
  // totalUsers, newUsersThisWeek, newUsersThisMonth, totalVehicles,
  // totalPosts, totalComments, aiReportsThisMonth, pendingReportsCount
  function setupSelectMocks(counts: number[]) {
    let chain = mockSelect;
    for (const count of counts) {
      chain = chain.mockReturnValueOnce(makeChain([{ count: String(count) }]));
    }
  }

  function spyOnHelpers() {
    vi.spyOn(adminService, "_getParseSuccessRate").mockResolvedValue(100);
    vi.spyOn(adminService, "_getWeeklySignups").mockResolvedValue([]);
    vi.spyOn(adminService, "_getWeeklyActivity").mockResolvedValue([]);
  }

  it("returns correct totalUsers count", async () => {
    spyOnHelpers();
    setupSelectMocks([42, 3, 8, 15, 100, 250, 5, 2]);

    const result = await adminService.getAnalytics();

    expect(result.totalUsers).toBe(42);
  });

  it("returns correct newUsersThisWeek count", async () => {
    spyOnHelpers();
    setupSelectMocks([200, 7, 20, 50, 300, 800, 12, 0]);

    const result = await adminService.getAnalytics();

    expect(result.newUsersThisWeek).toBe(7);
  });

  it("calculates parse success rate correctly", async () => {
    // _getParseSuccessRate: select total docs first, then parsed docs
    mockSelect
      .mockReturnValueOnce(makeChain([{ count: "5" }]))   // total
      .mockReturnValueOnce(makeChain([{ count: "4" }]));  // parsed → 80%

    const result = await adminService._getParseSuccessRate(new Date());

    expect(result).toBe(80);
  });

  it("returns 100% parse success rate when no documents", async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ count: "0" }]))   // total = 0
      .mockReturnValueOnce(makeChain([{ count: "0" }]));  // parsed (not reached)

    const result = await adminService._getParseSuccessRate(new Date());

    expect(result).toBe(100);
  });

  it("returns weekly signups as array of { week, count }", async () => {
    mockExecute.mockResolvedValue([
      { week: "2026-02-02", count: "10" },
      { week: "2026-02-09", count: "5" },
    ]);

    const result = await adminService._getWeeklySignups(new Date("2026-01-05"));

    expect(result).toEqual([
      { week: "2026-02-02", count: 10 },
      { week: "2026-02-09", count: 5 },
    ]);
  });
});
