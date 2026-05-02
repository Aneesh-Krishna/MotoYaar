import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { communityService } from "@/services/communityService";
import { handleApiError } from "@/lib/errors";
import { createPostSchema } from "@/lib/validations/post";

export async function GET(req: Request) {
  const session = await getSession();
  // No auth required — guests can view the feed

  try {
    const { searchParams } = new URL(req.url);
    const sort = (searchParams.get("sort") as "trending" | "newest") ?? "trending";
    const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const tag = searchParams.get("tag") ?? undefined;
    const q = searchParams.get("q")?.slice(0, 200) || undefined;

    const result = await communityService.listPosts(sort, page, tag, session?.user.id, q);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createPostSchema.parse(body);
    const post = await communityService.createPost(session.user.id, data);
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
