import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockRouterPush })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/api/vehicleApi", () => ({
  deleteVehicle: vi.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { VehicleKebabMenu } from "@/components/vehicles/VehicleKebabMenu";
import * as vehicleApi from "@/services/api/vehicleApi";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("VehicleKebabMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render Delete option when isOwner=false", async () => {
    render(<VehicleKebabMenu vehicleId="v1" isOwner={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Vehicle options" }));
    expect(screen.queryByText("Delete Vehicle")).not.toBeInTheDocument();
  });

  it("renders Delete option when isOwner=true", async () => {
    render(<VehicleKebabMenu vehicleId="v1" isOwner />);
    await userEvent.click(screen.getByRole("button", { name: "Vehicle options" }));
    expect(screen.getByText("Delete Vehicle")).toBeInTheDocument();
  });

  it("opens ConfirmModal when Delete Vehicle is clicked", async () => {
    render(<VehicleKebabMenu vehicleId="v1" isOwner />);
    await userEvent.click(screen.getByRole("button", { name: "Vehicle options" }));
    await userEvent.click(screen.getByText("Delete Vehicle"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/This cannot be undone/i)).toBeInTheDocument();
  });

  it("calls deleteVehicle and redirects to /garage on confirm", async () => {
    (vehicleApi.deleteVehicle as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    render(<VehicleKebabMenu vehicleId="v1" isOwner />);
    await userEvent.click(screen.getByRole("button", { name: "Vehicle options" }));
    await userEvent.click(screen.getByText("Delete Vehicle"));
    await userEvent.click(screen.getByRole("button", { name: "Delete Vehicle" }));
    expect(vehicleApi.deleteVehicle).toHaveBeenCalledWith("v1");
    expect(toast.success).toHaveBeenCalledWith("Vehicle deleted");
    expect(mockRouterPush).toHaveBeenCalledWith("/garage");
  });

  it("shows error toast and keeps modal closed on API error", async () => {
    (vehicleApi.deleteVehicle as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError("FORBIDDEN", "Only the vehicle owner can delete this vehicle", undefined, 403)
    );
    render(<VehicleKebabMenu vehicleId="v1" isOwner />);
    await userEvent.click(screen.getByRole("button", { name: "Vehicle options" }));
    await userEvent.click(screen.getByText("Delete Vehicle"));
    await userEvent.click(screen.getByRole("button", { name: "Delete Vehicle" }));
    expect(toast.error).toHaveBeenCalledWith("Only the vehicle owner can delete this vehicle");
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
