import { describe, it, expect } from "vitest";
import { createPostSchema } from "@/lib/validations/post";

describe("createPostSchema", () => {
  it("rejects empty title", () => {
    const result = createPostSchema.safeParse({ title: "", description: "valid" });
    expect(result.success).toBe(false);
  });

  it("rejects description over 1000 chars", () => {
    const result = createPostSchema.safeParse({
      title: "Valid",
      description: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL in link field", () => {
    const result = createPostSchema.safeParse({
      title: "Valid",
      description: "Valid description",
      link: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty link field", () => {
    const result = createPostSchema.safeParse({
      title: "Valid",
      description: "Valid description",
      link: "",
    });
    expect(result.success).toBe(true);
  });

  it("allows a valid URL in link field", () => {
    const result = createPostSchema.safeParse({
      title: "Valid",
      description: "Valid description",
      link: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("allows missing link (undefined)", () => {
    const result = createPostSchema.safeParse({
      title: "Valid",
      description: "Valid description",
    });
    expect(result.success).toBe(true);
  });
});
