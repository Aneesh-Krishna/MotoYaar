import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { documentService } from "@/services/documentService";
import { handleApiError } from "@/lib/errors";
import { createDocumentSchema } from "@/lib/validations/document";

export async function GET(_req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const docs = await documentService.listUserDocuments(session.user.id);
    return NextResponse.json(docs);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createDocumentSchema.parse(body);
    const doc = await documentService.createUserDocument(session.user.id, data);
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
