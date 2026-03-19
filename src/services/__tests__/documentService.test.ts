import { describe, it, expect } from "vitest";
import { computeDocumentStatus } from "@/services/documentService";

describe("computeDocumentStatus", () => {
  const WINDOW = 30;

  it("returns 'incomplete' for null expiryDate", () => {
    expect(computeDocumentStatus(null, WINDOW)).toBe("incomplete");
    expect(computeDocumentStatus(undefined, WINDOW)).toBe("incomplete");
  });

  it("returns 'expired' for a past date", () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    expect(computeDocumentStatus(past, WINDOW)).toBe("expired");
  });

  it("returns 'expiring' for a date within the notification window", () => {
    const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    expect(computeDocumentStatus(soon, WINDOW)).toBe("expiring");
  });

  it("returns 'expiring' for a date exactly on the window boundary", () => {
    const boundary = new Date(Date.now() + WINDOW * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    expect(computeDocumentStatus(boundary, WINDOW)).toBe("expiring");
  });

  it("returns 'valid' for a date beyond the notification window", () => {
    const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    expect(computeDocumentStatus(future, WINDOW)).toBe("valid");
  });

  it("returns 'incomplete' for an invalid date string", () => {
    expect(computeDocumentStatus("not-a-date", WINDOW)).toBe("incomplete");
    expect(computeDocumentStatus("2027-99-99", WINDOW)).toBe("incomplete");
  });

  it("respects a custom notification window", () => {
    const in15Days = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    expect(computeDocumentStatus(in15Days, 30)).toBe("expiring");
    expect(computeDocumentStatus(in15Days, 10)).toBe("valid");
  });
});
