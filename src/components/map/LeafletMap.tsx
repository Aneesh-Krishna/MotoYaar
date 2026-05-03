"use client"
// TODO (Story 13.3): Implement full Mappls live-trip map replacing this stub.
// Use MapplsMap from @/components/map/MapplsMap with Mappls tile domain; zoom cap 15.
import type { Waypoint } from "@/types"

interface LeafletMapProps {
  waypoints: Waypoint[]
  currentPosition: GeolocationPosition | null
  autoCenter: boolean
  onManualPan: () => void
}

export default function LeafletMap(_props: LeafletMapProps) {
  return (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
      <p className="text-sm text-gray-500">Map (Mappls) coming in Story 13.3</p>
    </div>
  )
}
