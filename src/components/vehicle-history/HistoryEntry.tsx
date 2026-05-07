import { Wrench, MapPin, Gauge } from "lucide-react";
import type { VehicleHistoryEntry } from "@/services/vehicleHistoryService";

function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

interface Props {
  entry: VehicleHistoryEntry;
}

export function HistoryEntry({ entry }: Props) {
  if (entry.deletedByOwner) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 bg-card rounded-card border border-border opacity-60">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <Wrench size={14} className="text-foreground-muted" aria-hidden="true" />
        </div>
        <p className="text-body text-foreground-muted italic">
          Service — entry removed by owner · {formatMonthYear(entry.date)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-card rounded-card border border-border">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Wrench size={14} className="text-primary" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-body font-semibold text-foreground">{entry.reason}</p>
        <p className="text-caption text-foreground-muted">{formatMonthYear(entry.date)}</p>
        {entry.serviceCenterName && (
          <p className="text-caption text-foreground-muted flex items-center gap-1">
            <MapPin size={11} aria-hidden="true" />
            {entry.serviceCenterName}
          </p>
        )}
        {entry.odometerKm != null && (
          <p className="text-caption text-foreground-muted flex items-center gap-1">
            <Gauge size={11} aria-hidden="true" />
            {entry.odometerKm.toLocaleString("en-IN")} km
          </p>
        )}
      </div>
    </div>
  );
}
