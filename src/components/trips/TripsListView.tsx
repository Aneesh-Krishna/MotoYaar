"use client";

import { useState } from "react";
import Link from "next/link";
import { Map } from "lucide-react";
import { TripCard } from "@/components/trips/TripCard";
import type { Trip, Vehicle } from "@/types";

interface TripsListViewProps {
  trips: Trip[];
  vehicles: Vehicle[];
}

export function TripsListView({ trips, vehicles }: TripsListViewProps) {
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");

  const filteredTrips =
    vehicleFilter === "all" ? trips : trips.filter((t) => t.vehicleId === vehicleFilter);

  return (
    <div>
      {vehicles.length > 1 && (
        <div className="mb-4">
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
            aria-label="Filter by vehicle"
          >
            <option value="all">All vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {filteredTrips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-8">
          <Map size={48} className="text-gray-300" aria-hidden="true" />
          <p className="font-semibold text-gray-700">
            {vehicleFilter !== "all" ? "No trips for this vehicle" : "No trips logged yet"}
          </p>
          <p className="text-sm text-gray-500">
            {vehicleFilter !== "all"
              ? "Select a different vehicle or clear the filter."
              : "Record your first journey to see it here."}
          </p>
          {vehicleFilter === "all" && (
            <Link
              href="/trips/new"
              className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-semibold"
            >
              Add first trip
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
