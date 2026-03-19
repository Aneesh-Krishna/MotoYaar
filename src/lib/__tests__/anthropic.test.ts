import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Anthropic SDK before importing the module under test
const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  const AnthropicMock = function () {
    return { messages: { create: mockCreate } };
  };
  return { default: AnthropicMock };
});

// Import after mocking
const { parseDocument } = await import("@/lib/anthropic");

describe("parseDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns expiryDate and confidence when Claude extracts a date", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: '{"expiryDate":"2026-12-31","confidence":"high"}' },
      ],
    });

    const buffer = new ArrayBuffer(8);
    const result = await parseDocument(buffer, "image/jpeg");

    expect(result.expiryDate).toBe("2026-12-31");
    expect(result.confidence).toBe("high");
  });

  it("returns null expiryDate when Claude finds no date", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: '{"expiryDate":null,"confidence":"none"}' },
      ],
    });

    const buffer = new ArrayBuffer(8);
    const result = await parseDocument(buffer, "image/png");

    expect(result.expiryDate).toBeNull();
    expect(result.confidence).toBe("none");
  });

  it("handles malformed Claude response gracefully", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "not valid json at all" }],
    });

    const buffer = new ArrayBuffer(8);
    const result = await parseDocument(buffer, "image/jpeg");

    expect(result.expiryDate).toBeNull();
    expect(result.confidence).toBe("none");
  });

  it("handles non-text content response gracefully", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "x", name: "y", input: {} }],
    });

    const buffer = new ArrayBuffer(8);
    const result = await parseDocument(buffer, "image/jpeg");

    expect(result.expiryDate).toBeNull();
    expect(result.confidence).toBe("none");
  });

  it("handles Anthropic API error gracefully", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API rate limit"));

    const buffer = new ArrayBuffer(8);
    const result = await parseDocument(buffer, "image/jpeg");

    expect(result.expiryDate).toBeNull();
    expect(result.confidence).toBe("none");
  });
});
