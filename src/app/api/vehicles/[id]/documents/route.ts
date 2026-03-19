import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { vehicleService } from "@/services/vehicleService";
import { documentService } from "@/services/documentService";
import { handleApiError } from "@/lib/errors";
import { createDocumentSchema } from "@/lib/validations/document";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await vehicleService.getWithAccessCheck(params.id, session.user.id);
    // Full implementation in Story 4.3
    return NextResponse.json([]);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await vehicleService.getWithAccessCheck(params.id, session.user.id);
    const body = await req.json();
    const data = createDocumentSchema.parse(body);
    const document = await documentService.create(params.id, session.user.id, data);
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
