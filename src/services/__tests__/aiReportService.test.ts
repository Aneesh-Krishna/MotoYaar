import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuotaExceededError, BadRequestError, NotFoundError, ForbiddenError } from "@/lib/errors";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockFindMany,
  mockFindFirst,
  mockLoggerError,
  mockLoggerWarn,
  mockNotificationCreate,
  mockGetSubscriptionsForUser,
  mockDeleteSubscription,
  mockSendEmail,
  mockSendPushNotification,
  mockUserGetById,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindFirst: vi.fn(),
  mockLoggerError: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockNotificationCreate: vi.fn().mockResolvedValue({
    id: "notif-1",
    userId: "user-uuid-1",
    type: "ai_report_ready",
    title: "Your AI report is ready",
    body: "Your spending report is ready to view.",
    actionUrl: "/reports/ai/report-uuid-1",
    isRead: false,
    createdAt: new Date(),
  }),
  mockGetSubscriptionsForUser: vi.fn().mockResolvedValue([]),
  mockDeleteSubscription: vi.fn().mockResolvedValue(undefined),
  mockSendEmail: vi.fn().mockResolvedValue(undefined),
  mockSendPushNotification: vi.fn().mockResolvedValue(undefined),
  mockUserGetById: vi.fn().mockResolvedValue({ id: "user-uuid-1", name: "Test User" }),
}));

const mockInsert = {
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

const mockUpdate = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      aiReports: {
        findMany: mockFindMany,
        findFirst: mockFindFirst,
      },
    },
    insert: vi.fn(),
    update: vi.fn(() => mockUpdate),
  },
}));

vi.mock("@/lib/anthropic", () => ({
  generateReport: vi.fn().mockResolvedValue("AI narrative text"),
}));

vi.mock("@/services/notificationService", () => ({
  notificationService: {
    create: mockNotificationCreate,
  },
}));

vi.mock("@/services/pushService", () => ({
  pushService: {
    getSubscriptionsForUser: mockGetSubscriptionsForUser,
    deleteSubscription: mockDeleteSubscription,
  },
}));

vi.mock("@/services/userService", () => ({
  userService: {
    getById: mockUserGetById,
  },
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: mockSendEmail,
}));

vi.mock("@/lib/push", () => ({
  sendPushNotification: mockSendPushNotification,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: mockLoggerError, info: vi.fn(), warn: mockLoggerWarn },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { db } from "@/lib/db/client";
import { generateReport } from "@/lib/anthropic";
import { aiReportService, FREE_REPORTS_PER_MONTH } from "../aiReportService";
import type { ExpenseSnapshot } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-uuid-1";
const REPORT_ID = "report-uuid-1";

const VALID_SNAPSHOT: ExpenseSnapshot = {
  periodLabel: "Apr 2026",
  totalExpenses: 5000,
  currency: "INR",
  byCategory: [{ category: "Fuel", total: 3000, count: 5 }],
  monthlyTotals: [{ month: "Apr 2026", total: 5000 }],
  vehicleCount: 1,
  topVehicle: { name: "My Bike", total: 5000 },
};

function makePendingReport(overrides: Partial<{ expenseSnapshot: ExpenseSnapshot | null }> = {}) {
  return {
    id: REPORT_ID,
    userId: USER_ID,
    status: "pending",
    periodLabel: "Apr 2026",
    content: null,
    expenseSnapshot: overrides.expenseSnapshot !== undefined ? overrides.expenseSnapshot : VALID_SNAPSHOT,
    requestedAt: new Date(),
    completedAt: null,
  };
}

// ─── checkQuota ───────────────────────────────────────────────────────────────

describe("aiReportService.checkQuota", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows report when no reports exist this month", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await aiReportService.checkQuota(USER_ID);

    expect(result.allowed).toBe(true);
    expect(result.usedThisMonth).toBe(0);
    expect(result.freePerMonth).toBe(FREE_REPORTS_PER_MONTH);
  });

  it("blocks report when 1 non-failed report exists this month", async () => {
    mockFindMany.mockResolvedValue([makePendingReport()]);

    const result = await aiReportService.checkQuota(USER_ID);

    expect(result.allowed).toBe(false);
    expect(result.usedThisMonth).toBe(1);
  });

  it("allows report when only failed reports exist this month", async () => {
    // checkQuota filters status != 'failed' at the DB level via ne(); findMany returns
    // only non-failed records — simulate the filter returning empty
    mockFindMany.mockResolvedValue([]);

    const result = await aiReportService.checkQuota(USER_ID);

    expect(result.allowed).toBe(true);
    expect(result.usedThisMonth).toBe(0);
  });
});

