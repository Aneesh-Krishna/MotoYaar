import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_JSON = '{"expiryDate":"2026-12-31","confidence":"high"}';
const NULL_JSON = '{"expiryDate":null,"confidence":"none"}';
const FENCED_JSON = '```json\n{"expiryDate":"2027-03-15","confidence":"high"}\n```';
const BAD_JSON = "not valid json at all";
const EMPTY_BUFFER = new ArrayBuffer(8);

// ─── Gemini (default provider) ────────────────────────────────────────────────

describe("parseDocument — Gemini provider", () => {
  let parseDocument: (typeof import("@/lib/anthropic"))["parseDocument"];
  const mockGenerateContent = vi.fn();

  beforeAll(async () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.resetModules();
    vi.doMock("@google/generative-ai", () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return { generateContent: mockGenerateContent };
        }
      },
    }));
    ({ parseDocument } = await import("@/lib/anthropic"));
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  beforeEach(() => vi.clearAllMocks());

  it("returns expiryDate and confidence on successful extraction", async () => {
    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => VALID_JSON } });
    const result = await parseDocument(EMPTY_BUFFER, "image/jpeg");
    expect(result.expiryDate).toBe("2026-12-31");
    expect(result.confidence).toBe("high");
    expect(result.reason).toBe("extracted");
  });

  it("returns no_date_found when AI finds no date", async () => {
    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => NULL_JSON } });
    const result = await parseDocument(EMPTY_BUFFER, "image/png");
    expect(result.expiryDate).toBeNull();
    expect(result.reason).toBe("no_date_found");
  });

  it("strips markdown code fences from response", async () => {
    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => FENCED_JSON } });
    const result = await parseDocument(EMPTY_BUFFER, "image/jpeg");
    expect(result.expiryDate).toBe("2027-03-15");
    expect(result.reason).toBe("extracted");
  });

  it("returns parse_error on malformed JSON response", async () => {
    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => BAD_JSON } });
    const result = await parseDocument(EMPTY_BUFFER, "image/jpeg");
    expect(result.expiryDate).toBeNull();
    expect(result.reason).toBe("parse_error");
  });

  it("returns api_error when API throws", async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error("429 quota exceeded"));
    const result = await parseDocument(EMPTY_BUFFER, "image/jpeg");
    expect(result.expiryDate).toBeNull();
    expect(result.reason).toBe("api_error");
  });
});

// ─── Anthropic ────────────────────────────────────────────────────────────────

describe("parseDocument — Anthropic provider", () => {
  let parseDocument: (typeof import("@/lib/anthropic"))["parseDocument"];
  const mockCreate = vi.fn();

  beforeAll(async () => {
    vi.stubEnv("AI_PROVIDER", "anthropic");
    vi.resetModules();
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: class {
        messages = { create: mockCreate };
      },
    }));
    ({ parseDocument } = await import("@/lib/anthropic"));
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  beforeEach(() => vi.clearAllMocks());

  it("returns expiryDate and confidence on successful extraction", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: VALID_JSON }],
    });
    const result = await parseDocument(EMPTY_BUFFER, "image/jpeg");
    expect(result.expiryDate).toBe("2026-12-31");
    expect(result.confidence).toBe("high");
    expect(result.reason).toBe("extracted");
  });

  it("returns no_date_found when AI finds no date", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: NULL_JSON }],
    });
    const result = await parseDocument(EMPTY_BUFFER, "image/png");
    expect(result.expiryDate).toBeNull();
    expect(result.reason).toBe("no_date_found");
  });

  it("returns parse_error on non-text content type", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "x", name: "y", input: {} }],
      stop_reason: "tool_use",
    });
    const result = await parseDocument(EMPTY_BUFFER, "image/jpeg");
    expect(result.expiryDate).toBeNull();
    expect(result.reason).toBe("parse_error");
  });

  it("returns parse_error on malformed JSON response", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: BAD_JSON }],
    });
    const result = await parseDocument(EMPTY_BUFFER, "image/jpeg");
    expect(result.expiryDate).toBeNull();
    expect(result.reason).toBe("parse_error");
  });

  it("returns api_error when API throws", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API rate limit"));
    const result = await parseDocument(EMPTY_BUFFER, "image/jpeg");
    expect(result.expiryDate).toBeNull();
    expect(result.reason).toBe("api_error");
  });
});

// ─── Mistral ──────────────────────────────────────────────────────────────────
// Mistral uses fetch directly (SDK omits Content-Length on large payloads).

describe("parseDocument — Mistral provider", () => {
  let parseDocument: (typeof import("@/lib/anthropic"))["parseDocument"];
  const mockFetch = vi.fn();

  function mistralOk(content: string) {
    return Promise.resolve({
      ok: true,
      json: async () => ({ choices: [{ message: { content } }] }),
    });
  }

  function mistralErr(status: number, message: string) {
    return Promise.resolve({
      ok: false,
      status,
      statusText: message,
      text: async () => message,
    });
  }

  beforeAll(async () => {
    vi.stubEnv("AI_PROVIDER", "mistral");
    vi.resetModules();
    ({ parseDocument } = await import("@/lib/anthropic"));
    vi.stubGlobal("fetch", mockFetch);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  beforeEach(() => vi.clearAllMocks());

  it("returns expiryDate and confidence on successful extraction", async () => {
    mockFetch.mockReturnValueOnce(mistralOk(VALID_JSON));
    const result = await parseDocument(EMPTY_BUFFER, "image/jpeg");
    expect(result.expiryDate).toBe("2026-12-31");
    expect(result.confidence).toBe("high");
    expect(result.reason).toBe("extracted");
  });

  it("returns no_date_found when AI finds no date", async () => {
    mockFetch.mockReturnValueOnce(mistralOk(NULL_JSON));
    const result = await parseDocument(EMPTY_BUFFER, "image/png");
    expect(result.expiryDate).toBeNull();
    expect(result.reason).toBe("no_date_found");
  });

  it("strips markdown code fences from response", async () => {
    mockFetch.mockReturnValueOnce(mistralOk(FENCED_JSON));
    const result = await parseDocument(EMPTY_BUFFER, "image/jpeg");
    expect(result.expiryDate).toBe("2027-03-15");
    expect(result.reason).toBe("extracted");
  });

  it("returns parse_error on malformed JSON response", async () => {
    mockFetch.mockReturnValueOnce(mistralOk(BAD_JSON));
    const result = await parseDocument(EMPTY_BUFFER, "image/jpeg");
    expect(result.expiryDate).toBeNull();
    expect(result.reason).toBe("parse_error");
  });

  it("returns api_error on HTTP error response (e.g. 411 Content-Length)", async () => {
    mockFetch.mockReturnValueOnce(mistralErr(411, "A valid Content-Length header is required"));
    const result = await parseDocument(EMPTY_BUFFER, "image/jpeg");
    expect(result.expiryDate).toBeNull();
    expect(result.reason).toBe("api_error");
  });

  it("sets Content-Length header on request", async () => {
    mockFetch.mockReturnValueOnce(mistralOk(VALID_JSON));
    await parseDocument(EMPTY_BUFFER, "image/jpeg");
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(options.headers["Content-Length"]).toBeDefined();
    expect(Number(options.headers["Content-Length"])).toBeGreaterThan(0);
  });

  it("returns api_error when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"));
    const result = await parseDocument(EMPTY_BUFFER, "image/jpeg");
    expect(result.expiryDate).toBeNull();
    expect(result.reason).toBe("api_error");
  });
});
