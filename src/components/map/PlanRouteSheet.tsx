"use client"
import { useState, useRef, useEffect } from "react"
import { useJsApiLoader } from "@react-google-maps/api"
import { X, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { buildOfflineNavCache, saveOfflineNavCache } from "@/lib/navCacheDb"
import type { OfflineNavCache, PlannedStop } from "@/types"

const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"]

interface Props {
  tripId: string
  currentPosition: { lat: number; lng: number }
  onActivate: (cache: OfflineNavCache) => void
  onClose: () => void
}

interface Suggestion {
  placeId: string
  name: string
  description: string
}

export function PlanRouteSheet({ tripId, currentPosition, onActivate, onClose }: Props) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selected, setSelected] = useState<{ placeId: string; name: string } | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSetting, setIsSetting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
  })

  useEffect(() => {
    if (isLoaded && !autocompleteRef.current) {
      autocompleteRef.current = new google.maps.places.AutocompleteService()
    }
  }, [isLoaded])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  function handleQueryChange(value: string) {
    setQuery(value)
    setSelected(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim() || !autocompleteRef.current) { setSuggestions([]); return }

    debounceRef.current = setTimeout(() => {
      setIsSearching(true)
      autocompleteRef.current!.getPlacePredictions(
        { input: value, componentRestrictions: { country: "in" } },
        (predictions, status) => {
          setIsSearching(false)
          if (
            status !== google.maps.places.PlacesServiceStatus.OK ||
            !predictions
          ) {
            setSuggestions([])
            return
          }
          setSuggestions(
            predictions.slice(0, 5).map(p => ({
              placeId: p.place_id,
              name: p.structured_formatting.main_text,
              description: p.description,
            }))
          )
        }
      )
    }, 350)
  }

  async function handleSetDestination() {
    if (!selected || !isLoaded) return
    setIsSetting(true)
    try {
      const geocoder = new google.maps.Geocoder()
      const geocodeResult = await new Promise<google.maps.GeocoderResult>(
        (resolve, reject) => {
          geocoder.geocode({ placeId: selected.placeId }, (results, status) => {
            if (status !== google.maps.GeocoderStatus.OK || !results?.[0]) {
              reject(new Error("geocode failed"))
              return
            }
            resolve(results[0])
          })
        }
      )

      const destLoc = geocodeResult.geometry.location
      const origin: PlannedStop = {
        order: 0,
        name: "Current position",
        lat: currentPosition.lat,
        lng: currentPosition.lng,
      }
      const destination: PlannedStop = {
        order: 1,
        name: selected.name,
        lat: destLoc.lat(),
        lng: destLoc.lng(),
      }

      const directionsService = new google.maps.DirectionsService()
      const response = await directionsService.route({
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        travelMode: google.maps.TravelMode.DRIVING,
        region: "in",
      })

      const cache = buildOfflineNavCache(tripId, response, [origin, destination])
      await saveOfflineNavCache(cache)
      onActivate(cache)
      onClose()
    } catch {
      toast.error("Couldn't calculate route. Check your connection and try again.")
    } finally {
      setIsSetting(false)
    }
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-[1200] bg-white rounded-t-2xl shadow-2xl p-4 flex flex-col gap-4 max-h-[80vh]">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Plan Route</h2>
        <button onClick={onClose} aria-label="Close" className="p-1 text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search destination…"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        {isSearching && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>

      {suggestions.length > 0 && !selected && (
        <ul className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                className="w-full text-left px-4 py-3 text-sm hover:bg-orange-50 transition-colors"
                onClick={() => { setSelected(s); setQuery(s.name); setSuggestions([]) }}
              >
                <p className="font-medium text-gray-900 truncate">{s.name}</p>
                <p className="text-xs text-gray-500 truncate">{s.description}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        disabled={!selected || isSetting || !isLoaded}
        onClick={handleSetDestination}
        className="flex items-center justify-center gap-2 w-full py-3 bg-orange-500 disabled:bg-orange-200 text-white font-semibold rounded-xl text-sm transition-colors"
      >
        {isSetting ? <Loader2 size={16} className="animate-spin" /> : null}
        Set Destination
      </button>
    </div>
  )
}
