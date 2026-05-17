"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Share2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClubFeed } from "./ClubFeed";
import { MemberList } from "./MemberList";
import { PostForm } from "@/components/community/PostForm";
import { getClubMembers, joinClubById } from "@/services/api/clubApi";
import type { Club, ClubMember } from "@/types";
import type { CreatePostInput } from "@/lib/validations/post";
import { toast } from "sonner";

interface ClubProfileViewProps {
  club: Club;
  currentUserId: string;
}

type Tab = "feed" | "members";

export function ClubProfileView({ club, currentUserId }: ClubProfileViewProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("feed");
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [feedKey, setFeedKey] = useState(0);

  const membership = members.find((m) => m.userId === currentUserId);
  const isActiveMember = membership?.status === "active";
  const isPending = membership?.status === "pending";
  const isAdmin = membership?.role === "admin" && isActiveMember;

  const loadMembers = useCallback(() => {
    getClubMembers(club.id)
      .then((data) => { setMembers(data); setMembersLoaded(true); })
      .catch(() => {});
  }, [club.id]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      const result = await joinClubById(club.id);
      if (result.status === "active") {
        toast.success("You joined the club!");
        loadMembers();
      } else {
        toast.success("Join request sent! Waiting for admin approval.");
        loadMembers();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setIsJoining(false);
    }
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/clubs/join/${club.inviteCode}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Invite link copied!"));
  };

  async function uploadPostImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/uploads/post-image", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Upload failed");
    }
    const { key } = await res.json();
    return `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;
  }

  async function handleClubPost(data: CreatePostInput) {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, clubId: club.id }),
    });
    if (!res.ok) {
      toast.error("Failed to post. Please try again.");
      return;
    }
    toast.success("Posted to club!");
    setFeedKey((k) => k + 1);
  }

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-zinc-800">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-white truncate">{club.name}</h1>
          <p className="text-xs text-zinc-500">{club.city}</p>
        </div>
        {isActiveMember && (
          <button onClick={copyInviteLink} className="text-zinc-400 hover:text-white">
            <Share2 className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Club info */}
      <div className="px-4 py-4 border-b border-zinc-800 flex gap-4 items-start">
        {club.logoUrl ? (
          <img src={club.logoUrl} alt={club.name} className="h-16 w-16 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
            <Users className="h-8 w-8 text-zinc-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {club.description && <p className="text-sm text-zinc-300 mb-2">{club.description}</p>}
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">
              {membersLoaded
                ? `${members.filter((m) => m.status === "active").length} members`
                : `${club.memberCount ?? "…"} members`}
            </span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              club.joinPolicy === "open" ? "bg-green-900 text-green-300" : "bg-zinc-800 text-zinc-400"
            )}>
              {club.joinPolicy === "open" ? "Open" : "Approval required"}
            </span>
          </div>
        </div>
      </div>

      {/* Join / pending state */}
      {!isActiveMember && !isPending && (
        <div className="px-4 py-3 border-b border-zinc-800">
          <button
            onClick={handleJoin}
            disabled={isJoining}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isJoining ? "Joining…" : "Join Club"}
          </button>
        </div>
      )}
      {isPending && (
        <div className="px-4 py-3 border-b border-zinc-800 text-center text-sm text-zinc-400">
          Your join request is pending admin approval.
        </div>
      )}

      {/* Tabs — only for active members */}
      {isActiveMember && (
        <>
          <div className="flex border-b border-zinc-800">
            {(["feed", "members"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-3 text-sm font-medium capitalize transition-colors",
                  tab === t ? "border-b-2 border-primary text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="px-4 py-4">
            {tab === "feed" && (
              <>
                <div className="mb-6 rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-medium text-foreground mb-3">Share with the club</p>
                  <PostForm
                    clubId={club.id}
                    clubName={club.name}
                    onSubmit={handleClubPost}
                    onImageUpload={uploadPostImage}
                    submitLabel="Post to Club"
                    loadingLabel="Posting…"
                  />
                </div>
                <ClubFeed key={feedKey} clubId={club.id} />
              </>
            )}
            {tab === "members" && membersLoaded && (
              <MemberList
                clubId={club.id}
                members={members}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onRefresh={loadMembers}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
