"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Users, Link as LinkIcon, Archive, UserMinus } from "lucide-react";
import type { GroupExpenseSession } from "@/services/groupExpenseService";

interface Props {
  session: GroupExpenseSession;
  currentUserId: string;
}

export default function SessionHeader({ session, currentUserId }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreator = session.createdBy === currentUserId;
  const joinLink = `${typeof window !== "undefined" ? window.location.origin : ""}/group-expenses/join/${session.inviteCode}`;

  async function handleCopyLink() {
    await navigator.clipboard.writeText(joinLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleArchive() {
    setArchiving(true);
    setError(null);
    try {
      const res = await fetch(`/api/group-expenses/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (!res.ok) throw new Error("Failed to archive session");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setArchiving(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    setRemoving(userId);
    setError(null);
    try {
      const res = await fetch(`/api/group-expenses/${session.id}/members/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to remove member");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {session.title ?? "Group Expense Session"}
          </h1>
          <span
            className={[
              "inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full",
              session.status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500",
            ].join(" ")}
          >
            {session.status}
          </span>
        </div>

        {isCreator && session.status === "active" && (
          <button
            onClick={handleArchive}
            disabled={archiving}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <Archive size={15} />
            Archive
          </button>
        )}
      </div>

      <button
        onClick={handleCopyLink}
        className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700"
      >
        <LinkIcon size={15} />
        {copied ? "Link copied!" : "Copy invite link"}
      </button>

      <div>
        <p className="text-xs font-medium text-gray-400 uppercase mb-2 flex items-center gap-1">
          <Users size={13} />
          Members ({session.members.length})
        </p>
        <ul className="space-y-2">
          {session.members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {m.profileImageUrl ? (
                  <Image
                    src={m.profileImageUrl}
                    alt={m.name}
                    width={28}
                    height={28}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">
                    {m.name[0]}
                  </div>
                )}
                <span className="text-sm text-gray-800">{m.name}</span>
                {m.username && (
                  <span className="text-xs text-gray-400">@{m.username}</span>
                )}
                {m.userId === session.createdBy && (
                  <span className="text-xs text-orange-500 font-medium">creator</span>
                )}
              </div>
              {isCreator && m.userId !== currentUserId && session.status === "active" && (
                <button
                  onClick={() => handleRemoveMember(m.userId)}
                  disabled={removing === m.userId}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-40"
                  aria-label={`Remove ${m.name}`}
                >
                  <UserMinus size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
