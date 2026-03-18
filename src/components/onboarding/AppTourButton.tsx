"use client";

import { useState } from "react";
import WalkthroughModal from "@/components/onboarding/WalkthroughModal";

export function AppTourButton() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-primary hover:underline"
      >
        App tour
      </button>
      {open && (
        <WalkthroughModal
          onComplete={close}
          onSkip={close}
          skipSave={true}
        />
      )}
    </>
  );
}
