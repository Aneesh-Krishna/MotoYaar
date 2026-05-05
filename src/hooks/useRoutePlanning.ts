"use client"
import { useState, useRef, useCallback } from "react"
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
  rawData: google.maps.DirectionsResult
}

export const MAX_STOPS = 8

async function fetchPlaces(query: string): Promise<PlaceResult[]> {
  return new Promise((resolve) => {
    if (typeof google === "undefined") { resolve([]); return }
    const service = new google.maps.places.AutocompleteService()
    service.getPlacePredictions(
      { input: query, componentRestrictions: { country: "in" } },
      (predictions, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
          resolve([])
          return
        }
        const geocoder = new google.maps.Geocoder()
        Promise.all(
          predictions.slice(0, 5).map(
            (p) =>
              new Promise<PlaceResult | null>((res) => {
                geocoder.geocode({ placeId: p.place_id }, (results, gStatus) => {
                  if (gStatus !== google.maps.GeocoderStatus.OK || !results?.[0]) {
                    res(null)
                    return
                  }
                  const loc = results[0].geometry.location
                  res({
                    id: p.place_id,
                    name: p.structured_formatting.main_text,
                    address: p.description,
                    lat: loc.lat(),
                    lng: loc.lng(),
                  })
                })
              })
          )
        ).then((all) => resolve(all.filter((r): r is PlaceResult => r !== null)))
      }
    )
  })
}

const INITIAL_STOPS: PlannedStop[] = [
  { order: 0, name: "My Location", lat: 0, lng: 0 },
  { order: 1, name: "", lat: 0, lng: 0 },
]

export function useRoutePlanning() {
  const [stops, setStops] = useState<PlannedStop[]>(INITIAL_STOPS)
  const [stopResults, setStopResults] = useState<PlaceResult[][]>([[], []])
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null)
  const [routeError, setRouteError] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [avoidTolls, setAvoidTollsState] = useState(false)
  const [avoidHighways, setAvoidHighwaysState] = useState(false)

  const stopsRef = useRef<PlannedStop[]>(INITIAL_STOPS)
  const avoidTollsRef = useRef(false)
  const avoidHighwaysRef = useRef(false)
  const searchTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const calcIdRef = useRef(0)

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
    if (typeof google === "undefined") return

    const thisCalcId = ++calcIdRef.current
    setCalculating(true)
    setRouteError(false)

    const directionsService = new google.maps.DirectionsService()
    const origin = new google.maps.LatLng(validStops[0].lat, validStops[0].lng)
    const destination = new google.maps.LatLng(
      validStops[validStops.length - 1].lat,
      validStops[validStops.length - 1].lng
    )
    const waypoints = validStops.slice(1, -1).map(s => ({
      location: new google.maps.LatLng(s.lat, s.lng),
      stopover: true,
    }))

    try {
      const response = await directionsService.route({
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        avoidTolls: tolls,
        avoidHighways: highways,
        region: "in",
      })

      if (calcIdRef.current !== thisCalcId) return

      const route = response.routes[0]
      const geometry: Array<{ lat: number; lng: number }> = []
      for (const leg of route.legs) {
        for (const step of leg.steps) {
          const points = step.polyline?.points
          if (points) {
            google.maps.geometry.encoding
              .decodePath(points)
              .forEach(p => geometry.push({ lat: p.lat(), lng: p.lng() }))
          }
        }
      }

      const legs: RouteLeg[] = route.legs.map((leg, i) => ({
        fromName: validStops[i]?.name ?? `Stop ${i + 1}`,
        toName: validStops[i + 1]?.name ?? `Stop ${i + 2}`,
        distanceKm: Math.round((leg.distance!.value / 1000) * 10) / 10,
        durationMin: Math.round(leg.duration!.value / 60),
      }))

      setRouteResult({
        geometry,
        legs,
        totalDistanceKm: Math.round(legs.reduce((s, l) => s + l.distanceKm, 0) * 10) / 10,
        totalDurationMin: legs.reduce((s, l) => s + l.durationMin, 0),
        rawData: response,
      })
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
