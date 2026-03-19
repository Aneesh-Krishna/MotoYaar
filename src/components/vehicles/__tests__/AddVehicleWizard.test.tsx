import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
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
});