// ─── requestReport ────────────────────────────────────────────────────────────

describe("aiReportService.requestReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(mockInsert);
  });

  it("throws QuotaExceededError when quota is reached", async () => {
    mockFindMany.mockResolvedValue([makePendingReport()]);

    await expect(
      aiReportService.requestReport(USER_ID, "Apr 2026", VALID_SNAPSHOT)
    ).rejects.toThrow(QuotaExceededError);
  });

  it("creates pending ai_report record and returns reportId", async () => {
    mockFindMany.mockResolvedValue([]);
    mockInsert.returning.mockResolvedValue([{ id: REPORT_ID }]);

    const result = await aiReportService.requestReport(USER_ID, "Apr 2026", VALID_SNAPSHOT);

    expect(result.reportId).toBe(REPORT_ID);

    const insertedValues = (mockInsert.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertedValues.userId).toBe(USER_ID);
    expect(insertedValues.status).toBe("pending");
    expect(insertedValues.periodLabel).toBe("Apr 2026");
    expect(insertedValues.expenseSnapshot).toEqual(VALID_SNAPSHOT);
  });

  it("does not consume quota when expenseSnapshot is empty (totalExpenses = 0)", async () => {
    mockFindMany.mockResolvedValue([]);

    const emptySnapshot: ExpenseSnapshot = { ...VALID_SNAPSHOT, totalExpenses: 0 };

    await expect(
      aiReportService.requestReport(USER_ID, "Apr 2026", emptySnapshot)
    ).rejects.toThrow(BadRequestError);

    // No DB insert should have occurred
    expect(db.insert).not.toHaveBeenCalled();
  });
});

// ─── runGeneration ────────────────────────────────────────────────────────────

describe("aiReportService.runGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(mockUpdate);
  });

  it("sets status=ready and content after successful generation", async () => {
    mockFindFirst.mockResolvedValue(makePendingReport());
    (generateReport as ReturnType<typeof vi.fn>).mockResolvedValue("AI narrative");

    await aiReportService.runGeneration(REPORT_ID, USER_ID);

    const setArgs = (mockUpdate.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setArgs.status).toBe("ready");
    expect(setArgs.content).toBe("AI narrative");
    expect(setArgs.completedAt).toBeInstanceOf(Date);
  });

  it("sets status=failed when generation throws", async () => {
    mockFindFirst.mockResolvedValue(makePendingReport());
    (generateReport as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("API timeout"));

    await aiReportService.runGeneration(REPORT_ID, USER_ID);

    const setArgs = (mockUpdate.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setArgs.status).toBe("failed");
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it("sets status=failed when expenseSnapshot is null", async () => {
    mockFindFirst.mockResolvedValue(makePendingReport({ expenseSnapshot: null }));

    await aiReportService.runGeneration(REPORT_ID, USER_ID);

    const setArgs = (mockUpdate.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setArgs.status).toBe("failed");
    expect(mockLoggerError).toHaveBeenCalled();
    expect(generateReport).not.toHaveBeenCalled();
  });

  it("returns early when report is not found", async () => {
    mockFindFirst.mockResolvedValue(null);

    await aiReportService.runGeneration(REPORT_ID, USER_ID);

    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns early when report status is not pending", async () => {
    mockFindFirst.mockResolvedValue({ ...makePendingReport(), status: "ready" });

    await aiReportService.runGeneration(REPORT_ID, USER_ID);

    expect(db.update).not.toHaveBeenCalled();
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe("aiReportService.getById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns report when user owns it", async () => {
    const report = makePendingReport();
    mockFindFirst.mockResolvedValue(report);

    const result = await aiReportService.getById(REPORT_ID, USER_ID);

    expect(result.id).toBe(report.id);
    expect(result.userId).toBe(report.userId);
    expect(result.status).toBe(report.status);
    expect(result.periodLabel).toBe(report.periodLabel);
    expect(mockFindFirst).toHaveBeenCalledOnce();
  });

  it("throws NotFoundError for non-existent ID", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(aiReportService.getById(REPORT_ID, USER_ID)).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when different user requests report", async () => {
    mockFindFirst.mockResolvedValue(makePendingReport()); // report belongs to USER_ID

    await expect(aiReportService.getById(REPORT_ID, "other-user-uuid")).rejects.toThrow(ForbiddenError);
  });
});

// ─── listByUser ───────────────────────────────────────────────────────────────

describe("aiReportService.listByUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns reports ordered by requestedAt DESC", async () => {
    const older = { ...makePendingReport(), id: "r1", requestedAt: new Date("2026-03-01") };
    const newer = { ...makePendingReport(), id: "r2", requestedAt: new Date("2026-04-01") };
    // Simulate DB returning them already in DESC order
    mockFindMany.mockResolvedValue([newer, older]);

    const result = await aiReportService.listByUser(USER_ID);

    expect(result[0].id).toBe("r2");
    expect(result[1].id).toBe("r1");
    expect(mockFindMany).toHaveBeenCalledOnce();
  });

  it("returns empty array when user has no reports", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await aiReportService.listByUser(USER_ID);

    expect(result).toEqual([]);
  });
});

