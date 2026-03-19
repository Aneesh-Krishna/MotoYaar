import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { userService } from "@/services/userService";
import { DocumentStorageSection } from "@/components/settings/DocumentStorageSection";
import { AppTourButton } from "@/components/onboarding/AppTourButton";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await userService.getById(session.user.id);

  return (
    <main className="px-4 py-6 space-y-8">
      <h1 className="text-xl font-bold">Settings</h1>
      <DocumentStorageSection
        currentPreference={user.documentStoragePreference as "parse_only" | "full_storage"}
      />
      <section>
        <h2 className="text-lg font-semibold mb-3">Help</h2>
        <AppTourButton />
      </section>
    </main>
  );
}
