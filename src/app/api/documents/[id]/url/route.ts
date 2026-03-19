import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateAccessUrl } from "@/lib/r2";
import { handleApiError, ForbiddenError, NotFoundError } from "@/lib/errors";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, params.id),
    });

    if (!doc) throw new NotFoundError("Document not found");
    // Owner-only: signed URLs are restricted to the document owner.
    // Shared vehicle viewers (vehicleAccess) cannot retrieve stored files by design —
    // storage is a per-user preference and files are keyed under the owner's namespace.
    // Revisit if shared-viewer file access is added in a future story.
    if (doc.userId !== session.user.id) throw new ForbiddenError("Access denied");
    if (!doc.storageUrl) {
      return NextResponse.json({ error: "No file stored for this document" }, { status: 404 });
    }

    const signedUrl = await generateAccessUrl(doc.storageUrl);
    return NextResponse.json({ signedUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
