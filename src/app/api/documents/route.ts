import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { documentService } from "@/services/documentService";
import { handleApiError } from "@/lib/errors";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type) {
      const doc = await documentService.getUserDocumentByType(session.user.id, type);
      return NextResponse.json(doc ? [doc] : []);
    }

    const docs = await documentService.listUserDocuments(session.user.id);
    return NextResponse.json(docs);
  } catch (error) {
    return handleApiError(error);
  }
}
