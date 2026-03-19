import { apiRequest } from "@/lib/api-client";
import type { Document } from "@/types";

export async function listDocuments(vehicleId: string): Promise<Document[]> {
  return apiRequest<Document[]>(`/vehicles/${vehicleId}/documents`);
}

export async function getSignedUrl(docId: string): Promise<{ signedUrl: string }> {
  return apiRequest<{ signedUrl: string }>(`/documents/${docId}/url`);
}
