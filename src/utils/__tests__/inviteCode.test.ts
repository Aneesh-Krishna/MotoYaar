import { generateInviteCode } from "@/utils/inviteCode";

describe("generateInviteCode", () => {
  it("generates 6-character code", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
  });

  it("generates uppercase alphanumeric code", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
  });

  it("does not include ambiguous characters (I, O, 0, 1)", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode();
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  it("generates different codes on each call", () => {
    const codes = new Set();
    for (let i = 0; i < 50; i++) {
      codes.add(generateInviteCode());
    }
    expect(codes.size).toBeGreaterThan(40); // Expecting high uniqueness
  });
});
