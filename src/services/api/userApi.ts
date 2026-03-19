import { apiRequest } from "@/lib/api-client";

export async function updateSettings(data: {
  documentStoragePreference: "parse_only" | "full_storage";
}): Promise<void> {
  await apiRequest<unknown>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
