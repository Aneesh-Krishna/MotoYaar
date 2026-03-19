import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt} {...props} />
  ),
}));

import { VehicleCard } from "@/components/ui/VehicleCard";
import type { Vehicle } from "@/types";

const BASE_VEHICLE: Vehicle = {
  id: "v1",
  userId: "u1",
  name: "Royal Enfield Meteor",
  type: "2-wheeler",
  registrationNumber: "MH02AB1234",
  previousOwners: 0,
  createdAt: "2025-01-01",
};

describe("VehicleCard", () => {
  it("renders vehicle name and registration number", () => {
    render(<VehicleCard vehicle={BASE_VEHICLE} />);
    expect(screen.getByText("Royal Enfield Meteor")).toBeInTheDocument();
    expect(screen.getByText("MH02AB1234")).toBeInTheDocument();
  });

  it("renders Car placeholder icon when no imageUrl", () => {
    render(<VehicleCard vehicle={BASE_VEHICLE} />);
    // No <img> rendered when imageUrl is absent
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders image when imageUrl is provided", () => {
    render(<VehicleCard vehicle={{ ...BASE_VEHICLE, imageUrl: "/test.jpg" }} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/test.jpg");
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Royal Enfield Meteor");
  });

  it("renders StatusBadge when nextDocumentStatus is set", () => {
    render(<VehicleCard vehicle={{ ...BASE_VEHICLE, nextDocumentStatus: "expiring" }} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not render StatusBadge when nextDocumentStatus is absent", () => {
    render(<VehicleCard vehicle={BASE_VEHICLE} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("maps type '2-wheeler' to display label '2W'", () => {
    render(<VehicleCard vehicle={BASE_VEHICLE} />);
    expect(screen.getByText("2W")).toBeInTheDocument();
  });

  it("maps type '4-wheeler' to display label '4W'", () => {
    render(<VehicleCard vehicle={{ ...BASE_VEHICLE, type: "4-wheeler" }} />);
    expect(screen.getByText("4W")).toBeInTheDocument();
  });

  it("maps type 'truck' to display label 'Truck'", () => {
    render(<VehicleCard vehicle={{ ...BASE_VEHICLE, type: "truck" }} />);
    expect(screen.getByText("Truck")).toBeInTheDocument();
  });

  it("maps type 'other' to display label 'Other'", () => {
    render(<VehicleCard vehicle={{ ...BASE_VEHICLE, type: "other" }} />);
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("links to /garage/:id", () => {
    render(<VehicleCard vehicle={BASE_VEHICLE} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/garage/v1");
  });
});
