import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { liveTripSessions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "increment";

    // Get session and atomically update guest_view_count
    const [session] = await db.select().from(liveTripSessions)
      .where(eq(liveTripSessions.inviteCode, params.code.toUpperCase()));

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (action === "decrement") {
      // Decrement but don't go below 0
      await db.update(liveTripSessions)
        .set({ guestViewCount: sql`GREATEST(0, ${liveTripSessions.guestViewCount} - 1)` })
        .where(eq(liveTripSessions.id, session.id));
    } else {
      // Increment
      await db.update(liveTripSessions)
        .set({ guestViewCount: sql`${liveTripSessions.guestViewCount} + 1` })
        .where(eq(liveTripSessions.id, session.id));
    }

    // Fetch updated count
    const [updated] = await db.select().from(liveTripSessions)
      .where(eq(liveTripSessions.id, session.id));

    return NextResponse.json({
      guest_view_count: updated.guestViewCount,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
