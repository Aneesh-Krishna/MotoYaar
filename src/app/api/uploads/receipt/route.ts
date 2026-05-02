import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { generateUploadUrl } from "@/lib/r2";
import { handleApiError } from "@/lib/errors";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { filename: _filename, contentType } = await req.json();

    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "Invalid file type. Only JPG, PNG, and PDF allowed." }, { status: 400 });
    }

    const ext =
      contentType === "application/pdf" ? "pdf" : contentType === "image/png" ? "png" : "jpg";
    const tempKey = `${session.user.id}/receipts/temp/${crypto.randomUUID()}.${ext}`;

    const uploadUrl = await generateUploadUrl(tempKey, contentType, 5 * 60); // 5-min TTL

    return NextResponse.json({ uploadUrl, tempKey });
  } catch (error) {
    return handleApiError(error);
  }
}
