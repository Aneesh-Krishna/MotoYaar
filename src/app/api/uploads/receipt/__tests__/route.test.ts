import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockGetSession, mockPutObject } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockPutObject: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/r2", () => ({ putObject: mockPutObject }));
vi.mock("@/lib/errors", () => ({
  handleApiError: vi.fn((err: unknown) =>
    Response.json({ error: String(err) }, { status: 500 })
  ),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { POST } from "../route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-1" } };

function makeRequest(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return new Request("http://localhost/api/uploads/receipt", {
    method: "POST",
    body: formData,
  });
}

function makeFile(name: string, type: string, size = 1024): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/uploads/receipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPutObject.mockResolvedValue(undefined);
  });

  it("uploads JPG receipt and returns temp key", async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await POST(makeRequest(makeFile("receipt.jpg", "image/jpeg")) as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tempKey).toMatch(/^user-1\/receipts\/temp\/.+\.jpg$/);
    expect(mockPutObject).toHaveBeenCalledOnce();
  });

  it("uploads PNG receipt and returns temp key", async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await POST(makeRequest(makeFile("receipt.png", "image/png")) as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tempKey).toMatch(/\.png$/);
  });

  it("uploads PDF receipt and returns temp key", async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await POST(makeRequest(makeFile("receipt.pdf", "application/pdf")) as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tempKey).toMatch(/\.pdf$/);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(makeRequest(makeFile("receipt.jpg", "image/jpeg")) as never);

    expect(res.status).toBe(401);
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  it("returns 400 for unsupported content type", async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await POST(makeRequest(makeFile("virus.exe", "application/octet-stream")) as never);

    expect(res.status).toBe(400);
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  it("scopes temp key to authenticated user's namespace", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-xyz" } });

    const res = await POST(makeRequest(makeFile("receipt.jpg", "image/jpeg")) as never);
    const body = await res.json();

    expect(body.tempKey).toMatch(/^user-xyz\/receipts\/temp\//);
  });
});
