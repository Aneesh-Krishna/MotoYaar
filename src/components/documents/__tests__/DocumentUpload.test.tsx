import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Stub framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock Calendar to render a simple button that triggers onSelect with a fixed date
vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({
    onSelect,
  }: {
    onSelect?: (date: Date | undefined) => void;
  }) => (
    <button data-testid="mock-calendar-day" onClick={() => onSelect?.(new Date("2027-06-15"))}>
      15
    </button>
  ),
}));

// Mock Popover to render children inline (no portal/overlay complexity)
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <>{children}</>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ─── Imports (after mocks) ─────────────────────────────────────────────────────

import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { toast } from "sonner";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  vehicleId: "vehicle-123",
  storagePreference: "parse_only" as const,
  onSuccess: vi.fn(),
};

function makeFile(name = "insurance.jpg", type = "image/jpeg") {
  return new File(["content"], name, { type });
}

/** Renders component, selects doc type, uploads a file, and stubs the parse API response. */
async function renderAndUpload(parseResponse: object) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => parseResponse,
    })
  );

  render(<DocumentUpload {...DEFAULT_PROPS} />);

  // Select document type
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "Insurance" } });

  // Trigger file upload
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(fileInput, { target: { files: [makeFile()] } });
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("DocumentUpload manual entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    DEFAULT_PROPS.onSuccess = vi.fn();
  });

  it("shows manual entry screen when AI returns no date", async () => {
    await renderAndUpload({
      extractedExpiryDate: null,
      documentType: "Insurance",
      confidence: "low",
      parseStatus: "failed",
      parseReason: "no_date_found",
      tempR2Key: "user-1/documents/temp/abc.png",
    });

    await waitFor(() => {
      expect(screen.getByText("Enter Expiry Date")).toBeInTheDocument();
    });
    expect(screen.getByText(/no expiry date was found/i)).toBeInTheDocument();
  });

  it("shows manual entry screen when user taps 'Enter manually' on confirm screen", async () => {
    await renderAndUpload({
      extractedExpiryDate: "2026-12-31",
      documentType: "Insurance",
      confidence: "high",
      parseStatus: "parsed",
      tempR2Key: "user-1/documents/temp/abc.png",
    });

    // Wait for confirm screen
    await waitFor(() => {
      expect(screen.getByText("Date extracted successfully")).toBeInTheDocument();
    });

    // Click "Enter date manually instead"
    fireEvent.click(screen.getByText("Enter date manually instead"));

    expect(screen.getByText("Enter Expiry Date")).toBeInTheDocument();
    expect(screen.getByText("Enter the date manually.")).toBeInTheDocument();
  });

  it("save button is disabled until a date is selected", async () => {
    await renderAndUpload({
      extractedExpiryDate: null,
      documentType: "Insurance",
      confidence: "low",
      parseStatus: "failed",
      tempR2Key: "user-1/documents/temp/abc.png",
    });

    await waitFor(() => {
      expect(screen.getByText("Enter Expiry Date")).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", { name: "Save Document" });
    expect(saveButton).toBeDisabled();

    // Select a date via mock calendar
    fireEvent.click(screen.getByTestId("mock-calendar-day"));

    expect(saveButton).not.toBeDisabled();
  });

  it("Skip saves document with parseStatus='incomplete'", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        extractedExpiryDate: null,
        documentType: "Insurance",
        confidence: "low",
        parseStatus: "failed",
        parseReason: "no_date_found",
        tempR2Key: "user-1/documents/temp/abc.png",
      }),
    });
    // Second fetch call is the save
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "doc-1" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<DocumentUpload {...DEFAULT_PROPS} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Insurance" } });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(screen.getByText("Enter Expiry Date")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Skip for now"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Document saved as incomplete");
    });

    // Verify API call includes parseStatus="incomplete" and no expiryDate
    const [, saveOptions] = mockFetch.mock.calls[1];
    const body = JSON.parse((saveOptions as RequestInit).body as string);
    expect(body.parseStatus).toBe("incomplete");
    expect(body.expiryDate).toBeUndefined();
    expect(DEFAULT_PROPS.onSuccess).toHaveBeenCalled();
  });

  it("Save with date calls API with parseStatus='manual' and selected date", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        extractedExpiryDate: null,
        documentType: "Insurance",
        confidence: "low",
        parseStatus: "failed",
        parseReason: "no_date_found",
        tempR2Key: "user-1/documents/temp/abc.png",
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "doc-1" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<DocumentUpload {...DEFAULT_PROPS} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Insurance" } });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(screen.getByText("Enter Expiry Date")).toBeInTheDocument();
    });

    // Select a date via mock calendar
    fireEvent.click(screen.getByTestId("mock-calendar-day"));

    fireEvent.click(screen.getByRole("button", { name: "Save Document" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Document saved");
    });

    const [, saveOptions] = mockFetch.mock.calls[1];
    const body = JSON.parse((saveOptions as RequestInit).body as string);
    expect(body.parseStatus).toBe("manual");
    expect(body.expiryDate).toBe("2027-06-15");
    expect(DEFAULT_PROPS.onSuccess).toHaveBeenCalled();
  });

  // ─── C2 QA fix: error path coverage ──────────────────────────────────────

  it("handleManualSave shows toast.error when API returns error", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        extractedExpiryDate: null,
        documentType: "Insurance",
        confidence: "low",
        parseStatus: "failed",
        parseReason: "no_date_found",
        tempR2Key: "user-1/documents/temp/abc.png",
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Storage quota exceeded" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<DocumentUpload {...DEFAULT_PROPS} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Insurance" } });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(screen.getByText("Enter Expiry Date")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("mock-calendar-day"));
    fireEvent.click(screen.getByRole("button", { name: "Save Document" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Storage quota exceeded");
    });
    expect(DEFAULT_PROPS.onSuccess).not.toHaveBeenCalled();
  });

  it("handleSkip shows toast.error when API returns error", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        extractedExpiryDate: null,
        documentType: "Insurance",
        confidence: "low",
        parseStatus: "failed",
        parseReason: "no_date_found",
        tempR2Key: "user-1/documents/temp/abc.png",
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<DocumentUpload {...DEFAULT_PROPS} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Insurance" } });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(screen.getByText("Enter Expiry Date")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Skip for now"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Unauthorized");
    });
    expect(DEFAULT_PROPS.onSuccess).not.toHaveBeenCalled();
  });
});
