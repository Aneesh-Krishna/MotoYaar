import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSignedUrl = vi.fn();

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    constructor() {}
  },
  GetObjectCommand: class {
    constructor(public input: unknown) {}
  },
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  },
  DeleteObjectCommand: class {
    constructor(public input: unknown) {}
  },
  CopyObjectCommand: class {
    constructor(public input: unknown) {}
  },
}));

const { generateAccessUrl } = await import("@/lib/r2");

describe("generateAccessUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a signed URL for a valid R2 key", async () => {
    mockGetSignedUrl.mockResolvedValue("https://signed.example.com/doc.jpg?token=abc");

    const url = await generateAccessUrl("user-1/documents/vehicle-1/doc.jpg");

    expect(url).toBe("https://signed.example.com/doc.jpg?token=abc");
    expect(mockGetSignedUrl).toHaveBeenCalledOnce();
  });

  it("URL expires in 15 minutes (900 seconds) by default", async () => {
    mockGetSignedUrl.mockResolvedValue("https://signed.example.com/doc.jpg");

    await generateAccessUrl("user-1/documents/vehicle-1/doc.jpg");

    const [, , options] = mockGetSignedUrl.mock.calls[0];
    expect(options).toEqual({ expiresIn: 900 });
  });

  it("respects explicit expiresInSeconds parameter", async () => {
    mockGetSignedUrl.mockResolvedValue("https://signed.example.com/doc.jpg");

    await generateAccessUrl("user-1/documents/vehicle-1/doc.jpg", 300);

    const [, , options] = mockGetSignedUrl.mock.calls[0];
    expect(options).toEqual({ expiresIn: 300 });
  });
});
