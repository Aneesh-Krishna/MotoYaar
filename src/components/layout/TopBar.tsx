"use client";

import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  /** Override the default "MotoYaar" title with a page-specific heading. */
  title?: string;
  /** Show the brand logo instead of a text title (default: true on Home). */
  showLogo?: boolean;
  /** Extra content rendered on the right side (e.g. an Edit button). */
  actions?: React.ReactNode;
  unreadCount?: number;
}

export function TopBar({
  title,
  showLogo = false,
  actions,
  unreadCount = 0,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border">
      <div className="flex h-14 items-center px-screen-x gap-3 max-w-screen-xl mx-auto">
        {/* Left: Logo or title */}
        <div className="flex-1 min-w-0">
          {showLogo ? (
            <span className="text-primary font-bold text-xl tracking-tight">
              MotoYaar
            </span>
          ) : (
            <h1 className="text-heading font-semibold truncate text-foreground">
              {title}
            </h1>
          )}
        </div>

        {/* Right: custom actions + notification bell */}
        <div className="flex items-center gap-1">
          {actions}

          <button
            aria-label={
              unreadCount > 0
                ? `${unreadCount} unread notifications`
                : "Notifications"
            }
            className={cn(
              "relative flex items-center justify-center",
              "w-10 h-10 rounded-full",
              "text-foreground-muted hover:text-foreground hover:bg-gray-100",
              "transition-colors"
            )}
          >
            <Bell size={20} aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-1.5 right-1.5",
                  "min-w-[16px] h-4 px-1",
                  "bg-primary text-white text-[10px] font-bold",
                  "rounded-full flex items-center justify-center leading-none"
                )}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}