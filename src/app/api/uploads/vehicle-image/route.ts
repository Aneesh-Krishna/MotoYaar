import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { putObject, deleteObject } from "@/lib/r2";
import { handleApiError } from "@/lib/errors";
import path from "path";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const r2PublicUrl = process.env.R2_PUBLIC_URL;
    if (!r2PublicUrl) {
      console.error("[vehicle-image] R2_PUBLIC_URL env var is not set");
      return NextResponse.json(
        { error: { code: "CONFIGURATION_ERROR", message: "Storage is not configured" } },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "file is required" } },
        { status: 422 }
      );
    }

    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
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

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Image must be under 5 MB." } },
        { status: 422 }
      );
    }

    const ext = path.extname(file.name).slice(0, 10) || ".jpg";
    const safeName = `${crypto.randomUUID()}${ext}`;
    const key = `${session.user.id}/vehicles/images/${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`[vehicle-image] uploading ${key} (${buffer.byteLength} bytes, ${file.type})`);
    await putObject(key, buffer, file.type);
    console.log(`[vehicle-image] upload succeeded: ${key}`);

    const publicUrl = `${r2PublicUrl}/${key}`;
    return NextResponse.json({ key, publicUrl });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
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
