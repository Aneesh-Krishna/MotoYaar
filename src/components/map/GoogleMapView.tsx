"use client"
// SSR constraint: always load via next/dynamic({ ssr: false }) — never statically import in a server component.
// Usage: const GoogleMapView = dynamic(() => import("@/components/map/GoogleMapView"), { ssr: false })
import { useRef, useCallback } from "react"
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api"

const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"]
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 }

interface GoogleMapViewProps {
  className?: string
  center?: { lat: number; lng: number }
  zoom?: number
  onMapReady?: (map: google.maps.Map) => void
}

export default function GoogleMapView({
  className = "",
  center,
  zoom = 13,
  onMapReady,
}: GoogleMapViewProps) {
  const mapRef = useRef<google.maps.Map | null>(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
  })

  const handleLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map
      onMapReady?.(map)
    },
    [onMapReady]
  )

  if (!isLoaded) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <p className="text-sm text-gray-500">Loading map…</p>
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerClassName={`w-full h-full ${className}`}
      center={center ?? DEFAULT_CENTER}
      zoom={zoom}
      onLoad={handleLoad}
      options={{
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: "greedy",
        styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
      }}
    />
  )
}
