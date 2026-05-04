"use client"
import { useEffect, useState } from "react"
import { GripVertical, MapPin, X } from "lucide-react"
import type { PlannedStop } from "@/types"
import type { PlaceResult } from "@/hooks/useRoutePlanning"

interface Props {
  stop: PlannedStop
  index: number
  isOrigin: boolean
  searchResults: PlaceResult[]
  onSearch: (index: number, query: string) => void
  onSelect: (index: number, place: PlaceResult) => void
  onRemove: (index: number) => void
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDrop: (index: number) => void
  onClearResults: (index: number) => void
}

export function StopListItem({
  stop,
  index,
  isOrigin,
  searchResults,
  onSearch,
  onSelect,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onClearResults,
}: Props) {
  const [inputValue, setInputValue] = useState(stop.name)

  // Sync when parent updates the stop name (e.g. GPS auto-populate)
  useEffect(() => {
    setInputValue(stop.name)
  }, [stop.name])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setInputValue(v)
    onSearch(index, v)
  }

  function handleSelect(place: PlaceResult) {
    setInputValue(place.name)
    onSelect(index, place)
  }

  return (
    <div
      className="relative flex items-center gap-2"
      draggable={!isOrigin}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index) }}
      onDrop={(e) => { e.preventDefault(); onDrop(index) }}
    >
      {/* Order badge */}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold flex items-center justify-center">
        {isOrigin ? <MapPin size={12} /> : index}
      </div>

      {/* Input + dropdown */}
      <div className="flex-1 relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onBlur={() => setTimeout(() => onClearResults(index), 150)}
          placeholder={isOrigin ? "My Location" : "Search destination…"}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        {searchResults.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((r) => (
              <li key={r.id}>
                <button
                  onMouseDown={() => handleSelect(r)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50"
                >
                  <p className="font-medium text-gray-900 truncate">{r.name}</p>
                  <p className="text-xs text-gray-500 truncate">{r.address}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Drag handle */}
      <button
        className="flex-shrink-0 text-gray-400 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical size={16} />
      </button>

      {/* Remove — hidden for origin */}
      {!isOrigin && (
        <button
          onClick={() => onRemove(index)}
          aria-label="Remove stop"
          className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
