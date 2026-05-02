import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockUseSession, mockToastError } = vi.hoisted(() => ({
  mockUseSession: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ useSession: mockUseSession }));
vi.mock("sonner", () => ({ toast: { error: mockToastError } }));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { PendingInviteResolver } from "@/components/invites/PendingInviteResolver";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_TOKEN = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const SESSION_COMPLETE = {
  data: { user: { id: "user-1", username: "riderUser", email: "rider@example.com", name: "Rider" } },
  status: "authenticated",
};

const SESSION_NO_USERNAME = {
  data: { user: { id: "user-1", username: null, email: "rider@example.com", name: "Rider" } },
  status: "authenticated",
};

function setCookie(value: string) {
  document.cookie = `pending_invite_token=${value}; path=/`;
}

function clearTestCookie() {
  document.cookie = "pending_invite_token=; path=/; max-age=0";
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PendingInviteResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCookie();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "http://localhost/" },
    });
  });

  it("does not call accept API when no pending cookie", () => {
    mockUseSession.mockReturnValue(SESSION_COMPLETE);
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    render(<PendingInviteResolver />);

    expect(mockFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("calls accept API when pending_invite_token cookie is present and session active", async () => {
    mockUseSession.mockReturnValue(SESSION_COMPLETE);
    setCookie(VALID_TOKEN);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ vehicleId: "vehicle-1" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<PendingInviteResolver />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/invites/${VALID_TOKEN}/accept`,
        { method: "POST" }
      );
    });
    vi.unstubAllGlobals();
  });

  it("redirects to vehicle page on successful accept", async () => {
    mockUseSession.mockReturnValue(SESSION_COMPLETE);
    setCookie(VALID_TOKEN);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ vehicleId: "vehicle-abc" }),
    }));

    render(<PendingInviteResolver />);

    await waitFor(() => {
      expect(window.location.href).toBe("/garage/vehicle-abc");
    });
    vi.unstubAllGlobals();
  });

  it("does not run when session has no username (onboarding not complete)", () => {
    mockUseSession.mockReturnValue(SESSION_NO_USERNAME);
    setCookie(VALID_TOKEN);

    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    render(<PendingInviteResolver />);

    expect(mockFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("does not run when session is null", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    setCookie(VALID_TOKEN);

    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    render(<PendingInviteResolver />);

    expect(mockFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("shows expiry toast and redirects to /garage on 410 response", async () => {
    mockUseSession.mockReturnValue(SESSION_COMPLETE);
    setCookie(VALID_TOKEN);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 410,
    }));

    render(<PendingInviteResolver />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "The invite link has expired. Ask the vehicle owner to resend it."
      );
    });
    expect(window.location.href).toBe("/garage");
    vi.unstubAllGlobals();
  });

  it("clears cookie before making the API call", async () => {
    mockUseSession.mockReturnValue(SESSION_COMPLETE);
    setCookie(VALID_TOKEN);

    let cookieAtCallTime = "";
    const mockFetch = vi.fn().mockImplementation(() => {
      cookieAtCallTime = document.cookie;
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ vehicleId: "v1" }) });
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<PendingInviteResolver />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(cookieAtCallTime).not.toContain("pending_invite_token");
    vi.unstubAllGlobals();
  });

  it("ignores cookie values that are not valid UUIDs", () => {
    mockUseSession.mockReturnValue(SESSION_COMPLETE);
    setCookie("../../malicious-path");

    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    render(<PendingInviteResolver />);

    expect(mockFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
