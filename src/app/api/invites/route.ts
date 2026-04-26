import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { vehicleInviteService } from "@/services/vehicleInviteService";
import { handleApiError } from "@/lib/errors";

const createInviteSchema = z.object({
  vehicleId: z.string().uuid(),
  inviteeEmail: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const body = await req.json();
    const { vehicleId, inviteeEmail } = createInviteSchema.parse(body);
    const invite = await vehicleInviteService.createInvite(session.user.id, vehicleId, inviteeEmail);
    return NextResponse.json(invite, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
