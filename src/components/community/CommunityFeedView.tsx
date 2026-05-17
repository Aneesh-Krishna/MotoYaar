"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Tag, Users, X, History, Shield } from "lucide-react";
import Link from "next/link";
import { PostCard } from "@/components/ui/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { listPosts } from "@/services/api/communityApi";
import type { FeedPost } from "@/types";

const FEED_TAGS = [
  "All", "Bikes", "Cars", "Mods", "Travel",
  "Maintenance", "Fuel", "Roads", "Events", "Help",
];

interface CommunityFeedViewProps {
  initialPosts: FeedPost[];
  initialHasMore: boolean;
  isAuthenticated?: boolean;
}

export function CommunityFeedView({ initialPosts, initialHasMore, isAuthenticated = false }: CommunityFeedViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sort, setSort] = useState<"trending" | "newest">("trending");
  const [activeTag, setActiveTag] = useState<string | undefined>(() => searchParams.get("tag") ?? undefined);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get("q") ?? "");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => setDebouncedQuery(value), 300);
  };

  const clearSearch = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const fetchPosts = useCallback(
    async (
      newSort: "trending" | "newest",
      newTag: string | undefined,
      newPage: number,
      newQ?: string
    ) => {
      return listPosts(newSort, newPage, newTag, newQ);
    },
    []
  );

  // Sync URL when active filters change
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (activeTag) newParams.set("tag", activeTag);
    if (debouncedQuery) newParams.set("q", debouncedQuery);
    const qs = newParams.toString();
    router.replace(`/community${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [activeTag, debouncedQuery, router]);

  // Reset feed when sort, tag, or debounced query changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchPosts(sort, activeTag, 1, debouncedQuery || undefined)
      .then((result) => {
        if (cancelled) return;
        setPosts(result.posts);
        setHasMore(result.hasMore);
        setPage(1);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load posts. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [sort, activeTag, debouncedQuery, fetchPosts]);

  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const result = await fetchPosts(sort, activeTag, nextPage, debouncedQuery || undefined);
      setPosts((prev) => [...prev, ...result.posts]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch {
      // Non-fatal: leave existing posts in place
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, page, sort, activeTag, debouncedQuery, fetchPosts]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMorePosts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const result = await fetchPosts(sort, activeTag, 1, debouncedQuery || undefined);
      setPosts(result.posts);
      setHasMore(result.hasMore);
      setPage(1);
    } catch {
      setError("Failed to refresh. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      {/* Search bar + Sort + Tag filters */}
      <div className="border-b border-border bg-card sticky top-14 z-20">
        {/* Search bar */}
        <div className="relative px-4 py-2">
          <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search posts..."
            aria-label="Search posts"
            className="w-full bg-gray-100 rounded-full pl-9 pr-8 py-2 text-sm text-gray-900 outline-none"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-7 top-1/2 -translate-y-1/2"
            >
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Sort chips + Clubs shortcut */}
        <div className="flex gap-2 px-screen-x pt-1 pb-0">
          <Link
            href="/community/clubs"
            className="flex items-center gap-1 rounded-full px-3 py-1 text-caption font-semibold border border-border text-foreground-muted hover:border-gray-400 transition-colors"
          >
            <Shield size={12} />
            Clubs
          </Link>
          {(["Trending", "Newest"] as const).map((label) => {
            const value = label.toLowerCase() as "trending" | "newest";
            return (
              <button
                key={label}
                onClick={() => setSort(value)}
                className={cn(
                  "rounded-full px-3 py-1 text-caption font-semibold border transition-colors",
                  sort === value
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "bg-transparent border-border text-foreground-muted hover:border-gray-400"
                )}
              >
                {label}
              </button>
            );
          })}

          {/* Pull-to-refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh feed"
            className="ml-auto text-caption text-foreground-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isRefreshing ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>

        {/* Tag filter strip */}
        <div
          className="flex gap-2 overflow-x-auto scrollbar-none px-screen-x py-3"
          role="group"
          aria-label="Filter by tag"
        >
          {FEED_TAGS.map((tag) => {
            const isActive = tag === "All" ? !activeTag : activeTag === tag;
            return (
              <button
                key={tag}
                aria-pressed={isActive}
                onClick={() => setActiveTag(tag === "All" ? undefined : tag)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-caption font-medium border transition-colors",
                  isActive
                    ? "bg-primary text-white border-primary"
                    : "bg-transparent border-border text-foreground-muted hover:border-gray-400 hover:text-foreground"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <div className="px-screen-x py-4 max-w-screen-xl mx-auto lg:px-screen-x-md">
        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-6">
          {/* Posts */}
          <div>
            {/* Vehicle History quick access — mobile only */}
            <Link
              href="/vehicle-history"
              className="lg:hidden flex items-center gap-3 mb-4 bg-card rounded-card border border-border p-3 hover:shadow-md transition-shadow"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <History size={16} className="text-primary" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-semibold text-foreground">Vehicle History</p>
                <p className="text-caption text-foreground-muted">Look up service records by reg number</p>
              </div>
            </Link>

            {/* Active tag dismiss chip */}
            {activeTag && (
              <div className="pb-3 flex items-center gap-2">
                <span className="text-xs text-gray-500">Filtered by:</span>
                <button
                  onClick={() => setActiveTag(undefined)}
                  aria-label={`Remove ${activeTag} filter`}
                  className="flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full font-medium"
                >
                  {activeTag}
                  <X size={12} />
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-card" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-sm text-red-500">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : posts.length === 0 && debouncedQuery ? (
              <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
                <Search size={40} className="text-gray-300" />
                <p className="font-semibold text-gray-700">No posts found</p>
                <p className="text-sm text-gray-500">
                  No results for &ldquo;<span className="font-medium">{debouncedQuery}</span>&rdquo;
                </p>
              </div>
            ) : posts.length === 0 && activeTag ? (
              <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
                <Tag size={40} className="text-gray-300" />
                <p className="font-semibold text-gray-700">No posts in this category</p>
                <button onClick={() => setActiveTag(undefined)} className="text-sm text-orange-500">
                  Clear filter
                </button>
              </div>
            ) : posts.length === 0 ? (
              <EmptyState
                icon={<Users size={48} />}
                heading="No posts yet"
                subtext="Be the first to share something with the community."
              />
            ) : (
              <>
                <ul className="space-y-3" aria-label="Community posts">
                  {posts.map((post) => (
                    <li key={post.id}>
                      <PostCard post={post} isAuthenticated={isAuthenticated} />
                    </li>
                  ))}
                </ul>

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-4" />
                {isLoadingMore && (
                  <div className="space-y-3 mt-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-card" />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Desktop sidebar: Trending tags */}
          <aside className="hidden lg:flex lg:flex-col gap-4 sticky top-[120px] self-start">
            <Link
              href="/community/clubs"
              className="flex items-center gap-3 bg-card rounded-card border border-border p-4 shadow-card hover:shadow-md transition-shadow"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Shield size={18} className="text-primary" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-semibold text-foreground">Clubs</p>
                <p className="text-caption text-foreground-muted">Your riding clubs &amp; communities</p>
              </div>
            </Link>
            <Link
              href="/vehicle-history"
              className="flex items-center gap-3 bg-card rounded-card border border-border p-4 shadow-card hover:shadow-md transition-shadow"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <History size={18} className="text-primary" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-semibold text-foreground">Vehicle History</p>
                <p className="text-caption text-foreground-muted">Look up service records by reg number</p>
              </div>
            </Link>

            <div className="bg-card rounded-card border border-border p-4 shadow-card">
              <h3 className="text-heading font-semibold mb-3">Trending Tags</h3>
              <ul className="space-y-2">
                {FEED_TAGS.filter((t) => t !== "All").map((tag) => (
                  <li key={tag}>
                    <button
                      onClick={() => setActiveTag(tag)}
                      className="text-body text-primary hover:text-primary-dark font-medium"
                    >
                      #{tag}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

    </>
  );
}
