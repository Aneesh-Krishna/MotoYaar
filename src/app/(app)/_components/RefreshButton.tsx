"use client";

import { useRouter } from "next/navigation";

/**
 * Minimum viable pull-to-refresh: a Refresh button that calls router.refresh().
 * Full pull-gesture support (swipe-down) is a follow-up task.
 */
export function RefreshButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.refresh()}
      className="text-xs text-foreground-muted underline"
      aria-label="Refresh dashboard"
    >
      Refresh
    </button>
  );
}
