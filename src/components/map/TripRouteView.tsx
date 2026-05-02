"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import type { TripRoute } from "@/types";
import RouteStats from "./RouteStats";

const StaticRouteMap = dynamic(() => import("./StaticRouteMap"), { ssr: false });

interface TripRouteViewProps {
  tripId: string;
}

export default function TripRouteView({ tripId }: TripRouteViewProps) {
  const [route, setRoute] = useState<TripRoute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<TripRoute>(`/trips/${tripId}/route`)
      .then(setRoute)
      .catch(() => setRoute(null))
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return <RouteSkeleton />;
  if (!route || !route.waypoints.length) {
    return (
      <div className="flex flex-col items-center py-12 text-gray-400">
        <p>No route data available.</p>
        <p className="text-sm mt-1">Start a live trip to record your route automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-64 rounded-xl overflow-hidden">
        <StaticRouteMap waypoints={route.waypoints} />
      </div>
      <RouteStats route={route} />
    </div>
  );
}

function RouteSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-64 w-full rounded-xl bg-gray-200 animate-pulse" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-16 rounded-xl bg-gray-200 animate-pulse" />
        <div className="h-16 rounded-xl bg-gray-200 animate-pulse" />
        <div className="h-16 rounded-xl bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}
