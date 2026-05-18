"use client";

import { useMapStore } from "@/stores/mapStore";

export function SpeedBadge() {
  const speedKmh = useMapStore((s) => s.speedKmh);

  if (speedKmh === null) return null;

  return (
    <div className="absolute bottom-52 right-3 z-10 flex flex-col items-center rounded-xl bg-white px-3 py-2 shadow-lg">
      <span className="text-2xl font-bold leading-none text-gray-900">{speedKmh}</span>
      <span className="text-[0.6rem] font-medium uppercase tracking-wide text-gray-500">km/h</span>
    </div>
  );
}
