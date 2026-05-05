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
  const onMapReadyRef = useRef(onMapReady)
  onMapReadyRef.current = onMapReady

  const { isReady, mappls } = useMappls()

  useEffect(() => {
    if (!isReady || !mappls || !containerRef.current || mapRef.current) return

    const map = new mappls.Map(containerRef.current, {
      center: center ? [center.lat, center.lng] : [28.6139, 77.2090],
      zoom,
      search: false,
    })

    mapRef.current = map

    map.on("load", () => {
      map.resize?.()
      onMapReadyRef.current?.(map)
    })

    // ResizeObserver keeps the map filling its container as layout changes
    // (e.g. bottom sheets animating in, flex containers resolving size)
    const ro = new ResizeObserver(() => {
      map.resize?.()
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      map.remove?.()
      mapRef.current = null
    }
  }, [isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync center prop changes after the map is initialized
  useEffect(() => {
    if (!mapRef.current || !center) return
    try {
      mapRef.current.setCenter([center.lat, center.lng])
    } catch {
      // ignore if map not ready
    }
  }, [center?.lat, center?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div id={mapId} ref={containerRef} className={`w-full h-full ${className}`} />
}
