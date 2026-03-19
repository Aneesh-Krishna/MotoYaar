import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { vehicleService } from "@/services/vehicleService";
import { createVehicleSchema } from "@/lib/validations/vehicle";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }
    const vehicles = await vehicleService.listByUser(session.user.id);
    return NextResponse.json(vehicles);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const body = await req.json();
    const data = createVehicleSchema.parse(body);
    const vehicle = await vehicleService.create(session.user.id, data);
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
