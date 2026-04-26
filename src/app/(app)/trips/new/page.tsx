"use client";

import { useRouter } from "next/navigation";
import { TripForm } from "@/components/trips/TripForm";

export default function NewTripPage() {
  const router = useRouter();

  return (
    <div className="px-screen-x py-5 max-w-screen-xl mx-auto lg:px-screen-x-md">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Log Trip</h1>
        <TripForm
          onSaved={(tripId) => {
            router.refresh();
            router.push(`/trips/${tripId}`);
          }}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
