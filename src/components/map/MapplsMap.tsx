"use client"
// SSR constraint: always load via next/dynamic({ ssr: false }) — never statically import in a server component.
// Usage: const MapplsMap = dynamic(() => import("@/components/map/MapplsMap"), { ssr: false })
import { useEffect, useRef } from "react"
import { useMappls } from "@/hooks/useMappls"

interface MapplsMapProps {
  mapId?: string
  className?: string
  center?: { lat: number; lng: number }
  zoom?: number
  onMapReady?: (map: any) => void
}

export default function MapplsMap({
  mapId = "mappls-map",
  className = "",
  center,
  zoom = 13,
  onMapReady,
}: MapplsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const { isReady, mappls } = useMappls()

  useEffect(() => {
    if (!isReady || !mappls || !containerRef.current || mapRef.current) return

    const map = new mappls.Map(containerRef.current, {
      center: center ? [center.lat, center.lng] : [28.6139, 77.2090], // default: Delhi
      zoom,
      search: false,
    })

    mapRef.current = map
    map.on("load", () => onMapReady?.(map))

    return () => {
      map.remove?.()
      mapRef.current = null
    }
  }, [isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div id={mapId} ref={containerRef} className={`w-full h-full ${className}`} />
}
