import { describe, it, expect, beforeEach, vi } from "vitest";

let instanceCount = 0;
class FakeToken {
  readonly id: number;
  constructor() {
    this.id = ++instanceCount;
  }
}

vi.stubGlobal("google", {
  maps: {
    places: {
      AutocompleteSessionToken: FakeToken,
    },
  },
});

beforeEach(() => {
  instanceCount = 0;
  vi.resetModules();
});

describe("sessionToken", () => {
  it("returns same token on repeated getSessionToken calls", async () => {
    const { getSessionToken } = await import("../sessionToken");
    const t1 = getSessionToken();
    const t2 = getSessionToken();
    expect(t1).toBe(t2);
    expect(instanceCount).toBe(1);
  });

  it("consumeSessionToken returns current token then resets — next call creates new token", async () => {
    const { getSessionToken, consumeSessionToken } = await import("../sessionToken");
    const before = getSessionToken();
    const consumed = consumeSessionToken();
    expect(consumed).toBe(before);
    const after = getSessionToken();
    expect(after).not.toBe(before);
    expect(instanceCount).toBe(2);
  });

  it("refreshSessionToken is no longer exported (removed as dead code)", async () => {
    const mod = await import("../sessionToken");
    expect((mod as Record<string, unknown>).refreshSessionToken).toBeUndefined();
  });
});
