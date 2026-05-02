import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { liveTripSessions, liveTripParticipants, trips, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError } from "@/lib/errors";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  try {
    const [session] = await db.select().from(liveTripSessions)
      .where(eq(liveTripSessions.inviteCode, params.code.toUpperCase()));

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Fetch participants with user info
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

    // Fetch trip and host info
    const [trip] = await db.select()
      .from(trips)
      .where(eq(trips.id, session.tripId));

    const [host] = await db.select()
      .from(users)
      .where(eq(users.id, session.hostUserId));

    return NextResponse.json({
      id: session.id,
      tripId: session.tripId,
      hostUserId: session.hostUserId,
      inviteCode: session.inviteCode,
      status: session.status,
      guestViewCount: session.guestViewCount,
      createdAt: session.createdAt,
      endedAt: session.endedAt,
      host: host ? { id: host.id, name: host.name } : null,
      trip: trip ? { id: trip.id, title: trip.title } : null,
      participants,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
