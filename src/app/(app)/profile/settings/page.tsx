// Minimal settings page — full implementation in Story 12.4
import { AppTourButton } from "@/components/onboarding/AppTourButton";

export default function SettingsPage() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      {/* Other settings added in Epic 12 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Help</h2>
        <AppTourButton />
      </section>
    </main>
  );
}
