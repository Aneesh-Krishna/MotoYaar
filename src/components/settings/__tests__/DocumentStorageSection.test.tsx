import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpdateSettings = vi.fn();

vi.mock("@/services/api/userApi", () => ({
  updateSettings: mockUpdateSettings,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { DocumentStorageSection } = await import(
  "@/components/settings/DocumentStorageSection"
);

describe("DocumentStorageSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows toggle off by default (parse_only)", () => {
    render(<DocumentStorageSection currentPreference="parse_only" />);

    const toggle = screen.getByRole("switch", { name: /enable document storage/i });
    expect(toggle).toHaveAttribute("data-state", "unchecked");
    expect(
      screen.getByText(/Parse-only mode \(default\)/i)
    ).toBeInTheDocument();
  });

  it("calls PATCH API when toggle switched on", async () => {
    mockUpdateSettings.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<DocumentStorageSection currentPreference="parse_only" />);

    const toggle = screen.getByRole("switch", { name: /enable document storage/i });
    await user.click(toggle);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        documentStoragePreference: "full_storage",
      });
    });
  });

  it("shows explanatory text matching current preference", () => {
    const { unmount } = render(
      <DocumentStorageSection currentPreference="parse_only" />
    );
    expect(screen.getByText(/Parse-only mode \(default\)/i)).toBeInTheDocument();
    unmount();

    render(<DocumentStorageSection currentPreference="full_storage" />);
    expect(screen.getByText(/Full storage enabled/i)).toBeInTheDocument();
  });

  it("shows toggle on by default (full_storage)", () => {
    render(<DocumentStorageSection currentPreference="full_storage" />);

    const toggle = screen.getByRole("switch", { name: /enable document storage/i });
    expect(toggle).toHaveAttribute("data-state", "checked");
  });

  it("calls PATCH API when toggle switched off (full_storage → parse_only)", async () => {
    mockUpdateSettings.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<DocumentStorageSection currentPreference="full_storage" />);

    const toggle = screen.getByRole("switch", { name: /enable document storage/i });
    await user.click(toggle);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        documentStoragePreference: "parse_only",
      });
    });
  });

  it("does not update state and shows error toast when API call fails", async () => {
    const { toast } = await import("sonner");
    mockUpdateSettings.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<DocumentStorageSection currentPreference="parse_only" />);

    const toggle = screen.getByRole("switch", { name: /enable document storage/i });
    await user.click(toggle);

    await waitFor(() => {
      expect((toast.error as Mock)).toHaveBeenCalledWith("Failed to update preference");
    });

    // State should remain parse_only — explanatory text unchanged
    expect(screen.getByText(/Parse-only mode \(default\)/i)).toBeInTheDocument();
  });
});
