"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, Radio, Square } from "lucide-react";
import { useLiveTrip } from "@/hooks/useLiveTrip";
import { StartSessionSheet } from "@/components/map/StartSessionSheet";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { formatDistance, formatElapsed, formatSpeed } from "@/utils/geo";
import type { Waypoint } from "@/types";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
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
  const [isStopping, setIsStopping] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const waypointsRef = useRef<Waypoint[]>([]);

  const { startTracking, stopTracking, pauseTracking, currentPosition, pendingCount } =
    useLiveTrip(params.id);

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

  // Accumulate waypoints from position updates for map display
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

  const handleStop = async () => {
    setIsStopping(true);
    await stopTracking();
    router.push(`/trips/${params.id}`);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <LeafletMap
          waypoints={waypoints}
          currentPosition={currentPosition}
          autoCenter={autoCenter}
          onManualPan={() => setAutoCenter(false)}
        />
      </div>

      {/* Offline / pending banner */}
      {(!isOnline || pendingCount > 0) && (
        <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white text-sm text-center py-2 z-[1000]">
          {!isOnline
            ? `You're offline. Route saved locally.${pendingCount > 0 ? ` (${pendingCount} pending)` : ""}`
            : `Syncing… ${pendingCount} waypoint${pendingCount !== 1 ? "s" : ""} pending`}
        </div>
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
    </div>
  );
}
