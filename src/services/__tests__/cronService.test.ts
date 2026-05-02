import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockDocsFindMany,
  mockUsersFindMany,
  mockNotificationCreate,
  mockSendDocumentExpiryEmail,
  mockGetSubscriptionsForUser,
  mockDeleteSubscription,
  mockSendPushNotification,
  mockDeleteObject,
  mockLoggerError,
  mockLoggerWarn,
  mockLoggerInfo,
} = vi.hoisted(() => ({
  mockDocsFindMany: vi.fn(),
  mockUsersFindMany: vi.fn(),
  mockNotificationCreate: vi.fn().mockResolvedValue({ id: "notif-1" }),
  mockSendDocumentExpiryEmail: vi.fn().mockResolvedValue(undefined),
  mockGetSubscriptionsForUser: vi.fn().mockResolvedValue([]),
  mockDeleteSubscription: vi.fn().mockResolvedValue(undefined),
  mockSendPushNotification: vi.fn().mockResolvedValue(undefined),
  mockDeleteObject: vi.fn().mockResolvedValue(undefined),
  mockLoggerError: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockLoggerInfo: vi.fn(),
}));

const mockUpdate = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      documents: { findMany: mockDocsFindMany },
      users: { findMany: mockUsersFindMany },
    },
    update: vi.fn(() => mockUpdate),
  },
}));

vi.mock("@/services/notificationService", () => ({
  notificationService: { create: mockNotificationCreate },
}));

vi.mock("@/services/emailService", () => ({
  emailService: { sendDocumentExpiryEmail: mockSendDocumentExpiryEmail },
}));

vi.mock("@/services/pushService", () => ({
  pushService: {
    getSubscriptionsForUser: mockGetSubscriptionsForUser,
    deleteSubscription: mockDeleteSubscription,
  },
}));

vi.mock("@/lib/push", () => ({
  sendPushNotification: mockSendPushNotification,
}));

