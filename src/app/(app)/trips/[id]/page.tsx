import { getSession } from "@/lib/session";
import { tripService } from "@/services/tripService";
import { expenseService } from "@/services/expenseService";
import { redirect, notFound } from "next/navigation";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { formatTripDateRange } from "@/utils/date";
import { formatINR } from "@/utils/currency";
import { TripKebabMenu } from "@/components/trips/TripKebabMenu";
import { MapPin, Car, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Trip, Expense } from "@/types";

interface Props {
  params: { id: string };
}

function TripDetailHeader({ trip }: { trip: Trip }) {
  const dateRange = formatTripDateRange(trip.startDate, trip.endDate);

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{trip.title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{dateRange}</p>
      </div>
      <TripKebabMenu tripId={trip.id} />
    </div>
  );
}

function TripDetailContent({
  trip,
  linkedExpense,
}: {
  trip: Trip;
  linkedExpense: Expense | null;
}) {
  const totalCost = trip.breakdown.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-4">
      {trip.description && (
        <p className="text-gray-700 text-sm">{trip.description}</p>
      )}

      {(trip.routeText || trip.mapsLink) && (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-1">
          <p className="text-xs font-medium text-gray-400 uppercase">Route</p>
          {trip.routeText && (
            <p className="text-sm text-gray-800">{trip.routeText}</p>
          )}
          {trip.mapsLink && /^https?:\/\//.test(trip.mapsLink) && (
            <a
              href={trip.mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange-600 underline flex items-center gap-1"
            >
              <MapPin size={14} />
              View on Maps
            </a>
          )}
        </div>
      )}

      {trip.vehicle && (
        <Link
          href={`/garage/${trip.vehicle.id}`}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-orange-600"
        >
          <Car size={16} />
          {trip.vehicle.name}
          <ChevronRight size={14} className="text-gray-400" />
        </Link>
      )}

      {trip.timeTaken && (
        <p className="text-sm text-gray-600 flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          Duration: {trip.timeTaken}
        </p>
      )}

      <div className="bg-orange-50 rounded-xl px-4 py-4">
        <p className="text-xs font-medium text-gray-400 uppercase">Total Cost</p>
        <p className="text-2xl font-bold text-orange-600 mt-1">
          {formatINR(totalCost)}
        </p>
      </div>

      {trip.breakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <p className="px-4 py-3 text-xs font-medium text-gray-400 uppercase border-b">
            Breakdown
          </p>
          {trip.breakdown.map((item, i) => (
            <div
              key={i}
              className="flex justify-between items-center px-4 py-2.5 border-b last:border-0"
            >
              <span className="text-sm text-gray-700">{item.category}</span>
              <span className="text-sm font-medium text-gray-900">
                {formatINR(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* TODO (Story 5.3): link to expense detail page once expense detail route exists */}
      {linkedExpense && (
        <span className="text-sm text-gray-500 underline cursor-default">
          View linked expense entry
        </span>
      )}
    </div>
  );
}

export default async function TripDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const [trip, linkedExpense] = await Promise.all([
      tripService.getById(params.id, session.user.id),
      expenseService.getByTripId(params.id, session.user.id),
    ]);

    return (
      <div className="px-4 py-4 space-y-6">
        <TripDetailHeader trip={trip} />
        <TripDetailContent trip={trip} linkedExpense={linkedExpense} />
      </div>
    );
  } catch (error) {
    if (error instanceof ForbiddenError) redirect("/trips");
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
