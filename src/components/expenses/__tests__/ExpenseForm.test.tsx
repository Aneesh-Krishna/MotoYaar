import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format, subYears } from "date-fns";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/api/expenseApi", () => ({
  createVehicleExpense: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import * as expenseApi from "@/services/api/expenseApi";
import type { Expense } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense-1",
    userId: "user-1",
    vehicleId: "vehicle-1",
    price: 500,
    currency: "INR",
    date: "2026-03-21",
    reason: "Service",
    whereText: "Raj Motors",
    comment: "Average",
    createdAt: "2026-03-21T10:00:00.000Z",
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ExpenseForm", () => {
  const onSaved = vi.fn();
  const onTripRedirect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all fields with correct defaults", () => {
    render(<ExpenseForm onSaved={onSaved} onTripRedirect={onTripRedirect} />);

    // Price field with ₹ prefix
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
    expect(screen.getByText("₹")).toBeInTheDocument();

    // Date defaults to today
    const today = format(new Date(), "yyyy-MM-dd");
    expect(screen.getByDisplayValue(today)).toBeInTheDocument();

    // Reason chips
    expect(screen.getByRole("button", { name: "Service" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fuel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trip" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Others" })).toBeInTheDocument();

    // Optional fields
    expect(screen.getByPlaceholderText("e.g. Raj Motors, Bangalore")).toBeInTheDocument();
    expect(screen.getByText("Your take (optional)")).toBeInTheDocument();

    // Receipt stub
    expect(screen.getByText("Attach receipt (optional)")).toBeInTheDocument();

    // Submit button
    expect(screen.getByRole("button", { name: "Save Expense" })).toBeInTheDocument();
  });

  it("shows past date warning for date > 1 year ago", async () => {
    render(<ExpenseForm onSaved={onSaved} onTripRedirect={onTripRedirect} />);

    const pastDate = format(subYears(new Date(), 2), "yyyy-MM-dd");
    const dateInput = screen.getByDisplayValue(format(new Date(), "yyyy-MM-dd"));

    fireEvent.change(dateInput, { target: { value: pastDate } });

    expect(
      screen.getByText("This date seems far in the past — double-check?")
    ).toBeInTheDocument();
  });

  it("calls onTripRedirect when Trip chip selected", async () => {
    render(<ExpenseForm onSaved={onSaved} onTripRedirect={onTripRedirect} />);

    await userEvent.click(screen.getByRole("button", { name: "Trip" }));

    expect(onTripRedirect).toHaveBeenCalledOnce();
    expect(expenseApi.createVehicleExpense).not.toHaveBeenCalled();
    expect(expenseApi.createExpense).not.toHaveBeenCalled();
  });

  it("shows validation error when submitted with no price", async () => {
    render(<ExpenseForm onSaved={onSaved} onTripRedirect={onTripRedirect} />);

    // Select a reason so it's the only missing field
    await userEvent.click(screen.getByRole("button", { name: "Service" }));
    await userEvent.click(screen.getByRole("button", { name: "Save Expense" }));

    expect(screen.getByText("Price must be greater than 0")).toBeInTheDocument();
    expect(expenseApi.createVehicleExpense).not.toHaveBeenCalled();
    expect(expenseApi.createExpense).not.toHaveBeenCalled();
  });
});

describe("ExpenseForm edit mode", () => {
  const onSaved = vi.fn();
  const onTripRedirect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pre-populates all fields from expense prop", () => {
    const expense = makeExpense({ price: 750, whereText: "Raj Motors", comment: "Average" });
    render(<ExpenseForm expense={expense} onSaved={onSaved} onTripRedirect={onTripRedirect} />);

    // Price pre-populated
    expect(screen.getByDisplayValue("750")).toBeInTheDocument();
    // Date pre-populated
    expect(screen.getByDisplayValue("2026-03-21")).toBeInTheDocument();
    // Where pre-populated
    expect(screen.getByDisplayValue("Raj Motors")).toBeInTheDocument();
    // Submit button shows "Update Expense"
    expect(screen.getByRole("button", { name: "Update Expense" })).toBeInTheDocument();
  });

  it("shows read-only indicator for trip-linked expense", () => {
    const expense = makeExpense({ tripId: "trip-1", reason: "Trip" });
    render(<ExpenseForm expense={expense} onSaved={onSaved} onTripRedirect={onTripRedirect} />);

    expect(screen.getByText("Linked to a trip")).toBeInTheDocument();
    expect(screen.getByText("This expense is linked to a trip. Edit it from the trip.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to trip →" })).toHaveAttribute("href", "/trips/trip-1");
    // Form fields not rendered
    expect(screen.queryByPlaceholderText("0.00")).not.toBeInTheDocument();
  });

  it("excludes 'Trip' chip from reason selector in edit mode", () => {
    const expense = makeExpense({ reason: "Service" });
    render(<ExpenseForm expense={expense} onSaved={onSaved} onTripRedirect={onTripRedirect} />);

    expect(screen.getByRole("button", { name: "Service" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fuel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Others" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Trip" })).not.toBeInTheDocument();
  });
});

describe("ExpenseForm delete button", () => {
  const onSaved = vi.fn();
  const onTripRedirect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders delete button in edit mode for non-trip-linked expense", () => {
    const expense = makeExpense();
    render(<ExpenseForm expense={expense} onSaved={onSaved} onTripRedirect={onTripRedirect} />);

    expect(screen.getByRole("button", { name: /delete expense/i })).toBeInTheDocument();
  });

  it("does not render delete button for trip-linked expense", () => {
    const expense = makeExpense({ tripId: "trip-1", reason: "Trip" });
    render(<ExpenseForm expense={expense} onSaved={onSaved} onTripRedirect={onTripRedirect} />);

    expect(screen.queryByRole("button", { name: /delete expense/i })).not.toBeInTheDocument();
  });

  it("shows ConfirmModal when delete button clicked", async () => {
    const expense = makeExpense();
    render(<ExpenseForm expense={expense} onSaved={onSaved} onTripRedirect={onTripRedirect} />);

    await userEvent.click(screen.getByRole("button", { name: /delete expense/i }));

    expect(screen.getByText("Delete this expense?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });
});
