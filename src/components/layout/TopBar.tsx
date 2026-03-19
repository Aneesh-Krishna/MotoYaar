"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";

export function TopBar() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 h-14 z-40",
          "bg-white border-b border-gray-200",
          "lg:hidden"
        )}
      >
        <div className="flex h-full items-center justify-between px-4">
          {/* Logo */}
          <span className="text-orange-500 font-bold text-xl tracking-tight">
            MotoYaar
          </span>

          {/* Bell */}
          <button
            aria-label="Notifications"
            onClick={() => setNotificationsOpen(true)}
            className={cn(
              "relative flex items-center justify-center",
              "w-10 h-10 rounded-full",
              "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
              "transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            )}
          >
            <Bell size={24} aria-hidden="true" />
          </button>
        </div>
      </header>

      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </>
  );
}
