import Link from "next/link";
import Image from "next/image";
import { Car } from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import type { Vehicle } from "@/types";

interface VehicleCardProps {
  vehicle: Vehicle;
  /** Renders as a horizontal card for dashboard scroll (default: false = vertical list card) */
  compact?: boolean;
  className?: string;
}

export function VehicleCard({ vehicle, compact = false, className }: VehicleCardProps) {
  const content = (
    <>
      {/* Vehicle image */}
      <div
        className={cn(
          "relative bg-gray-100 flex items-center justify-center shrink-0",
          compact
            ? "w-full h-32 rounded-t-card"
            : "w-16 h-16 rounded-lg"
        )}
      >
        {vehicle.imageUrl ? (
          <Image
            src={vehicle.imageUrl}
            alt={vehicle.name}
            fill
            className={cn("object-cover", compact ? "rounded-t-card" : "rounded-lg")}
            sizes={compact ? "160px" : "64px"}
          />
        ) : (
          <Car
            size={compact ? 32 : 24}
            className="text-gray-400"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Info */}
      <div className={cn("flex-1 min-w-0", compact ? "p-3" : "py-1")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-heading font-semibold truncate text-foreground">
              {vehicle.name}
            </p>
            <p className="text-caption text-foreground-muted mt-0.5">
              {vehicle.registrationNumber}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-gray-100 text-foreground-muted text-caption px-2 py-0.5 font-medium capitalize">
            {vehicle.type}
          </span>
        </div>

        <div className="flex items-center justify-between mt-2">
          {vehicle.nextDocumentStatus && (
            <StatusBadge
              status={vehicle.nextDocumentStatus}
              showLabel={!compact}
            />
          )}
          {vehicle.totalSpend !== undefined && (
            <span className="text-caption text-foreground-muted">
              {formatINR(vehicle.totalSpend)}
            </span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <Link
      href={`/garage/${vehicle.id}`}
      className={cn(
        "block bg-card rounded-card shadow-card border border-border",
        "hover:shadow-md transition-shadow",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        compact
          ? "w-40 shrink-0 flex flex-col"
          : "flex items-center gap-3 p-3",
        className
      )}
      aria-label={`${vehicle.name} — ${vehicle.registrationNumber}`}
    >
      {content}
    </Link>
  );
}