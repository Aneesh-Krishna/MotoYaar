"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { haversineDistance } from "@/utils/geo";
import { saveLiveTripState, getLiveTripState, clearLiveTripState } from "@/lib/liveTripDb";
import { openDB } from "idb";
import { apiRequest } from "@/lib/api-client";
import { toast } from "sonner";
import type { Waypoint, LocalLiveTripState } from "@/types";

const MIN_DISTANCE_M = 10;
const MIN_TIME_MS = 10_000;
const WAYPOINT_CAP_WARN = 8_000;

export function useLiveTrip(tripId: string, highAccuracy = false) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const lastWaypointRef = useRef<Waypoint | null>(null);
  const lastWaypointTimeRef = useRef<number>(0);
  const intervalMultiplierRef = useRef<number>(1);

  const flush = useCallback(async (waypoints: Waypoint[]) => {
    if (!waypoints.length) return;
    try {
      await apiRequest(`/trips/${tripId}/route`, {
        method: "PATCH",
        body: JSON.stringify({ waypoints }),
      });
      toast.success(`Route synced — ${waypoints.length} waypoints uploaded.`);
      const state = await getLiveTripState(tripId);
      if (state) {
        const sentTimestamps = new Set(waypoints.map(w => w.timestamp));
        state.pendingWaypoints = state.pendingWaypoints.filter(
          w => !sentTimestamps.has(w.timestamp)
        );
        const remaining = state.pendingWaypoints.length;
        await saveLiveTripState(tripId, state);
        setPendingCount(remaining);
      }
    } catch {
      // Silently retain in IndexedDB; retry on next 'online' event
    }
  }, [tripId]);

  const recordWaypoint = useCallback(async (position: GeolocationPosition) => {
    const waypoint: Waypoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      timestamp: position.timestamp,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      altitude: position.coords.altitude,
    };

    const now = Date.now();
    const effectiveMinTime = MIN_TIME_MS * intervalMultiplierRef.current;
    const last = lastWaypointRef.current;
    const timeSinceLast = now - lastWaypointTimeRef.current;

    const distOk = !last || haversineDistance(last, waypoint) > MIN_DISTANCE_M;
    const timeOk = timeSinceLast >= effectiveMinTime;
    if (!distOk && !timeOk) return;

    lastWaypointRef.current = waypoint;
    lastWaypointTimeRef.current = now;

    const state = await getLiveTripState(tripId);
    if (!state) return;
    state.pendingWaypoints.push(waypoint);

    if (state.pendingWaypoints.length >= WAYPOINT_CAP_WARN && intervalMultiplierRef.current === 1) {
      intervalMultiplierRef.current = 2;
      console.warn("[useLiveTrip] Approaching waypoint cap — doubling recording interval");
    }

    await saveLiveTripState(tripId, state);
    setPendingCount(state.pendingWaypoints.length);

    if (navigator.onLine) await flush(state.pendingWaypoints);
  }, [tripId, flush]);

  const startTracking = useCallback(async () => {
    const initialState: LocalLiveTripState = {
      tripId,
      status: "active",
      startedAt: Date.now(),
      pausedAt: null,
      pendingWaypoints: [],
    };
    await saveLiveTripState(tripId, initialState);
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPosition(pos);
        recordWaypoint(pos);
      },
      (err) => console.error("[useLiveTrip] GPS error:", err),
      { enableHighAccuracy: highAccuracy, maximumAge: 5000 }
    );
  }, [tripId, highAccuracy, recordWaypoint]);

  const pauseTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    const state = await getLiveTripState(tripId);
    if (state) {
      state.status = "paused";
      state.pausedAt = Date.now();
      await saveLiveTripState(tripId, state);
    }
    setIsTracking(false);
  }, [tripId]);

  const resumeTracking = useCallback(async () => {
    const state = await getLiveTripState(tripId);
    if (!state) return;
    state.status = "active";
    state.pausedAt = null;
    await saveLiveTripState(tripId, state);
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPosition(pos);
        recordWaypoint(pos);
      },
      (err) => console.error("[useLiveTrip] GPS error:", err),
      { enableHighAccuracy: highAccuracy, maximumAge: 5000 }
    );
  }, [tripId, highAccuracy, recordWaypoint]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    const state = await getLiveTripState(tripId);
    if (state?.pendingWaypoints.length) {
      await flush(state.pendingWaypoints);
    }
    await clearLiveTripState(tripId);
    try {
      const db = await openDB("motoyaar-nav", 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("nav-cache")) {
            db.createObjectStore("nav-cache");
          }
        },
      });
      await db.delete("nav-cache", `offline_route:${tripId}`);
    } catch {
      // nav cache may not exist — ignore
    }
    setIsTracking(false);
    setPendingCount(0);
  }, [tripId, flush]);

  useEffect(() => {
    const onOnline = async () => {
      const state = await getLiveTripState(tripId);
      if (state?.pendingWaypoints.length) await flush(state.pendingWaypoints);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [tripId, flush]);

  return { startTracking, stopTracking, pauseTracking, resumeTracking, isTracking, currentPosition, pendingCount };
}
