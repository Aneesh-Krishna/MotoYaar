"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { timeAgo } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Comment } from "@/types";

interface CommentThreadProps {
  comments: Comment[];
  postId: string;
  currentUserId?: string;
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onLoginPrompt?: () => void;
}

export function CommentThread({ comments, currentUserId, onAddComment, onDeleteComment, onLoginPrompt }: CommentThreadProps) {
  if (comments.length === 0) {
    return <p className="text-sm text-foreground-muted py-4 text-center">No comments yet. Be the first!</p>;
  }

  return (
    <div className="space-y-5">
      {comments.map((comment) => (
        <TopLevelComment
          key={comment.id}
          comment={comment}
          currentUserId={currentUserId}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          onLoginPrompt={onLoginPrompt}
        />
      ))}
    </div>
  );
}

function TopLevelComment({
  comment,
  currentUserId,
  onAddComment,
  onDeleteComment,
  onLoginPrompt,
}: {
  comment: Comment;
  currentUserId?: string;
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onLoginPrompt?: () => void;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddComment(replyContent.trim(), comment.id);
      setReplyContent("");
      setShowReplyInput(false);
    } catch {
      toast.error("Failed to post reply");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isAuthenticated = !!currentUserId;
  const isOwnComment = isAuthenticated && currentUserId === comment.userId;
  const showReplyButton = !comment.deleted;

  const handleReplyClick = () => {
    if (!isAuthenticated) {
      onLoginPrompt?.();
      return;
    }
    setShowReplyInput((s) => !s);
  };

  return (
    <div>
      <CommentRow
        comment={comment}
        isOwn={isOwnComment}
        onDelete={onDeleteComment}
      />

      {showReplyButton && (
        <button
          onClick={handleReplyClick}
          className="ml-9 mt-1 text-xs text-foreground-muted hover:text-foreground transition-colors"
        >
          Reply
        </button>
      )}

      {/* Replies — indented, newest last */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-9 mt-2 pl-3 border-l border-border space-y-3">
          {comment.replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              isOwn={isAuthenticated && currentUserId === reply.userId}
              onDelete={onDeleteComment}
            />
          ))}
        </div>
      )}

      {/* Inline reply input — authenticated users only */}
      {showReplyInput && isAuthenticated && (
        <form onSubmit={handleSubmitReply} className="ml-9 mt-2 flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply…"
            className="flex-1 text-sm border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!replyContent.trim() || isSubmitting}
            className="text-sm font-medium text-primary disabled:opacity-50"
          >
            Reply
          </button>
          <button
            type="button"
            onClick={() => {
              setShowReplyInput(false);
              setReplyContent("");
            }}
            className="text-sm text-foreground-muted"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  isOwn,
  onDelete,
}: {
  comment: Comment;
  isOwn: boolean;
  onDelete?: (commentId: string) => Promise<void>;
}) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
      setDeleteModalOpen(false);
    } catch {
      toast.error("Failed to delete comment");
      setDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="flex gap-2.5">
        <div className="relative w-7 h-7 rounded-full bg-gray-200 shrink-0 overflow-hidden">
          {comment.author?.profileImageUrl ? (
            <Image
              src={comment.author.profileImageUrl}
              alt={comment.author.name}
              fill
              className="object-cover"
              sizes="28px"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-500">
              {comment.author?.name?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-semibold text-foreground">
              {comment.author?.name ?? "Unknown"}
            </span>
            <time className="text-xs text-foreground-muted" dateTime={comment.createdAt}>
              {timeAgo(comment.createdAt)}
            </time>
            {isOwn && !comment.deleted && onDelete && (
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="ml-auto text-xs text-red-500 hover:text-red-700 transition-colors shrink-0"
              >
                Delete
              </button>
            )}
          </div>
          {comment.deleted ? (
            <p className="text-sm text-gray-400 italic mt-0.5">[deleted]</p>
          ) : (
            <p className="text-sm text-foreground mt-0.5 break-words">{comment.content}</p>
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
    </>
  );
}
