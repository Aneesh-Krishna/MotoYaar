"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { ParticipantMapState } from "@/types";

interface SessionMapViewProps {
  participantStates: Map<string, ParticipantMapState>;
  currentUserId: string;
}

function ParticipantMarkers({ participantStates, currentUserId }: SessionMapViewProps) {
  const map = useMap();
  useEffect(() => {
    const markers: L.Marker[] = [];
    participantStates.forEach((state) => {
      if (!state.position || state.connectionStatus === "left") return;
      const isStale = state.connectionStatus === "stale";
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="
            width:32px;height:32px;border-radius:50%;
            background:${isStale ? "#9CA3AF" : state.color};
            border:2px solid white;
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:700;color:white;
            opacity:${isStale ? 0.6 : 1};
          ">
            ${state.name.charAt(0).toUpperCase()}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marker = L.marker([state.position.lat, state.position.lng], { icon })
        .bindTooltip(state.name, { permanent: false })
        .addTo(map);
      markers.push(marker);
    });
    return () => markers.forEach(m => map.removeLayer(m));
  }, [participantStates, map]);
  return null;
}

export default function SessionMapView({ participantStates, currentUserId }: SessionMapViewProps) {
  const defaultCenter: [number, number] = [20.5937, 78.9629];
  return (
    <MapContainer center={defaultCenter} zoom={13} className="h-full w-full">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
      />
      <ParticipantMarkers participantStates={participantStates} currentUserId={currentUserId} />
    </MapContainer>
  );
}
