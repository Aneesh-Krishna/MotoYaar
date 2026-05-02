import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { generateUploadUrl } from "@/lib/r2";
import { handleApiError } from "@/lib/errors";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { contentType, size } = await req.json();

    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG and PNG are allowed." },
        { status: 400 }
      );
    }

    if (!size || typeof size !== "number" || size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 5 MB limit." },
        { status: 400 }
      );
    }

    const ext = contentType === "image/png" ? "png" : "jpg";
    const safeFilename = `${crypto.randomUUID()}.${ext}`;

    const key = `${session.user.id}/posts/${crypto.randomUUID()}/${safeFilename}`;
    const uploadUrl = await generateUploadUrl(key, contentType, 5 * 60); // 5-min TTL

    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    return handleApiError(error);
  }
}
