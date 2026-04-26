import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUpdateSettings = vi.fn();
vi.mock("@/services/api/userApi", () => ({
  updateSettings: mockUpdateSettings,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Shared subscribe mock — referenced inside the vi.mock factory so the same
// instance is used by every test in this file.
const mockSubscribe = vi.fn();
vi.mock("@/hooks/usePushSubscription", () => ({
  usePushSubscription: () => ({
    permissionState: "granted",
    subscribe: mockSubscribe,
    isSubscribing: false,
  }),
}));

// Mock fetch for /api/push/status and /api/push/unsubscribe
global.fetch = vi.fn();

const { NotificationsSection } = await import(
  "@/components/settings/NotificationsSection"
);

// ─── ExpiryWindowSetting Tests ────────────────────────────────────────────────

describe("NotificationsSection — ExpiryWindowSetting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ hasSubscription: false }),
      ok: true,
    });
  });

  it("renders the expiry window input with the given value", () => {
    render(
      <NotificationsSection notificationWindowDays={30} emailNotificationsEnabled={true} />
    );
    const input = screen.getByRole("spinbutton", { name: /expiry alert window/i });
    expect(input).toHaveValue(30);
  });

  it("clamps value to minimum (7) on blur when input is below range", async () => {
    const user = userEvent.setup();
    mockUpdateSettings.mockResolvedValue(undefined);

    render(
      <NotificationsSection notificationWindowDays={30} emailNotificationsEnabled={true} />
    );
    const input = screen.getByRole("spinbutton", { name: /expiry alert window/i });

    await user.clear(input);
    await user.type(input, "3");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input).toHaveValue(7);
    });
  });

  it("clamps value to maximum (90) on blur when input exceeds range", async () => {
    const user = userEvent.setup();
    mockUpdateSettings.mockResolvedValue(undefined);

    render(
      <NotificationsSection notificationWindowDays={30} emailNotificationsEnabled={true} />
    );
    const input = screen.getByRole("spinbutton", { name: /expiry alert window/i });

    await user.clear(input);
    await user.type(input, "150");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input).toHaveValue(90);
    });
  });

  it("calls PATCH /api/users/me on blur", async () => {
    const user = userEvent.setup();
    mockUpdateSettings.mockResolvedValue(undefined);

    render(
      <NotificationsSection notificationWindowDays={30} emailNotificationsEnabled={true} />
    );
    const input = screen.getByRole("spinbutton", { name: /expiry alert window/i });

    await user.clear(input);
    await user.type(input, "45");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({ notificationWindowDays: 45 });
    });
  });

  it("reverts to previous value on save error", async () => {
    const { toast } = await import("sonner");
    const user = userEvent.setup();
    mockUpdateSettings.mockRejectedValue(new Error("Network error"));

    render(
      <NotificationsSection notificationWindowDays={30} emailNotificationsEnabled={true} />
    );
    const input = screen.getByRole("spinbutton", { name: /expiry alert window/i });

    await user.clear(input);
    await user.type(input, "45");
    fireEvent.blur(input);

    await waitFor(() => {
      // 45 is in range so previousDays=45; clamped=45; revert sets back to 45
      expect(input).toHaveValue(45);
      expect(toast.error).toHaveBeenCalledWith("Failed to save expiry window");
    });
  });
});

// ─── EmailNotificationSetting Tests ──────────────────────────────────────────

describe("NotificationsSection — EmailNotificationSetting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ hasSubscription: false }),
      ok: true,
    });
  });

  it("reflects the initial email enabled state", () => {
    render(
      <NotificationsSection notificationWindowDays={30} emailNotificationsEnabled={false} />
    );
    const toggle = screen.getByRole("switch", { name: /toggle email notifications/i });
    expect(toggle).toHaveAttribute("data-state", "unchecked");
  });

  it("calls updateSettings when email toggle is changed", async () => {
    const user = userEvent.setup();
    mockUpdateSettings.mockResolvedValue(undefined);

    render(
      <NotificationsSection notificationWindowDays={30} emailNotificationsEnabled={false} />
    );
    const toggle = screen.getByRole("switch", { name: /toggle email notifications/i });
    await user.click(toggle);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({ emailNotificationsEnabled: true });
    });
  });

  it("reverts email toggle on API error", async () => {
    const { toast } = await import("sonner");
    const user = userEvent.setup();
    mockUpdateSettings.mockRejectedValue(new Error("Network error"));

    render(
      <NotificationsSection notificationWindowDays={30} emailNotificationsEnabled={true} />
    );
    const toggle = screen.getByRole("switch", { name: /toggle email notifications/i });
    await user.click(toggle);

    await waitFor(() => {
      expect(toggle).toHaveAttribute("data-state", "checked");
      expect(toast.error).toHaveBeenCalledWith("Failed to update email notification preference");
    });
  });
});

// ─── PushNotificationSetting Tests ───────────────────────────────────────────

describe("NotificationsSection — PushNotificationSetting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockResolvedValue(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ hasSubscription: false }),
      ok: true,
    });
  });

  it("initialises isEnabled from /api/push/status on mount", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ hasSubscription: true }),
      ok: true,
    });

    render(
      <NotificationsSection notificationWindowDays={30} emailNotificationsEnabled={true} />
    );

    const toggle = screen.getByRole("switch", { name: /toggle push notifications/i });
    await waitFor(() => {
      expect(toggle).toHaveAttribute("data-state", "checked");
    });
  });

  it("calls subscribe() when push toggle is turned ON", async () => {
    const user = userEvent.setup();

    render(
      <NotificationsSection notificationWindowDays={30} emailNotificationsEnabled={true} />
    );

    // Toggle starts OFF (hasSubscription: false from fetch mock)
    const toggle = screen.getByRole("switch", { name: /toggle push notifications/i });
    await waitFor(() => expect(toggle).toHaveAttribute("data-state", "unchecked"));

    await user.click(toggle);

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  it("calls DELETE /api/push/unsubscribe when push toggle is turned OFF", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ hasSubscription: true }),
        ok: true,
      })
      .mockResolvedValueOnce({ ok: true }); // DELETE response

    const user = userEvent.setup();

    render(
      <NotificationsSection notificationWindowDays={30} emailNotificationsEnabled={true} />
    );

    const toggle = screen.getByRole("switch", { name: /toggle push notifications/i });
    await waitFor(() => expect(toggle).toHaveAttribute("data-state", "checked"));

    await user.click(toggle);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/push/unsubscribe", { method: "DELETE" });
      expect(toggle).toHaveAttribute("data-state", "unchecked");
    });
  });

  it("shows error toast when push unsubscribe fails", async () => {
    const { toast } = await import("sonner");
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ hasSubscription: true }),
        ok: true,
      })
      .mockRejectedValueOnce(new Error("Network error"));

    const user = userEvent.setup();

    render(
      <NotificationsSection notificationWindowDays={30} emailNotificationsEnabled={true} />
    );

    const toggle = screen.getByRole("switch", { name: /toggle push notifications/i });
    await waitFor(() => expect(toggle).toHaveAttribute("data-state", "checked"));

    await user.click(toggle);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to disable push notifications");
    });
  });
});
