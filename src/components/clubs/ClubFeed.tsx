"use client";

import { useCallback, useEffect, useState } from "react";
import { PostCard } from "@/components/ui/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getClubPosts } from "@/services/api/clubApi";
import type { FeedPost } from "@/types";


interface ClubFeedProps {
  clubId: string;
}

export function ClubFeed({ clubId }: ClubFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getClubPosts(clubId, 1)
      .then((result) => {
        if (cancelled) return;
        setPosts(result.posts);
        setHasMore(result.hasMore);
        setPage(1);
      })
      .catch(() => { if (!cancelled) setError("Failed to load posts."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [clubId]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const next = page + 1;
    try {
      const result = await getClubPosts(clubId, next);
      setPosts((prev) => [...prev, ...result.posts]);
      setHasMore(result.hasMore);
      setPage(next);
    } catch { /* non-fatal */ }
    finally { setIsLoadingMore(false); }
  }, [clubId, hasMore, isLoadingMore, page]);

  if (isLoading) return <div className="py-12 text-center text-zinc-500 text-sm">Loading…</div>;
  if (error) return <div className="py-12 text-center text-red-400 text-sm">{error}</div>;
  if (posts.length === 0) return <EmptyState heading="No posts yet" subtext="Be the first to post in this club" />;

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoadingMore}
          className="w-full py-3 text-sm text-zinc-400 hover:text-white disabled:opacity-50"
        >
          {isLoadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
