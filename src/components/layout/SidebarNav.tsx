"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_TABS } from "@/config/nav";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-full w-60 z-40",
        "bg-white border-r border-gray-200",
        "hidden lg:flex flex-col"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
        <span className="text-orange-500 font-bold text-xl tracking-tight">
          MotoYaar
        </span>
      </div>

      {/* Nav links */}
      <nav aria-label="Sidebar navigation" className="flex-1 px-3 py-4 space-y-1">
        {NAV_TABS.map(({ href, label, Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5",
                "text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
                isActive
                  ? "border-l-4 border-orange-500 bg-orange-50 text-orange-600"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.75}
                aria-hidden="true"
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User avatar stub */}
      <div className="flex items-center gap-3 px-4 py-4 border-t border-gray-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
          <User size={16} className="text-gray-500" aria-hidden="true" />
        </div>
        <span className="text-sm font-medium text-gray-700 truncate">
          My Profile
        </span>
      </div>
    </aside>
  );
}
