import type { FeedPost } from "@/types";

export async function listPosts(
  sort: "trending" | "newest",
  page: number,
  tag?: string,
  q?: string
): Promise<{ posts: FeedPost[]; hasMore: boolean }> {
  const params = new URLSearchParams({ sort, page: String(page) });
  if (tag) params.set("tag", tag);
  if (q) params.set("q", q);
  const res = await fetch(`/api/posts?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
}
