import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/lib/session"
import { db } from "@/lib/db/client"
import { trips } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

const plannedStopSchema = z.object({
  order: z.number().int().min(0),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
})

const bodySchema = z.object({
  plannedStops: z.array(plannedStopSchema),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plannedStops" }, { status: 400 })
  }

  const { plannedStops } = parsed.data

  const [updated] = await db
    .update(trips)
    .set({ plannedStops })
    .where(and(eq(trips.id, params.id), eq(trips.userId, session.user.id)))
    .returning({ id: trips.id })

  if (!updated) return NextResponse.json({ error: "Trip not found" }, { status: 404 })
  return NextResponse.json({ id: updated.id })
}
