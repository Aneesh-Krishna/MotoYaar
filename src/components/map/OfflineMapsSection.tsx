"use client";
import { useState, useEffect } from "react";
import { Trash2, Map } from "lucide-react";
import { tileUrls } from "@/utils/tiles";
import type { OfflineMapMeta } from "./OfflineMapSheet";

function formatLatLng(lat: number, lng: number): string {
  return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function OfflineMapsSection({ tripId }: { tripId: string }) {
  const [maps, setMaps] = useState<OfflineMapMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage
    try {
      const stored = localStorage.getItem("offline-maps") ?? "[]";
      const allMaps: OfflineMapMeta[] = JSON.parse(stored);
      const tripMaps = allMaps.filter((m) => m.tripId === tripId);
      setMaps(tripMaps);
    } catch {
      setMaps([]);
    }
    setLoading(false);
  }, [tripId]);

  const handleDelete = async (meta: OfflineMapMeta) => {
    try {
      const cache = await caches.open("osm-tiles-v1");
      for (const url of tileUrls(meta.bbox)) {
        await cache.delete(url);
      }

      // Update localStorage
      const stored = localStorage.getItem("offline-maps") ?? "[]";
      const allMaps: OfflineMapMeta[] = JSON.parse(stored);
      const filtered = allMaps.filter(
        (m) => !(m.tripId === meta.tripId && m.downloadedAt === meta.downloadedAt)
      );
      localStorage.setItem("offline-maps", JSON.stringify(filtered));
      setMaps(maps.filter((m) => m.downloadedAt !== meta.downloadedAt));
    } catch (error) {
      console.error("Failed to delete offline map:", error);
    }
  };

  if (loading || maps.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <p className="px-4 py-3 text-xs font-medium text-gray-400 uppercase border-b flex items-center gap-2">
        <Map size={14} />
        Offline Maps
      </p>
      {maps.map((map) => {
        const centerLat = (map.bbox.north + map.bbox.south) / 2;
        const centerLng = (map.bbox.east + map.bbox.west) / 2;
        return (
          <div
            key={map.downloadedAt}
            className="flex items-center justify-between px-4 py-3 border-b last:border-0"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {formatLatLng(centerLat, centerLng)}
              </p>
              <p className="text-xs text-gray-500">
                {map.sizeMB} MB • {formatDate(map.downloadedAt)}
              </p>
            </div>
            <button
              onClick={() => handleDelete(map)}
              className="text-red-500 hover:text-red-700 p-2"
              aria-label="Delete offline map"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
