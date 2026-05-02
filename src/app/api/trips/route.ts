import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { tripService } from "@/services/tripService";
import { handleApiError } from "@/lib/errors";
import { createTripSchema } from "@/lib/validations/trip";

export async function GET(_req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tripList = await tripService.listByUser(session.user.id);
    return NextResponse.json(tripList);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createTripSchema.parse(body);
    const trip = await tripService.create(session.user.id, data);
    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
