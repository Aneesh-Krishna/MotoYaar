import { apiRequest } from "@/lib/api-client";

export async function updateSettings(data: Partial<{
  documentStoragePreference: "parse_only" | "full_storage";
  notificationWindowDays: number;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
}>): Promise<void> {
  await apiRequest<unknown>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
