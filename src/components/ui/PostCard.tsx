import Image from "next/image";
import Link from "next/link";
import { ThumbsUp, ThumbsDown, MessageCircle, Pin } from "lucide-react";
import { cn, timeAgo, truncate } from "@/lib/utils";
import type { Post } from "@/types";

interface PostCardProps {
  post: Post;
  pinned?: boolean;
  className?: string;
}

export function PostCard({ post, pinned = false, className }: PostCardProps) {
  const hasImage = post.images.length > 0;

  return (
    <article
      className={cn(
        "bg-card rounded-card shadow-card border border-border",
        "hover:shadow-md transition-shadow",
        className
      )}
    >
      <Link href={`/community/${post.id}`} className="block p-4">
        {/* Header */}
        <div className="flex items-start gap-2.5 mb-3">
          {/* Avatar */}
          <div className="relative w-8 h-8 rounded-full bg-gray-200 shrink-0 overflow-hidden">
            {post.author?.profileImageUrl ? (
              <Image
                src={post.author.profileImageUrl}
                alt={post.author.name}
                fill
                className="object-cover"
                sizes="32px"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-caption font-bold text-gray-500">
                {post.author?.name?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>

          {/* Author + time */}
          <div className="flex-1 min-w-0">
            <span className="text-caption font-semibold text-foreground">
              {post.author?.name ?? "Unknown"}
            </span>
            <span className="text-caption text-foreground-muted ml-1.5">
              @{post.author?.username}
            </span>
            <span className="text-caption text-foreground-muted mx-1.5">·</span>
            <time
              dateTime={post.createdAt}
              className="text-caption text-foreground-muted"
            >
              {timeAgo(post.createdAt)}
            </time>
          </div>

          {/* Pinned badge */}
          {pinned && (
            <span className="flex items-center gap-1 text-caption text-primary font-medium shrink-0">
              <Pin size={12} aria-hidden="true" />
              Pinned
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-heading font-semibold text-foreground mb-1">
          {post.title}
        </h3>

        {/* Description */}
        <p className="text-body text-foreground-muted line-clamp-2 mb-3">
          {truncate(post.description, 120)}
        </p>

        {/* Image thumbnail */}
        {hasImage && (
          <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-100 mb-3">
            <Image
              src={post.images[0]}
              alt="Post image"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
            />
            {post.images.length > 1 && (
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-caption px-1.5 py-0.5 rounded">
                +{post.images.length - 1}
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3" aria-label="Post tags">
            {post.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 text-foreground-muted text-caption px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </Link>

      {/* Engagement bar */}
      <div className="flex items-center gap-4 px-4 pb-3 border-t border-border pt-2.5">
        <button
          aria-label={`${post.likes} likes`}
          className={cn(
            "flex items-center gap-1.5 text-caption",
            post.userReaction === "like"
              ? "text-primary font-semibold"
              : "text-foreground-muted hover:text-primary transition-colors"
          )}
        >
          <ThumbsUp size={14} aria-hidden="true" />
          <span>{post.likes}</span>
        </button>

        <button
          aria-label={`${post.dislikes} dislikes`}
          className={cn(
            "flex items-center gap-1.5 text-caption",
            post.userReaction === "dislike"
              ? "text-red-600 font-semibold"
              : "text-foreground-muted hover:text-red-500 transition-colors"
          )}
        >
          <ThumbsDown size={14} aria-hidden="true" />
          <span>{post.dislikes}</span>
        </button>

        <Link
          href={`/community/${post.id}#comments`}
          className="flex items-center gap-1.5 text-caption text-foreground-muted hover:text-foreground transition-colors ml-auto"
          aria-label={`${post.commentCount} comments`}
        >
          <MessageCircle size={14} aria-hidden="true" />
          <span>{post.commentCount}</span>
        </Link>

        {post.edited && (
          <span className="text-caption text-foreground-muted italic">
            Edited
          </span>
        )}
      </div>
    </article>
  );
}