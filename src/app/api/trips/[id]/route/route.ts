import { getSession } from "@/lib/session";
import { tripRouteService } from "@/services/tripRouteService";
import { handleApiError } from "@/lib/errors";
import { NextResponse } from "next/server";
import { z } from "zod";

const appendWaypointsSchema = z.object({
  waypoints: z
    .array(
      z.object({
        lat: z.number(),
        lng: z.number(),
        timestamp: z.number(),
        accuracy: z.number(),
        speed: z.number().nullable(),
        altitude: z.number().nullable(),
      })
    )
    .min(1),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const route = await tripRouteService.getByTripId(params.id, session.user.id);
    return NextResponse.json(route);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = appendWaypointsSchema.parse(await req.json());
    const route = await tripRouteService.createOrAppend(params.id, session.user.id, body.waypoints);
    return NextResponse.json(route);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  if (searchParams.get("confirm") !== "true")
    return NextResponse.json({ error: "Add ?confirm=true to confirm deletion" }, { status: 400 });
  try {
    await tripRouteService.deleteByTripId(params.id, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
