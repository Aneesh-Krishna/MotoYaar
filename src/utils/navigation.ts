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
  const sdk = (window as any).mappls
  if (!sdk) return null

  // Slice remaining stops from the current stop onwards
  const remainingStops = currentStopIndex < stops.length ? stops.slice(currentStopIndex) : stops.slice(-1)

  try {
    const result = await new Promise<RouteInstruction[]>((resolve, reject) => {
      sdk.direction(
        {
          origin: `${currentPosition.lat},${currentPosition.lng}`,
          destination: `${remainingStops[remainingStops.length - 1].lat},${remainingStops[remainingStops.length - 1].lng}`,
          waypoints: remainingStops.slice(0, -1).map((s: PlannedStop) => `${s.lat},${s.lng}`).join(";"),
          rtype: 1,
          region: "IND",
        },
        (data: any) => {
          if (!data?.routes?.[0]) { reject(new Error("no route")); return }

          const route = data.routes[0]
          const steps: RouteInstruction[] = []
          let stepIndex = 0

          for (const leg of (route.legs ?? [])) {
            for (const step of (leg.steps ?? [])) {
              const coords = step.geometry?.coordinates ?? []
              const triggerCoord = coords[coords.length - 1] ?? [0, 0]
              steps.push({
                stepIndex: stepIndex++,
                manoeuvre: step.maneuver?.type ?? "straight",
                streetName: step.name ?? "",
                distanceToNext: step.distance ?? 0,
                durationToNext: step.duration ?? 0,
                triggerLat: triggerCoord[1],
                triggerLng: triggerCoord[0],
                bearing: step.maneuver?.bearing_after ?? 0,
              })
            }
          }

          resolve(steps)
        }
      )
    })
    return result
  } catch {
    return null
  }
}
