import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const BASE_PROPS = {
  open: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  title: "Delete Vehicle",
  description: "This cannot be undone. Continue?",
};

describe("ConfirmModal", () => {
  it("renders title and description", () => {
    render(<ConfirmModal {...BASE_PROPS} />);
    expect(screen.getByText("Delete Vehicle")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone. Continue?")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...BASE_PROPS} onConfirm={onConfirm} confirmLabel="Delete" />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel button clicked", async () => {
    const onClose = vi.fn();
    render(<ConfirmModal {...BASE_PROPS} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows loading spinner and disables buttons when isLoading=true", () => {
    render(<ConfirmModal {...BASE_PROPS} confirmLabel="Confirm" isLoading />);
    const confirmBtn = screen.getByRole("button", { name: /Confirm/i });
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    expect(confirmBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
  });

  it("does not render when open=false", () => {
    render(<ConfirmModal {...BASE_PROPS} open={false} />);
    expect(screen.queryByText("Delete Vehicle")).not.toBeInTheDocument();
  });

  it("blocks Escape key when isLoading=true", () => {
    render(<ConfirmModal {...BASE_PROPS} isLoading />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    // onClose must NOT be called — escape is blocked during loading
    expect(BASE_PROPS.onClose).not.toHaveBeenCalled();
  });
});
