"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Waypoint } from "@/types";

// Fix broken default icon paths — known Next.js + Leaflet issue
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

interface LeafletMapProps {
  waypoints: Waypoint[];
  currentPosition: GeolocationPosition | null;
  autoCenter: boolean;
  onManualPan: () => void;
}

function DragListener({ onDrag }: { onDrag: () => void }) {
  useMapEvents({ dragstart: onDrag });
  return null;
}

function CenterController({
  position,
  autoCenter,
}: {
  position: GeolocationPosition | null;
  autoCenter: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (autoCenter && position) {
      map.setView(
        [position.coords.latitude, position.coords.longitude],
        map.getZoom()
      );
    }
  }, [position, autoCenter, map]);
  return null;
}

function PulsingPositionMarker({
  position,
  accuracy,
}: {
  position: [number, number];
  accuracy: number;
}) {
  const map = useMap();
  useEffect(() => {
    const icon = L.divIcon({
      className: "",
      html: `<div class="pulsing-dot"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    const marker = L.marker(position, { icon }).addTo(map);
    const circle = L.circle(position, {
      radius: accuracy,
      color: "#3B82F6",
      weight: 1,
      fillOpacity: 0.1,
    }).addTo(map);
    return () => {
      map.removeLayer(marker);
      map.removeLayer(circle);
    };
  }, [position, accuracy, map]);
  return null;
}

export default function LeafletMap({
  waypoints,
  currentPosition,
  autoCenter,
  onManualPan,
}: LeafletMapProps) {
  const defaultCenter: [number, number] = [20.5937, 78.9629]; // India centre
  const positions: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);
  const currentLatLng = currentPosition
    ? ([
        currentPosition.coords.latitude,
        currentPosition.coords.longitude,
      ] as [number, number])
    : null;

  return (
    <MapContainer
      center={currentLatLng ?? defaultCenter}
      zoom={15}
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
      />
      {positions.length > 1 && (
        <Polyline positions={positions} color="#F97316" weight={4} opacity={0.9} />
      )}
      {currentLatLng && (
        <PulsingPositionMarker
          position={currentLatLng}
          accuracy={currentPosition?.coords.accuracy ?? 0}
        />
      )}
      <CenterController position={currentPosition} autoCenter={autoCenter} />
      <DragListener onDrag={onManualPan} />
    </MapContainer>
  );
}
