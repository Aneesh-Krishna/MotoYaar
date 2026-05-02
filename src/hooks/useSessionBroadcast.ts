"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { haversineDistance } from "@/utils/geo";
import { getParticipantColor } from "@/utils/sessionColors";
import type { ParticipantPosition, ParticipantMapState } from "@/types";

const BROADCAST_INTERVAL_MS = 5_000;
const MIN_MOVE_M = 10;
const STALE_THRESHOLD_MS = 30_000;
const BROADCAST_RETRY_MAX = 3;
const BROADCAST_RETRY_DELAY_MS = 1000;

export function useSessionBroadcast(
  sessionId: string,
  currentUserId: string,
  currentPosition: GeolocationPosition | null,
  participants: Array<{ userId: string; user?: { name?: string; image?: string } }>
) {
  const [participantStates, setParticipantStates] = useState<Map<string, ParticipantMapState>>(
    () => new Map(participants.map((p, i) => [
      p.userId,
      {
        userId: p.userId,
        name: p.user?.name ?? "Rider",
        image: p.user?.image,
        position: null,
        connectionStatus: "active" as const,
        lastSeen: null,
        color: getParticipantColor(i),
      },
    ]))
  );

  const [sessionEndedByHost, setSessionEndedByHost] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const lastBroadcastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const staleTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const retryCountRef = useRef(0);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const resetStaleTimer = useCallback((userId: string) => {
    const existing = staleTimersRef.current.get(userId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      setParticipantStates(prev => {
        const next = new Map(prev);
        const state = next.get(userId);
        if (state && state.connectionStatus !== "left") {
          next.set(userId, { ...state, connectionStatus: "stale" });
        }
        return next;
      });
    }, STALE_THRESHOLD_MS);

    staleTimersRef.current.set(userId, timer);
  }, []);

  // Subscribe to broadcast channel with error handling
  useEffect(() => {
    const channel = supabase.channel(`session:${sessionId}`, {
      config: { broadcast: { self: false } },
    });

    const timers = staleTimersRef.current;

    channel
      .on("broadcast", { event: "location" }, ({ payload }: { payload: ParticipantPosition }) => {
        if (payload.userId === currentUserId) return; // ignore own broadcasts
        setBroadcastError(null);
        setParticipantStates(prev => {
          const next = new Map(prev);
          const state = next.get(payload.userId);
          if (!state) return prev;
          next.set(payload.userId, {
            ...state,
            position: payload,
            connectionStatus: "active",
            lastSeen: payload.timestamp,
          });
          return next;
        });
        resetStaleTimer(payload.userId);
      })
      .on("broadcast", { event: "session_ended" }, () => {
        setSessionEndedByHost(true);
        channel.unsubscribe();
      })
      .on("broadcast", { event: "participant_left" }, ({ payload }: { payload: { userId: string } }) => {
        setParticipantStates(prev => {
          const next = new Map(prev);
          const state = next.get(payload.userId);
          if (state) next.set(payload.userId, { ...state, connectionStatus: "left" });
          return next;
        });
      })
      .on("system", { event: "channel_error" }, () => {
        setBroadcastError("Connection error. Location updates may not be syncing.");
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      timers.forEach(t => clearTimeout(t));
    };
  }, [sessionId, currentUserId, supabase, resetStaleTimer]);

  // Broadcast own position on interval with error handling
  useEffect(() => {
    if (!currentPosition || !channelRef.current) return;

    const { latitude: lat, longitude: lng } = currentPosition.coords;
    const last = lastBroadcastPositionRef.current;
    if (last && haversineDistance(last, { lat, lng }) < MIN_MOVE_M) return;

    lastBroadcastPositionRef.current = { lat, lng };

    const payload: ParticipantPosition = {
      userId: currentUserId,
      lat,
      lng,
      timestamp: currentPosition.timestamp,
      speed: currentPosition.coords.speed,
    };

    const sendWithRetry = async (attempt = 0) => {
      try {
        channelRef.current?.send({
          type: "broadcast",
          event: "location",
          payload,
        });
        retryCountRef.current = 0;
        setBroadcastError(null);
      } catch (err) {
        if (attempt < BROADCAST_RETRY_MAX) {
          setTimeout(() => {
            sendWithRetry(attempt + 1);
          }, BROADCAST_RETRY_DELAY_MS);
        } else {
          setBroadcastError("Failed to sync location. Please check your connection.");
          retryCountRef.current = 0;
        }
      }
    };

    sendWithRetry();
  }, [currentPosition, currentUserId]);

  const broadcastSessionEnd = useCallback(async () => {
    if (!channelRef.current) return;
    try {
      channelRef.current.send({ type: "broadcast", event: "session_ended", payload: {} });
      setBroadcastError(null);
    } catch (err) {
      setBroadcastError("Failed to end session. Please try again.");
    }
  }, []);

  const broadcastParticipantLeft = useCallback(async () => {
    if (!channelRef.current) return;
    try {
      channelRef.current.send({
        type: "broadcast",
        event: "participant_left",
        payload: { userId: currentUserId },
      });
      setBroadcastError(null);
    } catch (err) {
      setBroadcastError("Failed to leave session. Please try again.");
    }
  }, [currentUserId]);

  return { participantStates, sessionEndedByHost, broadcastError, broadcastSessionEnd, broadcastParticipantLeft };
}
