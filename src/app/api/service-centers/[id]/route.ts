import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { serviceCenterService } from "@/services/serviceCenterService";
import { handleApiError } from "@/lib/errors";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const [serviceCenter, reviews] = await Promise.all([
      serviceCenterService.getById(id),
      serviceCenterService.getReviews(id),
    ]);
    return NextResponse.json({ ...serviceCenter, reviews });
  } catch (error) {
    return handleApiError(error);
  }
}