// ─── deliverAIReportNotifications (via runGeneration) ─────────────────────────

describe("deliverAIReportNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(mockUpdate);
    (generateReport as ReturnType<typeof vi.fn>).mockResolvedValue("AI narrative");
    mockNotificationCreate.mockResolvedValue({ id: "notif-1", userId: USER_ID });
    mockGetSubscriptionsForUser.mockResolvedValue([]);
    mockUserGetById.mockResolvedValue({ id: USER_ID, name: "Test User", pushNotificationsEnabled: true });
    mockSendPushNotification.mockResolvedValue(undefined);
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("creates in-app notification with correct type and action_url", async () => {
    mockFindFirst.mockResolvedValue(makePendingReport());

    await aiReportService.runGeneration(REPORT_ID, USER_ID);

    expect(mockNotificationCreate).toHaveBeenCalledOnce();
    const [uid, type, title, body, actionUrl] = mockNotificationCreate.mock.calls[0];
    expect(uid).toBe(USER_ID);
    expect(type).toBe("ai_report_ready");
    expect(title).toBe("Your AI report is ready");
    expect(body).toContain("Apr 2026");
    expect(actionUrl).toBe(`/reports/ai/${REPORT_ID}`);
  });

  it("does not throw when email delivery fails", async () => {
    mockFindFirst.mockResolvedValue(makePendingReport());
    mockUserGetById.mockResolvedValue({ id: USER_ID, name: "Test", email: "test@example.com", pushNotificationsEnabled: true });
    mockSendEmail.mockRejectedValue(new Error("Resend down"));

    await expect(aiReportService.runGeneration(REPORT_ID, USER_ID)).resolves.toBeUndefined();
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, reportId: REPORT_ID }),
      "AI report email delivery failed"
    );
  });

  it("does not throw when push delivery fails", async () => {
    const sub = { endpoint: "https://push.example.com/1", p256dhKey: "key", authKey: "auth" };
    mockFindFirst.mockResolvedValue(makePendingReport());
    mockGetSubscriptionsForUser.mockResolvedValue([sub]);
    mockSendPushNotification.mockRejectedValue(new Error("Push server error"));

    await expect(aiReportService.runGeneration(REPORT_ID, USER_ID)).resolves.toBeUndefined();
  });

  it("deletes stale push subscription on 410 response", async () => {
    const stale = { endpoint: "https://push.example.com/stale", p256dhKey: "k", authKey: "a" };
    mockFindFirst.mockResolvedValue(makePendingReport());
    mockGetSubscriptionsForUser.mockResolvedValue([stale]);
    const staleError = Object.assign(new Error("Gone"), { statusCode: 410 });
    mockSendPushNotification.mockRejectedValue(staleError);

    await aiReportService.runGeneration(REPORT_ID, USER_ID);

    expect(mockDeleteSubscription).toHaveBeenCalledWith(stale.endpoint);
  });

  // R1 fix verification
  it("report status remains ready when notificationService.create throws", async () => {
    mockFindFirst.mockResolvedValue(makePendingReport());
    mockNotificationCreate.mockRejectedValue(new Error("DB connection lost"));

    await expect(aiReportService.runGeneration(REPORT_ID, USER_ID)).resolves.toBeUndefined();

    // First update: status='ready' (generation succeeded)
    const firstSetArgs = (mockUpdate.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(firstSetArgs.status).toBe("ready");
    // No second update to 'failed' — notification error must not corrupt status
    const allSetCalls = (mockUpdate.set as ReturnType<typeof vi.fn>).mock.calls as Array<[Record<string, unknown>]>;
    expect(allSetCalls.every((call) => call[0].status !== "failed")).toBe(true);
  });

  // R2 fix verification
  it("does not send push when pushNotificationsEnabled is false", async () => {
    mockFindFirst.mockResolvedValue(makePendingReport());
    mockUserGetById.mockResolvedValue({ id: USER_ID, name: "Test", pushNotificationsEnabled: false });

    await aiReportService.runGeneration(REPORT_ID, USER_ID);

    expect(mockGetSubscriptionsForUser).not.toHaveBeenCalled();
    expect(mockSendPushNotification).not.toHaveBeenCalled();
  });
});
