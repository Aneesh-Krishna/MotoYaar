import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentRow } from "@/components/documents/DocumentRow";
import type { Document } from "@/types";

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    vehicleId: "vehicle-1",
    userId: "user-1",
    type: "Insurance",
    expiryDate: "2027-06-15",
    storageUrl: undefined,
    parseStatus: "parsed",
    status: "valid",
    createdAt: "2026-03-19T00:00:00Z",
    ...overrides,
  };
}

describe("DocumentRow", () => {
  it("renders type label, expiry date, and StatusBadge", () => {
    render(
      <DocumentRow
        document={makeDocument()}
        storagePreference="parse_only"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Insurance")).toBeInTheDocument();
    expect(screen.getByText("15 Jun 2027")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows 'No expiry date' for incomplete document", () => {
    render(
      <DocumentRow
        document={makeDocument({ expiryDate: undefined, status: "incomplete" })}
        storagePreference="parse_only"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("No expiry date")).toBeInTheDocument();
  });

  it("shows 'View Document' in kebab menu when storageUrl is set and pref is full_storage", async () => {
    const user = userEvent.setup();
    render(
      <DocumentRow
        document={makeDocument({ storageUrl: "user-1/documents/vehicle-1/file.jpg" })}
        storagePreference="full_storage"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onView={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /document actions/i }));
    expect(screen.getByText("View Document")).toBeInTheDocument();
  });

  it("hides 'View Document' when storageUrl is null", async () => {
    const user = userEvent.setup();
    render(
      <DocumentRow
        document={makeDocument({ storageUrl: undefined })}
        storagePreference="full_storage"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onView={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /document actions/i }));
    expect(screen.queryByText("View Document")).not.toBeInTheDocument();
  });

  it("hides 'View Document' when storageUrl is set but pref is parse_only", async () => {
    const user = userEvent.setup();
    render(
      <DocumentRow
        document={makeDocument({ storageUrl: "user-1/documents/vehicle-1/file.jpg" })}
        storagePreference="parse_only"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onView={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /document actions/i }));
    expect(screen.queryByText("View Document")).not.toBeInTheDocument();
  });

  it("calls onEdit with doc id when Edit is selected", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <DocumentRow
        document={makeDocument()}
        storagePreference="parse_only"
        onEdit={onEdit}
        onDelete={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /document actions/i }));
    await user.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith("doc-1");
  });

  it("calls onDelete with doc id when Delete is selected", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <DocumentRow
        document={makeDocument()}
        storagePreference="parse_only"
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );

    await user.click(screen.getByRole("button", { name: /document actions/i }));
    await user.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith("doc-1");
  });
});
