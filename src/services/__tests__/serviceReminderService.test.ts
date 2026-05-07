import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockFindMany,
  mockFindFirst,
  mockUserFindFirst,
  mockInsertReturning,
  mockUpdateReturning,
  mockDelete,
  mockNotificationCreate,
  mockLoggerError,
  mockGetSubscriptions,
  mockSendPush,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindFirst: vi.fn(),
  mockUserFindFirst: vi.fn().mockResolvedValue({ id: "user-1", pushNotificationsEnabled: false }),
  mockInsertReturning: vi.fn(),
  mockUpdateReturning: vi.fn(),
  mockDelete: vi.fn(),
  mockNotificationCreate: vi.fn().mockResolvedValue(undefined),
  mockLoggerError: vi.fn(),
  mockGetSubscriptions: vi.fn().mockResolvedValue([]),
  mockSendPush: vi.fn().mockResolvedValue(undefined),
}));

const mockInsert = { values: vi.fn().mockReturnThis(), returning: mockInsertReturning };
const mockUpdate = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: mockUpdateReturning,
};
const mockDeleteChain = { where: mockDelete };

vi.mock("@/lib/db/client", () => ({
  db: {
    insert: vi.fn(() => mockInsert),
    update: vi.fn(() => mockUpdate),
    delete: vi.fn(() => mockDeleteChain),
    query: {
      serviceReminders: { findMany: mockFindMany, findFirst: mockFindFirst },
      expenses: { findFirst: vi.fn().mockResolvedValue(null) },
      users: { findFirst: mockUserFindFirst },
    },
  },
}));

vi.mock("@/services/notificationService", () => ({
  notificationService: { create: mockNotificationCreate },
}));

