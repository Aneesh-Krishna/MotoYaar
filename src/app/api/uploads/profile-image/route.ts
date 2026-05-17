import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { putObject } from "@/lib/r2";
import { handleApiError } from "@/lib/errors";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
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
            message: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.",
          },
        },
        { status: 422 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "File too large. Maximum allowed size is 5 MB." } },
        { status: 422 }
      );
    }

    const ext =
      file.type === "image/png" ? "png" :
      file.type === "image/webp" ? "webp" :
      file.type === "image/gif" ? "gif" : "jpg";
    const key = `${session.user.id}/profile/${crypto.randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await putObject(key, buffer, file.type);

    return NextResponse.json({ key });
  } catch (error) {
    return handleApiError(error);
  }
}
