import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Stub out LeafletMap — it has browser-only Leaflet deps
vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="leaflet-map" />,
}));

const mockStartTracking = vi.fn();
const mockStopTracking = vi.fn();
const mockPauseTracking = vi.fn();

vi.mock("@/hooks/useLiveTrip", () => ({
  useLiveTrip: () => ({
    startTracking: mockStartTracking,
    stopTracking: mockStopTracking,
    pauseTracking: mockPauseTracking,
    resumeTracking: vi.fn(),
    isTracking: true,
    currentPosition: null,
    pendingCount: 0,
  }),
}));

vi.mock("@/utils/geo", () => ({
  formatDistance: () => "0.0",
  formatElapsed: () => "0m",
  formatSpeed: () => "—",
}));

// ─── Import (after mocks) ─────────────────────────────────────────────────────

const { default: LiveTripPage } = await import("@/app/(app)/trips/[id]/live/page");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PARAMS = { id: "trip-123" };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LiveTripPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
  });

  it("starts tracking on mount", () => {
    render(<LiveTripPage params={PARAMS} />);
    expect(mockStartTracking).toHaveBeenCalledOnce();
  });

  it("shows offline banner when navigator.onLine is false", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });

    render(<LiveTripPage params={PARAMS} />);

    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it("shows stop confirmation modal on 'Stop Trip' click", async () => {
    render(<LiveTripPage params={PARAMS} />);

    await userEvent.click(screen.getByLabelText("Stop trip"));

    expect(screen.getByText("Stop this trip?")).toBeInTheDocument();
  });

  it("calls stopTracking and navigates on confirm", async () => {
    mockStopTracking.mockResolvedValue(undefined);

    render(<LiveTripPage params={PARAMS} />);

    // Open modal
    await userEvent.click(screen.getByLabelText("Stop trip"));

    // Confirm stop
    await userEvent.click(screen.getByRole("button", { name: "Stop Trip" }));

    await waitFor(() => {
      expect(mockStopTracking).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith("/trips/trip-123");
    });
  });
});
