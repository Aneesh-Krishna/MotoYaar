import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { documentService } from "@/services/documentService";
import { updateDocumentSchema } from "@/lib/validations/document";
import { handleApiError } from "@/lib/errors";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = updateDocumentSchema.parse(body);
    const doc = await documentService.update(params.id, session.user.id, data);
    return NextResponse.json(doc);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await documentService.delete(params.id, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
