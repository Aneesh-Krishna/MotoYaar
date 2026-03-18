"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Car,
  Users,
  MapPin,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",          label: "Home",      Icon: Home    },
  { href: "/garage",    label: "Garage",    Icon: Car     },
  { href: "/community", label: "Community", Icon: Users   },
  { href: "/trips",     label: "Trips",     Icon: MapPin  },
  { href: "/profile",   label: "Profile",   Icon: User    },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      role="tablist"
      aria-label="Main navigation"
      className={cn(
        "fixed bottom-0 inset-x-0 z-40",
        "bg-card shadow-nav pb-safe",
        // Desktop: hidden (replaced by sidebar)
        "lg:hidden"
      )}
      style={{ height: "calc(4rem + env(safe-area-inset-bottom))" }}
    >
      <ul className="flex h-16 items-stretch">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
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
                  "flex h-full flex-col items-center justify-center gap-0.5",
                  "text-foreground-muted transition-colors",
                  // Minimum tap target 44×44px
                  "min-h-[44px] min-w-[44px]",
                  isActive && "text-primary"
                )}
              >
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-[0.625rem] font-medium leading-none",
                    isActive ? "text-primary" : "text-foreground-muted"
                  )}
                >
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