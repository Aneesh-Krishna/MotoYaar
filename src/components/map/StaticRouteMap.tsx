"use client"
// TODO (Story 13.5): Implement full Mappls static route map replacing this stub.
// Use MapplsMap from @/components/map/MapplsMap with Mappls tile domain; zoom cap 15.
import type { Waypoint } from "@/types"

export default function StaticRouteMap({ waypoints: _waypoints }: { waypoints: Waypoint[] }) {
  return (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
      <p className="text-sm text-gray-500">Map (Mappls) coming in Story 13.5</p>
    </div>
  )
}
