import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Expense } from "@/types";

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { ExpenseRow } from "@/components/expenses/ExpenseRow";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense-1",
    userId: "user-1",
    vehicleId: "vehicle-1",
    price: 123456,
    currency: "INR",
    date: "2026-03-15",
    reason: "Service",
    whereText: undefined,
    receiptUrl: undefined,
    createdAt: "2026-03-15T10:00:00.000Z",
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ExpenseRow", () => {
  const onTap = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders price in Indian number format", () => {
    render(<ExpenseRow expense={makeExpense({ price: 123456 })} onTap={onTap} />);

    // Intl.NumberFormat("en-IN") formats 123456 as ₹1,23,456
    expect(screen.getByText(/1,23,456/)).toBeInTheDocument();
  });

  it("renders reason badge with correct color class", () => {
    const { rerender } = render(
      <ExpenseRow expense={makeExpense({ reason: "Service" })} onTap={onTap} />
    );
    expect(screen.getByText("Service").className).toContain("bg-blue-50");

    rerender(<ExpenseRow expense={makeExpense({ reason: "Fuel" })} onTap={onTap} />);
    expect(screen.getByText("Fuel").className).toContain("bg-yellow-50");

    rerender(<ExpenseRow expense={makeExpense({ reason: "Others" })} onTap={onTap} />);
    expect(screen.getByText("Others").className).toContain("bg-gray-100");
  });

  it("shows receipt icon when receiptUrl is set", () => {
    const { rerender } = render(
      <ExpenseRow expense={makeExpense({ receiptUrl: "https://example.com/receipt.pdf" })} onTap={onTap} />
    );
    // Lucide Paperclip renders an svg — check it exists via aria or test id fallback
    expect(document.querySelector("svg")).toBeInTheDocument();

    rerender(<ExpenseRow expense={makeExpense({ receiptUrl: undefined })} onTap={onTap} />);
    // Without receiptUrl the only svg is the reason badge (none) — safe to assert null
    expect(document.querySelector("svg")).toBeNull();
  });

  it("calls onTap with the expense id when the row is clicked", async () => {
    render(<ExpenseRow expense={makeExpense({ id: "expense-abc" })} onTap={onTap} />);

    await userEvent.click(screen.getByRole("button"));

    expect(onTap).toHaveBeenCalledOnce();
    expect(onTap).toHaveBeenCalledWith("expense-abc");
  });
});
