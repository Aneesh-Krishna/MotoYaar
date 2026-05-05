"use client"
import { useEffect, useRef } from "react"
import { useMappls } from "@/hooks/useMappls"
import type { Waypoint } from "@/types"

export default function StaticRouteMap({ waypoints }: { waypoints: Waypoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const { isReady, mappls } = useMappls()

  useEffect(() => {
    if (!isReady || !mappls || !containerRef.current || !waypoints.length) return
    if (mapRef.current) return

    const center = waypoints[Math.floor(waypoints.length / 2)]
    const map = new mappls.Map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 13,
      search: false,
    })
    mapRef.current = map

    map.on("load", () => {
      if (waypoints.length >= 2) {
        try {
          new mappls.Polyline({
            map,
            path: waypoints.map(w => [w.lat, w.lng]),
            strokeColor: "#F97316",
            strokeOpacity: 0.85,
            strokeWeight: 4,
          })
        } catch {
          // Mappls polyline API may vary — skip gracefully
        }
      }

      // Fit bounds to all waypoints
      try {
        const lats = waypoints.map(w => w.lat)
        const lngs = waypoints.map(w => w.lng)
        const bounds = [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ]
        map.fitBounds(bounds, { padding: 40 })
      } catch {
        // fitBounds may not be available in all SDK versions — ignore
      }
    })

    return () => {
      map.remove?.()
      mapRef.current = null
    }
  }, [isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!waypoints.length) {
    return (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-500">No route data</p>
      </div>
    )
  }

  return <div ref={containerRef} className="w-full h-full" />
}
