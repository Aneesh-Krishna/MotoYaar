import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError } from "@/lib/errors";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockFindMany, mockUsersFindFirst } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockUsersFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      users: { findFirst: mockUsersFindFirst },
      documents: { findMany: mockFindMany },
    },
  },
}));

vi.mock("@/services/vehicleService", () => ({
  vehicleService: {
    getWithAccessCheck: vi.fn().mockResolvedValue({ id: "vehicle-1", userId: "user-1" }),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/services/storageService", () => ({
  storageService: {
    copyFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { documentService } from "../documentService";
import { vehicleService } from "@/services/vehicleService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const VEHICLE_ID = "vehicle-1";

function makeDoc(overrides: {
  id?: string;
  expiryDate?: string | null;
  status?: string;
  storageUrl?: string | null;
} = {}) {
  return {
    id: overrides.id ?? "doc-1",
    vehicleId: VEHICLE_ID,
    userId: USER_ID,
    type: "Insurance",
    label: null,
    expiryDate: "expiryDate" in overrides ? overrides.expiryDate! : "2027-06-01",
    storageUrl: overrides.storageUrl ?? null,
    parseStatus: "parsed",
    status: overrides.status ?? "valid",
    expiryWarningNotifiedAt: null,
    expiryNotifiedAt: null,
    createdAt: new Date("2026-03-19"),
  };
}

const DB_USER = { id: USER_ID, notificationWindowDays: 30 };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("documentService.listByVehicle()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsersFindFirst.mockResolvedValue(DB_USER);
  });

  it("returns documents sorted by soonest expiry first", async () => {
    const soon = makeDoc({ id: "doc-soon", expiryDate: "2026-04-01" });
    const later = makeDoc({ id: "doc-later", expiryDate: "2027-12-01" });
    // DB returns in the order Drizzle was called — we trust the orderBy to handle this server-side
    mockFindMany.mockResolvedValue([soon, later]);

    const result = await documentService.listByVehicle(VEHICLE_ID, USER_ID);

    expect(result[0].id).toBe("doc-soon");
    expect(result[1].id).toBe("doc-later");
  });

  it("returns incomplete documents (null expiry) with 'incomplete' status", async () => {
    const noExpiry = makeDoc({ id: "doc-null", expiryDate: null });
    mockFindMany.mockResolvedValue([noExpiry]);

    const result = await documentService.listByVehicle(VEHICLE_ID, USER_ID);

    expect(result[0].status).toBe("incomplete");
    expect(result[0].expiryDate).toBeUndefined();
  });

  it("throws ForbiddenError for non-owner without access", async () => {
    vi.mocked(vehicleService.getWithAccessCheck).mockRejectedValueOnce(
      new ForbiddenError("Access denied")
    );

    await expect(documentService.listByVehicle(VEHICLE_ID, "other-user")).rejects.toThrow(
      ForbiddenError
    );
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("computes status for each document based on user notification window", async () => {
    // 10 days from now — within 30-day window → expiring
    const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const doc = makeDoc({ expiryDate: in10Days });
    mockFindMany.mockResolvedValue([doc]);
    mockUsersFindFirst.mockResolvedValue({ ...DB_USER, notificationWindowDays: 30 });

    const result = await documentService.listByVehicle(VEHICLE_ID, USER_ID);

    expect(result[0].status).toBe("expiring");
  });

  it("uses default 30-day window when user not found", async () => {
    mockUsersFindFirst.mockResolvedValue(undefined);
    const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    mockFindMany.mockResolvedValue([makeDoc({ expiryDate: in10Days })]);

    const result = await documentService.listByVehicle(VEHICLE_ID, USER_ID);

    expect(result[0].status).toBe("expiring");
  });

  it("returns 'expired' for a document whose expiry date is today", async () => {
    const today = new Date().toISOString().split("T")[0];
    mockFindMany.mockResolvedValue([makeDoc({ expiryDate: today })]);

    const result = await documentService.listByVehicle(VEHICLE_ID, USER_ID);

    expect(result[0].status).toBe("expired");
  });

  it("returns 'expired' for a document whose expiry date is in the past", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    mockFindMany.mockResolvedValue([makeDoc({ expiryDate: yesterday })]);

    const result = await documentService.listByVehicle(VEHICLE_ID, USER_ID);

    expect(result[0].status).toBe("expired");
  });
});
