import { describe, it, expect, vi, afterEach } from "vitest";
import { formatTripDateRange, formatRelativeTime, formatDate } from "../date";

describe("formatTripDateRange", () => {
  it("formats a single date when endDate is null", () => {
    expect(formatTripDateRange("2026-03-20", null)).toBe("20 Mar 2026");
  });

  it("formats a single date when endDate is undefined", () => {
    expect(formatTripDateRange("2026-03-20")).toBe("20 Mar 2026");
  });

  it("formats a single date when start and end are the same day", () => {
    expect(formatTripDateRange("2026-03-20", "2026-03-20")).toBe("20 Mar 2026");
  });

  it("formats a same-month range with abbreviated start day", () => {
    expect(formatTripDateRange("2026-03-18", "2026-03-20")).toBe("18–20 Mar 2026");
  });

  it("formats a cross-month range with both month labels", () => {
    expect(formatTripDateRange("2026-03-28", "2026-04-02")).toBe("28 Mar–2 Apr 2026");
  });

  it("formats a cross-year range", () => {
    expect(formatTripDateRange("2025-12-30", "2026-01-02")).toBe("30 Dec–2 Jan 2026");
  });
});

// ─── formatRelativeTime ───────────────────────────────────────────────────────

describe("formatRelativeTime", () => {
  afterEach(() => vi.useRealTimers());

  it("returns empty string for null", () => {
    expect(formatRelativeTime(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatRelativeTime(undefined)).toBe("");
  });

  it("returns 'just now' for < 60 seconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T12:00:00Z"));
    expect(formatRelativeTime(new Date("2026-04-13T11:59:30Z"))).toBe("just now");
  });

  it("returns '5 minutes ago' for 5 minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T12:00:00Z"));
    expect(formatRelativeTime(new Date("2026-04-13T11:55:00Z"))).toBe("5 minutes ago");
  });

  it("returns '1 minute ago' for 1 minute (singular)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T12:00:00Z"));
    expect(formatRelativeTime(new Date("2026-04-13T11:59:00Z"))).toBe("1 minute ago");
  });

  it("returns '2 hours ago' for 2 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T12:00:00Z"));
    expect(formatRelativeTime(new Date("2026-04-13T10:00:00Z"))).toBe("2 hours ago");
  });

  it("returns '1 hour ago' for 1 hour (singular)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T12:00:00Z"));
    expect(formatRelativeTime("2026-04-13T11:00:00Z")).toBe("1 hour ago");
  });

  it("returns '3 days ago' for 3 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T12:00:00Z"));
    expect(formatRelativeTime(new Date("2026-04-10T12:00:00Z"))).toBe("3 days ago");
  });

  it("returns '2 days ago' for 2 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T12:00:00Z"));
    expect(formatRelativeTime(new Date("2026-04-11T12:00:00Z"))).toBe("2 days ago");
  });

  it("returns '2 weeks ago' for 14 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T12:00:00Z"));
    expect(formatRelativeTime(new Date("2026-03-30T12:00:00Z"))).toBe("2 weeks ago");
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatDate(undefined)).toBe("");
  });

  it("formats a Date object as 'd MMM yyyy, HH:mm'", () => {
    // Use UTC-safe date construction to avoid timezone-sensitive failures
    const date = new Date("2026-04-13T09:30:00");
    const result = formatDate(date);
    expect(result).toMatch(/13 Apr 2026, \d{2}:30/);
  });

  it("formats a date string correctly", () => {
    const result = formatDate("2026-01-05T14:45:00");
    expect(result).toMatch(/5 Jan 2026, \d{2}:45/);
  });
});
