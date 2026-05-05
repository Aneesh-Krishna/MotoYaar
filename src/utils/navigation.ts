import { haversineDistance } from "@/utils/geo"
import type { RouteInstruction, PlannedStop } from "@/types"

function humaniseManoeuvre(manoeuvre: string): string {
  return manoeuvre.replace(/-/g, " ")
}

export function buildAnnouncementText(
  distance: "300" | "50" | "at",
  instruction: RouteInstruction
): string {
  const manoeuvre = humaniseManoeuvre(instruction.manoeuvre)
  const street = instruction.streetName ? ` onto ${instruction.streetName}` : ""

  if (instruction.manoeuvre === "arrive") {
    return "You have arrived at your destination"
  }
  if (distance === "at") return `${manoeuvre}${street}`
  return `In ${distance} metres, ${manoeuvre}${street}`
}

// iOS Safari: speechSynthesis may be interrupted when the screen locks.
// This is a known platform limitation with no reliable workaround.
export function announce(text: string, muted: boolean): void {
  if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = "en-IN"
  utterance.rate = 0.9
  window.speechSynthesis.speak(utterance)
}

export function closestPointOnRoute(
  pos: { lat: number; lng: number },
  geometry: Array<{ lat: number; lng: number }>
): number {
  return geometry.reduce((minDist, point) => {
    const d = haversineDistance(pos, point)
    return d < minDist ? d : minDist
  }, Infinity)
}

export function resumeNearestInstruction(
  pos: { lat: number; lng: number },
  instructions: RouteInstruction[],
  currentIndex: number
): number {
  let nearest = currentIndex
  let minDist = Infinity

  for (let i = currentIndex; i < instructions.length; i++) {
    const d = haversineDistance(pos, {
      lat: instructions[i].triggerLat,
      lng: instructions[i].triggerLng,
    })
    if (d < minDist) {
      minDist = d
      nearest = i
    }
  }

  return nearest
}

export async function rerouteFromCurrentPosition(
  currentPosition: { lat: number; lng: number },
  stops: PlannedStop[],
  currentStopIndex: number
): Promise<RouteInstruction[] | null> {
  if (typeof google === "undefined") return null

  const remainingStops =
    currentStopIndex < stops.length ? stops.slice(currentStopIndex) : stops.slice(-1)
  if (remainingStops.length < 1) return null

  const directionsService = new google.maps.DirectionsService()
  const destination = remainingStops[remainingStops.length - 1]
  const waypoints = remainingStops.slice(0, -1).map(s => ({
    location: new google.maps.LatLng(s.lat, s.lng),
    stopover: true,
  }))

  try {
    const response = await directionsService.route({
      origin: new google.maps.LatLng(currentPosition.lat, currentPosition.lng),
      destination: new google.maps.LatLng(destination.lat, destination.lng),
      waypoints,
      travelMode: google.maps.TravelMode.DRIVING,
      region: "in",
    })

    const route = response.routes[0]
    const steps: RouteInstruction[] = []
    let stepIndex = 0

    for (const leg of route.legs) {
      for (const step of leg.steps) {
        const endLoc = step.end_location
        steps.push({
          stepIndex: stepIndex++,
          manoeuvre: step.maneuver ?? "straight",
          streetName: step.instructions.replace(/<[^>]+>/g, ""),
          distanceToNext: step.distance?.value ?? 0,
          durationToNext: step.duration?.value ?? 0,
          triggerLat: endLoc.lat(),
          triggerLng: endLoc.lng(),
          bearing: 0,
        })
      }
    }

    return steps
  } catch {
    return null
  }
}
