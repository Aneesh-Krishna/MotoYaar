"use client"
import { useEffect, useRef, useCallback } from "react"
import { useMappls } from "@/hooks/useMappls"
import type { BoundingBox } from "@/utils/tiles"

interface BboxSelectorMapProps {
  onBboxChange: (bbox: BoundingBox | null) => void
}

export default function BboxSelectorMap({ onBboxChange }: BboxSelectorMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const rectangleRef = useRef<any>(null)
  const startLatLngRef = useRef<{ lat: number; lng: number } | null>(null)
  const isDrawingRef = useRef(false)
  const onBboxChangeRef = useRef(onBboxChange)
  onBboxChangeRef.current = onBboxChange

  const { isReady, mappls } = useMappls()

  const clearRect = useCallback(() => {
    if (rectangleRef.current) {
      rectangleRef.current.remove?.()
      rectangleRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isReady || !mappls || !containerRef.current || mapRef.current) return

    const map = new mappls.Map(containerRef.current, {
      center: [20.5937, 78.9629], // India center
      zoom: 5,
      search: false,
    })
    mapRef.current = map

    map.on("load", () => {
      const canvas = map.getCanvas?.() ?? containerRef.current
      if (!canvas) return

      // Disable map drag while the user is drawing a bounding box
      const onMouseDown = (e: MouseEvent) => {
        if (!e.shiftKey) return
        e.preventDefault()
        isDrawingRef.current = true
        clearRect()
        onBboxChangeRef.current(null)

        // Convert pixel → lat/lng
        const point = map.unproject?.([e.offsetX, e.offsetY])
        if (!point) return
        startLatLngRef.current = { lat: point.lat, lng: point.lng }
        map.dragPan?.disable?.()
      }

      const onMouseMove = (e: MouseEvent) => {
        if (!isDrawingRef.current || !startLatLngRef.current) return
        const point = map.unproject?.([e.offsetX, e.offsetY])
        if (!point) return

        const start = startLatLngRef.current
        const bbox: BoundingBox = {
          north: Math.max(start.lat, point.lat),
          south: Math.min(start.lat, point.lat),
          east: Math.max(start.lng, point.lng),
          west: Math.min(start.lng, point.lng),
        }

        clearRect()
        try {
          rectangleRef.current = new mappls.Rectangle({
            map,
            bounds: [[bbox.south, bbox.west], [bbox.north, bbox.east]],
            fillColor: "#F97316",
            fillOpacity: 0.15,
            strokeColor: "#F97316",
            strokeWeight: 2,
          })
        } catch {
          // SDK may use a different API — skip rectangle preview
        }
      }

      const onMouseUp = (e: MouseEvent) => {
        if (!isDrawingRef.current || !startLatLngRef.current) return
        isDrawingRef.current = false
        map.dragPan?.enable?.()

        const point = map.unproject?.([e.offsetX, e.offsetY])
        if (!point) {
          startLatLngRef.current = null
          return
        }

        const start = startLatLngRef.current
        startLatLngRef.current = null

        const bbox: BoundingBox = {
          north: Math.max(start.lat, point.lat),
          south: Math.min(start.lat, point.lat),
          east: Math.max(start.lng, point.lng),
          west: Math.min(start.lng, point.lng),
        }

        // Require at least a small area
        if (Math.abs(bbox.north - bbox.south) < 0.001 || Math.abs(bbox.east - bbox.west) < 0.001) {
          clearRect()
          onBboxChangeRef.current(null)
          return
        }

        onBboxChangeRef.current(bbox)
      }

      canvas.addEventListener("mousedown", onMouseDown)
      canvas.addEventListener("mousemove", onMouseMove)
      canvas.addEventListener("mouseup", onMouseUp)

      map._bboxListenerCleanup = () => {
        canvas.removeEventListener("mousedown", onMouseDown)
        canvas.removeEventListener("mousemove", onMouseMove)
        canvas.removeEventListener("mouseup", onMouseUp)
      }
    })

    return () => {
      map._bboxListenerCleanup?.()
      clearRect()
      map.remove?.()
      mapRef.current = null
    }
  }, [isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative flex-1 min-h-0">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
        <span className="bg-white/90 text-xs text-gray-600 px-3 py-1 rounded-full shadow">
          Hold Shift + drag to select an area
        </span>
      </div>
    </div>
  )
}
