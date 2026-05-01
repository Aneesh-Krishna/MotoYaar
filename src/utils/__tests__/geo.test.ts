import { describe, it, expect } from "vitest";
import { haversineDistance, totalDistance, formatDistance, formatElapsed, formatSpeed } from "../geo";
import type { Waypoint } from "@/types";

describe("haversineDistance", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistance({ lat: 12.9716, lng: 77.5946 }, { lat: 12.9716, lng: 77.5946 })).toBe(0);
  });

  it("returns ~111km for 1 degree of latitude", () => {
    const d = haversineDistance({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeCloseTo(111195, -2); // within ~100m tolerance
  });

  it("returns ~111km for 1 degree of longitude at equator", () => {
    const d = haversineDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(d).toBeCloseTo(111195, -2);
  });

  it("correctly computes short distance between two points", () => {
    // Approx 15m apart
    const d = haversineDistance(
      { lat: 12.97160, lng: 77.59460 },
      { lat: 12.97173, lng: 77.59460 }
    );
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(30);
  });
});

describe("totalDistance", () => {
  it("returns 0 for empty array", () => {
    expect(totalDistance([])).toBe(0);
  });

  it("returns 0 for single point", () => {
    expect(totalDistance([{ lat: 0, lng: 0 }])).toBe(0);
  });

  it("sums segment distances correctly", () => {
    const points = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 0 },
      { lat: 2, lng: 0 },
    ];
    const total = totalDistance(points);
    const expected = haversineDistance(points[0], points[1]) + haversineDistance(points[1], points[2]);
    expect(total).toBeCloseTo(expected, 5);
  });
});

// ─── Helpers: formatDistance ──────────────────────────────────────────────────

function makeWaypoint(lat: number, lng: number, timestamp = 0): Waypoint {
  return { lat, lng, timestamp, accuracy: 5, speed: null, altitude: null };
}

describe("formatDistance", () => {
  it("returns '0.0' for empty waypoints", () => {
    expect(formatDistance([])).toBe("0.0");
  });

  it("returns '0.0' for a single waypoint", () => {
    expect(formatDistance([makeWaypoint(0, 0)])).toBe("0.0");
  });

  it("returns distance in km for multi-waypoint route", () => {
    // Two points ~111km apart (1 degree latitude)
    const waypoints = [makeWaypoint(0, 0), makeWaypoint(1, 0)];
    const result = parseFloat(formatDistance(waypoints));
    expect(result).toBeGreaterThan(110);
    expect(result).toBeLessThan(112);
  });
});

// ─── Helpers: formatElapsed ───────────────────────────────────────────────────

describe("formatElapsed", () => {
  it("returns '0m' for fewer than 2 waypoints", () => {
    expect(formatElapsed([])).toBe("0m");
    expect(formatElapsed([makeWaypoint(0, 0, 0)])).toBe("0m");
  });

  it("returns minutes-only format for elapsed < 1 hour", () => {
    const w = [makeWaypoint(0, 0, 0), makeWaypoint(0, 0, 30 * 60_000)];
    expect(formatElapsed(w)).toBe("30m");
  });

  it("returns hours+minutes format for elapsed >= 1 hour", () => {
    const w = [makeWaypoint(0, 0, 0), makeWaypoint(0, 0, 2 * 60 * 60_000 + 34 * 60_000)];
    expect(formatElapsed(w)).toBe("2h 34m");
  });

  it("returns '0m' for zero elapsed time", () => {
    const w = [makeWaypoint(0, 0, 1000), makeWaypoint(0, 0, 1000)];
    expect(formatElapsed(w)).toBe("0m");
  });
});

// ─── Helpers: formatSpeed ─────────────────────────────────────────────────────

function makePosition(speed: number | null): GeolocationPosition {
  return {
    coords: {
      latitude: 0, longitude: 0, accuracy: 5,
      speed, altitude: null, altitudeAccuracy: null, heading: null,
    },
    timestamp: 0,
  } as unknown as GeolocationPosition;
}

describe("formatSpeed", () => {
  it("returns '—' for null position", () => {
    expect(formatSpeed(null)).toBe("—");
  });

  it("returns '—' when speed is null", () => {
    expect(formatSpeed(makePosition(null))).toBe("—");
  });

  it("returns '—' when speed is 0", () => {
    expect(formatSpeed(makePosition(0))).toBe("—");
  });

  it("converts m/s to km/h correctly", () => {
    // 10 m/s = 36 km/h
    expect(formatSpeed(makePosition(10))).toBe("36");
  });

  it("rounds to nearest integer", () => {
    // 13.89 m/s ≈ 50 km/h
    expect(formatSpeed(makePosition(13.89))).toBe("50");
  });
});
