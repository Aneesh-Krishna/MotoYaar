import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { storageService } from "@/services/storageService";
import { parseDocument } from "@/lib/anthropic";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const ext = file.type.includes("png") ? "png" : "jpg";
    const tempKey = `${session.user.id}/documents/temp/dl-${crypto.randomUUID()}.${ext}`;
    const fileBuffer = await file.arrayBuffer();
    await storageService.uploadFile(tempKey, Buffer.from(fileBuffer), file.type);

    const result = await parseDocument(fileBuffer, file.type);

    return NextResponse.json({
      extractedExpiryDate: result.expiryDate ?? null,
      documentType: "DL",
      confidence: result.confidence,
      parseStatus: result.expiryDate ? "parsed" : "failed",
      parseReason: result.reason,
      tempR2Key: tempKey,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
