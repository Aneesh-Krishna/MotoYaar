"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import type { Club } from "@/types";

interface ClubCardProps {
  club: Club;
}

export function ClubCard({ club }: ClubCardProps) {
  return (
    <Link
      href={`/clubs/${club.id}`}
      className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-600 transition-colors"
    >
      {club.logoUrl ? (
        <img src={club.logoUrl} alt={club.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-zinc-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white truncate">{club.name}</p>
        <p className="text-xs text-zinc-400 truncate">{club.city}</p>
      </div>
      {club.memberCount !== undefined && (
        <span className="text-xs text-zinc-500 shrink-0">{club.memberCount} members</span>
      )}
    </Link>
  );
}
