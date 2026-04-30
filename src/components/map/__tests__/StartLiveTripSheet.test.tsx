import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockApiRequest = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiRequest: mockApiRequest,
}));

const mockCheckGeolocationPermission = vi.fn();
vi.mock("@/utils/geo", () => ({
  checkGeolocationPermission: mockCheckGeolocationPermission,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

const { StartLiveTripSheet } = await import("@/components/map/StartLiveTripSheet");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_TRIPS = [
  { id: "t1", userId: "u1", title: "Pune to Mumbai", startDate: "2026-03-10", breakdown: [], createdAt: "2026-03-10", hasLiveRoute: false },
  { id: "t2", userId: "u1", title: "Mumbai to Goa", startDate: "2026-04-01", breakdown: [], createdAt: "2026-04-01", hasLiveRoute: true },
  { id: "t3", userId: "u1", title: "Delhi to Agra", startDate: "2026-04-10", breakdown: [], createdAt: "2026-04-10", hasLiveRoute: false },
];

const DEFAULT_PROPS = {
  open: true,
  onClose: vi.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("StartLiveTripSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockResolvedValue(BASE_TRIPS);
    mockCheckGeolocationPermission.mockResolvedValue(true);
    // Default: online
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
  });

  it("shows permission error when geolocation is denied", async () => {
    mockCheckGeolocationPermission.mockResolvedValue(false);
    mockApiRequest.mockResolvedValue(BASE_TRIPS);

    render(<StartLiveTripSheet {...DEFAULT_PROPS} />);

    // Wait for trips to load and select one
    await waitFor(() => expect(screen.getByText("Pune to Mumbai")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Pune to Mumbai"));
    await userEvent.click(screen.getByRole("button", { name: /Start Live Trip/i }));

    await waitFor(() => {
      expect(screen.getByText(/Location permission is required/i)).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("lists existing trips without has_live_route", async () => {
    render(<StartLiveTripSheet {...DEFAULT_PROPS} />);

    await waitFor(() => {
      // Trips without hasLiveRoute should be visible
      expect(screen.getByText("Pune to Mumbai")).toBeInTheDocument();
      expect(screen.getByText("Delhi to Agra")).toBeInTheDocument();
      // Trip WITH hasLiveRoute should be filtered out
      expect(screen.queryByText("Mumbai to Goa")).not.toBeInTheDocument();
    });
  });

  it("creates new trip and navigates to live page", async () => {
    const newTrip = { id: "new-trip-1", title: "Hyderabad to Bangalore", startDate: "2026-04-29", breakdown: [], createdAt: "2026-04-29", userId: "u1" };
    // First call: GET /trips for existing list; second call: POST /trips
    mockApiRequest
      .mockResolvedValueOnce(BASE_TRIPS)
      .mockResolvedValueOnce(newTrip);

    render(<StartLiveTripSheet {...DEFAULT_PROPS} />);

    // Switch to "New Trip" tab
    await userEvent.click(screen.getByRole("tab", { name: "New Trip" }));

    // Fill in title
    const titleInput = screen.getByPlaceholderText(/Pune to Mumbai/i);
    await userEvent.type(titleInput, "Hyderabad to Bangalore");

    // Click start
    await userEvent.click(screen.getByRole("button", { name: /Start Live Trip/i }));

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith("/trips", expect.objectContaining({ method: "POST" }));
      expect(mockPush).toHaveBeenCalledWith("/trips/new-trip-1/live");
    });
  });
});
