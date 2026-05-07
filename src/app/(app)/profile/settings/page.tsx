import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { userService } from "@/services/userService";
import { SettingsView } from "@/components/settings/SettingsView";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await userService.getById(session.user.id);

  return (
    <SettingsView
      initialCurrency={user.currency ?? "INR"}
      initialNotificationWindowDays={user.notificationWindowDays ?? 30}
      initialEmailNotificationsEnabled={user.emailNotificationsEnabled ?? true}
      initialDocumentStoragePreference={
        (user.documentStoragePreference as "parse_only" | "full_storage") ?? "parse_only"
      }
      initialHistoryOptOut={user.historyOptOut ?? false}
    />
  );
}
