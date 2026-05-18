"use client";

import { useMapStore, type MapType } from "@/stores/mapStore";
import { cn } from "@/lib/utils";

const MAP_TYPES: { value: MapType; label: string }[] = [
  { value: "roadmap", label: "Road" },
  { value: "satellite", label: "Sat" },
  { value: "terrain", label: "Terrain" },
  { value: "hybrid", label: "Hybrid" },
];

export function MapTypeToggle() {
  const { mapType, setMapType, isDarkMode, setDarkMode } = useMapStore();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
        {MAP_TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setMapType(value)}
            className={cn(
              "px-2 py-1.5 text-xs font-medium transition-colors",
              mapType === value
                ? "bg-orange-500 text-white"
                : "text-gray-700 hover:bg-gray-50"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        onClick={() => setDarkMode(!isDarkMode)}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 shadow-md hover:bg-gray-50"
        title="Toggle dark map"
      >
        {isDarkMode ? "Light" : "Dark"}
      </button>
    </div>
  );
}
