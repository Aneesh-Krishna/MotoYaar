"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertBannerProps {
  variant?: "warning" | "danger";
  message: string;
  href?: string;
  dismissible?: boolean;
  className?: string;
}

export function AlertBanner({
  variant = "warning",
  message,
  href,
  dismissible = true,
  className,
}: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isWarning = variant === "warning";

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-2 px-screen-x py-2.5",
        "text-body font-medium",
        isWarning
          ? "bg-amber-50 text-amber-800 border-b border-amber-200"
          : "bg-red-50 text-red-800 border-b border-red-200",
        className
      )}
    >
      <AlertTriangle
        size={16}
        aria-hidden="true"
        className={isWarning ? "text-status-expiring shrink-0" : "text-status-expired shrink-0"}
      />

      {href ? (
        <a href={href} className="flex-1 hover:underline truncate">
          {message}
        </a>
      ) : (
        <span className="flex-1 truncate">{message}</span>
      )}

      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss alert"
          className={cn(
            "shrink-0 p-1 rounded",
            isWarning ? "hover:bg-amber-100" : "hover:bg-red-100",
            "transition-colors"
          )}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}