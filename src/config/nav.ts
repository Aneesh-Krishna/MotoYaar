import { Home, Car, Users, Map, User, type LucideIcon } from "lucide-react";

export interface NavTab {
  href: string;
  label: string;
  Icon: LucideIcon;
}

export const NAV_TABS: NavTab[] = [
  { href: "/",          label: "Home",      Icon: Home  },
  { href: "/garage",    label: "Garage",    Icon: Car   },
  { href: "/community", label: "Community", Icon: Users },
  { href: "/trips",     label: "Trips",     Icon: Map   },
  { href: "/profile",   label: "Profile",   Icon: User  },
];

export interface FabEntry {
  label: string;
  href: string;
}

export const FAB_CONFIG: Record<string, FabEntry> = {
  "/garage":    { label: "Add Vehicle", href: "/garage/new"    },
  "/community": { label: "New Post",    href: "/community/new" },
  "/trips":     { label: "Add Trip",    href: "/trips/new"     },
};
