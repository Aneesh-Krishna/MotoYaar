"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronUp, ChevronDown } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Comment } from "@/types";

// Depth-based thread line colors cycling through Reddit-style palette
const THREAD_LINE_COLORS = [
  "bg-blue-400",
  "bg-green-400",
  "bg-orange-400",
  "bg-purple-400",
  "bg-red-400",
  "bg-pink-400",
  "bg-teal-400",
  "bg-yellow-400",
];

interface CommentThreadProps {
  comments: Comment[];
  postId: string;
  currentUserId?: string;
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onLoginPrompt?: () => void;
}

export function CommentThread({
  comments,
  currentUserId,
  onAddComment,
  onDeleteComment,
  onLoginPrompt,
}: CommentThreadProps) {
  // Track per-comment vote state (optimistic)
  const [voteState, setVoteState] = useState<Record<string, { score: number; userVote: "up" | "down" | undefined }>>({});
  // Track which comment has its reply form open
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  const getScore = useCallback(
    (comment: Comment) => voteState[comment.id]?.score ?? comment.score,
    [voteState]
  );
  const getUserVote = useCallback(
    (comment: Comment) => (comment.id in voteState ? voteState[comment.id].userVote : comment.userVote),
    [voteState]
  );

  async function handleVote(comment: Comment, type: "up" | "down") {
    if (!currentUserId) {
      onLoginPrompt?.();
      return;
    }

    const prev = { score: getScore(comment), userVote: getUserVote(comment) };
    const isSame = prev.userVote === type;

    // Optimistic update
    let newScore = prev.score;
    let newUserVote: "up" | "down" | undefined;
    if (isSame) {
      newScore += type === "up" ? -1 : 1;
      newUserVote = undefined;
    } else if (!prev.userVote) {
      newScore += type === "up" ? 1 : -1;
      newUserVote = type;
    } else {
      newScore += type === "up" ? 2 : -2;
      newUserVote = type;
    }
    setVoteState((s) => ({ ...s, [comment.id]: { score: newScore, userVote: newUserVote } }));

    try {
      const res = await fetch(`/api/comments/${comment.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setVoteState((s) => ({ ...s, [comment.id]: { score: data.score, userVote: data.userVote ?? undefined } }));
    } catch {
      setVoteState((s) => ({ ...s, [comment.id]: { score: prev.score, userVote: prev.userVote } }));
      toast.error("Failed to vote");
    }
  }

  if (comments.length === 0) {
    return <p className="text-sm text-foreground-muted py-4 text-center">No comments yet. Be the first!</p>;
  }

  return (
    <div className="space-y-1">
      {comments.map((comment) => (
        <CommentNode
          key={comment.id}
          comment={comment}
          depth={0}
          currentUserId={currentUserId}
          activeReplyId={activeReplyId}
          setActiveReplyId={setActiveReplyId}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          onLoginPrompt={onLoginPrompt}
          getScore={getScore}
          getUserVote={getUserVote}
          onVote={handleVote}
        />
      ))}
    </div>
  );
}

interface CommentNodeProps {
  comment: Comment;
  depth: number;
  currentUserId?: string;
  activeReplyId: string | null;
  setActiveReplyId: (id: string | null) => void;
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onLoginPrompt?: () => void;
  getScore: (comment: Comment) => number;
  getUserVote: (comment: Comment) => "up" | "down" | undefined;
  onVote: (comment: Comment, type: "up" | "down") => void;
}

function CommentNode({
  comment,
  depth,
  currentUserId,
  activeReplyId,
  setActiveReplyId,
  onAddComment,
  onDeleteComment,
  onLoginPrompt,
  getScore,
  getUserVote,
  onVote,
}: CommentNodeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const score = getScore(comment);
  const userVote = getUserVote(comment);
  const isOwn = !!currentUserId && currentUserId === comment.userId;
  const hasReplies = (comment.replies?.length ?? 0) > 0;
  const isReplying = activeReplyId === comment.id;
  const lineColor = THREAD_LINE_COLORS[depth % THREAD_LINE_COLORS.length];

  function countDescendants(c: Comment): number {
    return (c.replies ?? []).reduce((sum, r) => sum + 1 + countDescendants(r), 0);
  }
  const descendantCount = countDescendants(comment);

  async function handleConfirmDelete() {
    if (!onDeleteComment) return;
    setIsDeleting(true);
    try {
      await onDeleteComment(comment.id);
      setDeleteModalOpen(false);
    } catch {
      toast.error("Failed to delete comment");
      setDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setIsSubmittingReply(true);
    try {
      await onAddComment(replyContent.trim(), comment.id);
      setReplyContent("");
      setActiveReplyId(null);
    } catch {
      toast.error("Failed to post reply");
    } finally {
      setIsSubmittingReply(false);
    }
  }

  function handleReplyClick() {
    if (!currentUserId) {
      onLoginPrompt?.();
      return;
    }
    setActiveReplyId(isReplying ? null : comment.id);
    setReplyContent("");
  }

  const scoreDisplay = score > 0 ? `+${score}` : String(score);

  return (
    <div className={depth > 0 ? "mt-1" : ""}>
      <div className="flex gap-0">
        {/* Thread line column — click to collapse */}
        {depth > 0 && (
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand thread" : "Collapse thread"}
            className="flex-shrink-0 w-5 flex justify-center pt-1 group"
          >
            <div
              className={`w-0.5 rounded-full min-h-full group-hover:opacity-70 transition-opacity ${lineColor}`}
              style={{ minHeight: "100%" }}
            />
          </button>
        )}

        <div className="flex-1 min-w-0">
          {/* Comment header row */}
          <div className="flex items-start gap-2">
            {/* Upvote / score / downvote column — vertical like Reddit */}
            <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
              <button
                onClick={() => onVote(comment, "up")}
                aria-label="Upvote"
                className={`p-0.5 rounded transition-colors ${
                  userVote === "up"
                    ? "text-orange-500"
                    : "text-gray-400 hover:text-orange-500"
                }`}
              >
                <ChevronUp size={16} strokeWidth={2.5} />
              </button>
              <span
                className={`text-xs font-bold tabular-nums leading-none ${
                  userVote === "up"
                    ? "text-orange-500"
                    : userVote === "down"
                    ? "text-blue-500"
                    : "text-gray-500"
                }`}
              >
                {scoreDisplay}
              </span>
              <button
                onClick={() => onVote(comment, "down")}
                aria-label="Downvote"
                className={`p-0.5 rounded transition-colors ${
                  userVote === "down"
                    ? "text-blue-500"
                    : "text-gray-400 hover:text-blue-500"
                }`}
              >
                <ChevronDown size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Comment body */}
            <div className="flex-1 min-w-0 pb-2">
              {/* Author + time + collapse indicator */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="relative w-5 h-5 rounded-full bg-gray-200 shrink-0 overflow-hidden">
                  {comment.author?.profileImageUrl ? (
                    <Image
                      src={comment.author.profileImageUrl}
                      alt={comment.author.name}
                      fill
                      className="object-cover"
                      sizes="20px"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-500">
                      {comment.author?.name?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {comment.author?.name ?? "Unknown"}
                </span>
                <time className="text-xs text-foreground-muted" dateTime={comment.createdAt}>
                  {timeAgo(comment.createdAt)}
                </time>
                {collapsed && descendantCount > 0 && (
                  <button
                    onClick={() => setCollapsed(false)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    [{descendantCount} {descendantCount === 1 ? "reply" : "replies"}]
                  </button>
                )}
                {isOwn && !comment.deleted && onDeleteComment && (
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="ml-auto text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Content */}
              {comment.deleted ? (
                <p className="text-sm text-gray-400 italic mt-0.5">[deleted]</p>
              ) : (
                <p className="text-sm text-foreground mt-0.5 break-words leading-snug">
                  {comment.content}
                </p>
              )}

              {/* Action bar */}
              {!collapsed && !comment.deleted && (
                <button
                  onClick={handleReplyClick}
                  className="mt-1 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors"
                >
                  Reply
                </button>
              )}

              {/* Inline reply form */}
              {isReplying && !collapsed && (
                <form onSubmit={handleSubmitReply} className="mt-2 flex flex-col gap-2">
                  <textarea
                    autoFocus
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="What are your thoughts?"
                    rows={3}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-primary resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={!replyContent.trim() || isSubmittingReply}
                      className="px-3 py-1 text-xs font-semibold bg-orange-500 text-white rounded-full disabled:opacity-50 hover:bg-orange-600 transition-colors"
                    >
                      {isSubmittingReply ? "Posting…" : "Reply"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveReplyId(null);
                        setReplyContent("");
                      }}
                      className="px-3 py-1 text-xs font-semibold text-foreground-muted border border-gray-300 rounded-full hover:border-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Nested replies */}
          {!collapsed && hasReplies && (
            <div className="ml-5 space-y-1">
              {comment.replies!.map((reply) => (
                <CommentNode
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  currentUserId={currentUserId}
                  activeReplyId={activeReplyId}
                  setActiveReplyId={setActiveReplyId}
                  onAddComment={onAddComment}
                  onDeleteComment={onDeleteComment}
                  onLoginPrompt={onLoginPrompt}
                  getScore={getScore}
                  getUserVote={getUserVote}
                  onVote={onVote}
                />
              ))}
            </div>
          )}

          {/* Collapsed summary at root level (depth === 0) */}
          {collapsed && depth === 0 && (
            <button
              onClick={() => setCollapsed(false)}
              className="ml-7 text-xs text-blue-500 hover:underline"
            >
              [{descendantCount} {descendantCount === 1 ? "reply" : "replies"}] Click to expand
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        open={deleteModalOpen}
        title="Delete comment"
        description="Are you sure you want to delete this comment? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalOpen(false)}
        isLoading={isDeleting}
      />
    </div>
  );
}
