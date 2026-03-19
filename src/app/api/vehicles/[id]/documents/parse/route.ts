import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { vehicleService } from "@/services/vehicleService";
import { storageService } from "@/services/storageService";
import { parseDocument } from "@/lib/anthropic";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Verify vehicle access
    await vehicleService.getWithAccessCheck(params.id, session.user.id);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docType = formData.get("type") as string | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Server-side file size validation (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Upload to R2 as a temp file
    const ext = file.type.includes("png") ? "png" : "jpg";
    const tempKey = `${session.user.id}/documents/temp/${crypto.randomUUID()}.${ext}`;
    const fileBuffer = await file.arrayBuffer();
    await storageService.uploadFile(tempKey, Buffer.from(fileBuffer), file.type);

    // Call Claude API to extract expiry date
    const result = await parseDocument(fileBuffer, file.type);

    return NextResponse.json({
      extractedExpiryDate: result.expiryDate ?? null,
      documentType: docType,
      confidence: result.confidence,
      parseStatus: result.expiryDate ? "parsed" : "failed",
      tempR2Key: tempKey,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
