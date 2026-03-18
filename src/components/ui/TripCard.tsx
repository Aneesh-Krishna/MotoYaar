import Link from "next/link";
import { MapPin, Calendar, Clock, Car } from "lucide-react";
import { cn, formatINR, formatDate } from "@/lib/utils";
import type { Trip } from "@/types";

interface TripCardProps {
  trip: Trip;
  className?: string;
}

export function TripCard({ trip, className }: TripCardProps) {
  const dateLabel = trip.endDate
    ? `${formatDate(trip.startDate)} — ${formatDate(trip.endDate)}`
    : formatDate(trip.startDate);

  return (
    <Link
      href={`/trips/${trip.id}`}
      className={cn(
        "block bg-card rounded-card shadow-card border border-border p-4",
        "hover:shadow-md transition-shadow",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className
      )}
      aria-label={`Trip: ${trip.title}`}
    >
      {/* Title + cost */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-heading font-semibold text-foreground flex-1 min-w-0 truncate">
          {trip.title}
        </h3>
        {trip.totalCost !== undefined && (
          <span className="shrink-0 text-body font-semibold text-primary tabular-nums">
            {formatINR(trip.totalCost)}
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 text-caption text-foreground-muted">
          <Calendar size={12} aria-hidden="true" />
          <time dateTime={trip.startDate}>{dateLabel}</time>
        </span>

        {trip.routeText && (
          <span className="flex items-center gap-1.5 text-caption text-foreground-muted">
            <MapPin size={12} aria-hidden="true" />
            <span className="truncate max-w-[160px]">{trip.routeText}</span>
          </span>
        )}

        {trip.timeTaken && (
          <span className="flex items-center gap-1.5 text-caption text-foreground-muted">
            <Clock size={12} aria-hidden="true" />
            {trip.timeTaken}
          </span>
        )}

        {trip.vehicle && (
          <span className="flex items-center gap-1.5 text-caption text-foreground-muted">
            <Car size={12} aria-hidden="true" />
            {trip.vehicle.name}
          </span>
        )}
      </div>
    </Link>
  );
}