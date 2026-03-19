import Link from "next/link";
import { Search, Plus, Users } from "lucide-react";
import { PostCard } from "@/components/ui/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

// ─── Mock data ────────────────────────────────────────────────────────────────

const PREDEFINED_TAGS = [
  "All", "Bikes", "Cars", "Mods", "Travel",
  "Maintenance", "Fuel", "Roads", "Events", "Help",
];

const MOCK_POSTS: Post[] = [
  {
    id: "p1",
    userId: "u2",
    title: "Manali via Rohtang — Solo Ride Report",
    description:
      "Finally did the Manali solo trip on my Bullet. 1,200km over 4 days. Here's everything you need to know about the route, fuel stops, and stay options.",
    images: [],
    links: [],
    tags: ["Bikes", "Travel"],
    edited: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    author: { id: "u2", name: "Ravi Kumar", username: "ravikumar", profileImageUrl: undefined },
    likes: 47,
    dislikes: 2,
    commentCount: 13,
  },
  {
    id: "p2",
    userId: "u3",
    title: "Best engine oil for RE Classic 350?",
    description:
      "My bike just crossed 10,000km and due for a service. Mechanic suggested switching to Motul 7100. Anyone used it? Worth the ₹800 vs standard Castrol?",
    images: [],
    links: [],
    tags: ["Bikes", "Maintenance", "Help"],
    edited: false,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    author: { id: "u3", name: "Priya Sharma", username: "priyasharma", profileImageUrl: undefined },
    likes: 12,
    dislikes: 0,
    commentCount: 8,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const activeTag = "All";

  return (
    <>
      {/* Sort + Tag filters */}
      <div className="border-b border-border bg-card sticky top-14 z-20">
        {/* Sort chips */}
        <div className="flex gap-2 px-screen-x pt-3 pb-0">
          {["Trending", "Newest"].map((sort) => (
            <button
              key={sort}
              className={cn(
                "rounded-full px-3 py-1 text-caption font-semibold border transition-colors",
                sort === "Trending"
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "bg-transparent border-border text-foreground-muted hover:border-gray-400"
              )}
            >
              {sort}
            </button>
          ))}
        </div>

        {/* Tag filter strip */}
        <div
          className="flex gap-2 overflow-x-auto scrollbar-none px-screen-x py-3"
          role="group"
          aria-label="Filter by tag"
        >
          {PREDEFINED_TAGS.map((tag) => (
            <button
              key={tag}
              aria-pressed={tag === activeTag}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-caption font-medium border transition-colors",
                tag === activeTag
                  ? "bg-primary text-white border-primary"
                  : "bg-transparent border-border text-foreground-muted hover:border-gray-400 hover:text-foreground"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="px-screen-x py-4 max-w-screen-xl mx-auto lg:px-screen-x-md">
        {/* Desktop: 2-col layout */}
        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-6">
          {/* Posts */}
          <div>
            {MOCK_POSTS.length === 0 ? (
              <EmptyState
                icon={<Users size={48} />}
                heading="No posts yet"
                subtext="Be the first to share something with the community."
              />
            ) : (
              <ul className="space-y-3" aria-label="Community posts">
                {MOCK_POSTS.map((post) => (
                  <li key={post.id}>
                    <PostCard post={post} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Desktop sidebar: Trending tags */}
          <aside className="hidden lg:block space-y-4">
            <div className="bg-card rounded-card border border-border p-4 shadow-card">
              <h3 className="text-heading font-semibold mb-3">Trending Tags</h3>
              <ul className="space-y-2">
                {PREDEFINED_TAGS.filter((t) => t !== "All").map((tag) => (
                  <li key={tag}>
                    <button className="text-body text-primary hover:text-primary-dark font-medium">
                      #{tag}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* FAB — New Post */}
      <Link
        href="/community/new"
        aria-label="Create a new post"
        className="fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] z-30 lg:hidden
                   w-14 h-14 bg-primary text-white rounded-full shadow-lg
                   flex items-center justify-center
                   hover:bg-primary-dark transition-colors
                   focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Plus size={24} aria-hidden="true" />
      </Link>
    </>
  );
}