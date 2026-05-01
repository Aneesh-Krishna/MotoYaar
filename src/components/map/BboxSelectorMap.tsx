"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { BoundingBox } from "@/utils/tiles";

// Fix broken default icon paths — known Next.js + Leaflet issue
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

interface BboxSelectorMapProps {
  onBboxChange: (bbox: BoundingBox | null) => void;
}

function BoundsSelector({
  onBboxChange,
}: {
  onBboxChange: (bbox: BoundingBox | null) => void;
}) {
  const map = useMapEvents({});

  useEffect(() => {
    const handleMapEvent = () => {
      const bounds = map.getBounds();
      if (bounds) {
        onBboxChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
      }
    };

    map.on("moveend", handleMapEvent);
    map.on("zoomend", handleMapEvent);

    return () => {
      map.off("moveend", handleMapEvent);
      map.off("zoomend", handleMapEvent);
    };
  }, [map, onBboxChange]);

  return null;
}

export default function BboxSelectorMap({
  onBboxChange,
}: BboxSelectorMapProps) {
  return (
    <MapContainer
      center={[20, 78]}
      zoom={4}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <BoundsSelector onBboxChange={onBboxChange} />
    </MapContainer>
  );
}
