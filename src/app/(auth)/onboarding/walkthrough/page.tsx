"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import WalkthroughModal from "@/components/onboarding/WalkthroughModal";

export default function WalkthroughPage() {
  const router = useRouter();
  const { update } = useSession();
  const [saving, setSaving] = useState(false);

  const handleAction = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walkthroughSeen: true }),
      });
      if (res.ok) {
        await update(); // QA-2.3-05: keep JWT session in sync for Story 2.4
      } else {
        console.error("[walkthrough] Failed to mark walkthrough seen:", res.status);
      }
    } catch (err) {
      console.error("[walkthrough] Network error marking walkthrough seen:", err);
    } finally {
      setSaving(false);
      router.push("/");
    }
  };

  return <WalkthroughModal onComplete={handleAction} onSkip={handleAction} disabled={saving} />;
}
