"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { joinClub } from "@/services/api/clubApi";
import type { Club } from "@/types";
import { toast } from "sonner";

interface JoinClubViewProps {
  club: Club;
  inviteCode: string;
}

export function JoinClubView({ club, inviteCode }: JoinClubViewProps) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      const result = await joinClub(inviteCode);
      if (result.status === "active") {
        toast.success("You joined the club!");
        router.push(`/clubs/${club.id}`);
      } else {
        toast.success("Join request sent! Waiting for admin approval.");
        router.push(`/clubs/${club.id}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to join");
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center space-y-4">
        {club.logoUrl ? (
          <img src={club.logoUrl} alt={club.name} className="h-20 w-20 rounded-full object-cover mx-auto" />
        ) : (
          <div className="h-20 w-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
            <Users className="h-10 w-10 text-zinc-500" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-white">{club.name}</h1>
          <p className="text-sm text-zinc-500">{club.city}</p>
        </div>
        {club.description && (
          <p className="text-sm text-zinc-400">{club.description}</p>
        )}
        <p className="text-xs text-zinc-500">
          {club.joinPolicy === "open"
            ? "Anyone with this link can join instantly."
            : "Joining requires admin approval."}
        </p>
        <button
          onClick={handleJoin}
          disabled={isJoining}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isJoining ? "Joining…" : `Join ${club.name}`}
        </button>
        <button
          onClick={() => router.push("/community/clubs")}
          className="w-full text-sm text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
