import type { Waypoint } from "@/types";

interface LatLng { lat: number; lng: number }

export function haversineDistance(p1: LatLng, p2: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function totalDistance(waypoints: { lat: number; lng: number }[]): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += haversineDistance(waypoints[i - 1], waypoints[i]);
  }
  return total;
}

export function formatDistance(waypoints: Waypoint[]): string {
  const metres = totalDistance(waypoints);
  return (metres / 1000).toFixed(1);
}

export function formatElapsed(waypoints: Waypoint[]): string {
  if (waypoints.length < 2) return "0m";
  const ms = waypoints[waypoints.length - 1].timestamp - waypoints[0].timestamp;
  const totalMinutes = Math.floor(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatSpeed(position: GeolocationPosition | null): string {
  if (!position?.coords.speed) return "—";
  return (position.coords.speed * 3.6).toFixed(0);
}

export async function checkGeolocationPermission(): Promise<boolean> {
  if (!("geolocation" in navigator)) return false;
  try {
    const perm = await navigator.permissions.query({ name: "geolocation" });
    if (perm.state === "denied") return false;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { timeout: 5000 }
      );
    });
  } catch {
    return false;
  }
}
