"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_TABS } from "@/config/nav";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      role="tablist"
      aria-label="Main navigation"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "h-16 pb-safe",
        "bg-white border-t border-gray-200",
        "lg:hidden"
      )}
    >
      <ul className="flex h-full items-stretch">
        {NAV_TABS.map(({ href, label, Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <li key={href} className="flex-1" role="none">
              <Link
                href={href}
                role="tab"
                aria-selected={isActive}
                aria-label={label}
                className={cn(
                  "flex h-full min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5",
                  "transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
                  isActive ? "text-orange-500" : "text-gray-500"
                )}
              >
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  aria-hidden="true"
                />
                <span className="text-[0.625rem] font-medium leading-none">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
