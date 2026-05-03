"use client"
// TODO (Story 13.4): Implement full Mappls bbox selector replacing this stub.
// Use MapplsMap from @/components/map/MapplsMap with Mappls tile domain; zoom cap 15.
import type { BoundingBox } from "@/utils/tiles"

interface BboxSelectorMapProps {
  onBboxChange: (bbox: BoundingBox | null) => void
}

export default function BboxSelectorMap({ onBboxChange: _onBboxChange }: BboxSelectorMapProps) {
  return (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
      <p className="text-sm text-gray-500">Map (Mappls) coming in Story 13.4</p>
    </div>
  )
}
