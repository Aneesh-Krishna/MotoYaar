import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockGetSession, mockListPosts } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockListPosts: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/services/communityService", () => ({
  communityService: { listPosts: mockListPosts },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET } from "../route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AUTHOR_SAFE = { id: "user-1", name: "Alice", username: "alice", profileImageUrl: null };

const FEED_POST = {
  id: "post-1",
  userId: "user-1",
  title: "Test Post",
  description: "A description",
  images: [] as string[],
  links: [] as string[],
  tags: [] as string[],
  edited: false,
  createdAt: "2026-04-14T10:00:00.000Z",
  author: AUTHOR_SAFE,
  likes: 3,
  dislikes: 1,
  commentCount: 2,
  score: 0.5,
  userReaction: undefined,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/posts — guest access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 for unauthenticated requests (no session required)", async () => {
    mockGetSession.mockResolvedValue(null);
    mockListPosts.mockResolvedValue({ posts: [FEED_POST], hasMore: false });

    const res = await GET(new Request("http://localhost/api/posts"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toHaveLength(1);
  });

  it("passes undefined userId to listPosts when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    mockListPosts.mockResolvedValue({ posts: [], hasMore: false });

    await GET(new Request("http://localhost/api/posts"));

    expect(mockListPosts).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Number),
      undefined,
      undefined, // userId = undefined for guests
      undefined
    );
  });

  it("returns userReaction=undefined for unauthenticated request", async () => {
    mockGetSession.mockResolvedValue(null);
    mockListPosts.mockResolvedValue({ posts: [{ ...FEED_POST, userReaction: undefined }], hasMore: false });

    const res = await GET(new Request("http://localhost/api/posts"));
    const body = await res.json();

    expect(body.posts[0].userReaction).toBeUndefined();
  });

  it("never returns email field in author object", async () => {
    mockGetSession.mockResolvedValue(null);
    mockListPosts.mockResolvedValue({ posts: [FEED_POST], hasMore: false });

    const res = await GET(new Request("http://localhost/api/posts"));
    const body = await res.json();

    const post = body.posts[0];
    expect(post.author).not.toHaveProperty("email");
    expect(JSON.stringify(body)).not.toContain("@gmail.com");
    expect(JSON.stringify(body)).not.toContain('"email"');
  });

  it("passes userId to listPosts when authenticated", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockListPosts.mockResolvedValue({ posts: [], hasMore: false });

    await GET(new Request("http://localhost/api/posts"));

    expect(mockListPosts).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Number),
      undefined,
      "user-1",
      undefined
    );
  });
});
