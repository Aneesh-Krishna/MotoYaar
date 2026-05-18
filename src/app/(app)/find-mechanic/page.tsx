"use client";

import { useRouter } from "next/navigation";
import { PlacePicker } from "@/components/maps/PlacePicker";
import type { ServiceCenter } from "@/types";

export default function FindMechanicPage() {
  const router = useRouter();

  const handleSelect = (sc: ServiceCenter | null) => {
    if (sc) router.push(`/service-centers/${sc.id}`);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Find a Mechanic</h1>
      <p className="text-sm text-gray-500">
        Search any service center on Google Maps. Pick one to view ratings, reviews, and your past
        visits.
      </p>

      <PlacePicker
        mode="service-center"
        value={null}
        onChange={handleSelect}
        placeholder="Search service center on Maps…"
      />
    </div>
  );
}
