import { CheckCircle2, AlertTriangle, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/types";

interface StatusBadgeProps {
  status: DocumentStatus;
  /** Show text label alongside icon (default: true) */
  showLabel?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; Icon: React.ElementType; classes: string }
> = {
  valid: {
    label: "Valid",
    Icon: CheckCircle2,
    classes: "bg-green-50 text-status-valid border-green-200",
  },
  expiring: {
    label: "Expiring",
    Icon: AlertTriangle,
    classes: "bg-amber-50 text-status-expiring border-amber-200",
  },
  expired: {
    label: "Expired",
    Icon: XCircle,
    classes: "bg-red-50 text-status-expired border-red-200",
  },
  incomplete: {
    label: "Incomplete",
    Icon: AlertCircle,
    classes: "bg-gray-50 text-status-incomplete border-gray-200",
  },
};

/**
 * Document status pill — always renders colour + icon + label to
 * ensure colour-blind users receive the same information. Never use
 * colour alone to convey status.
 */
export function StatusBadge({
  status,
  showLabel = true,
  className,
}: StatusBadgeProps) {
  const { label, Icon, classes } = STATUS_CONFIG[status];

  return (
    <span
      role="status"
      aria-label={`Document status: ${label}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
        "text-caption font-medium leading-none",
        classes,
        className
      )}
    >
      <Icon size={12} aria-hidden="true" strokeWidth={2.5} />
      {showLabel && <span>{label}</span>}
    </span>
  );
}