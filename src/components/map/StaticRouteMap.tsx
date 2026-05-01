"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import type { Waypoint } from "@/types";

function FitBoundsController({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      const L = require("leaflet");
      map.fitBounds(L.latLngBounds(positions), { padding: [20, 20] });
    }
  }, [positions, map]);
  return null;
}

export default function StaticRouteMap({ waypoints }: { waypoints: Waypoint[] }) {
  const positions: [number, number][] = waypoints.map(w => [w.lat, w.lng]);
  const centre = positions[0] ?? [20.5937, 78.9629];

  return (
    <MapContainer center={centre} zoom={13} className="h-full w-full" zoomControl={false} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
      />
      {positions.length >= 2 && (
        <Polyline positions={positions} color="#F97316" weight={4} opacity={0.9} />
      )}
      <FitBoundsController positions={positions} />
    </MapContainer>
  );
}
