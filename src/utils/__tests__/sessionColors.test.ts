import { getParticipantColor } from "../sessionColors";

describe("getParticipantColor", () => {
  it("returns brand orange for index 0 (host)", () => {
    expect(getParticipantColor(0)).toBe("#F97316");
  });

  it("returns correct color for each valid index", () => {
    expect(getParticipantColor(1)).toBe("#3B82F6"); // blue
    expect(getParticipantColor(2)).toBe("#10B981"); // green
    expect(getParticipantColor(3)).toBe("#8B5CF6"); // purple
    expect(getParticipantColor(4)).toBe("#EF4444"); // red
    expect(getParticipantColor(5)).toBe("#F59E0B"); // amber
    expect(getParticipantColor(6)).toBe("#06B6D4"); // cyan
    expect(getParticipantColor(7)).toBe("#EC4899"); // pink
  });

  it("cycles through palette for indices beyond palette length", () => {
    expect(getParticipantColor(8)).toBe("#F97316"); // cycles back to orange
    expect(getParticipantColor(9)).toBe("#3B82F6"); // blue
    expect(getParticipantColor(15)).toBe("#EC4899"); // pink
    expect(getParticipantColor(16)).toBe("#F97316"); // cycles back to orange
  });

  it("handles large indices with modulo correctly", () => {
    expect(getParticipantColor(100)).toBe("#EF4444"); // 100 % 8 = 4 (red)
  });
});
