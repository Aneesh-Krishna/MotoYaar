"use client"
import { useState, useRef, useCallback } from "react"
import { useMappls } from "@/hooks/useMappls"
import type { PlannedStop } from "@/types"

export interface PlaceResult {
  id: string
  name: string
  address: string
  lat: number
  lng: number
}

export interface RouteLeg {
  fromName: string
  toName: string
  distanceKm: number
  durationMin: number
}

export interface RouteResult {
  geometry: Array<{ lat: number; lng: number }>
  legs: RouteLeg[]
  totalDistanceKm: number
  totalDurationMin: number
  rawData: any
}

export const MAX_STOPS = 8

async function fetchPlaces(query: string): Promise<PlaceResult[]> {
  return new Promise((resolve) => {
    const sdk = (window as any).mappls
    if (!sdk?.search) { resolve([]); return }

    try {
      sdk.search(
        { keywords: query, region: "IND" },
        (data: any) => {
          if (!Array.isArray(data)) { resolve([]); return }
          resolve(
            data.map((loc: any) => ({
              id: loc.eLoc ?? loc.placeName,
              name: loc.placeName ?? "",
              address: loc.placeAddress ?? "",
              lat: parseFloat(loc.latitude ?? "0"),
              lng: parseFloat(loc.longitude ?? "0"),
            }))
          )
        }
      )
    } catch {
      resolve([])
    }
  })
}

const INITIAL_STOPS: PlannedStop[] = [
  { order: 0, name: "My Location", lat: 0, lng: 0 },
  { order: 1, name: "", lat: 0, lng: 0 },
]

