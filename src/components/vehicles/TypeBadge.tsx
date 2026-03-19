import { cn } from "@/lib/utils";
import type { VehicleType } from "@/types";

const TYPE_DISPLAY: Record<VehicleType, string> = {
  "2-wheeler": "2W",
  "4-wheeler": "4W",
  "truck": "Truck",
  "other": "Other",
};

interface TypeBadgeProps {
  type: VehicleType;
  className?: string;
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full bg-white/20 text-white text-xs px-2 py-0.5 font-medium",
        className
      )}
    >
      {TYPE_DISPLAY[type] ?? "Other"}
    </span>
  );
}
