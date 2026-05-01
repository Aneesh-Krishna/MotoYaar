"use client";

import { useState } from "react";
import { StartLiveTripSheet } from "@/components/map/StartLiveTripSheet";

export function StartLiveTripSheetWrapper() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Start a live trip"
        className="fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+5rem)] z-30 lg:hidden
                   w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg
                   flex items-center justify-center
                   hover:bg-orange-600 transition-colors
                   focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
          <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
          <circle cx="12" cy="12" r="2" />
          <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
          <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
        </svg>
      </button>

      <StartLiveTripSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
