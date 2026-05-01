import { db } from "@/lib/db/client";
import { liveTripSessions, liveTripParticipants, trips, users } from "@/lib/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/errors";
import { generateInviteCode } from "@/utils/inviteCode";
import type { LiveTripSession, LiveTripParticipant } from "@/types";

export const liveSessionService = {
  async create(tripId: string, hostUserId: string): Promise<LiveTripSession> {
    // Ownership check
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
    if (!trip) throw new NotFoundError("Trip not found");
    if (trip.userId !== hostUserId) throw new ForbiddenError("Only the trip owner can start a session");

    // Check for existing active session
    const [existing] = await db.select().from(liveTripSessions)
      .where(and(eq(liveTripSessions.tripId, tripId), eq(liveTripSessions.status, "active")));
    if (existing) throw new ConflictError("An active session already exists for this trip");

    // Generate unique invite code with retry
    let inviteCode = generateInviteCode();
    for (let attempt = 0; attempt < 3; attempt++) {
      const [collision] = await db.select().from(liveTripSessions)
        .where(eq(liveTripSessions.inviteCode, inviteCode));
      if (!collision) break;
      if (attempt === 2) throw new Error("Failed to generate unique invite code");
      inviteCode = generateInviteCode();
    }

    // Create session + add host as participant
    const [session] = await db.insert(liveTripSessions)
      .values({ tripId, hostUserId, inviteCode, status: "active" })
      .returning();

    await db.insert(liveTripParticipants)
      .values({ sessionId: session.id, userId: hostUserId, status: "active" });

    return session as unknown as LiveTripSession;
  },

  async getActiveByTripId(tripId: string, userId: string): Promise<LiveTripSession & { participants: LiveTripParticipant[] }> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
    if (!trip) throw new NotFoundError("Trip not found");
    if (trip.userId !== userId) throw new ForbiddenError("Access denied");

    const [session] = await db.select().from(liveTripSessions)
      .where(and(eq(liveTripSessions.tripId, tripId), eq(liveTripSessions.status, "active")));
    if (!session) throw new NotFoundError("No active session for this trip");

    const participants = await db.select({
      id: liveTripParticipants.id,
      sessionId: liveTripParticipants.sessionId,
      userId: liveTripParticipants.userId,
      status: liveTripParticipants.status,
      joinedAt: liveTripParticipants.joinedAt,
      leftAt: liveTripParticipants.leftAt,
      user: { id: users.id, name: users.name },
    })
      .from(liveTripParticipants)
      .innerJoin(users, eq(liveTripParticipants.userId, users.id))
      .where(eq(liveTripParticipants.sessionId, session.id));

    return { ...session, participants } as unknown as LiveTripSession & { participants: LiveTripParticipant[] };
  },

  async getByInviteCode(code: string): Promise<LiveTripSession> {
    const [session] = await db.select().from(liveTripSessions)
      .where(eq(liveTripSessions.inviteCode, code.toUpperCase()));
    if (!session) throw new NotFoundError("Session not found");
    return session as unknown as LiveTripSession;
  },

  async end(tripId: string, hostUserId: string): Promise<void> {
    const [session] = await db.select().from(liveTripSessions)
      .where(and(eq(liveTripSessions.tripId, tripId), eq(liveTripSessions.status, "active")));
    if (!session) throw new NotFoundError("No active session to end");
    if (session.hostUserId !== hostUserId) throw new ForbiddenError("Only the host can end the session");

    const now = new Date();
    await db.update(liveTripSessions)
      .set({ status: "ended", endedAt: now })
      .where(eq(liveTripSessions.id, session.id));

    await db.update(liveTripParticipants)
      .set({ status: "left", leftAt: now })
      .where(and(eq(liveTripParticipants.sessionId, session.id), eq(liveTripParticipants.status, "active")));
  },

  async join(code: string, userId: string): Promise<LiveTripParticipant> {
    const [session] = await db.select().from(liveTripSessions)
      .where(eq(liveTripSessions.inviteCode, code.toUpperCase()));
    if (!session) throw new NotFoundError("Session not found");
    if (session.status !== "active") throw new ConflictError("This session has ended");

    const [existing] = await db.select().from(liveTripParticipants)
      .where(and(
        eq(liveTripParticipants.sessionId, session.id),
        eq(liveTripParticipants.userId, userId),
      ));
    if (existing?.status === "active") throw new ConflictError("You are already in this session");

    // If previously left, re-add with fresh record
    const [participant] = await db.insert(liveTripParticipants)
      .values({ sessionId: session.id, userId, status: "active" })
      .onConflictDoUpdate({
        target: [liveTripParticipants.sessionId, liveTripParticipants.userId],
        set: { status: "active", joinedAt: new Date(), leftAt: null },
      })
      .returning();
    return participant as unknown as LiveTripParticipant;
  },

  async leave(code: string, userId: string): Promise<void> {
    const [session] = await db.select().from(liveTripSessions)
      .where(eq(liveTripSessions.inviteCode, code.toUpperCase()));
    if (!session) return; // no-op

    await db.update(liveTripParticipants)
      .set({ status: "left", leftAt: new Date() })
      .where(and(
        eq(liveTripParticipants.sessionId, session.id),
        eq(liveTripParticipants.userId, userId),
      ));
  },

  async expireOldSessions(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expired = await db.update(liveTripSessions)
      .set({ status: "expired", endedAt: new Date() })
      .where(and(eq(liveTripSessions.status, "active"), lt(liveTripSessions.createdAt, cutoff)))
      .returning({ id: liveTripSessions.id });

    if (expired.length > 0) {
      const expiredIds = expired.map(s => s.id);
      await db.update(liveTripParticipants)
        .set({ status: "left", leftAt: new Date() })
        .where(and(
          sql`${liveTripParticipants.sessionId} = ANY(${expiredIds})`,
          eq(liveTripParticipants.status, "active"),
        ));
    }
    return expired.length;
  },
};
