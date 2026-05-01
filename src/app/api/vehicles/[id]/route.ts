import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { vehicleService } from "@/services/vehicleService";
import { handleApiError } from "@/lib/errors";
import { updateVehicleSchema } from "@/lib/validations/vehicle";
import { CACHE_TAGS } from "@/lib/cache";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const vehicle = await vehicleService.getWithAccessCheck(params.id, session.user.id);
    return NextResponse.json(vehicle);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = updateVehicleSchema.parse(body);
    const vehicle = await vehicleService.update(params.id, session.user.id, data);
    revalidateTag(CACHE_TAGS.vehicles(session.user.id));
    return NextResponse.json(vehicle);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await vehicleService.delete(params.id, session.user.id);
    revalidateTag(CACHE_TAGS.vehicles(session.user.id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
