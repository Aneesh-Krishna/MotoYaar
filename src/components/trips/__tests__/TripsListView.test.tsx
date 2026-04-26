import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

import { TripsListView } from "@/components/trips/TripsListView";
import type { Trip, Vehicle } from "@/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const V1: Vehicle = {
  id: "v1",
  userId: "u1",
  name: "Royal Enfield Meteor",
  type: "2-wheeler",
  registrationNumber: "MH02AB1234",
  previousOwners: 0,
  createdAt: "2025-01-01",
};

const V2: Vehicle = {
  id: "v2",
  userId: "u1",
  name: "Maruti Swift",
  type: "4-wheeler",
  registrationNumber: "MH02CD5678",
  previousOwners: 0,
  createdAt: "2025-01-01",
};

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    userId: "u1",
    title: "Test Trip",
    startDate: "2026-03-20",
    breakdown: [],
    createdAt: "2026-03-20T00:00:00Z",
    ...overrides,
  };
}

const TRIP_V1 = makeTrip({ id: "t1", title: "Bike Trip", vehicleId: "v1", vehicle: { id: "v1", name: "Royal Enfield Meteor", registrationNumber: "MH02AB1234" } });
const TRIP_V2 = makeTrip({ id: "t2", title: "Car Trip", vehicleId: "v2", vehicle: { id: "v2", name: "Maruti Swift", registrationNumber: "MH02CD5678" } });
const TRIP_NO_VEH = makeTrip({ id: "t3", title: "No Vehicle Trip" });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TripsListView", () => {
  it("renders all trips when no filter applied", () => {
    render(<TripsListView trips={[TRIP_V1, TRIP_V2]} vehicles={[V1, V2]} />);

    expect(screen.getByText("Bike Trip")).toBeInTheDocument();
    expect(screen.getByText("Car Trip")).toBeInTheDocument();
  });

  it("filters trips to selected vehicle", () => {
    render(<TripsListView trips={[TRIP_V1, TRIP_V2]} vehicles={[V1, V2]} />);

    const select = screen.getByRole("combobox", { name: /filter by vehicle/i });
    fireEvent.change(select, { target: { value: "v1" } });

    expect(screen.getByText("Bike Trip")).toBeInTheDocument();
    expect(screen.queryByText("Car Trip")).not.toBeInTheDocument();
  });

  it("restores all trips when 'all' option selected after filtering", () => {
    render(<TripsListView trips={[TRIP_V1, TRIP_V2]} vehicles={[V1, V2]} />);

    const select = screen.getByRole("combobox", { name: /filter by vehicle/i });
    fireEvent.change(select, { target: { value: "v1" } });
    fireEvent.change(select, { target: { value: "all" } });

    expect(screen.getByText("Bike Trip")).toBeInTheDocument();
    expect(screen.getByText("Car Trip")).toBeInTheDocument();
  });

  it("hides the vehicle filter when user has only one vehicle", () => {
    render(<TripsListView trips={[TRIP_V1]} vehicles={[V1]} />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("hides the vehicle filter when user has no vehicles", () => {
    render(<TripsListView trips={[TRIP_NO_VEH]} vehicles={[]} />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows global empty state when no trips exist", () => {
    render(<TripsListView trips={[]} vehicles={[]} />);

    expect(screen.getByText("No trips logged yet")).toBeInTheDocument();
    expect(screen.getByText(/Record your first journey/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Add first trip/i })).toBeInTheDocument();
  });

  it("shows filtered empty state when filter yields no results", () => {
    render(<TripsListView trips={[TRIP_V1]} vehicles={[V1, V2]} />);

    const select = screen.getByRole("combobox", { name: /filter by vehicle/i });
    fireEvent.change(select, { target: { value: "v2" } });

    expect(screen.getByText("No trips for this vehicle")).toBeInTheDocument();
    expect(screen.getByText(/Select a different vehicle/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Add first trip/i })).not.toBeInTheDocument();
  });
});
