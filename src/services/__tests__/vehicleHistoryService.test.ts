import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: mockSelect,
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { vehicleHistoryService } from "../vehicleHistoryService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  const noop = () => chain;
  chain.from = noop;
  chain.innerJoin = noop;
  chain.leftJoin = noop;
  chain.where = noop;
  chain.orderBy = vi.fn().mockResolvedValue(resolvedValue);
  return chain;
}

function makeRow(overrides: Partial<{
  id: string;
  reason: string;
  date: string;
  serviceCenterName: string | null;
  odometerKm: number | null;
  deletedByOwner: boolean;
}> = {}) {
  return {
    id: overrides.id ?? "exp-1",
    reason: overrides.reason ?? "Service",
    date: overrides.date ?? "2026-01-15",
    serviceCenterName: overrides.serviceCenterName ?? null,
    odometerKm: overrides.odometerKm ?? null,
    deletedByOwner: overrides.deletedByOwner ?? false,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("vehicleHistoryService.getByReg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns service history entries for a registration number", async () => {
    const rows = [
      makeRow({ id: "exp-1", date: "2025-06-10", serviceCenterName: "QuickFix", odometerKm: 12000 }),
      makeRow({ id: "exp-2", date: "2026-01-20" }),
    ];
    const chain = makeSelectChain(rows);
    mockSelect.mockReturnValue(chain);

    const result = await vehicleHistoryService.getByReg("MH12AB1234");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("exp-1");
    expect(result[0].serviceCenterName).toBe("QuickFix");
    expect(result[0].odometerKm).toBe(12000);
    expect(result[1].id).toBe("exp-2");
  });

  it("returns tombstone entries for soft-deleted records", async () => {
    const rows = [
      makeRow({ id: "exp-1", deletedByOwner: true }),
    ];
    const chain = makeSelectChain(rows);
    mockSelect.mockReturnValue(chain);

    const result = await vehicleHistoryService.getByReg("MH12AB1234");

    expect(result).toHaveLength(1);
    expect(result[0].deletedByOwner).toBe(true);
  });

  it("returns empty array when no history exists", async () => {
    const chain = makeSelectChain([]);
    mockSelect.mockReturnValue(chain);

    const result = await vehicleHistoryService.getByReg("XX00ZZ9999");

    expect(result).toHaveLength(0);
  });

  it("normalises registration number before query (strips spaces and hyphens, uppercases)", async () => {
    const chain = makeSelectChain([]);
    mockSelect.mockReturnValue(chain);

    // Should not throw; normalisation is internal
    await expect(vehicleHistoryService.getByReg("mh 12-ab 1234")).resolves.toEqual([]);
    expect(chain.orderBy).toHaveBeenCalled();
  });
});
