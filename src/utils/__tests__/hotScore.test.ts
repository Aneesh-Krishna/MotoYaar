import { describe, it, expect } from "vitest";
import { hotScore } from "@/utils/hotScore";

describe("hotScore", () => {
  it("returns higher score for more likes", () => {
    const now = new Date();
    const fewer = hotScore(5, 0, now);
    const more = hotScore(20, 0, now);
    expect(more).toBeGreaterThan(fewer);
  });

  it("returns lower score for older posts", () => {
    const recent = hotScore(10, 0, new Date(Date.now() - 1 * 60 * 60 * 1000));
    const old = hotScore(10, 0, new Date(Date.now() - 48 * 60 * 60 * 1000));
    expect(recent).toBeGreaterThan(old);
  });

  it("returns negative score for more dislikes than likes", () => {
    const score = hotScore(2, 10, new Date());
    expect(score).toBeLessThan(0);
  });

  it("returns zero score when likes equal dislikes", () => {
    const score = hotScore(5, 5, new Date());
    expect(score).toBe(0);
  });
});
