import { getSession } from "@/lib/session";
import { handleApiError } from "@/lib/errors";
import { pushService } from "@/services/pushService";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ hasSubscription: false });
    }

    const subs = await pushService.getSubscriptionsForUser(session.user.id);
    return NextResponse.json({ hasSubscription: subs.length > 0 });
  } catch (error) {
    return handleApiError(error);
  }
}
