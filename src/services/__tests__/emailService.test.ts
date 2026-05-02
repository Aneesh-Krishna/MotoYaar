import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockFindFirst,
  mockSendEmail,
  mockLoggerInfo,
  mockLoggerWarn,
} = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockSendEmail: vi.fn().mockResolvedValue(undefined),
  mockLoggerInfo: vi.fn(),
  mockLoggerWarn: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      users: { findFirst: mockFindFirst },
    },
  },
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: mockSendEmail,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: vi.fn(),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { emailService, type ExpiringDoc } from "@/services/emailService";

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-1",
    name: "Aneesh",
    email: "aneesh@example.com",
    emailNotificationsEnabled: true,
    ...overrides,
  };
}

function makeDoc(daysUntilExpiry: number, overrides: Partial<ExpiringDoc> = {}): ExpiringDoc {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);
  return {
    type: "Insurance",
    vehicleName: "Royal Enfield",
    expiryDate,
    daysUntilExpiry,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("emailService.sendDocumentExpiryEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("sends email when user has email notifications enabled", async () => {
    mockFindFirst.mockResolvedValue(makeUser());

    await emailService.sendDocumentExpiryEmail("user-1", [makeDoc(10)]);

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      "aneesh@example.com",
      expect.stringContaining("reminder"),
      expect.stringContaining("MotoYaar")
    );
  });

  it("skips email when user.emailNotificationsEnabled is false", async () => {
    mockFindFirst.mockResolvedValue(makeUser({ emailNotificationsEnabled: false }));

    await emailService.sendDocumentExpiryEmail("user-1", [makeDoc(10)]);

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
      "Email notification skipped — user opted out"
    );
  });

  it("skips email when user has no email address", async () => {
    mockFindFirst.mockResolvedValue(makeUser({ email: null }));

    await emailService.sendDocumentExpiryEmail("user-1", [makeDoc(10)]);

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
      "Email notification skipped — no email address on record"
    );
  });

  it("skips email when user is not found", async () => {
    mockFindFirst.mockResolvedValue(null);

    await emailService.sendDocumentExpiryEmail("user-1", [makeDoc(10)]);

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns early without calling sendEmail when docs array is empty", async () => {
    await emailService.sendDocumentExpiryEmail("user-1", []);

    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends combined email for multiple docs (not one per doc)", async () => {
    mockFindFirst.mockResolvedValue(makeUser());
    const docs = [makeDoc(5, { type: "Insurance" }), makeDoc(15, { type: "PUC" })];

    await emailService.sendDocumentExpiryEmail("user-1", docs);

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const html = mockSendEmail.mock.calls[0][2] as string;
    expect(html).toContain("Insurance");
    expect(html).toContain("PUC");
  });

  it("uses 'expired' subject when any doc has daysUntilExpiry <= 0", async () => {
    mockFindFirst.mockResolvedValue(makeUser());

    await emailService.sendDocumentExpiryEmail("user-1", [makeDoc(-1)]);

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.any(String),
      "Your document has expired — MotoYaar",
      expect.any(String)
    );
  });

  it("uses 'reminder' subject when all docs are upcoming", async () => {
    mockFindFirst.mockResolvedValue(makeUser());

    await emailService.sendDocumentExpiryEmail("user-1", [makeDoc(5), makeDoc(10)]);

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.any(String),
      "Document expiry reminder — MotoYaar",
      expect.any(String)
    );
  });

  it("does not throw when sendEmail fails", async () => {
    mockFindFirst.mockResolvedValue(makeUser());
    mockSendEmail.mockRejectedValue(new Error("Resend API down"));

    await expect(
      emailService.sendDocumentExpiryEmail("user-1", [makeDoc(5)])
    ).resolves.not.toThrow();

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
      "sendDocumentExpiryEmail failed"
    );
  });

  it("email HTML contains vehicle name when provided", async () => {
    mockFindFirst.mockResolvedValue(makeUser());

    await emailService.sendDocumentExpiryEmail("user-1", [
      makeDoc(5, { vehicleName: "Royal Enfield" }),
    ]);

    const html = mockSendEmail.mock.calls[0][2] as string;
    expect(html).toContain("Royal Enfield");
  });

  it("email HTML contains CTA link to /garage", async () => {
    mockFindFirst.mockResolvedValue(makeUser());

    await emailService.sendDocumentExpiryEmail("user-1", [makeDoc(5)]);

    const html = mockSendEmail.mock.calls[0][2] as string;
    expect(html).toContain("motoyaar.app/garage");
    expect(html).toContain("View in MotoYaar");
  });

  it("email HTML shows orange #F97316 branding", async () => {
    mockFindFirst.mockResolvedValue(makeUser());

    await emailService.sendDocumentExpiryEmail("user-1", [makeDoc(5)]);

    const html = mockSendEmail.mock.calls[0][2] as string;
    expect(html).toContain("#F97316");
  });

  it("marks expired docs with red 'Expired' label in HTML", async () => {
    mockFindFirst.mockResolvedValue(makeUser());

    await emailService.sendDocumentExpiryEmail("user-1", [makeDoc(-3)]);

    const html = mockSendEmail.mock.calls[0][2] as string;
    expect(html).toContain("Expired");
    expect(html).toContain("#dc2626");
  });

  it("shows 'Expires tomorrow' label for daysUntilExpiry === 1", async () => {
    mockFindFirst.mockResolvedValue(makeUser());

    await emailService.sendDocumentExpiryEmail("user-1", [makeDoc(1)]);

    const html = mockSendEmail.mock.calls[0][2] as string;
    expect(html).toContain("Expires tomorrow");
    expect(html).not.toContain("Expires today");
  });

  it("shows 'Expires in N days' label for daysUntilExpiry > 1", async () => {
    mockFindFirst.mockResolvedValue(makeUser());

    await emailService.sendDocumentExpiryEmail("user-1", [makeDoc(5)]);

    const html = mockSendEmail.mock.calls[0][2] as string;
    expect(html).toContain("Expires in 5 days");
  });
});
