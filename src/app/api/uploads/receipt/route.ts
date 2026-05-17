import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { putObject } from "@/lib/r2";
import { handleApiError } from "@/lib/errors";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, and PDF allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });
    }

    const ext =
      file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
    const tempKey = `${session.user.id}/receipts/temp/${crypto.randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await putObject(tempKey, buffer, file.type);

    return NextResponse.json({ tempKey });
  } catch (error) {
    return handleApiError(error);
  }
}
