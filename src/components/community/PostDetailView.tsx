"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ExternalLink, MoreVertical } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn, timeAgo } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CommentThread } from "@/components/community/CommentThread";
import { LoginPromptModal } from "@/components/community/LoginPromptModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Comment, PostDetail, PostReactionType } from "@/types";

interface PostDetailViewProps {
  post: PostDetail;
  currentUserId?: string;
}

export function PostDetailView({ post, currentUserId }: PostDetailViewProps) {
  const router = useRouter();

  const [likes, setLikes] = useState(post.likes);
  const [dislikes, setDislikes] = useState(post.dislikes);
  const [userReaction, setUserReaction] = useState<PostReactionType | undefined>(post.userReaction);
  const [commentList, setCommentList] = useState<Comment[]>(post.comments);
  const [commentContent, setCommentContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [deletePostModalOpen, setDeletePostModalOpen] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const isOwnPost = currentUserId === post.userId;
  const isAuthenticated = !!currentUserId;
  function countAllComments(list: Comment[]): number {
    return list.reduce((sum, c) => sum + 1 + countAllComments(c.replies ?? []), 0);
  }
  const totalCommentCount = countAllComments(commentList);

  async function handleReaction(type: PostReactionType) {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    // Optimistic update
    const prev = { likes, dislikes, userReaction };
    if (userReaction === type) {
      // toggling off
      if (type === "like") setLikes((l) => l - 1);
      else setDislikes((d) => d - 1);
      setUserReaction(undefined);
    } else if (!userReaction) {
      // new reaction
      if (type === "like") setLikes((l) => l + 1);
      else setDislikes((d) => d + 1);
      setUserReaction(type);
    } else {
      // switching
      if (type === "like") {
        setLikes((l) => l + 1);
        setDislikes((d) => d - 1);
      } else {
        setDislikes((d) => d + 1);
        setLikes((l) => l - 1);
      }
      setUserReaction(type);
    }

    try {
      const res = await fetch(`/api/posts/${post.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLikes(data.likes);
      setDislikes(data.dislikes);
      setUserReaction(data.userReaction ?? undefined);
    } catch {
      setLikes(prev.likes);
      setDislikes(prev.dislikes);
      setUserReaction(prev.userReaction);
      toast.error("Failed to update reaction");
    }
  }

  async function handleDeletePost() {
    setIsDeletingPost(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete post");
      router.push("/community");
    } catch {
      toast.error("Failed to delete post");
      setIsDeletingPost(false);
      setDeletePostModalOpen(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete comment");

    function removeFromTree(list: Comment[]): Comment[] {
      return list
        .map((c) => {
          if (c.id === commentId) {
            if ((c.replies?.length ?? 0) > 0) {
              return { ...c, content: "[deleted]", deleted: true };
            }
            return null;
          }
          return { ...c, replies: removeFromTree(c.replies ?? []) };
        })
        .filter(Boolean) as Comment[];
    }

    setCommentList((prev) => removeFromTree(prev));
  }

  async function handleAddComment(content: string, parentId?: string) {
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentCommentId: parentId }),
    });
    if (!res.ok) throw new Error("Failed to add comment");

    const newComment: Comment = await res.json();

    if (parentId) {
      function insertReply(list: Comment[]): Comment[] {
        return list.map((c) => {
          if (c.id === parentId) {
            return { ...c, replies: [...(c.replies ?? []), { ...newComment, replies: [] }] };
          }
          return { ...c, replies: insertReply(c.replies ?? []) };
        });
      }
      setCommentList((prev) => insertReply(prev));
    } else {
      setCommentList((prev) => [...prev, { ...newComment, replies: [] }]);
    }
  }

  async function handleTopLevelComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentContent.trim()) return;
    setIsSubmitting(true);
    try {
      await handleAddComment(commentContent.trim());
      setCommentContent("");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-40 lg:pb-24">
      {/* Post header: author + kebab */}
      <div className="flex items-center gap-2.5 py-4">
        <div className="relative w-9 h-9 rounded-full bg-gray-200 shrink-0 overflow-hidden">
          {post.author?.profileImageUrl ? (
            <Image
              src={post.author.profileImageUrl}
              alt={post.author.name}
              fill
              className="object-cover"
              sizes="36px"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-500">
              {post.author?.name?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {post.author?.name ?? "Unknown"}
          </p>
          <div className="flex items-center gap-1 text-xs text-foreground-muted">
            <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
            {post.edited && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="italic cursor-help">· Edited</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edited {timeAgo(post.updatedAt)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Kebab menu */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              aria-label="Post options"
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <MoreVertical size={16} className="text-gray-500" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-36 p-1">
            {isOwnPost ? (
              <>
                <button
                  onClick={() => router.push(`/community/${post.id}/edit`)}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeletePostModalOpen(true)}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors text-red-600"
                >
                  Delete
                </button>
              </>
            ) : (
              isAuthenticated && (
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                >
                  Report
                </button>
              )
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Title */}
      <h1 className="text-xl font-semibold text-foreground mb-2">{post.title}</h1>

      {/* Image carousel */}
      {post.images.length > 0 && <ImageCarousel imageUrls={post.images} />}

      {/* Description */}
      <p className="text-sm text-foreground mt-3 whitespace-pre-wrap">{post.description}</p>

      {/* Link — href sanitised to http/https only to prevent javascript: injection */}
      {post.links.length > 0 && (
        <a
          href={/^https?:\/\//i.test(post.links[0]) ? post.links[0] : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline break-all"
        >
          <ExternalLink size={13} aria-hidden="true" />
          {post.links[0]}
        </a>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="bg-gray-100 text-foreground-muted text-xs px-2 py-0.5 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center gap-4 mt-4 pb-4 border-b border-border">
        <button
          onClick={() => handleReaction("like")}
          aria-label={`${likes} likes`}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors",
            userReaction === "like"
              ? "bg-green-50 border-green-400 text-green-700"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          )}
        >
          👍 {likes}
        </button>
        <button
          onClick={() => handleReaction("dislike")}
          aria-label={`${dislikes} dislikes`}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors",
            userReaction === "dislike"
              ? "bg-red-50 border-red-400 text-red-700"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          )}
        >
          👎 {dislikes}
        </button>
      </div>

      {/* Comments section */}
      <div id="comments" className="mt-5">
        <h2 className="text-base font-semibold text-foreground mb-3">
          Comments ({totalCommentCount})
        </h2>
        <CommentThread
          comments={commentList}
          postId={post.id}
          currentUserId={currentUserId}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onLoginPrompt={() => setShowLoginPrompt(true)}
        />
      </div>

      {/* Top-level comment input — fixed at bottom */}
      {isAuthenticated ? (
        <form
          onSubmit={handleTopLevelComment}
          className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-40 bg-background border-t border-border px-4 py-3 flex items-center gap-2"
        >
          <input
            type="text"
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 text-sm border border-gray-200 rounded-full px-3 py-2 focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!commentContent.trim() || isSubmitting}
            className="text-sm font-semibold text-primary disabled:opacity-50 shrink-0"
          >
            Post
          </button>
        </form>
      ) : (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-40 bg-background border-t border-border px-4 py-3">
          <button
            onClick={() => setShowLoginPrompt(true)}
            className="w-full text-sm text-left border border-gray-200 rounded-full px-4 py-2 text-gray-400 hover:border-primary transition-colors"
          >
            Sign in to comment…
          </button>
        </div>
      )}

      <LoginPromptModal open={showLoginPrompt} onOpenChange={setShowLoginPrompt} />

      <ConfirmModal
        open={deletePostModalOpen}
        title="Delete post"
        description="This will permanently delete your post and all its comments. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeletePost}
        onClose={() => setDeletePostModalOpen(false)}
        isLoading={isDeletingPost}
      />

      <ReportModal
        postId={post.id}
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
}

function ReportModal({
  postId,
  open,
  onClose,
}: {
  postId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, description: description || undefined }),
      });
      if (res.ok || res.status === 409) {
        toast.success("Thanks for reporting. We'll review this post.");
      }
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setReason("");
      setDescription("");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select value={reason} onValueChange={setReason} required>
            <SelectTrigger>
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spam">Spam</SelectItem>
              <SelectItem value="inappropriate">Inappropriate</SelectItem>
              <SelectItem value="misinformation">Misinformation</SelectItem>
              <SelectItem value="harassment">Harassment</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Additional details (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <Button type="submit" disabled={!reason || isSubmitting} className="w-full">
            {isSubmitting ? "Submitting..." : "Submit report"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImageCarousel({ imageUrls }: { imageUrls: string[] }) {
  const [current, setCurrent] = useState(0);

  if (imageUrls.length === 1) {
    return (
      <div className="relative w-full h-64 rounded-xl overflow-hidden mt-2">
        <Image
          src={imageUrls[0]}
          alt="Post image"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 600px"
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl mt-2">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -50 && current < imageUrls.length - 1)
            setCurrent((c) => c + 1);
          if (info.offset.x > 50 && current > 0) setCurrent((c) => c - 1);
        }}
        animate={{ x: `-${current * 100}%` }}
        className="flex"
      >
        {imageUrls.map((url, i) => (
          <div key={url} className="relative w-full h-64 flex-shrink-0">
            <Image
              src={url}
              alt={`Post image ${i + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
            />
          </div>
        ))}
      </motion.div>
      {/* Dot indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {imageUrls.map((_, i) => (
          <span
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              i === current ? "bg-white" : "bg-white/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}
