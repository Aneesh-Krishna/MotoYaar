import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSelect, mockInsert, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

import { getCached, setCached, buildCacheKey, purgeExpired } from "../mapCacheService";

const FUTURE = new Date(Date.now() + 60_000).toISOString();
const PAST = new Date(Date.now() - 60_000).toISOString();

function makeSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  mockSelect.mockReturnValue(chain);
  return chain;
}

function makeUpdateChain() {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  mockUpdate.mockReturnValue(chain);
  return chain;
}

/** Supports both plain .where() (getCached expired cleanup) and .where().returning() (purgeExpired) */
function makeDeleteChain(deletedRows: unknown[] = []) {
  const chain: Record<string, unknown> = {};
  // .where() resolves (for getCached plain delete) AND returns the chain (for .returning() chaining)
  chain.where = vi.fn().mockResolvedValue(undefined);
  (chain.where as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  chain.returning = vi.fn().mockResolvedValue(deletedRows);
  mockDelete.mockReturnValue(chain);
  return chain;
}

function makeInsertChain() {
  const chain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };
  mockInsert.mockReturnValue(chain);
  return chain;
}

beforeEach(() => vi.clearAllMocks());

describe("buildCacheKey", () => {
  it("produces the same hash regardless of key order", () => {
    const a = buildCacheKey({ origin: "Delhi", destination: "Mumbai", mode: "driving" });
    const b = buildCacheKey({ mode: "driving", destination: "Mumbai", origin: "Delhi" });
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", () => {
    const a = buildCacheKey({ origin: "Delhi" });
    const b = buildCacheKey({ origin: "Mumbai" });
    expect(a).not.toBe(b);
  });
});

describe("getCached", () => {
  it("returns null on cache miss", async () => {
    makeSelectChain([]);
    const result = await getCached("nonexistent-key");
    expect(result).toBeNull();
  });

  it("returns data and increments hit_count on cache hit", async () => {
    const payload = { routes: [] };
    makeSelectChain([{ cacheKey: "k", responseData: payload, expiresAt: FUTURE }]);
    makeUpdateChain();

    const result = await getCached("k");
    expect(result).toEqual(payload);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("deletes expired entry and returns null", async () => {
    makeSelectChain([{ cacheKey: "k", responseData: {}, expiresAt: PAST }]);
    makeDeleteChain([{ cacheKey: "k" }]);

    const result = await getCached("k");
    expect(result).toBeNull();
    expect(mockDelete).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("setCached", () => {
  it("inserts with correct cache key and type", async () => {
    const insertChain = makeInsertChain();
    await setCached("key1", "directions", { routes: [] }, "directions_traffic");
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ cacheKey: "key1", cacheType: "directions" })
    );
  });
});

describe("purgeExpired", () => {
  it("returns count of deleted rows from .returning()", async () => {
    makeDeleteChain([{ cacheKey: "a" }, { cacheKey: "b" }]);
    const count = await purgeExpired();
    expect(count).toBe(2);
  });

  it("returns 0 when nothing is expired", async () => {
    makeDeleteChain([]);
    const count = await purgeExpired();
    expect(count).toBe(0);
  });
});
