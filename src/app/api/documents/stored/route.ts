import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { documentService } from "@/services/documentService";
import { handleApiError } from "@/lib/errors";

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const count = await documentService.deleteAllStoredFiles(session.user.id);
    return NextResponse.json({ deleted: count });
  } catch (error) {
    return handleApiError(error);
  }
}
