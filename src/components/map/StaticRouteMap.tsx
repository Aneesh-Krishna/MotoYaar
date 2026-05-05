"use client"
import { useEffect, useRef } from "react"
import { GoogleMap, Polyline } from "@react-google-maps/api"
import { useGoogleMapsLoaded } from "@/lib/googleMapsLoader"
import type { Waypoint } from "@/types"

interface StaticRouteMapProps {
  waypoints: Waypoint[]
}

export default function StaticRouteMap({ waypoints }: StaticRouteMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const isLoaded = useGoogleMapsLoaded()

  const center = waypoints.length
    ? waypoints[Math.floor(waypoints.length / 2)]
    : { lat: 28.6139, lng: 77.209 }

  useEffect(() => {
    if (!isLoaded || !mapRef.current || waypoints.length < 2) return
    const bounds = new google.maps.LatLngBounds()
    waypoints.forEach(w => bounds.extend({ lat: w.lat, lng: w.lng }))
    mapRef.current.fitBounds(bounds, 40)
  }, [isLoaded, waypoints])

  if (!waypoints.length) {
    return (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-500">No route data</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading map…</p>
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={center}
      zoom={13}
      onLoad={map => { mapRef.current = map }}
      options={{
        disableDefaultUI: true,
        gestureHandling: "none",
        styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
      }}
    >
      <Polyline
        path={waypoints.map(w => ({ lat: w.lat, lng: w.lng }))}
        options={{
          strokeColor: "#F97316",
          strokeOpacity: 0.85,
          strokeWeight: 4,
        }}
      />
    </GoogleMap>
  )
}
