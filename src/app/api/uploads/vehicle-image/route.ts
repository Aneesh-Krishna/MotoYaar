import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { generateUploadUrl, deleteObject } from "@/lib/r2";
import { handleApiError } from "@/lib/errors";
import path from "path";
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
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
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid file type. Only JPEG, PNG, and WebP are allowed.",
          },
        },
        { status: 422 }
      );
    }

    const ext = path.extname(String(filename ?? "upload")).slice(0, MAX_FILENAME_LENGTH) || ".jpg";
    const safeName = `${crypto.randomUUID()}${ext}`;
    const key = `${session.user.id}/vehicles/images/${safeName}`;
    const uploadUrl = await generateUploadUrl(key, contentType);
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ uploadUrl, key, publicUrl });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "key is required" } },
        { status: 422 }
      );
    }

    // Ensure user can only delete their own objects
    if (!key.startsWith(`${session.user.id}/`)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden" } },
        { status: 403 }
      );
    }

    await deleteObject(key);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
