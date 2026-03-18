import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/services/userService";
import { handleApiError } from "@/lib/errors";
import { updateUserSchema } from "@/lib/validations/user";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const body = await req.json();
    const data = updateUserSchema.parse(body);
    const user = await userService.update(session.user.id, data);
    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}
