"use client";

import dynamic from "next/dynamic";
import { useJsApiLoader } from "@react-google-maps/api";

const MapContainer = dynamic(
  () => import("@/components/maps/MapContainer").then((m) => ({ default: m.MapContainer })),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-gray-500">Loading map…</div> }
);

const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Add it to .env.local and Vercel environment variables.");
}
const MAPS_API_KEY: string = apiKey;

export default function MapsPage() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  return (
    <div className="fixed inset-0 pt-14 pb-16 lg:left-60 lg:pt-0 lg:pb-0">
      <MapContainer apiLoaded={isLoaded} />
    </div>
  );
}
