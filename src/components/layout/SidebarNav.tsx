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

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-card h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <span className="text-primary font-bold text-xl tracking-tight">MotoYaar</span>
      </div>

      {/* Nav links */}
      <nav aria-label="Sidebar navigation" className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-btn px-3 py-2.5",
                "text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-foreground-muted hover:bg-gray-100 hover:text-foreground"
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
    </aside>
  );
}