vi.mock("@/lib/r2", () => ({
  deleteObject: mockDeleteObject,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

function daysFromNow(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-1",
    name: "Test User",
    notificationWindowDays: 30,
    pushNotificationsEnabled: false,
    ...overrides,
  };
}

function makeDoc(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "doc-1",
    userId: "user-1",
    type: "Insurance",
    expiryDate: daysFromNow(10),
    storageUrl: null,
    storageKey: null,
    expiryWarningNotifiedAt: null,
    expiryNotifiedAt: null,
    status: "valid",
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

import { cronService } from "@/services/cronService";

describe("cronService.runDocumentExpiryCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.set.mockReturnThis();
    mockUpdate.where.mockResolvedValue(undefined);
    mockNotificationCreate.mockResolvedValue({ id: "notif-1" });
    mockSendDocumentExpiryEmail.mockResolvedValue(undefined);
    mockGetSubscriptionsForUser.mockResolvedValue([]);
    mockDeleteObject.mockResolvedValue(undefined);
  });

  it("marks document as expired when expiry_date < today", async () => {
    const user = makeUser();
    const doc = makeDoc({ expiryDate: daysFromNow(-1), status: "valid" });
    mockDocsFindMany.mockResolvedValue([doc]);
    mockUsersFindMany.mockResolvedValue([user]);

    await cronService.runDocumentExpiryCheck();

    expect(mockUpdate.set).toHaveBeenCalledWith({ status: "expired" });
  });

  it("sets expiry_warning_notified_at when within notification window", async () => {
    const user = makeUser({ notificationWindowDays: 30 });
    const doc = makeDoc({ expiryDate: daysFromNow(10), expiryWarningNotifiedAt: null });
    mockDocsFindMany.mockResolvedValue([doc]);
    mockUsersFindMany.mockResolvedValue([user]);

    await cronService.runDocumentExpiryCheck();

    expect(mockUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ expiryWarningNotifiedAt: expect.any(Date) })
    );
  });

  it("does not double-notify when expiry_warning_notified_at is already set", async () => {
    const user = makeUser();
    const doc = makeDoc({
      expiryDate: daysFromNow(10),
      expiryWarningNotifiedAt: new Date(),
    });
    mockDocsFindMany.mockResolvedValue([doc]);
    mockUsersFindMany.mockResolvedValue([user]);

    await cronService.runDocumentExpiryCheck();

    expect(mockNotificationCreate).not.toHaveBeenCalled();
    expect(mockSendDocumentExpiryEmail).not.toHaveBeenCalled();
  });

  it("batches multiple expiring docs into ONE notification per user", async () => {
    const user = makeUser();
    const doc1 = makeDoc({ id: "doc-1", type: "Insurance", expiryDate: daysFromNow(5) });
    const doc2 = makeDoc({ id: "doc-2", type: "PUC", expiryDate: daysFromNow(10) });
    mockDocsFindMany.mockResolvedValue([doc1, doc2]);
    mockUsersFindMany.mockResolvedValue([user]);

    await cronService.runDocumentExpiryCheck();

    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
    expect(mockSendDocumentExpiryEmail).toHaveBeenCalledTimes(1);
  });

  it("deletes R2 file when expired > 10 days ago and storage_url is set", async () => {
    const user = makeUser();
    const doc = makeDoc({
      expiryDate: daysFromNow(-11),
      storageUrl: "https://r2.example.com/user-1/doc-1/file.pdf",
      storageKey: "user-1/doc-1/file.pdf",
    });
    mockDocsFindMany.mockResolvedValue([doc]);
    mockUsersFindMany.mockResolvedValue([user]);

    const result = await cronService.runDocumentExpiryCheck();

    expect(mockDeleteObject).toHaveBeenCalledWith("user-1/doc-1/file.pdf");
    expect(mockUpdate.set).toHaveBeenCalledWith({ storageUrl: null, storageKey: null });
    expect(result.deleted).toBe(1);
  });

  it("does NOT delete R2 file when storage_url is null", async () => {
    const user = makeUser();
    const doc = makeDoc({
      expiryDate: daysFromNow(-11),
      storageUrl: null,
      storageKey: null,
    });
    mockDocsFindMany.mockResolvedValue([doc]);
    mockUsersFindMany.mockResolvedValue([user]);

    await cronService.runDocumentExpiryCheck();

    expect(mockDeleteObject).not.toHaveBeenCalled();
  });

  it("continues processing after one document throws an error", async () => {
    const user = makeUser();
    const badDoc = makeDoc({ id: "bad-doc", expiryDate: daysFromNow(-1) });
    const goodDoc = makeDoc({ id: "good-doc", expiryDate: daysFromNow(5) });
    mockDocsFindMany.mockResolvedValue([badDoc, goodDoc]);
    mockUsersFindMany.mockResolvedValue([user]);

    // Simulate db.update throwing for bad-doc's status='expired' update
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.update).mockImplementationOnce(() => {
      throw new Error("DB connection lost");
    });

    await expect(cronService.runDocumentExpiryCheck()).resolves.not.toThrow();

    // logger.error called for the failing doc
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ docId: "bad-doc" }),
      "Error processing document in cron"
    );
    // good doc still processed — warning notification sent
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
  });

  it("returns correct processed / notified / deleted counts", async () => {
    const user = makeUser();
    const expiringDoc = makeDoc({ id: "doc-1", expiryDate: daysFromNow(5) });
    const expiredDoc = makeDoc({
      id: "doc-2",
      expiryDate: daysFromNow(-1),
      storageUrl: null,
    });
    mockDocsFindMany.mockResolvedValue([expiringDoc, expiredDoc]);
    mockUsersFindMany.mockResolvedValue([user]);

    const result = await cronService.runDocumentExpiryCheck();

    expect(result.processed).toBe(2);
    expect(result.notified).toBe(1); // both docs belong to same user → 1 batch
    expect(result.deleted).toBe(0);
  });

  it("sends push notification when user has push enabled", async () => {
    const user = makeUser({ pushNotificationsEnabled: true });
    const sub = { endpoint: "https://push.example.com/1", p256dhKey: "key", authKey: "auth" };
    const doc = makeDoc({ expiryDate: daysFromNow(5) });
    mockDocsFindMany.mockResolvedValue([doc]);
    mockUsersFindMany.mockResolvedValue([user]);
    mockGetSubscriptionsForUser.mockResolvedValue([sub]);

    await cronService.runDocumentExpiryCheck();

    expect(mockSendPushNotification).toHaveBeenCalledWith(
      sub,
      expect.objectContaining({ title: expect.any(String), body: expect.any(String) })
    );
  });

  it("removes stale push subscription on 410 error", async () => {
    const user = makeUser({ pushNotificationsEnabled: true });
    const sub = { endpoint: "https://push.example.com/stale", p256dhKey: "k", authKey: "a" };
    const doc = makeDoc({ expiryDate: daysFromNow(5) });
    mockDocsFindMany.mockResolvedValue([doc]);
    mockUsersFindMany.mockResolvedValue([user]);
    mockGetSubscriptionsForUser.mockResolvedValue([sub]);
    mockSendPushNotification.mockRejectedValue({ statusCode: 410 });

    await cronService.runDocumentExpiryCheck();

    expect(mockDeleteSubscription).toHaveBeenCalledWith(sub.endpoint);
  });

  it("returns zero counts when no documents have expiry dates", async () => {
    mockDocsFindMany.mockResolvedValue([]);
    mockUsersFindMany.mockResolvedValue([]);

    const result = await cronService.runDocumentExpiryCheck();

    expect(result).toEqual({ processed: 0, notified: 0, deleted: 0 });
  });

  // R4: expiryNotifiedAt idempotency (AC6)
  it("does not send expiry-day notification when expiryNotifiedAt is already set", async () => {
    const user = makeUser();
    const doc = makeDoc({
      expiryDate: daysFromNow(0),
      expiryNotifiedAt: new Date(),
    });
    mockDocsFindMany.mockResolvedValue([doc]);
    mockUsersFindMany.mockResolvedValue([user]);

    await cronService.runDocumentExpiryCheck();

    expect(mockNotificationCreate).not.toHaveBeenCalled();
    expect(mockSendDocumentExpiryEmail).not.toHaveBeenCalled();
  });

  // R1: notification body correctly separates expired from warning docs
  it("notification body correctly distinguishes expired from warning docs in mixed batch", async () => {
    const user = makeUser();
    const warningDoc = makeDoc({ id: "doc-warn", type: "Insurance", expiryDate: daysFromNow(5) });
    const expiredDoc = makeDoc({
      id: "doc-exp",
      type: "PUC",
      expiryDate: daysFromNow(-1),
      // expired doc won't be added to expiredDocs (daysUntilExpiry === 0 path),
      // but a doc expiring today with !expiryNotifiedAt will
    });
    // Use today doc to trigger step 4 (expiry-day) and warning doc for step 3
    const todayDoc = makeDoc({
      id: "doc-today",
      type: "PUC",
      expiryDate: daysFromNow(0),
      expiryNotifiedAt: null,
    });
    mockDocsFindMany.mockResolvedValue([warningDoc, todayDoc]);
    mockUsersFindMany.mockResolvedValue([user]);

    await cronService.runDocumentExpiryCheck();

    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
    const [, , , body] = mockNotificationCreate.mock.calls[0];
    expect(body).toContain("PUC");
    expect(body).toContain("Insurance");
    // Body must NOT say Insurance has expired
    expect(body).not.toMatch(/Insurance.*expired/);
    // Body must indicate Insurance is expiring soon
    expect(body).toMatch(/Insurance.*expiring soon/);
  });
});

// ─── Route: 401 check ─────────────────────────────────────────────────────────

describe("GET /api/cron/document-expiry — auth", () => {
  it("returns 401 when CRON_SECRET env var is not set", async () => {
    const saved = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    const { GET } = await import("@/app/api/cron/document-expiry/route");

    const req = new Request("http://localhost/api/cron/document-expiry", {
      headers: { Authorization: "Bearer undefined" },
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
    process.env.CRON_SECRET = saved;
  });

  it("returns 401 when Authorization header is missing or wrong", async () => {
    process.env.CRON_SECRET = "secret-value";

    const { GET } = await import("@/app/api/cron/document-expiry/route");

    const req = new Request("http://localhost/api/cron/document-expiry");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 200 with correct Authorization header", async () => {
    process.env.CRON_SECRET = "secret-value";
    mockDocsFindMany.mockResolvedValue([]);
    mockUsersFindMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/cron/document-expiry/route");

    const req = new Request("http://localhost/api/cron/document-expiry", {
      headers: { Authorization: "Bearer secret-value" },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ processed: 0, notified: 0, deleted: 0 });
  });
});
