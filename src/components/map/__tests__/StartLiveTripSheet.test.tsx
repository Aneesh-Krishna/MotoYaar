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
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/lib/navCacheDb", () => ({
  buildOfflineNavCache: vi.fn(() => ({})),
  saveOfflineNavCache: vi.fn(() => Promise.resolve()),
}));

// Mock RoutePlanningStep so sheet tests stay focused on sheet flow
vi.mock("@/components/map/RoutePlanningStep", () => ({
  RoutePlanningStep: ({ onStartTrip, onSkip, onBack }: any) => (
    <div data-testid="route-planning-step">
      <button onClick={onBack}>Back to selection</button>
      <button onClick={onSkip}>Skip</button>
      <button onClick={() => onStartTrip([], { routes: [{ legs: [], geometry: { coordinates: [] } }] })}>
        Start Trip
      </button>
    </div>
  ),
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
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
  });

  it("shows permission error when geolocation is denied on skip", async () => {
    mockCheckGeolocationPermission.mockResolvedValue(false);
    mockApiRequest.mockResolvedValue(BASE_TRIPS);

    render(<StartLiveTripSheet {...DEFAULT_PROPS} />);

    // Wait for trips to load and select one
    await waitFor(() => expect(screen.getByText("Pune to Mumbai")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Pune to Mumbai"));
    await userEvent.click(screen.getByRole("button", { name: /Plan Route/i }));

    // Route planning step appears
    await waitFor(() => expect(screen.getByTestId("route-planning-step")).toBeInTheDocument());

    // Click Skip — triggers permission check
    await userEvent.click(screen.getByRole("button", { name: /Skip/i }));

    await waitFor(() => {
      expect(screen.getByText(/Location permission is required/i)).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("lists existing trips without has_live_route", async () => {
    render(<StartLiveTripSheet {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("Pune to Mumbai")).toBeInTheDocument();
      expect(screen.getByText("Delhi to Agra")).toBeInTheDocument();
      expect(screen.queryByText("Mumbai to Goa")).not.toBeInTheDocument();
    });
  });

  it("navigates to route planning step on Plan Route click", async () => {
    render(<StartLiveTripSheet {...DEFAULT_PROPS} />);

    await waitFor(() => expect(screen.getByText("Pune to Mumbai")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Pune to Mumbai"));
    await userEvent.click(screen.getByRole("button", { name: /Plan Route/i }));

    await waitFor(() =>
      expect(screen.getByTestId("route-planning-step")).toBeInTheDocument()
    );
  });

  it("goes back to trip selection from route planning", async () => {
    render(<StartLiveTripSheet {...DEFAULT_PROPS} />);

    await waitFor(() => expect(screen.getByText("Pune to Mumbai")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Pune to Mumbai"));
    await userEvent.click(screen.getByRole("button", { name: /Plan Route/i }));

    await waitFor(() => expect(screen.getByTestId("route-planning-step")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Back to selection/i }));

    await waitFor(() =>
      expect(screen.queryByTestId("route-planning-step")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Pune to Mumbai")).toBeInTheDocument();
  });

  it("skip navigates to live page with toast", async () => {
    const { toast } = await import("sonner");
    render(<StartLiveTripSheet {...DEFAULT_PROPS} />);

    await waitFor(() => expect(screen.getByText("Pune to Mumbai")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Pune to Mumbai"));
    await userEvent.click(screen.getByRole("button", { name: /Plan Route/i }));

    await waitFor(() => expect(screen.getByTestId("route-planning-step")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /Skip/i }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.stringMatching(/No route planned/i),
        expect.any(Object)
      );
      expect(mockPush).toHaveBeenCalledWith("/trips/t1/live");
    });
  });

  it("creates new trip then shows route planning step", async () => {
    const newTrip = { id: "new-trip-1", title: "Hyderabad to Bangalore", startDate: "2026-04-29", breakdown: [], createdAt: "2026-04-29", userId: "u1" };
    mockApiRequest
      .mockResolvedValueOnce(BASE_TRIPS)
      .mockResolvedValueOnce(newTrip);

    render(<StartLiveTripSheet {...DEFAULT_PROPS} />);

    await userEvent.click(screen.getByRole("tab", { name: "New Trip" }));

    const titleInput = screen.getByPlaceholderText(/Pune to Mumbai/i);
    await userEvent.type(titleInput, "Hyderabad to Bangalore");

    await userEvent.click(screen.getByRole("button", { name: /Plan Route/i }));

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith("/trips", expect.objectContaining({ method: "POST" }));
      expect(screen.getByTestId("route-planning-step")).toBeInTheDocument();
    });
  });

  it("Start Trip saves planned stops and navigates", async () => {
    mockApiRequest
      .mockResolvedValueOnce(BASE_TRIPS)
      .mockResolvedValueOnce({ id: "t1" }); // PATCH response

    render(<StartLiveTripSheet {...DEFAULT_PROPS} />);

    await waitFor(() => expect(screen.getByText("Pune to Mumbai")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Pune to Mumbai"));
    await userEvent.click(screen.getByRole("button", { name: /Plan Route/i }));

    await waitFor(() => expect(screen.getByTestId("route-planning-step")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /Start Trip/i }));

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/trips/t1/planned-stops",
        expect.objectContaining({ method: "PATCH" })
      );
      expect(mockPush).toHaveBeenCalledWith("/trips/t1/live");
    });
  });
});
