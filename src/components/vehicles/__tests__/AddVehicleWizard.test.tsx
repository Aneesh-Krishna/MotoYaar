import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockRouterPush })),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/services/api/vehicleApi", () => ({
  createVehicle: vi.fn(),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

import { AddVehicleWizard } from "@/components/vehicles/AddVehicleWizard";
import { ApiError } from "@/lib/api-client";
import * as vehicleApi from "@/services/api/vehicleApi";
import { toast } from "sonner";

describe("AddVehicleWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Step 1 on mount", () => {
    render(<AddVehicleWizard />);

    expect(screen.getByText("Step 1 of 6")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Royal Enfield Classic 350")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows validation error when name is empty", async () => {
    render(<AddVehicleWizard />);

    // Submit without filling name
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText("Name must be at least 2 characters")).toBeInTheDocument();
    });
  });

  it("advances to Step 2 when Step 1 is valid", async () => {
    const user = userEvent.setup();
    render(<AddVehicleWizard />);

    await user.type(screen.getByPlaceholderText("e.g. Royal Enfield Classic 350"), "My Bike");
    await user.selectOptions(screen.getByRole("combobox"), "2-wheeler");
    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText("Step 2 of 6")).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("e.g. MH12AB1234")).toBeInTheDocument();
  });

  it("shows review screen on Step 6 after completing steps 1–5", async () => {
    const user = userEvent.setup();
    render(<AddVehicleWizard />);

    // Step 1
    await user.type(screen.getByPlaceholderText("e.g. Royal Enfield Classic 350"), "My Bike");
    await user.selectOptions(screen.getByRole("combobox"), "2-wheeler");
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Step 2
    await waitFor(() => screen.getByPlaceholderText("e.g. MH12AB1234"));
    await user.type(screen.getByPlaceholderText("e.g. MH12AB1234"), "MH12AB1234");
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Step 3
    await waitFor(() => screen.getByText("Step 3 of 6"));
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Step 4 - skip
    await waitFor(() => screen.getByText("Step 4 of 6"));
    await user.click(screen.getByRole("button", { name: /skip/i }));

    // Step 5 - skip
    await waitFor(() => screen.getByText("Step 5 of 6"));
    await user.click(screen.getByRole("button", { name: /skip for now/i }));

    // Step 6 - review
    await waitFor(() => {
      expect(screen.getByText("Step 6 of 6")).toBeInTheDocument();
    });
    expect(screen.getByText("Save Vehicle")).toBeInTheDocument();
    expect(screen.getByText("My Bike")).toBeInTheDocument();
    expect(screen.getByText("MH12AB1234")).toBeInTheDocument();
  });

  it("back button on step 2 returns to step 1", async () => {
    const user = userEvent.setup();
    render(<AddVehicleWizard />);

    // Advance to step 2
    await user.type(screen.getByPlaceholderText("e.g. Royal Enfield Classic 350"), "My Bike");
    await user.selectOptions(screen.getByRole("combobox"), "2-wheeler");
    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => screen.getByText("Step 2 of 6"));

    // Go back
    await user.click(screen.getByRole("button", { name: /go back/i }));

    await waitFor(() => {
      expect(screen.getByText("Step 1 of 6")).toBeInTheDocument();
    });
  });

  it("shows 409 conflict error inline on review step when reg number is duplicate", async () => {
    vi.mocked(vehicleApi.createVehicle).mockRejectedValueOnce(
      new ApiError("CONFLICT", "You already have a vehicle with this registration number", undefined, 409)
    );

    const user = userEvent.setup();
    render(<AddVehicleWizard />);

    await navigateToReviewStep(user, "My Bike", "MH12AB1234");

    await user.click(screen.getByRole("button", { name: /save vehicle/i }));

    await waitFor(() => {
      expect(
        screen.getByText("You already have a vehicle with this registration number")
      ).toBeInTheDocument();
    });
  });

  it("redirects to /garage/[id] on successful save", async () => {
    vi.mocked(vehicleApi.createVehicle).mockResolvedValueOnce({
      id: "abc-123",
      userId: "user-1",
      name: "My Bike",
      type: "2-wheeler",
      registrationNumber: "MH12AB1234",
      previousOwners: 0,
      createdAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    render(<AddVehicleWizard />);

    await navigateToReviewStep(user, "My Bike", "MH12AB1234");

    await user.click(screen.getByRole("button", { name: /save vehicle/i }));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/garage/abc-123");
    });
  });

  it("shows toast on network error during save", async () => {
    vi.mocked(vehicleApi.createVehicle).mockRejectedValueOnce(new Error("Network error"));

    const user = userEvent.setup();
    render(<AddVehicleWizard />);

    await navigateToReviewStep(user, "My Bike", "MH12AB1234");

    await user.click(screen.getByRole("button", { name: /save vehicle/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to save vehicle. Try again.");
    });
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function navigateToReviewStep(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  regNumber: string
) {
  // Step 1
  await user.type(screen.getByPlaceholderText("e.g. Royal Enfield Classic 350"), name);
  await user.selectOptions(screen.getByRole("combobox"), "2-wheeler");
  await user.click(screen.getByRole("button", { name: /next/i }));

  // Step 2
  await waitFor(() => screen.getByPlaceholderText("e.g. MH12AB1234"));
  await user.type(screen.getByPlaceholderText("e.g. MH12AB1234"), regNumber);
  await user.click(screen.getByRole("button", { name: /next/i }));

  // Step 3
  await waitFor(() => screen.getByText("Step 3 of 6"));
  await user.click(screen.getByRole("button", { name: /next/i }));

  // Step 4 - skip
  await waitFor(() => screen.getByText("Step 4 of 6"));
  await user.click(screen.getByRole("button", { name: /skip/i }));

  // Step 5 - skip
  await waitFor(() => screen.getByText("Step 5 of 6"));
  await user.click(screen.getByRole("button", { name: /skip for now/i }));

  // Step 6
  await waitFor(() => screen.getByText("Step 6 of 6"));
}