vi.mock("@/services/pushService", () => ({
  pushService: {
    getSubscriptionsForUser: mockGetSubscriptions,
    deleteSubscription: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/push", () => ({
  sendPushNotification: mockSendPush,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: mockLoggerError },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { serviceReminderService } from "../serviceReminderService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const VEHICLE_ID = "vehicle-1";
const REMINDER_ID = "reminder-1";

function makeReminder(overrides: Record<string, unknown> = {}) {
  return {
    id: REMINDER_ID,
    vehicleId: VEHICLE_ID,
    userId: USER_ID,
    serviceType: "Oil Change",
    kmInterval: 5000,
    dayInterval: 180,
    lastServicedKm: null,
    lastServicedAt: "2026-01-01",
    notifiedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("serviceReminderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockInsert.values as ReturnType<typeof vi.fn>).mockReturnThis();
    mockUserFindFirst.mockResolvedValue({ id: USER_ID, pushNotificationsEnabled: false });
    mockGetSubscriptions.mockResolvedValue([]);
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates reminder and returns mapped object", async () => {
      const row = makeReminder();
      mockInsertReturning.mockResolvedValue([row]);

      const result = await serviceReminderService.create(USER_ID, VEHICLE_ID, {
        serviceType: "Oil Change",
        kmInterval: 5000,
        dayInterval: 180,
      });

      expect(result.serviceType).toBe("Oil Change");
      expect(result.kmInterval).toBe(5000);
      expect(result.id).toBe(REMINDER_ID);
    });

    it("throws when neither kmInterval nor dayInterval provided", async () => {
      await expect(
        serviceReminderService.create(USER_ID, VEHICLE_ID, { serviceType: "Oil Change" })
      ).rejects.toThrow("At least one of kmInterval or dayInterval");
    });
  });

  // ─── markServiced ────────────────────────────────────────────────────────────

  describe("markServiced", () => {
    it("resets lastServicedAt and clears notifiedAt", async () => {
      mockFindFirst.mockResolvedValue(makeReminder({ lastServicedKm: 10000 }));
      const updatedRow = makeReminder({ lastServicedKm: 10000, notifiedAt: null });
      mockUpdateReturning.mockResolvedValue([updatedRow]);

      const result = await serviceReminderService.markServiced(REMINDER_ID, USER_ID);

      const setArgs = (mockUpdate.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(setArgs.notifiedAt).toBeNull();
      expect(result.id).toBe(REMINDER_ID);
    });

    it("throws Forbidden when userId does not match", async () => {
      mockFindFirst.mockResolvedValue(makeReminder({ userId: "other-user" }));

      await expect(
        serviceReminderService.markServiced(REMINDER_ID, USER_ID)
      ).rejects.toThrow("Forbidden");
    });

    it("throws when reminder not found", async () => {
      mockFindFirst.mockResolvedValue(null);

      await expect(
        serviceReminderService.markServiced(REMINDER_ID, USER_ID)
      ).rejects.toThrow("Reminder not found");
    });
  });

  // ─── delete ──────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes reminder for correct user", async () => {
      mockFindFirst.mockResolvedValue(makeReminder());
      mockDelete.mockResolvedValue(undefined);

      await serviceReminderService.delete(REMINDER_ID, USER_ID);

      expect(mockDelete).toHaveBeenCalled();
    });

    it("throws Forbidden when userId does not match", async () => {
      mockFindFirst.mockResolvedValue(makeReminder({ userId: "other-user" }));

      await expect(
        serviceReminderService.delete(REMINDER_ID, USER_ID)
      ).rejects.toThrow("Forbidden");
    });
  });

  // ─── checkKmRemindersForVehicle ───────────────────────────────────────────────

  describe("checkKmRemindersForVehicle", () => {
    it("sends notification when odometer exceeds threshold", async () => {
      const reminder = makeReminder({
        kmInterval: 5000,
        lastServicedKm: 10000,
        notifiedAt: null,
      });
      mockFindMany.mockResolvedValue([reminder]);
      mockUpdateReturning.mockResolvedValue([reminder]);

      await serviceReminderService.checkKmRemindersForVehicle(VEHICLE_ID, 15100);

      expect(mockNotificationCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: "service_reminder", userId: USER_ID })
      );
    });

    it("does not notify when odometer is below threshold", async () => {
      const reminder = makeReminder({
        kmInterval: 5000,
        lastServicedKm: 10000,
        notifiedAt: null,
      });
      mockFindMany.mockResolvedValue([reminder]);

      await serviceReminderService.checkKmRemindersForVehicle(VEHICLE_ID, 14000);

      expect(mockNotificationCreate).not.toHaveBeenCalled();
    });

    it("sets lastServicedKm baseline when no prior km exists", async () => {
      const reminder = makeReminder({ kmInterval: 5000, lastServicedKm: null });
      mockFindMany.mockResolvedValue([reminder]);

      await serviceReminderService.checkKmRemindersForVehicle(VEHICLE_ID, 5000);

      // Should update baseline, not notify
      expect(mockNotificationCreate).not.toHaveBeenCalled();
      expect(mockUpdate.set).toHaveBeenCalled();
    });

    it("skips notification if already notified within 7 days", async () => {
      const recentNotification = new Date(Date.now() - 3 * 86_400_000); // 3 days ago
      const reminder = makeReminder({
        kmInterval: 5000,
        lastServicedKm: 10000,
        notifiedAt: recentNotification,
      });
      mockFindMany.mockResolvedValue([reminder]);

      await serviceReminderService.checkKmRemindersForVehicle(VEHICLE_ID, 16000);

      expect(mockNotificationCreate).not.toHaveBeenCalled();
    });
  });

  // ─── runDateReminderCheck ─────────────────────────────────────────────────────

  describe("runDateReminderCheck", () => {
    it("sends notification when date interval has elapsed", async () => {
      const lastServiced = new Date(Date.now() - 200 * 86_400_000); // 200 days ago
      const reminder = makeReminder({
        kmInterval: null,
        dayInterval: 180,
        lastServicedAt: lastServiced.toISOString().split("T")[0],
        notifiedAt: null,
      });
      mockFindMany.mockResolvedValue([reminder]);
      mockUpdateReturning.mockResolvedValue([reminder]);

      const result = await serviceReminderService.runDateReminderCheck();

      expect(mockNotificationCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: "service_reminder", userId: USER_ID })
      );
      expect(result.notified).toBe(1);
    });

    it("does not notify when interval has not elapsed", async () => {
      const lastServiced = new Date(Date.now() - 10 * 86_400_000); // 10 days ago
      const reminder = makeReminder({
        dayInterval: 180,
        lastServicedAt: lastServiced.toISOString().split("T")[0],
        notifiedAt: null,
      });
      mockFindMany.mockResolvedValue([reminder]);

      const result = await serviceReminderService.runDateReminderCheck();

      expect(mockNotificationCreate).not.toHaveBeenCalled();
      expect(result.notified).toBe(0);
    });

    it("skips if notified within last 7 days", async () => {
      const lastServiced = new Date(Date.now() - 200 * 86_400_000);
      const recentNotification = new Date(Date.now() - 2 * 86_400_000);
      const reminder = makeReminder({
        dayInterval: 180,
        lastServicedAt: lastServiced.toISOString().split("T")[0],
        notifiedAt: recentNotification,
      });
      mockFindMany.mockResolvedValue([reminder]);

      const result = await serviceReminderService.runDateReminderCheck();

      expect(mockNotificationCreate).not.toHaveBeenCalled();
      expect(result.notified).toBe(0);
    });
  });
});
