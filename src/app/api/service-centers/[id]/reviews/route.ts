import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { serviceCenterService } from "@/services/serviceCenterService";
import { handleApiError } from "@/lib/errors";
import { z } from "zod";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(100).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const data = reviewSchema.parse(body);
    const review = await serviceCenterService.upsertReview(id, session.user.id, data.rating, data.reviewText);
    return NextResponse.json(review, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
