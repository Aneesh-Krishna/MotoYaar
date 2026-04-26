import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUpdate = vi.fn();
const mockFetch = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { currency: "INR" } }, update: mockUpdate }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children, disabled }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      disabled={disabled}
      data-testid="currency-select"
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

global.fetch = mockFetch;

// ─── Imports (after mocks) ────────────────────────────────────────────────────

const { CurrencySetting } = await import("@/components/settings/CurrencySetting");

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CurrencySetting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows current currency as selected value", () => {
    render(<CurrencySetting />);

    expect(screen.getByTestId("currency-select")).toHaveValue("INR");
  });

  it("accepts initialCurrency prop without error", () => {
    render(<CurrencySetting initialCurrency="USD" />);

    // session mock returns "INR" so session wins; prop is accepted without crash
    expect(screen.getByTestId("currency-select")).toHaveValue("INR");
  });

  it("calls PATCH /api/users/me with new currency on change", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    mockUpdate.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<CurrencySetting />);

    await user.selectOptions(screen.getByTestId("currency-select"), "USD");

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: "USD" }),
      });
    });
  });

  it("refreshes session after save", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    mockUpdate.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<CurrencySetting />);

    await user.selectOptions(screen.getByTestId("currency-select"), "EUR");

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledOnce();
    });
  });

  it("shows success toast after save", async () => {
    const { toast } = await import("sonner");
    mockFetch.mockResolvedValue({ ok: true });
    mockUpdate.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<CurrencySetting />);

    await user.selectOptions(screen.getByTestId("currency-select"), "GBP");

    await waitFor(() => {
      expect(toast.success as Mock).toHaveBeenCalledWith("Currency updated");
    });
  });

  it("shows error toast and does not refresh session when fetch returns non-ok", async () => {
    const { toast } = await import("sonner");
    mockFetch.mockResolvedValue({ ok: false });
    const user = userEvent.setup();

    render(<CurrencySetting />);

    await user.selectOptions(screen.getByTestId("currency-select"), "USD");

    await waitFor(() => {
      expect((toast.error as Mock)).toHaveBeenCalledWith("Failed to update currency");
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("shows error toast and does not refresh session when fetch throws", async () => {
    const { toast } = await import("sonner");
    mockFetch.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<CurrencySetting />);

    await user.selectOptions(screen.getByTestId("currency-select"), "USD");

    await waitFor(() => {
      expect((toast.error as Mock)).toHaveBeenCalledWith("Failed to update currency");
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