export function useRoutePlanning() {
  const { isReady, mappls } = useMappls()

  const [stops, setStops] = useState<PlannedStop[]>(INITIAL_STOPS)
  const [stopResults, setStopResults] = useState<PlaceResult[][]>([[], []])
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null)
  const [routeError, setRouteError] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [avoidTolls, setAvoidTollsState] = useState(false)
  const [avoidHighways, setAvoidHighwaysState] = useState(false)

  // Stable refs so async callbacks always see current values
  const stopsRef = useRef<PlannedStop[]>(INITIAL_STOPS)
  const avoidTollsRef = useRef(false)
  const avoidHighwaysRef = useRef(false)
  const mapplsRef = useRef<any>(null)
  const searchTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const calcIdRef = useRef(0)

  if (isReady && mappls) mapplsRef.current = mappls

  const calculateRoute = useCallback(async (
    currentStops: PlannedStop[],
    tolls: boolean,
    highways: boolean,
  ) => {
    const validStops = currentStops.filter(s => s.lat !== 0 || s.lng !== 0)
    if (validStops.length < 2) {
      setRouteResult(null)
      setRouteError(false)
      return
    }

    const sdk = mapplsRef.current
    if (!sdk) return

    const thisCalcId = ++calcIdRef.current
    setCalculating(true)
    setRouteError(false)

    try {
      const result = await new Promise<RouteResult>((resolve, reject) => {
        sdk.direction(
          {
            origin: `${validStops[0].lat},${validStops[0].lng}`,
            destination: `${validStops[validStops.length - 1].lat},${validStops[validStops.length - 1].lng}`,
            waypoints: validStops.slice(1, -1).map(s => `${s.lat},${s.lng}`).join(";"),
            rtype: 1,
            region: "IND",
            avoidTolls: tolls,
            avoidHighways: highways,
          },
          (data: any) => {
            if (!data?.routes?.[0]) { reject(new Error("no route")); return }

            const route = data.routes[0]
            const geometry = (route.geometry?.coordinates ?? []).map(
              ([lng, lat]: number[]) => ({ lat, lng })
            )

            const legs: RouteLeg[] = (route.legs ?? []).map((leg: any, i: number) => ({
              fromName: validStops[i]?.name ?? `Stop ${i + 1}`,
              toName: validStops[i + 1]?.name ?? `Stop ${i + 2}`,
              distanceKm: Math.round((leg.distance / 1000) * 10) / 10,
              durationMin: Math.round(leg.duration / 60),
            }))

            resolve({
              geometry,
              legs,
              totalDistanceKm: Math.round(legs.reduce((s, l) => s + l.distanceKm, 0) * 10) / 10,
              totalDurationMin: legs.reduce((s, l) => s + l.durationMin, 0),
              rawData: data,
            })
          }
        )
      })
      if (calcIdRef.current !== thisCalcId) return // stale — a newer calc already fired
      setRouteResult(result)
    } catch {
      if (calcIdRef.current === thisCalcId) {
        setRouteError(true)
        setRouteResult(null)
      }
    } finally {
      if (calcIdRef.current === thisCalcId) setCalculating(false)
    }
  }, [])

  const scheduleRouteCalc = useCallback(() => {
    if (routeTimerRef.current) clearTimeout(routeTimerRef.current)
    routeTimerRef.current = setTimeout(() => {
      calculateRoute(stopsRef.current, avoidTollsRef.current, avoidHighwaysRef.current)
    }, 500)
  }, [calculateRoute])

  const updateStopsState = useCallback((updater: (prev: PlannedStop[]) => PlannedStop[]) => {
    setStops(prev => {
      const next = updater(prev)
      stopsRef.current = next
      return next
    })
  }, [])

  const setOriginFromGps = useCallback((lat: number, lng: number) => {
    updateStopsState(prev =>
      prev.map((s, i) => (i === 0 ? { ...s, lat, lng } : s))
    )
    scheduleRouteCalc()
  }, [updateStopsState, scheduleRouteCalc])

  const searchStop = useCallback((index: number, query: string) => {
    const existing = searchTimers.current.get(index)
    if (existing) clearTimeout(existing)

    if (query.length < 2) {
      setStopResults(prev => { const n = [...prev]; n[index] = []; return n })
      return
    }

    const timer = setTimeout(async () => {
      const results = await fetchPlaces(query)
      setStopResults(prev => { const n = [...prev]; n[index] = results; return n })
    }, 300)
    searchTimers.current.set(index, timer)
  }, [])

  const clearResults = useCallback((index: number) => {
    setStopResults(prev => { const n = [...prev]; n[index] = []; return n })
  }, [])

  const selectStop = useCallback((index: number, place: PlaceResult) => {
    updateStopsState(prev =>
      prev.map((s, i) => (i === index ? { ...s, name: place.name, lat: place.lat, lng: place.lng } : s))
    )
    clearResults(index)
    scheduleRouteCalc()
  }, [updateStopsState, clearResults, scheduleRouteCalc])

  const addStop = useCallback(() => {
    updateStopsState(prev => {
      if (prev.length >= MAX_STOPS) return prev
      return [...prev, { order: prev.length, name: "", lat: 0, lng: 0 }]
    })
    setStopResults(prev => [...prev, []])
  }, [updateStopsState])

  const removeStop = useCallback((index: number) => {
    updateStopsState(prev =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }))
    )
    setStopResults(prev => prev.filter((_, i) => i !== index))
    scheduleRouteCalc()
  }, [updateStopsState, scheduleRouteCalc])

  const reorderStops = useCallback((fromIndex: number, toIndex: number) => {
    updateStopsState(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next.map((s, i) => ({ ...s, order: i }))
    })
    setStopResults(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
    scheduleRouteCalc()
  }, [updateStopsState, scheduleRouteCalc])

  const setAvoidTolls = useCallback((v: boolean) => {
    avoidTollsRef.current = v
    setAvoidTollsState(v)
    scheduleRouteCalc()
  }, [scheduleRouteCalc])

  const setAvoidHighways = useCallback((v: boolean) => {
    avoidHighwaysRef.current = v
    setAvoidHighwaysState(v)
    scheduleRouteCalc()
  }, [scheduleRouteCalc])

  return {
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
  }
}
