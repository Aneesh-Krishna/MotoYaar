import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockGetSession, mockGenerateUploadUrl } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGenerateUploadUrl: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/r2", () => ({ generateUploadUrl: mockGenerateUploadUrl }));
vi.mock("@/lib/errors", () => ({
  handleApiError: vi.fn((err: unknown) =>
    Response.json({ error: String(err) }, { status: 500 })
  ),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { POST } from "../route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-1" } };

function makeRequest(body: object) {
  return new Request("http://localhost/api/uploads/receipt", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/uploads/receipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns presigned PUT URL and temp key for valid JPG request", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGenerateUploadUrl.mockResolvedValue("https://r2.example.com/signed-put-url");

    const res = await POST(makeRequest({ filename: "receipt.jpg", contentType: "image/jpeg" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploadUrl).toBe("https://r2.example.com/signed-put-url");
    expect(body.tempKey).toMatch(/^user-1\/receipts\/temp\/.+\.jpg$/);
  });

  it("returns presigned PUT URL for PNG", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGenerateUploadUrl.mockResolvedValue("https://r2.example.com/signed-put-url");

    const res = await POST(makeRequest({ filename: "receipt.png", contentType: "image/png" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tempKey).toMatch(/\.png$/);
  });

  it("returns presigned PUT URL for PDF", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGenerateUploadUrl.mockResolvedValue("https://r2.example.com/signed-put-url");

    const res = await POST(makeRequest({ filename: "receipt.pdf", contentType: "application/pdf" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tempKey).toMatch(/\.pdf$/);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(makeRequest({ filename: "receipt.jpg", contentType: "image/jpeg" }));

    expect(res.status).toBe(401);
    expect(mockGenerateUploadUrl).not.toHaveBeenCalled();
  });

  it("returns 400 for unsupported content type", async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await POST(makeRequest({ filename: "virus.exe", contentType: "application/octet-stream" }));

    expect(res.status).toBe(400);
    expect(mockGenerateUploadUrl).not.toHaveBeenCalled();
  });

  it("uses 5-minute TTL (300 seconds) for the presigned URL", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGenerateUploadUrl.mockResolvedValue("https://r2.example.com/signed");

    await POST(makeRequest({ filename: "receipt.jpg", contentType: "image/jpeg" }));

    const [, , expiresIn] = mockGenerateUploadUrl.mock.calls[0];
    expect(expiresIn).toBe(300);
  });

  it("scopes temp key to authenticated user's namespace", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-xyz" } });
    mockGenerateUploadUrl.mockResolvedValue("https://r2.example.com/signed");

    await POST(makeRequest({ filename: "receipt.jpg", contentType: "image/jpeg" }));

    const [key] = mockGenerateUploadUrl.mock.calls[0];
    expect(key).toMatch(/^user-xyz\/receipts\/temp\//);
  });
});
