"use client";

import { useState } from "react";
import { UserCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { memberAction } from "@/services/api/clubApi";
import type { ClubMember } from "@/types";

interface MemberListProps {
  clubId: string;
  members: ClubMember[];
  currentUserId: string;
  isAdmin: boolean;
  onRefresh: () => void;
}

export function MemberList({ clubId, members, currentUserId, isAdmin, onRefresh }: MemberListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const active = members.filter((m) => m.status === "active");
  const pending = members.filter((m) => m.status === "pending");

  async function doAction(userId: string, action: "approve" | "reject" | "remove" | "promote") {
    setLoading(userId + action);
    try {
      await memberAction(clubId, userId, action);
      onRefresh();
    } catch {
      // ignore — user can retry
    } finally {
      setLoading(null);
      setExpanded(null);
    }
  }

  function MemberRow({ member }: { member: ClubMember }) {
    const isMe = member.userId === currentUserId;
    const open = expanded === member.id;
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <button
          className="flex w-full items-center gap-3 px-4 py-3"
          onClick={() => isAdmin && !isMe ? setExpanded(open ? null : member.id) : undefined}
        >
          {member.user?.profileImageUrl ? (
            <img src={member.user.profileImageUrl} className="h-9 w-9 rounded-full object-cover shrink-0" alt="" />
          ) : (
            <UserCircle className="h-9 w-9 text-zinc-500 shrink-0" />
          )}
          <div className="flex-1 min-w-0 text-left">
            <p className="font-medium text-white truncate">{member.user?.name ?? "Unknown"}</p>
            {member.user?.username && (
              <p className="text-xs text-zinc-500 truncate">@{member.user.username}</p>
            )}
          </div>
          <span className={cn("text-xs px-2 py-0.5 rounded-full shrink-0",
            member.role === "admin" ? "bg-amber-900 text-amber-300" : "bg-zinc-800 text-zinc-400"
          )}>
            {member.role}
          </span>
          {isAdmin && !isMe && (
            open ? <ChevronUp className="h-4 w-4 text-zinc-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />
          )}
        </button>
        {open && isAdmin && (
          <div className="flex gap-2 px-4 pb-3">
            {member.status === "active" && (
              <>
                {member.role === "member" && (
                  <button
                    disabled={loading === member.id + "promote"}
                    onClick={() => doAction(member.userId, "promote")}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-900 text-blue-300 hover:bg-blue-800 disabled:opacity-50"
                  >Promote to admin</button>
                )}
                <button
                  disabled={loading === member.id + "remove"}
                  onClick={() => doAction(member.userId, "remove")}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-900 text-red-300 hover:bg-red-800 disabled:opacity-50"
                >Remove</button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">Pending ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                {m.user?.profileImageUrl ? (
                  <img src={m.user.profileImageUrl} className="h-9 w-9 rounded-full object-cover shrink-0" alt="" />
                ) : (
                  <UserCircle className="h-9 w-9 text-zinc-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{m.user?.name ?? "Unknown"}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      disabled={loading === m.id + "approve"}
                      onClick={() => doAction(m.userId, "approve")}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-900 text-green-300 hover:bg-green-800 disabled:opacity-50"
                    >Approve</button>
                    <button
                      disabled={loading === m.id + "reject"}
                      onClick={() => doAction(m.userId, "reject")}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-900 text-red-300 hover:bg-red-800 disabled:opacity-50"
                    >Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 mb-2">Members ({active.length})</h3>
        <div className="space-y-2">
          {active.map((m) => <MemberRow key={m.id} member={m} />)}
        </div>
      </div>
    </div>
  );
}
