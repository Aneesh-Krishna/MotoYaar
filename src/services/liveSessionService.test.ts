import { describe, it, expect } from "vitest";
import { liveSessionService } from "@/services/liveSessionService";

describe("liveSessionService", () => {
  describe("API surface", () => {
    it("exports create method", () => {
      expect(liveSessionService.create).toBeDefined();
    });

    it("exports getActiveByTripId method", () => {
      expect(liveSessionService.getActiveByTripId).toBeDefined();
    });

    it("exports getByInviteCode method", () => {
      expect(liveSessionService.getByInviteCode).toBeDefined();
    });

    it("exports end method", () => {
      expect(liveSessionService.end).toBeDefined();
    });

    it("exports join method", () => {
      expect(liveSessionService.join).toBeDefined();
    });

    it("exports leave method", () => {
      expect(liveSessionService.leave).toBeDefined();
    });

    it("exports expireOldSessions method", () => {
      expect(liveSessionService.expireOldSessions).toBeDefined();
    });
  });
});
