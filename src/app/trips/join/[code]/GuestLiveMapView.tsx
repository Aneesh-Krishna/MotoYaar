"use client";
import React from "react";
import dynamic from "next/dynamic";
import { useEffect, useState, useRef }from "react";
import { createClient } from "@supabase/supabase-js";
import { getParticipantColor } from "@/utils/sessionColors";
import Link from "next/link";
import type { LiveTripSession, LiveTripParticipant, ParticipantMapState, ParticipantPosition } from "@/types";

const SessionMapView = dynamic(() => import("@/components/map/SessionMapView"), { ssr: false });

function MapErrorFallback() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-gray-100">
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-800">Unable to load map</p>
        <p className="text-gray-600 mt-2">Please refresh the page</p>
      </div>
    </div>
  );
}

const STALE_THRESHOLD_MS = 30_000;

interface SessionWithParticipants extends LiveTripSession {
  participants: LiveTripParticipant[];
}

interface GuestLiveMapViewProps {
  session: SessionWithParticipants;
  code: string;
}

export default function GuestLiveMapView({ session, code }: GuestLiveMapViewProps) {
  const [participantStates, setParticipantStates] = useState<Map<string, ParticipantMapState>>(new Map());
  const [guestCount, setGuestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionEndedByHost, setSessionEndedByHost] = useState(false);
  const [guestCountError, setGuestCountError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const staleTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const guestTrackedRef = useRef(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Track guest viewer on mount
  useEffect(() => {
    if (guestTrackedRef.current) return;
    guestTrackedRef.current = true;

    const trackGuestView = async () => {
      try {
        const res = await fetch(`/api/sessions/${code}/guest-view`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setGuestCount(data.guest_view_count ?? 0);
          setGuestCountError(null);
        } else {
          setGuestCountError("Unable to load guest count");
          console.error("Failed to track guest view: HTTP", res.status);
        }
      } catch (err) {
        setGuestCountError("Unable to load guest count");
        console.error("Failed to track guest view:", err);
      }
    };

    trackGuestView();

    // Decrement on page unload
    const handleBeforeUnload = async () => {
      await navigator.sendBeacon(`/api/sessions/${code}/guest-view?action=decrement`);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [code]);

  // Initialize participant states from session
  useEffect(() => {
    const participants = session.participants ?? [];
    const initialStates = new Map<string, ParticipantMapState>();

    participants.forEach((p: LiveTripParticipant, i: number) => {
      initialStates.set(p.userId, {
        userId: p.userId,
        name: p.user?.name ?? "Rider",
        position: null,
        connectionStatus: "active",
        lastSeen: null,
        color: getParticipantColor(i),
      });
    });

    setParticipantStates(initialStates);
    setLoading(false);
  }, [session]);

  // Subscribe to realtime broadcasts (receive-only for guests)
  useEffect(() => {
    if (participantStates.size === 0) return;

    const channel = supabase.channel(`session:${session.id}`, {
      config: { broadcast: { self: false } },
    });

    const timers = staleTimersRef.current;

    channel
      .on("broadcast", { event: "location" }, ({ payload }: { payload: ParticipantPosition }) => {
        setParticipantStates(prev => {
          const next = new Map(prev);
          const state = next.get(payload.userId);
          if (!state) return prev;

          // Reset stale timer
          const existing = timers.get(payload.userId);
          if (existing) clearTimeout(existing);

          const timer = setTimeout(() => {
            setParticipantStates(p => {
              const updated = new Map(p);
              const s = updated.get(payload.userId);
              if (s && s.connectionStatus !== "left") {
                updated.set(payload.userId, { ...s, connectionStatus: "stale" });
              }
              return updated;
            });
          }, STALE_THRESHOLD_MS);

          timers.set(payload.userId, timer);

          next.set(payload.userId, {
            ...state,
            position: payload,
            connectionStatus: "active",
            lastSeen: payload.timestamp,
          });
          return next;
        });
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
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      timers.forEach(t => clearTimeout(t));
    };
  }, [session.id, participantStates.size, supabase]);

  if (sessionEndedByHost) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-lg font-semibold">Session ended by host</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading session...</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Conversion Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-3 flex items-center justify-between text-sm font-medium">
        <span>You&apos;re viewing a live ride. Join MotoYaar to share your location.</span>
        <Link href="/login" className="font-semibold underline whitespace-nowrap ml-4 hover:text-orange-100">
          Sign Up
        </Link>
      </div>

      {/* Map View (offset for banner) with error boundary */}
      <div className="pt-12 h-full w-full">
        <ErrorBoundary fallback={<MapErrorFallback />}>
          <SessionMapView participantStates={participantStates} currentUserId="" />
        </ErrorBoundary>
      </div>

      {/* Guest Viewer Counter */}
      <div className="absolute bottom-6 left-6 z-20 px-4 py-2 bg-white text-gray-800 rounded-full shadow-lg text-sm font-medium">
        {guestCountError ? (
          <span className="text-red-600">{guestCountError}</span>
        ) : (
          <>
            {participantStates.size} participants {guestCount > 0 && `• ${guestCount} guest(s) viewing`}
          </>
        )}
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Map rendering error:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
