"use client";
import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { countTiles, estimateSizeMB, tileUrls } from "@/utils/tiles";
import type { BoundingBox } from "@/utils/tiles";

const BboxSelectorMap = dynamic(() => import("./BboxSelectorMap"), { ssr: false });

const HARD_CAP_MB = 100;
const WARN_MB = 50;

export interface OfflineMapMeta {
  tripId: string;
  bbox: BoundingBox;
  tileCount: number;
  sizeMB: number;
  downloadedAt: string;
}

export default function OfflineMapSheet({
  tripId,
  onComplete,
}: {
  tripId: string;
  onComplete: () => void;
}) {
  const [bbox, setBbox] = useState<BoundingBox | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cancelled, setCancelled] = useState(false);

  const tileCount = bbox ? countTiles(bbox) : 0;
  const sizeMB = estimateSizeMB(tileCount);

  const handleDownload = useCallback(async () => {
    if (!bbox) return;
    setDownloading(true);
    setCancelled(false);
    setProgress(0);

    const cache = await caches.open("osm-tiles-v1");
    const urls = [...tileUrls(bbox)];
    let done = 0;

    for (const url of urls) {
      if (cancelled) break;
      try {
        const existing = await cache.match(url);
        if (!existing) {
          const res = await fetch(url);
          if (res.ok) await cache.put(url, res);
        }
      } catch {
        /* skip failed tiles */
      }
      done++;
      setProgress(Math.floor((done / urls.length) * 100));
    }

    if (!cancelled) {
      // Store metadata in localStorage for display in "Manage Downloads"
      const meta: OfflineMapMeta = {
        tripId,
        bbox,
        tileCount: urls.length,
        sizeMB,
        downloadedAt: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("offline-maps") ?? "[]");
      localStorage.setItem("offline-maps", JSON.stringify([...existing, meta]));
      onComplete();
    }
    setDownloading(false);
  }, [bbox, cancelled, sizeMB, tripId, onComplete]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <BboxSelectorMap onBboxChange={setBbox} />
      {bbox && (
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Estimated download: ~{sizeMB} MB ({tileCount.toLocaleString()} tiles)
          </p>
          {sizeMB > WARN_MB && sizeMB <= HARD_CAP_MB && (
            <p className="text-amber-600 text-sm">
              ⚠️ This is a large download. Ensure you&apos;re on Wi-Fi.
            </p>
          )}
          {sizeMB > HARD_CAP_MB && (
            <p className="text-red-600 text-sm">
              Area too large (&gt;{HARD_CAP_MB}MB). Please select a smaller area.
            </p>
          )}
          {downloading ? (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-center">
                {progress}% — {Math.round((tileCount * progress) / 100)} tiles cached
              </p>
              <button
                onClick={() => setCancelled(true)}
                className="text-red-500 text-sm w-full"
              >
                Cancel download
              </button>
            </>
          ) : (
            <button
              onClick={handleDownload}
              disabled={sizeMB > HARD_CAP_MB}
              className="w-full bg-orange-500 text-white py-3 rounded-xl disabled:opacity-50"
            >
              Download Map ({sizeMB} MB)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
