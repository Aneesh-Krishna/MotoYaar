"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radio, X, AlertTriangle } from "lucide-react";
import { clearLiveTripState } from "@/lib/liveTripDb";
import { apiRequest } from "@/lib/api-client";
import type { LocalLiveTripState, Trip } from "@/types";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export function ResumeTripBanner() {
  const router = useRouter();
  const [resumable, setResumable] = useState<LocalLiveTripState | null>(null);
  const [expired, setExpired] = useState<LocalLiveTripState | null>(null);
  const [tripTitle, setTripTitle] = useState<string | null>(null);

  useEffect(() => {
    async function checkForPausedTrip() {
      try {
        const { getLiveTripDb } = await import("@/lib/liveTripDb");
        const db = await getLiveTripDb();
        const all = await db.getAll("live-trips");
        const paused = all.filter((s) => s.status === "paused");
        if (!paused.length) return;

        const state = paused[0];

        // Fetch trip title for the prompt message (AC16)
        try {
          const trip = await apiRequest<Trip>(`/trips/${state.tripId}`);
          setTripTitle(trip.title);
        } catch {
          // Non-critical — banner still shows without title
        }

        const ageMs = Date.now() - state.startedAt;
        if (ageMs > TWENTY_FOUR_HOURS) {
          setExpired(state);
        } else {
          setResumable(state);
        }
      } catch {
        // IndexedDB unavailable — silently ignore
      }
    }
    checkForPausedTrip();
  }, []);

  async function handleDiscard(state: LocalLiveTripState) {
    await clearLiveTripState(state.tripId);
    setResumable(null);
    setExpired(null);
  }

  function hoursAgo(startedAt: number) {
    const h = Math.floor((Date.now() - startedAt) / 3_600_000);
    return h === 0 ? "less than an hour" : `${h} hour${h !== 1 ? "s" : ""}`;
  }

  if (resumable) {
    return (
      <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
        <div className="flex items-start gap-3">
          <Radio size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {tripTitle
                ? `Resume your trip to ${tripTitle}?`
                : "Resume your trip?"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Started {hoursAgo(resumable.startedAt)} ago.
            </p>
          </div>
          <button
            onClick={() => setResumable(null)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => router.push(`/trips/${resumable.tripId}/live`)}
            className="flex-1 rounded-lg bg-orange-500 text-white text-sm font-medium py-2 hover:bg-orange-600"
          >
            Resume
          </button>
          <button
            onClick={() => handleDiscard(resumable)}
            className="flex-1 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium py-2 hover:bg-gray-50"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              Your trip was paused too long to resume.
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Save what was recorded?
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={async () => {
              // Navigate to trip — the route was already partially synced
              const id = expired.tripId;
              await handleDiscard(expired);
              router.push(`/trips/${id}`);
            }}
            className="flex-1 rounded-lg bg-gray-800 text-white text-sm font-medium py-2 hover:bg-gray-700"
          >
            Save
          </button>
          <button
            onClick={() => handleDiscard(expired)}
            className="flex-1 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium py-2 hover:bg-gray-50"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  return null;
}
