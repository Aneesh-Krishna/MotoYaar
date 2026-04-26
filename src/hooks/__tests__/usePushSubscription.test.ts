import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { subscribeToPush } from "@/lib/push";

vi.mock("@/lib/push", () => ({
  subscribeToPush: vi.fn().mockResolvedValue(null),
}));

describe("usePushSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns unsupported when Notification API unavailable", () => {
    const originalNotification = (global as any).Notification;
    delete (global as any).Notification;

    const { result } = renderHook(() => usePushSubscription());
    expect(result.current.permissionState).toBe("unsupported");

    (global as any).Notification = originalNotification;
  });

  it("sets permissionState from Notification.permission on mount", () => {
    Object.defineProperty(global, "Notification", {
      value: { permission: "granted", requestPermission: vi.fn() },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => usePushSubscription());
    expect(result.current.permissionState).toBe("granted");
  });

  it("subscribe() returns false when API returns non-2xx", async () => {
    Object.defineProperty(global, "Notification", {
      value: {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("granted"),
      },
      configurable: true,
      writable: true,
    });

    const fakeSub = { toJSON: () => ({ endpoint: "https://push.example.com/sub/abc", keys: { p256dh: "k", auth: "a" } }) };
    vi.mocked(subscribeToPush).mockResolvedValueOnce(fakeSub as unknown as PushSubscription);

    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 401 } as Response);

    const { result } = renderHook(() => usePushSubscription());
    let success: boolean;
    await act(async () => {
      success = await result.current.subscribe();
    });

    expect(success!).toBe(false);
  });

  it("dismiss() sets localStorage pushPromptDismissed=true", () => {
    Object.defineProperty(global, "Notification", {
      value: { permission: "default", requestPermission: vi.fn() },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => usePushSubscription());

    act(() => {
      result.current.dismiss();
    });

    expect(localStorage.getItem("pushPromptDismissed")).toBe("true");
    expect(result.current.isDismissed()).toBe(true);
  });
});
