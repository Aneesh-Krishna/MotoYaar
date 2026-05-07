import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { serviceCenterService } from "@/services/serviceCenterService";
import { handleApiError } from "@/lib/errors";
import { z } from "zod";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const city = searchParams.get("city") ?? undefined;
    const results = await serviceCenterService.search(q, city);
    return NextResponse.json(results);
  } catch (error) {
    return handleApiError(error);
  }
}

const createServiceCenterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  city: z.string().min(1, "City is required"),
  pincode: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createServiceCenterSchema.parse(body);
    const serviceCenter = await serviceCenterService.create(data, session.user.id);
    return NextResponse.json(serviceCenter, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
