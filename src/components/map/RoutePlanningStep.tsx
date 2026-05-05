"use client"
import { useEffect, useRef } from "react"
import { GoogleMap, Polyline } from "@react-google-maps/api"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { AlertTriangle, ChevronLeft, Loader2, Plus } from "lucide-react"
import { StopListItem } from "@/components/map/StopListItem"
import { useRoutePlanning, MAX_STOPS } from "@/hooks/useRoutePlanning"
import { useGoogleMapsLoaded } from "@/lib/googleMapsLoader"
import type { PlannedStop } from "@/types"

interface Props {
  tripId: string
  saving: boolean
  onStartTrip: (stops: PlannedStop[], routeData: google.maps.DirectionsResult) => void
  onSkip: () => void
  onBack: () => void
}

function formatDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}:${String(m).padStart(2, "0")}`
}

export function RoutePlanningStep({ tripId: _tripId, saving, onStartTrip, onSkip, onBack }: Props) {
  const {
    stops,
    stopResults,
    routeResult,
    routeError,
    calculating,
    avoidTolls,
    avoidHighways,
    setAvoidTolls,
    setAvoidHighways,
    searchStop,
    clearResults,
    selectStop,
    setOriginFromGps,
    addStop,
    removeStop,
    reorderStops,
  } = useRoutePlanning()

  const mapRef = useRef<google.maps.Map | null>(null)
  const dragIndexRef = useRef<number | null>(null)
  const isLoaded = useGoogleMapsLoaded()

  // GPS auto-populate origin
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setOriginFromGps(pos.coords.latitude, pos.coords.longitude),
      () => { /* Keep "My Location" with lat:0,lng:0 — user can manually search */ }
    )
  }, [setOriginFromGps])

  // Fit map to route when route updates
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !routeResult || routeResult.geometry.length < 2) return
    const bounds = new google.maps.LatLngBounds()
    routeResult.geometry.forEach(p => bounds.extend(p))
    mapRef.current.fitBounds(bounds, 24)
  }, [isLoaded, routeResult])

  function handleDragStart(index: number) {
    if (index === 0) return
    dragIndexRef.current = index
  }

  function handleDragOver(index: number) { void index }

  function handleDrop(toIndex: number) {
    const fromIndex = dragIndexRef.current
    if (fromIndex === null || fromIndex === toIndex) return
    reorderStops(fromIndex, toIndex)
    dragIndexRef.current = null
  }

  const hasValidRoute = routeResult !== null
  const hasDestination = stops.some(s => s.order > 0 && (s.lat !== 0 || s.lng !== 0))
  const canStart = hasValidRoute && !routeError && !calculating

  const mapCenter = routeResult?.geometry[0] ?? { lat: 28.6139, lng: 77.209 }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <DialogPrimitive.Title className="sr-only">Plan your route</DialogPrimitive.Title>

      {/* Header */}
      <div className="flex items-center gap-2 px-5 pb-3">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-full text-gray-400 hover:bg-gray-100"
          aria-label="Back"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-900" aria-hidden>Plan your route</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
        {/* Stop list */}
        <div className="space-y-2">
          {stops.map((stop, index) => (
            <StopListItem
              key={stop.order}
              stop={stop}
              index={index}
              isOrigin={index === 0}
              searchResults={stopResults[index] ?? []}
              onSearch={searchStop}
              onSelect={selectStop}
              onRemove={removeStop}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClearResults={clearResults}
            />
          ))}
        </div>

        {/* Add stop */}
        {stops.length < MAX_STOPS && (
          <button
            onClick={addStop}
            className="flex items-center gap-1.5 text-sm text-orange-500 font-medium hover:text-orange-600"
          >
            <Plus size={16} />
            Add stop
          </button>
        )}

        {/* Route toggles */}
        <div className="flex gap-3 pt-1">
          {[
            { label: "Avoid tolls", value: avoidTolls, setter: setAvoidTolls },
            { label: "Avoid highways", value: avoidHighways, setter: setAvoidHighways },
          ].map(({ label, value, setter }) => (
            <button
              key={label}
              onClick={() => setter(!value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                value
                  ? "border-orange-400 bg-orange-50 text-orange-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Route error */}
        {routeError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            Couldn&apos;t calculate route. Check your stops or try again.
          </div>
        )}

        {/* Map preview */}
        {hasDestination && isLoaded && (
          <div className="h-40 rounded-xl overflow-hidden border border-gray-200 relative">
            <GoogleMap
              mapContainerClassName="w-full h-full"
              center={mapCenter}
              zoom={11}
              onLoad={map => { mapRef.current = map }}
              options={{
                disableDefaultUI: true,
                gestureHandling: "none",
                styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
              }}
            >
              {routeResult && routeResult.geometry.length >= 2 && (
                <Polyline
                  path={routeResult.geometry}
                  options={{ strokeColor: "#f97316", strokeWeight: 4, strokeOpacity: 0.85 }}
                />
              )}
            </GoogleMap>
            {calculating && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                <Loader2 size={20} className="animate-spin text-orange-500" />
              </div>
            )}
          </div>
        )}

        {/* Route summary */}
        {routeResult && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="flex justify-between text-sm font-semibold text-gray-900">
              <span>{routeResult.totalDistanceKm} km</span>
              <span>{formatDuration(routeResult.totalDurationMin)}</span>
            </div>
            <div className="space-y-1">
              {routeResult.legs.map((leg, i) => (
                <p key={i} className="text-xs text-gray-600">
                  {leg.fromName} → {leg.toName}: {leg.distanceKm} km · {leg.durationMin} min
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CTAs */}
      <div className="px-5 pb-6 pt-2 space-y-2">
        <button
          onClick={() => routeResult && onStartTrip(stops, routeResult.rawData)}
          disabled={!canStart || saving}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white rounded-full h-12 font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : null}
          {saving ? "Saving…" : "Start Trip"}
        </button>
        <button
          onClick={onSkip}
          disabled={saving}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-1"
        >
          Skip — just track GPS
        </button>
      </div>
    </div>
  )
}
