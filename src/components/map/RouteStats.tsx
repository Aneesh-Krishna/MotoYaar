import type { TripRoute } from "@/types";

function formatDuration(waypoints: TripRoute["waypoints"]): string {
  if (waypoints.length < 2) return "—";
  const ms = waypoints[waypoints.length - 1].timestamp - waypoints[0].timestamp;
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatAvgSpeed(waypoints: TripRoute["waypoints"], distanceKm: number | null): string | null {
  const hasSpeed = waypoints.some(w => w.speed !== null);
  if (!hasSpeed || !distanceKm) return null;
  if (waypoints.length < 2) return null;
  const durationH = (waypoints[waypoints.length - 1].timestamp - waypoints[0].timestamp) / 3_600_000;
  if (durationH === 0) return null;
  return `${Math.round(distanceKm / durationH)} km/h`;
}

export default function RouteStats({ route }: { route: TripRoute }) {
  const avgSpeed = formatAvgSpeed(route.waypoints, route.distanceKm);

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="Distance" value={route.distanceKm ? `${Number(route.distanceKm).toFixed(1)} km` : "—"} />
      <StatCard label="Duration" value={formatDuration(route.waypoints)} />
      {avgSpeed && <StatCard label="Avg Speed" value={avgSpeed} />}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
