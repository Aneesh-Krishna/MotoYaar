import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/ui/StatusBadge";

describe("StatusBadge", () => {
  it("renders icon + label for 'valid' status", () => {
    render(<StatusBadge status="valid" />);
    expect(screen.getByText("Valid")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Document status: Valid");
  });

  it("renders icon + label for 'expiring' status with amber styling", () => {
    render(<StatusBadge status="expiring" />);
    expect(screen.getByText("Expiring")).toBeInTheDocument();
    const badge = screen.getByRole("status");
    expect(badge.className).toContain("amber");
  });

  it("renders icon + label for 'expired' status with red styling", () => {
    render(<StatusBadge status="expired" />);
    expect(screen.getByText("Expired")).toBeInTheDocument();
    const badge = screen.getByRole("status");
    expect(badge.className).toContain("red");
  });

  it("renders icon + label for 'incomplete' status", () => {
    render(<StatusBadge status="incomplete" />);
    expect(screen.getByText("Incomplete")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("hides label when showLabel=false", () => {
    render(<StatusBadge status="valid" showLabel={false} />);
    expect(screen.queryByText("Valid")).not.toBeInTheDocument();
    // aria-label still present for screen readers
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Document status: Valid");
  });

  it("always renders role=status for a11y regardless of showLabel", () => {
    const { rerender } = render(<StatusBadge status="expired" showLabel={true} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    rerender(<StatusBadge status="expired" showLabel={false} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("accepts className prop", () => {
    render(<StatusBadge status="valid" className="test-class" />);
    expect(screen.getByRole("status").className).toContain("test-class");
  });
});
