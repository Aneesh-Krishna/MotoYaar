"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, Radio, Square } from "lucide-react";
import { useLiveTrip } from "@/hooks/useLiveTrip";
import { useNavigation } from "@/hooks/useNavigation";
import { StartSessionSheet } from "@/components/map/StartSessionSheet";
import { NavigationBanner } from "@/components/map/NavigationBanner";
import { PlanRouteSheet } from "@/components/map/PlanRouteSheet";
import { StopChipsStrip } from "@/components/map/StopChipsStrip";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { formatDistance, formatElapsed, formatSpeed } from "@/utils/geo";
import type { Waypoint } from "@/types";

const MapplsMap = dynamic(() => import("@/components/map/MapplsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
      <p className="text-sm text-gray-500">Loading map…</p>
    </div>
  ),
});

interface StatItemProps {
  label: string;
  value: string;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-base font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function LiveTripPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [autoCenter, setAutoCenter] = useState(true);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showStartSessionSheet, setShowStartSessionSheet] = useState(false);
  const [showPlanRouteSheet, setShowPlanRouteSheet] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const waypointsRef = useRef<Waypoint[]>([]);

  const mapRef = useRef<any>(null);
  const livePolylineRef = useRef<any>(null);
  const plannedPolylineRef = useRef<any>(null);
  const mapReadyRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const { startTracking, stopTracking, pauseTracking, currentPosition, pendingCount } =
    useLiveTrip(params.id);

  const navPosition = currentPosition
    ? { lat: currentPosition.coords.latitude, lng: currentPosition.coords.longitude }
    : null;

  const {
    nextInstruction,
    distanceToNext,
    isOffRoute,
    isRerouting,
    rerouteFailed,
    isMuted,
    toggleMute,
    hasNavigation,
    cache,
    currentStopIndex,
    distanceToEachStop,
    activateNavigation,
  } = useNavigation(params.id, navPosition);

  // Start tracking on mount; pause on tab close so ResumeTripBanner can detect it
  useEffect(() => {
    startTracking();
    const onBeforeUnload = () => { pauseTracking(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track online/offline state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Accumulate waypoints from position updates for stats display
  useEffect(() => {
    if (!currentPosition) return;
    const wp: Waypoint = {
      lat: currentPosition.coords.latitude,
      lng: currentPosition.coords.longitude,
      timestamp: currentPosition.timestamp,
      accuracy: currentPosition.coords.accuracy,
      speed: currentPosition.coords.speed,
      altitude: currentPosition.coords.altitude,
    };
    waypointsRef.current = [...waypointsRef.current, wp];
    setWaypoints(waypointsRef.current);
  }, [currentPosition]);

  // Draw planned route overlay (grey polyline) once map and cache are ready
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !cache || cache.routeGeometry.length < 2) return;
    const sdk = (window as any).mappls;
    if (!sdk) return;

    plannedPolylineRef.current?.remove?.();
    try {
      plannedPolylineRef.current = new sdk.Polyline({
        map,
        path: cache.routeGeometry.map(p => [p.lat, p.lng]),
        strokeColor: "#9CA3AF",
        strokeOpacity: 0.6,
        strokeWeight: 4,
      });
    } catch {
      // Mappls SDK polyline API may vary — skip gracefully
    }
  }, [cache, mapReady]);

  // Draw live recorded trace (orange polyline) on each waypoint update
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReadyRef.current || !map || waypoints.length < 2) return;
    const sdk = (window as any).mappls;
    if (!sdk) return;

    livePolylineRef.current?.remove?.();
    try {
      livePolylineRef.current = new sdk.Polyline({
        map,
        path: waypoints.map(w => [w.lat, w.lng]),
        strokeColor: "#F97316",
        strokeOpacity: 0.85,
        strokeWeight: 4,
      });
    } catch {
      // Mappls SDK polyline API may vary — skip gracefully
    }
  }, [waypoints]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-center map on current position
  useEffect(() => {
    if (!autoCenter || !currentPosition || !mapRef.current || !mapReadyRef.current) return;
    const sdk = (window as any).mappls;
    if (!sdk) return;
    try {
      mapRef.current.setCenter([
        currentPosition.coords.latitude,
        currentPosition.coords.longitude,
      ]);
    } catch {
      // ignore
    }
  }, [currentPosition, autoCenter]);

  const handleMapReady = useCallback((map: any) => {
    mapRef.current = map;
    mapReadyRef.current = true;
    setMapReady(true);
  }, []);

  const handleStop = async () => {
    setIsStopping(true);
    await stopTracking();
    router.push(`/trips/${params.id}`);
  };

  const center = navPosition ?? undefined;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <MapplsMap
          mapId="live-trip-map"
          className="w-full h-full"
          center={center}
          zoom={15}
          onMapReady={handleMapReady}
        />
      </div>

      {/* Navigation banner — only when route was planned */}
      {hasNavigation && (
        <NavigationBanner
          instruction={nextInstruction}
          distanceToNext={distanceToNext}
          isRerouting={isRerouting}
          isOffRoute={isOffRoute}
          rerouteFailed={rerouteFailed}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          isOnline={isOnline}
        />
      )}

      {/* Offline / pending banner (below nav banner) */}
      {(!isOnline || pendingCount > 0) && (
        <div
          className={`absolute left-0 right-0 bg-amber-500 text-white text-sm text-center py-2 z-[1000] ${
            hasNavigation ? "top-[56px]" : "top-0"
          }`}
        >
          {!isOnline
            ? `You're offline. Route saved locally.${pendingCount > 0 ? ` (${pendingCount} pending)` : ""}`
            : `Syncing… ${pendingCount} waypoint${pendingCount !== 1 ? "s" : ""} pending`}
        </div>
      )}

      {/* Stop chips strip — only when route was planned */}
      {hasNavigation && cache && (
        <div className="absolute bottom-[148px] left-0 right-0 z-[1000]">
          <StopChipsStrip
            stops={cache.stops}
            currentStopIndex={currentStopIndex}
            distanceToEach={distanceToEachStop}
          />
        </div>
      )}

      {/* Mid-trip Plan Route button — visible only when no route was planned (Task 7.2) */}
      {!hasNavigation && navPosition && (
        <button
          onClick={() => setShowPlanRouteSheet(true)}
          className="absolute bottom-[148px] right-4 z-[1000] bg-orange-500 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg hover:bg-orange-600 transition-colors"
        >
          Plan Route
        </button>
      )}

      {/* Stats bar */}
      <div className="absolute bottom-24 left-4 right-4 bg-white/90 backdrop-blur rounded-2xl p-4 z-[1000] shadow-lg">
        <div className="flex justify-around text-center">
          <StatItem label="Distance" value={`${formatDistance(waypoints)} km`} />
          <StatItem label="Elapsed" value={formatElapsed(waypoints)} />
          <StatItem label="Speed" value={`${formatSpeed(currentPosition)} km/h`} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-4 left-4 right-4 flex gap-3 z-[1000]">
        <button
          onClick={() => setAutoCenter(true)}
          aria-label="Centre map on my position"
          className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg text-gray-700 hover:bg-gray-50 flex-shrink-0"
        >
          <Crosshair size={20} />
        </button>

        <button
          onClick={() => setShowStartSessionSheet(true)}
          className="flex-1 flex items-center justify-center gap-2 bg-white rounded-full shadow-lg text-gray-800 font-medium text-sm hover:bg-gray-50 h-12"
        >
          <Radio size={16} className="text-orange-500" />
          Share Session
        </button>

        <button
          onClick={() => setShowStopModal(true)}
          aria-label="Stop trip"
          className="flex items-center justify-center w-12 h-12 bg-red-500 rounded-full shadow-lg text-white hover:bg-red-600 flex-shrink-0"
        >
          <Square size={18} fill="currentColor" />
        </button>
      </div>

      <ConfirmModal
        open={showStopModal}
        onClose={() => setShowStopModal(false)}
        onConfirm={handleStop}
        title="Stop this trip?"
        description="Tracking will stop and all recorded waypoints will be synced. You can view the route on the trip detail page."
        confirmLabel="Stop Trip"
        isDestructive={false}
        isLoading={isStopping}
      />

      {showStartSessionSheet && (
        <StartSessionSheet
          tripId={params.id}
          onClose={() => setShowStartSessionSheet(false)}
        />
      )}

      {showPlanRouteSheet && navPosition && (
        <PlanRouteSheet
          tripId={params.id}
          currentPosition={navPosition}
          onActivate={activateNavigation}
          onClose={() => setShowPlanRouteSheet(false)}
        />
      )}
    </div>
  );
}
