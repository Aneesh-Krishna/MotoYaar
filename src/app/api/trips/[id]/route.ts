import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { tripService } from "@/services/tripService";
import { handleApiError } from "@/lib/errors";
import { updateTripSchema } from "@/lib/validations/trip";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const trip = await tripService.getById(params.id, session.user.id);
    return NextResponse.json(trip);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = updateTripSchema.parse(body);
    const trip = await tripService.update(params.id, session.user.id, data);
    return NextResponse.json(trip);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const confirmed = url.searchParams.get("confirm") === "true";

  if (!confirmed) {
    return NextResponse.json(
      { error: { code: "CONFIRMATION_REQUIRED", message: "Pass ?confirm=true to confirm deletion" } },
      { status: 400 }
    );
  }

  try {
    await tripService.delete(params.id, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
