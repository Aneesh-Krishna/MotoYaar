"use client"
import { useState, useRef, useEffect } from "react"
import { X, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { buildOfflineNavCache, saveOfflineNavCache } from "@/lib/navCacheDb"
import type { OfflineNavCache, PlannedStop } from "@/types"

interface Props {
  tripId: string
  currentPosition: { lat: number; lng: number }
  onActivate: (cache: OfflineNavCache) => void
  onClose: () => void
}

export function PlanRouteSheet({ tripId, currentPosition, onActivate, onClose }: Props) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<PlannedStop[]>([])
  const [selected, setSelected] = useState<PlannedStop | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSetting, setIsSetting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  function handleQueryChange(value: string) {
    setQuery(value)
    setSelected(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setSuggestions([]); return }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const sdk = (window as any).mappls
        if (!sdk) return
        await new Promise<void>((resolve, reject) => {
          sdk.search(
            { query: value, region: "IND" },
            (results: any[]) => {
              if (!results?.length) { setSuggestions([]); resolve(); return }
              setSuggestions(
                results.slice(0, 5).map((r: any, i: number) => ({
                  order: i + 1,
                  name: r.placeName ?? r.placeAddress ?? value,
                  lat: r.latitude ?? r.lat ?? 0,
                  lng: r.longitude ?? r.lng ?? 0,
                }))
              )
              resolve()
            },
            reject
          )
        })
      } catch {
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 350)
  }

  async function handleSetDestination() {
    if (!selected) return
    setIsSetting(true)
    try {
      const sdk = (window as any).mappls
      if (!sdk) { toast.error("Map SDK not ready."); return }

      const origin: PlannedStop = {
        order: 0,
        name: "Current position",
        lat: currentPosition.lat,
        lng: currentPosition.lng,
      }
      const destination: PlannedStop = { ...selected, order: 1 }
      const stops = [origin, destination]

      const routeData = await new Promise<any>((resolve, reject) => {
        sdk.direction(
          {
            origin: `${origin.lat},${origin.lng}`,
            destination: `${destination.lat},${destination.lng}`,
            rtype: 1,
            region: "IND",
          },
          (data: any) => {
            if (!data?.routes?.[0]) { reject(new Error("no route")); return }
            resolve(data)
          }
        )
      })

      const cache = buildOfflineNavCache(tripId, routeData, stops)
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
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                className="w-full text-left px-4 py-3 text-sm hover:bg-orange-50 transition-colors"
                onClick={() => { setSelected(s); setQuery(s.name); setSuggestions([]) }}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        disabled={!selected || isSetting}
        onClick={handleSetDestination}
        className="flex items-center justify-center gap-2 w-full py-3 bg-orange-500 disabled:bg-orange-200 text-white font-semibold rounded-xl text-sm transition-colors"
      >
        {isSetting ? <Loader2 size={16} className="animate-spin" /> : null}
        Set Destination
      </button>
    </div>
  )
}
