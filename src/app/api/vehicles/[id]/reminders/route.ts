import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { serviceReminderService } from "@/services/serviceReminderService";
import { vehicleService } from "@/services/vehicleService";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { z } from "zod";

const createSchema = z
  .object({
    serviceType: z.string().min(1).max(100),
    kmInterval: z.number().int().positive().nullable().optional(),
    dayInterval: z.number().int().positive().nullable().optional(),
  })
  .refine((d) => d.kmInterval || d.dayInterval, {
    message: "At least one of kmInterval or dayInterval must be provided",
  });

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await vehicleService.getWithAccessCheck(params.id, session.user.id);
    const reminders = await serviceReminderService.listByVehicle(params.id, session.user.id);
    return NextResponse.json({ reminders });
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await vehicleService.getWithAccessCheck(params.id, session.user.id);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const reminder = await serviceReminderService.create(session.user.id, params.id, parsed.data);
    return NextResponse.json({ reminder }, { status: 201 });
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
}
