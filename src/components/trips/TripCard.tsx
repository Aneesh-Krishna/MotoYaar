import Link from "next/link";
import { Car } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { formatTripDateRange } from "@/utils/date";
import type { Trip } from "@/types";

interface TripCardProps {
  trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
  const tripTotal = trip.breakdown.reduce((s, i) => s + i.amount, 0);

  return (
    <Link href={`/trips/${trip.id}`} aria-label={`Trip: ${trip.title}`}>
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-4 flex items-center justify-between active:bg-gray-50">
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{trip.title}</h3>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
            <span>{formatTripDateRange(trip.startDate, trip.endDate)}</span>
            {trip.vehicle ? (
              <>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1">
                  <Car size={10} aria-hidden="true" />
                  {trip.vehicle.name}
                </span>
              </>
            ) : (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-400">No vehicle</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-gray-900 text-sm">
            {tripTotal > 0 ? formatINR(tripTotal) : "—"}
          </p>
        </div>
      </div>
    </Link>
  );
}
