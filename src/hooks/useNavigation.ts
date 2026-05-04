"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { openDB } from "idb"
import { haversineDistance } from "@/utils/geo"
import { announce, buildAnnouncementText, closestPointOnRoute, rerouteFromCurrentPosition, resumeNearestInstruction } from "@/utils/navigation"
import { toast } from "sonner"
import { getLiveTripState } from "@/lib/liveTripDb"
import type { OfflineNavCache, RouteInstruction } from "@/types"

export function useNavigation(
  tripId: string,
  currentPosition: { lat: number; lng: number } | null
) {
  const [cache, setCache] = useState<OfflineNavCache | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [currentStopIndex, setCurrentStopIndex] = useState(0)
  const [distanceToNext, setDistanceToNext] = useState(0)
  const [isOffRoute, setIsOffRoute] = useState(false)
  const [isRerouting, setIsRerouting] = useState(false)
  const [rerouteFailed, setRerouteFailed] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const announcedAt = useRef<Record<string, Set<string>>>({})
  const arrivedAtStop = useRef<Set<number>>(new Set())
  const offRouteTicks = useRef(0)
  const isMutedRef = useRef(false)
  const currentStepIndexRef = useRef(0)
  const currentStopIndexRef = useRef(0)
  const prevIsOffRoute = useRef(false)

  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])
  useEffect(() => { currentStepIndexRef.current = currentStepIndex }, [currentStepIndex])
  useEffect(() => { currentStopIndexRef.current = currentStopIndex }, [currentStopIndex])

  // Load cache from IndexedDB on mount
  useEffect(() => {
    async function load() {
      try {
        const db = await openDB("motoyaar-nav", 1)
        const cached = await db.get("nav-cache", `offline_route:${tripId}`)
        if (cached) {
          setCache(cached)
        } else if (tripId) {
          // Only show the "data cleared" toast on trip resume (pausedAt set), not on fresh navigation-less trips
          const tripState = await getLiveTripState(tripId)
          if (tripState?.pausedAt !== null && tripState?.pausedAt !== undefined) {
            const toastKey = `nav-toast-${tripId}`
            if (!sessionStorage.getItem(toastKey)) {
              sessionStorage.setItem(toastKey, "1")
              toast.warning("Navigation data was cleared — re-routing will resume when you're back online.")
            }
          }
        }
      } catch {
        // No cache — hasNavigation will be false
      }
    }
    load()
  }, [tripId])

  function fireAnnouncement(
    stepIdx: number,
    distance: "300" | "50" | "at",
    instruction: RouteInstruction
  ) {
    if (!announcedAt.current[stepIdx]) {
      announcedAt.current[stepIdx] = new Set()
    }
    if (announcedAt.current[stepIdx].has(distance)) return
    announcedAt.current[stepIdx].add(distance)
    announce(buildAnnouncementText(distance, instruction), isMutedRef.current)
  }

  // Update navigation state on each GPS tick
  useEffect(() => {
    if (!cache || !currentPosition) return

    // Step advancement
    const instruction = cache.instructions[currentStepIndexRef.current]
    if (instruction) {
      const distToTrigger = haversineDistance(currentPosition, {
        lat: instruction.triggerLat,
        lng: instruction.triggerLng,
      })

      setDistanceToNext(Math.round(distToTrigger))

      if (distToTrigger <= 20) {
        fireAnnouncement(currentStepIndexRef.current, "at", instruction)
        setCurrentStepIndex(i => {
          currentStepIndexRef.current = i + 1
          return i + 1
        })
        offRouteTicks.current = 0
      } else {
        if (distToTrigger <= 50) {
          fireAnnouncement(currentStepIndexRef.current, "50", instruction)
        } else if (distToTrigger <= 300) {
          fireAnnouncement(currentStepIndexRef.current, "300", instruction)
        }
      }
    }

    // Stop advancement — tracked independently from step index
    const stops = cache.stops
    const stopIdx = currentStopIndexRef.current
    if (stopIdx < stops.length) {
      const distToStop = haversineDistance(currentPosition, stops[stopIdx])
      if (distToStop <= 100 && !arrivedAtStop.current.has(stopIdx)) {
        arrivedAtStop.current.add(stopIdx)
        announce(`Arriving at ${stops[stopIdx].name}`, isMutedRef.current)
      }
      if (distToStop <= 20 && stopIdx < stops.length - 1) {
        setCurrentStopIndex(i => {
          currentStopIndexRef.current = i + 1
          return i + 1
        })
      }
    }

    // Off-route detection
    const closestDist = closestPointOnRoute(currentPosition, cache.routeGeometry)
    if (closestDist > 50) {
      offRouteTicks.current++
      if (offRouteTicks.current >= 2) {
        prevIsOffRoute.current = true
        setIsOffRoute(true)
      }
    } else {
      offRouteTicks.current = 0
      // Transition: off-route → back on route while offline — resume nearest instruction
      if (prevIsOffRoute.current && !navigator.onLine && cache) {
        const nearest = resumeNearestInstruction(
          currentPosition,
          cache.instructions,
          currentStepIndexRef.current
        )
        setCurrentStepIndex(nearest)
        currentStepIndexRef.current = nearest
        announcedAt.current = {}
      }
      prevIsOffRoute.current = false
      setIsOffRoute(false)
    }
  }, [currentPosition]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-route when off route and online (Task 1)
  useEffect(() => {
    if (!isOffRoute || !cache || !currentPosition) return
    if (!navigator.onLine) return // offline — banner handles the message, no API call

    setIsRerouting(true)
    setRerouteFailed(false)
    rerouteFromCurrentPosition(currentPosition, cache.stops, currentStopIndexRef.current)
      .then(newInstructions => {
        if (newInstructions) {
          setCache(prev => prev ? { ...prev, instructions: newInstructions } : prev)
          setCurrentStepIndex(0)
          currentStepIndexRef.current = 0
          setIsOffRoute(false)
          setRerouteFailed(false)
          announcedAt.current = {}
          arrivedAtStop.current = new Set()
        } else {
          setRerouteFailed(true)
          setIsOffRoute(false)
        }
      })
      .finally(() => setIsRerouting(false))
  }, [isOffRoute]) // eslint-disable-line react-hooks/exhaustive-deps

  // Online event listener — trigger re-route if reconnected while off-route (Task 2)
  useEffect(() => {
    function handleOnline() {
      if (isOffRoute && cache && currentPosition) {
        setIsRerouting(true)
        setRerouteFailed(false)
        toast.info("Back online — re-routing…")
        rerouteFromCurrentPosition(currentPosition, cache.stops, currentStopIndexRef.current)
          .then(newInstructions => {
            if (newInstructions) {
              setCache(prev => prev ? { ...prev, instructions: newInstructions } : prev)
              setCurrentStepIndex(0)
              currentStepIndexRef.current = 0
              setIsOffRoute(false)
              setRerouteFailed(false)
              announcedAt.current = {}
              arrivedAtStop.current = new Set()
            } else {
              setRerouteFailed(true)
              setIsOffRoute(false)
            }
          })
          .finally(() => setIsRerouting(false))
      }
    }
    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
  }, [isOffRoute, currentPosition, cache]) // eslint-disable-line react-hooks/exhaustive-deps

  // activateNavigation — allows mid-trip route planning to activate navigation (Task 7.3)
  const activateNavigation = useCallback((newCache: OfflineNavCache) => {
    setCache(newCache)
    setCurrentStepIndex(0)
    currentStepIndexRef.current = 0
    setIsOffRoute(false)
    setRerouteFailed(false)
    announcedAt.current = {}
    arrivedAtStop.current = new Set()
  }, [])

  const toggleMute = useCallback(() => setIsMuted(m => !m), [])

  const nextInstruction = cache?.instructions[currentStepIndex] ?? null
  const hasNavigation = cache !== null

  const distanceToEachStop: number[] = cache?.stops.map(stop =>
    currentPosition ? Math.round(haversineDistance(currentPosition, stop)) : 0
  ) ?? []

  return {
    nextInstruction,
    distanceToNext,
    isOffRoute,
    isRerouting,
    rerouteFailed,
    isMuted,
    toggleMute,
    hasNavigation,
    cache,
    currentStepIndex,
    currentStopIndex,
    distanceToEachStop,
    activateNavigation,
  }
}
