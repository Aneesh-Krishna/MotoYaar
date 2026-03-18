import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { generateUploadUrl } from "@/lib/r2";
import { handleApiError } from "@/lib/errors";
import path from "path";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILENAME_LENGTH = 100;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const { filename, contentType } = await req.json();

    if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." } },
        { status: 422 }
      );
    }

    // Sanitize filename: strip path separators, limit length
    const safeName = path.basename(String(filename ?? "upload")).slice(0, MAX_FILENAME_LENGTH);
    const key = `${session.user.id}/profile/${safeName}`;
    const uploadUrl = await generateUploadUrl(key, contentType);

    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    return handleApiError(error);
  }
}
