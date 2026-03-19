import { apiRequest } from "@/lib/api-client";
import type { Document } from "@/types";
import type { UpdateDocumentInput } from "@/lib/validations/document";

export async function listDocuments(vehicleId: string): Promise<Document[]> {
  return apiRequest<Document[]>(`/vehicles/${vehicleId}/documents`);
}

export async function getSignedUrl(docId: string): Promise<{ signedUrl: string }> {
  return apiRequest<{ signedUrl: string }>(`/documents/${docId}/url`);
}

export async function updateDocument(id: string, data: UpdateDocumentInput): Promise<Document> {
  return apiRequest<Document>(`/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteDocument(id: string): Promise<void> {
  return apiRequest<void>(`/documents/${id}`, { method: "DELETE" });
}
