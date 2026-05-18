import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockInsert, mockDelete } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    insert: mockInsert,
    delete: mockDelete,
  },
}));

import { enforceRateLimit, RATE_LIMITS, purgeExpiredRateLimits, __test__ } from "../rateLimit";
import { QuotaExceededError } from "@/lib/errors";

function makeInsertChain(returnedCount: number) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ count: returnedCount }]),
  };
  mockInsert.mockReturnValue(chain);
  return chain;
}

function makeInsertChainSequence(counts: number[]) {
  let i = 0;
  mockInsert.mockImplementation(() => ({
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ count: counts[i++] ?? 0 }]),
  }));
}

const USER = "11111111-1111-1111-1111-111111111111";

beforeEach(() => vi.clearAllMocks());

describe("minuteKey / dayKey", () => {
  it("minuteKey buckets by minute (UTC)", () => {
    const k = __test__.minuteKey(new Date("2026-05-18T10:23:45.123Z"));
    expect(k).toBe("min:2026-05-18T10:23");
  });

  it("dayKey buckets by day (UTC)", () => {
    const k = __test__.dayKey(new Date("2026-05-18T23:59:59Z"));
    expect(k).toBe("day:2026-05-18");
  });
});

describe("enforceRateLimit", () => {
  it("passes when under limit", async () => {
    makeInsertChain(5);
    await expect(
      enforceRateLimit(USER, { endpoint: "x", perUserPerMin: 10 })
    ).resolves.toBeUndefined();
  });

  it("throws QuotaExceededError when per-min limit exceeded", async () => {
    makeInsertChain(11);
    await expect(
      enforceRateLimit(USER, { endpoint: "x", perUserPerMin: 10 })
    ).rejects.toBeInstanceOf(QuotaExceededError);
  });

  it("checks per-min, per-day, and global in order; first violation throws", async () => {
    // per-min ok, per-day ok, global EXCEEDS
    makeInsertChainSequence([1, 50, 5001]);
    await expect(
      enforceRateLimit(USER, {
        endpoint: "places.details",
        perUserPerMin: 30,
        perUserPerDay: 200,
        globalPerDay: 5000,
      })
    ).rejects.toBeInstanceOf(QuotaExceededError);
    expect(mockInsert).toHaveBeenCalledTimes(3);
  });

  it("uses GLOBAL_USER_ID for the global counter", async () => {
    const calls: Array<Record<string, unknown>> = [];
    mockInsert.mockImplementation(() => ({
      values: vi.fn((v: Record<string, unknown>) => {
        calls.push(v);
        return {
          onConflictDoUpdate: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([{ count: 1 }]),
        };
      }),
    }));

    await enforceRateLimit(USER, {
      endpoint: "places.details",
      perUserPerMin: 30,
      perUserPerDay: 200,
      globalPerDay: 5000,
    });

    expect(calls).toHaveLength(3);
    expect(calls[0].userId).toBe(USER); // per-min
    expect(calls[1].userId).toBe(USER); // per-day
    expect(calls[2].userId).toBe(__test__.GLOBAL_USER_ID); // global
  });

  it("skips checks not present in the rule", async () => {
    makeInsertChain(1);
    await enforceRateLimit(USER, { endpoint: "x", perUserPerMin: 10 });
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});

describe("RATE_LIMITS constants", () => {
  it("places.details has all three layers", () => {
    expect(RATE_LIMITS.placesDetails.perUserPerMin).toBe(30);
    expect(RATE_LIMITS.placesDetails.perUserPerDay).toBe(200);
    expect(RATE_LIMITS.placesDetails.globalPerDay).toBe(5000);
  });

  it("places.autocomplete has user-only layers", () => {
    expect(RATE_LIMITS.placesAutocomplete.perUserPerMin).toBe(60);
    expect(RATE_LIMITS.placesAutocomplete.perUserPerDay).toBe(500);
    expect((RATE_LIMITS.placesAutocomplete as { globalPerDay?: number }).globalPerDay).toBeUndefined();
  });
});

describe("purgeExpiredRateLimits", () => {
  it("returns count of deleted rows", async () => {
    const chain = {
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{}, {}, {}]),
    };
    mockDelete.mockReturnValue(chain);

    const n = await purgeExpiredRateLimits();
    expect(n).toBe(3);
  });
});
