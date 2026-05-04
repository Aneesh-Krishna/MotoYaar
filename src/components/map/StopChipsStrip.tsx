"use client"
import { useEffect, useRef } from "react"
import type { PlannedStop } from "@/types"

interface StopChipsStripProps {
  stops: PlannedStop[]
  currentStopIndex: number
  distanceToEach: number[]
}

function formatStopDistance(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`
  return `${metres} m`
}

export function StopChipsStrip({ stops, currentStopIndex, distanceToEach }: StopChipsStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll active chip into view when stop index changes
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const chip = container.children[currentStopIndex] as HTMLElement | undefined
    chip?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
  }, [currentStopIndex])

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide"
      aria-label="Route stops"
    >
      {stops.map((stop, i) => {
        const isActive = i === currentStopIndex
        const isArriving = distanceToEach[i] !== undefined && distanceToEach[i] <= 100
        const isPast = i < currentStopIndex

        return (
          <div
            key={stop.order}
            className={[
              "flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              isActive && isArriving
                ? "bg-orange-500 text-white animate-pulse"
                : isActive
                ? "bg-orange-500 text-white"
                : isPast
                ? "bg-gray-200 text-gray-400"
                : "bg-white text-gray-700 border border-gray-200",
            ].join(" ")}
          >
            <span className="max-w-[72px] truncate">{stop.name || `Stop ${i + 1}`}</span>
            {!isPast && distanceToEach[i] !== undefined && (
              <span className={isActive ? "text-orange-100" : "text-gray-400"}>
                {formatStopDistance(distanceToEach[i])}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
