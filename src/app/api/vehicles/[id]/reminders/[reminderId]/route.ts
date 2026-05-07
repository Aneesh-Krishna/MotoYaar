import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { serviceReminderService } from "@/services/serviceReminderService";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; reminderId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const reminder = await serviceReminderService.markServiced(params.reminderId, session.user.id);
    return NextResponse.json({ reminder });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Reminder not found") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; reminderId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await serviceReminderService.delete(params.reminderId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Reminder not found") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
}
