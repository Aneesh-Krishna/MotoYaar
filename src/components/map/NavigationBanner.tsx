"use client"
import { Loader2, Volume2, VolumeX } from "lucide-react"
import type { RouteInstruction } from "@/types"

const manoeuvreIcons: Record<string, string> = {
  "turn-left": "↰",
  "turn-right": "↱",
  "straight": "↑",
  "bear-left": "↖",
  "bear-right": "↗",
  "u-turn": "↩",
  "arrive": "📍",
}

function formatDistanceLabel(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`
  return `${metres} m`
}

interface NavigationBannerProps {
  instruction: RouteInstruction | null
  distanceToNext: number
  isRerouting: boolean
  isOffRoute: boolean
  rerouteFailed: boolean
  isMuted: boolean
  onToggleMute: () => void
  isOnline: boolean
}

export function NavigationBanner({
  instruction,
  distanceToNext,
  isRerouting,
  isOffRoute,
  rerouteFailed,
  isMuted,
  onToggleMute,
  isOnline,
}: NavigationBannerProps) {
  const showRerouting = isRerouting || (isOffRoute && !rerouteFailed && isOnline)
  const showOfflineOffRoute = isOffRoute && !isRerouting && !isOnline
  const showRouteUnavailable = rerouteFailed && !showOfflineOffRoute

  return (
    <div className="absolute top-0 left-0 right-0 z-[1100] bg-gray-900 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
      {showRerouting ? (
        <>
          <Loader2 size={20} className="animate-spin flex-shrink-0 text-orange-400" />
          <span className="flex-1 text-sm font-semibold">Re-routing…</span>
        </>
      ) : showOfflineOffRoute ? (
        <>
          <span className="text-lg flex-shrink-0">⚠️</span>
          <span className="flex-1 text-sm font-semibold">Off route — re-routing unavailable offline. Return to your planned route to resume guidance.</span>
        </>
      ) : showRouteUnavailable ? (
        <>
          <span className="text-lg flex-shrink-0">⚠️</span>
          <span className="flex-1 text-sm font-semibold">Route unavailable — continue to destination manually</span>
        </>
      ) : instruction ? (
        <>
          <span className="text-2xl flex-shrink-0" aria-hidden>
            {manoeuvreIcons[instruction.manoeuvre] ?? "↑"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold leading-tight">
              {formatDistanceLabel(distanceToNext)}
            </p>
            {instruction.streetName && (
              <p className="text-xs text-gray-300 truncate">{instruction.streetName}</p>
            )}
          </div>
        </>
      ) : (
        <span className="flex-1 text-sm text-gray-400">Calculating…</span>
      )}

      <button
        onClick={onToggleMute}
        aria-label={isMuted ? "Unmute voice navigation" : "Mute voice navigation"}
        className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/10 transition-colors"
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  )
}
