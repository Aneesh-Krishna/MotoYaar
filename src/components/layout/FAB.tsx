"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { FAB_CONFIG } from "@/config/nav";

export function FAB() {
  const pathname = usePathname();

  const fabEntry = Object.entries(FAB_CONFIG).find(([key]) =>
    pathname.startsWith(key)
  );

  if (!fabEntry) return null;

  const [, { label, href }] = fabEntry;

  return (
    <Link
      href={href}
      aria-label={label}
      className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      <Plus size={24} aria-hidden="true" />
    </Link>
  );
}
