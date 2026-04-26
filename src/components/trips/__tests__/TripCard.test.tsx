import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { TripCard } from "@/components/trips/TripCard";
import type { Trip } from "@/types";

const BASE_TRIP: Trip = {
  id: "trip-1",
  userId: "user-1",
  title: "Pune to Mumbai",
  startDate: "2026-03-10",
  breakdown: [
    { category: "Fuel", amount: 450 },
    { category: "Food", amount: 350 },
  ],
  createdAt: "2026-03-10T00:00:00.000Z",
};

describe("TripCard", () => {
  it("renders title, date, and total cost", () => {
    render(<TripCard trip={BASE_TRIP} />);

    expect(screen.getByText("Pune to Mumbai")).toBeInTheDocument();
    // Date is rendered (exact text depends on formatTripDateRange)
    expect(screen.getByText(/10 Mar 2026/)).toBeInTheDocument();
    // Total cost: 450 + 350 = 800
    expect(screen.getByText(/800/)).toBeInTheDocument();
  });

  it("renders 'No vehicle' when vehicleId is null", () => {
    render(<TripCard trip={{ ...BASE_TRIP, vehicleId: undefined }} />);

    expect(screen.getByText("No vehicle")).toBeInTheDocument();
  });

  it("renders vehicle name when linked", () => {
    render(
      <TripCard
        trip={{
          ...BASE_TRIP,
          vehicleId: "v1",
          vehicle: { id: "v1", name: "Royal Enfield Meteor", registrationNumber: "MH02AB1234" },
        }}
      />
    );

    expect(screen.getByText("Royal Enfield Meteor")).toBeInTheDocument();
    expect(screen.queryByText("No vehicle")).not.toBeInTheDocument();
  });

  it("renders '—' for total cost when breakdown is empty", () => {
    render(<TripCard trip={{ ...BASE_TRIP, breakdown: [] }} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("links to the trip detail page", () => {
    render(<TripCard trip={BASE_TRIP} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/trips/trip-1");
  });
});
