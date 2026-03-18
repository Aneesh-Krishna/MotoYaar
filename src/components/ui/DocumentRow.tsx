import { FileText, Upload, Eye, RefreshCw } from "lucide-react";
import { cn, formatDate, daysUntil } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import type { Document } from "@/types";

interface DocumentRowProps {
  document: Document;
  onUpload?: () => void;
  onView?: () => void;
  onReplace?: () => void;
  className?: string;
}

export function DocumentRow({
  document,
  onUpload,
  onView,
  onReplace,
  className,
}: DocumentRowProps) {
  const hasExpiry = !!document.expiryDate;
  const daysLeft = hasExpiry ? daysUntil(document.expiryDate!) : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3.5 border-b border-border last:border-0",
        className
      )}
    >
      {/* Icon */}
      <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
        <FileText size={18} className="text-foreground-muted" aria-hidden="true" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-body font-semibold text-foreground">
            {document.label ?? document.type}
          </span>
          <StatusBadge status={document.status} />
        </div>

        {hasExpiry ? (
          <p className="text-caption text-foreground-muted mt-0.5">
            Expires {formatDate(document.expiryDate!)}
            {daysLeft !== null && daysLeft > 0 && (
              <span className="ml-1">({daysLeft}d left)</span>
            )}
            {daysLeft !== null && daysLeft === 0 && (
              <span className="ml-1 text-status-expired font-medium">(Today!)</span>
            )}
          </p>
        ) : (
          <p className="text-caption text-foreground-muted mt-0.5">
            No expiry date recorded
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1">
        {!hasExpiry && onUpload && (
          <button
            onClick={onUpload}
            aria-label={`Upload ${document.type}`}
            className="flex items-center gap-1 text-caption font-medium text-primary hover:text-primary-dark transition-colors px-2 py-1.5 rounded"
          >
            <Upload size={14} aria-hidden="true" />
            Upload
          </button>
        )}
        {hasExpiry && onView && (
          <button
            onClick={onView}
            aria-label={`View ${document.type}`}
            className="p-1.5 rounded text-foreground-muted hover:text-foreground hover:bg-gray-100 transition-colors"
          >
            <Eye size={16} aria-hidden="true" />
          </button>
        )}
        {hasExpiry && onReplace && (
          <button
            onClick={onReplace}
            aria-label={`Replace ${document.type}`}
            className="p-1.5 rounded text-foreground-muted hover:text-foreground hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}