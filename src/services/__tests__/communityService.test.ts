import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";

// ─── Mock DB client ────────────────────────────────────────────────────────────

const {
  mockFindFirst,
  mockFindMany,
  mockInsert,
  mockValues,
  mockReturning,
  mockOnConflictDoUpdate,
  mockDelete,
  mockDeleteWhere,
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
  mockUpdateReturning,
  mockReactionFindFirst,
  mockReactionFindMany,
  mockCommentFindFirst,
  mockCommentFindMany,
  mockSelect,
  mockSelectFrom,
  mockSelectWhere,
  mockAdminFindFirst,
  mockDeleteObject,
} = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockOnConflictDoUpdate = vi.fn();
  const mockValues = vi.fn().mockReturnValue({
    returning: mockReturning,
    onConflictDoUpdate: mockOnConflictDoUpdate,
  });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });
  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
  const mockFindFirst = vi.fn();
  const mockFindMany = vi.fn();
  const mockReactionFindFirst = vi.fn();
  const mockReactionFindMany = vi.fn();
  const mockCommentFindFirst = vi.fn();
  const mockCommentFindMany = vi.fn();
  const mockSelectWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
  const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });
  const mockAdminFindFirst = vi.fn();
  const mockDeleteObject = vi.fn().mockResolvedValue(undefined);
  return {
    mockFindFirst,
    mockFindMany,
    mockInsert,
    mockValues,
    mockReturning,
    mockOnConflictDoUpdate,
    mockDelete,
    mockDeleteWhere,
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
    mockUpdateReturning,
    mockReactionFindFirst,
    mockReactionFindMany,
    mockCommentFindFirst,
    mockCommentFindMany,
    mockSelect,
    mockSelectFrom,
    mockSelectWhere,
    mockAdminFindFirst,
    mockDeleteObject,
  };
});

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      posts: {
        findFirst: mockFindFirst,
        findMany: mockFindMany,
      },
      postReactions: {
        findFirst: mockReactionFindFirst,
        findMany: mockReactionFindMany,
      },
      comments: {
        findFirst: mockCommentFindFirst,
        findMany: mockCommentFindMany,
      },
      adminSettings: {
        findFirst: mockAdminFindFirst,
      },
    },
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: mockSelect,
  },
}));

vi.mock("@/lib/r2", () => ({ deleteObject: mockDeleteObject }));

// import after mocks
import { communityService } from "@/services/communityService";

const BASE_POST = {
  id: "post-1",
  userId: "user-1",
  title: "Test Post",
  description: "A description",
  images: [] as string[],
  links: [] as string[],
  tags: [] as string[],
  isEdited: false,
  editHistory: [],
  isPinned: false,
  pinnedAt: null as Date | null,
  isHidden: false,
  score: 0,
  createdAt: new Date("2026-04-14T10:00:00Z"),
  updatedAt: new Date("2026-04-14T10:00:00Z"),
};

const makeRawPost = (overrides: Partial<typeof BASE_POST> & {
  user?: { id: string; name: string; username: string | null; profileImageUrl: string | null; isVerified: boolean };
  reactions?: { type: string; userId: string }[];
  comments?: { id: string }[];
  tags?: string[];
} = {}) => ({
  ...BASE_POST,
  user: { id: "user-1", name: "Alice", username: "alice", profileImageUrl: null, isVerified: false },
  reactions: [] as { type: string; userId: string }[],
  comments: [] as { id: string }[],
  ...overrides,
});

describe("communityService.createPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });
  });

  it("creates post and returns record", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockReturning.mockResolvedValue([BASE_POST]);

    const result = await communityService.createPost("user-1", {
      title: "Test Post",
      description: "A description",
      imageKeys: [],
      link: "",
      tags: [],
    });

    expect(result.id).toBe("post-1");
    expect(result.title).toBe("Test Post");
    expect(result.userId).toBe("user-1");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("throws ConflictError for duplicate title+description within 60s", async () => {
    mockFindFirst.mockResolvedValue(BASE_POST);

    await expect(
      communityService.createPost("user-1", {
        title: "Test Post",
        description: "A description",
        imageKeys: [],
        link: "",
        tags: [],
      })
    ).rejects.toThrow(ConflictError);

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("allows same content after 60s (no duplicate found)", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockReturning.mockResolvedValue([{ ...BASE_POST, id: "post-2" }]);

    const result = await communityService.createPost("user-1", {
      title: "Test Post",
      description: "A description",
      imageKeys: [],
      link: "",
      tags: [],
    });

    expect(result.id).toBe("post-2");
  });
});

describe("communityService.listPosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValueOnce([]); // absorb pinned query (first findMany call)
  });

  it("excludes hidden posts (filter applied via query)", async () => {
    mockFindMany.mockResolvedValue([makeRawPost()]);

    const result = await communityService.listPosts("trending", 1);

    // findMany called with where clause including isHidden=false
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    );
    expect(result.posts).toHaveLength(1);
  });

  it("returns newest first when sort=newest", async () => {
    const older = makeRawPost({
      id: "post-old",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    const newer = makeRawPost({
      id: "post-new",
      createdAt: new Date("2026-04-14T00:00:00Z"),
    });
    mockFindMany.mockResolvedValue([older, newer]);

    const result = await communityService.listPosts("newest", 1);

    expect(result.posts[0].id).toBe("post-new");
    expect(result.posts[1].id).toBe("post-old");
  });

  it("filters by tag correctly (passes tag to query)", async () => {
    mockFindMany.mockResolvedValue([makeRawPost({ tags: ["Bikes"] })]);

    await communityService.listPosts("trending", 1, "Bikes");

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    );
  });

  it("paginates correctly with page param", async () => {
    // 25 posts — page 2 should return posts 21-25
    const allPosts = Array.from({ length: 25 }, (_, i) =>
      makeRawPost({
        id: `post-${i + 1}`,
        createdAt: new Date(Date.now() - i * 60_000),
      })
    );
    mockFindMany.mockResolvedValue(allPosts);

    const page1 = await communityService.listPosts("newest", 1);
    expect(page1.posts).toHaveLength(20);
    expect(page1.hasMore).toBe(true);

    // Reset and call page 2 — absorb pinned query for the second listPosts call
    mockFindMany.mockResolvedValueOnce([]);
    mockFindMany.mockResolvedValue(allPosts);
    const page2 = await communityService.listPosts("newest", 2);
    expect(page2.posts).toHaveLength(5);
    expect(page2.hasMore).toBe(false);
  });

  it("attaches userReaction when userId provided", async () => {
    const postWithReaction = makeRawPost({
      reactions: [{ type: "like", userId: "user-1" }],
    });
    mockFindMany.mockResolvedValue([postWithReaction]);

    const result = await communityService.listPosts("trending", 1, undefined, "user-1");

    expect(result.posts[0].userReaction).toBe("like");
  });

  it("returns undefined userReaction when userId not provided", async () => {
    mockFindMany.mockResolvedValue([makeRawPost()]);

    const result = await communityService.listPosts("trending", 1);

    expect(result.posts[0].userReaction).toBeUndefined();
  });
});

describe("communityService.listPosts with q", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValueOnce([]); // absorb pinned query (first findMany call)
  });

  it("returns posts matching title ILIKE", async () => {
    mockFindMany.mockResolvedValue([makeRawPost({ title: "Helmet Review" })]);

    const result = await communityService.listPosts("trending", 1, undefined, undefined, "helmet");

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    );
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toBe("Helmet Review");
  });

  it("returns posts matching description ILIKE", async () => {
    mockFindMany.mockResolvedValue([
      makeRawPost({ id: "post-2", title: "Gear Review", description: "This helmet is great for long rides" }),
    ]);

    const result = await communityService.listPosts("trending", 1, undefined, undefined, "helmet");

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].description).toContain("helmet");
  });

  it("ranks title matches before description matches", async () => {
    const titleMatch = makeRawPost({
      id: "post-title",
      title: "Helmet Review",
      description: "A great accessory",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    const descMatch = makeRawPost({
      id: "post-desc",
      title: "Gear Roundup",
      description: "Covers helmets and gloves",
      createdAt: new Date("2026-04-14T00:00:00Z"),
    });
    // DB returns descMatch first (it's newer), but service should promote titleMatch
    mockFindMany.mockResolvedValue([descMatch, titleMatch]);

    const result = await communityService.listPosts("trending", 1, undefined, undefined, "helmet");

    expect(result.posts[0].id).toBe("post-title");
    expect(result.posts[1].id).toBe("post-desc");
  });

  it("returns empty array when no matches", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await communityService.listPosts("trending", 1, undefined, undefined, "xyznonexistent");

    expect(result.posts).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it("combines tag and q filters (both where conditions applied)", async () => {
    mockFindMany.mockResolvedValue([
      makeRawPost({ id: "post-tagged", title: "Bike Helmet Tips", tags: ["Bikes"] }),
    ]);

    const result = await communityService.listPosts("trending", 1, "Bikes", undefined, "helmet");

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    );
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].id).toBe("post-tagged");
  });
});

// ─── Pinned priority tests ─────────────────────────────────────────────────────

describe("communityService.listPosts pinned priority", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns pinned posts before regular posts regardless of score", async () => {
    const pinnedPost = makeRawPost({
      id: "pinned-1",
      isPinned: true,
      pinnedAt: new Date("2026-04-14T08:00:00Z"),
      createdAt: new Date("2026-01-01T00:00:00Z"), // old → low hot score
    });
    const regularPost = makeRawPost({
      id: "regular-1",
      isPinned: false,
      createdAt: new Date("2026-04-14T00:00:00Z"), // new + many likes → high score
      reactions: [
        { type: "like", userId: "u1" },
        { type: "like", userId: "u2" },
        { type: "like", userId: "u3" },
      ],
    });

    mockFindMany
      .mockResolvedValueOnce([pinnedPost])   // pinned query
      .mockResolvedValueOnce([regularPost]); // regular query

    const result = await communityService.listPosts("trending", 1);

    expect(result.posts).toHaveLength(2);
    expect(result.posts[0].id).toBe("pinned-1");
    expect(result.posts[0].isPinned).toBe(true);
    expect(result.posts[1].id).toBe("regular-1");
  });

  it("orders multiple pinned posts by pinnedAt DESC (preserves DB order)", async () => {
    const olderPinned = makeRawPost({
      id: "pinned-old",
      isPinned: true,
      pinnedAt: new Date("2026-04-10T00:00:00Z"),
      createdAt: new Date("2026-04-10T00:00:00Z"),
    });
    const newerPinned = makeRawPost({
      id: "pinned-new",
      isPinned: true,
      pinnedAt: new Date("2026-04-14T00:00:00Z"),
      createdAt: new Date("2026-04-14T00:00:00Z"),
    });

    // DB returns newest-pinned-first (orderBy pinnedAt DESC) — service must preserve this order
    mockFindMany
      .mockResolvedValueOnce([newerPinned, olderPinned]) // pinned query (DB already ordered DESC)
      .mockResolvedValueOnce([]);                        // regular query

    const result = await communityService.listPosts("trending", 1);

    expect(result.posts).toHaveLength(2);
    expect(result.posts[0].id).toBe("pinned-new");
    expect(result.posts[1].id).toBe("pinned-old");
  });
});

// ─── Reaction helpers ──────────────────────────────────────────────────────────

const REACTION_BASE = {
  id: "reaction-1",
  postId: "post-1",
  userId: "user-1",
  type: "like" as const,
  createdAt: new Date("2026-04-14T10:00:00Z"),
};

describe("communityService.addReaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues.mockReturnValue({
      returning: mockReturning,
      onConflictDoUpdate: mockOnConflictDoUpdate,
    });
    mockInsert.mockReturnValue({ values: mockValues });
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockFindFirst.mockResolvedValue({ id: "post-1" }); // post exists
  });

  it("throws NotFoundError for non-existent post", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      communityService.addReaction("bad-id", "user-1", "like")
    ).rejects.toThrow(NotFoundError);

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("adds like reaction and returns updated counts", async () => {
    mockReactionFindFirst.mockResolvedValue(null); // no existing reaction
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    mockReactionFindMany.mockResolvedValue([REACTION_BASE]); // one like after upsert

    const result = await communityService.addReaction("post-1", "user-1", "like");

    expect(mockInsert).toHaveBeenCalled();
    expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    expect(result.likes).toBe(1);
    expect(result.dislikes).toBe(0);
    expect(result.userReaction).toBe("like");
  });

  it("removes reaction when same type submitted again (unlike)", async () => {
    mockReactionFindFirst.mockResolvedValue(REACTION_BASE); // already liked
    mockDeleteWhere.mockResolvedValue(undefined);
    mockReactionFindMany.mockResolvedValue([]); // no reactions after delete

    const result = await communityService.addReaction("post-1", "user-1", "like");

    expect(mockDelete).toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(result.likes).toBe(0);
    expect(result.dislikes).toBe(0);
    expect(result.userReaction).toBeUndefined();
  });

  it("switches from like to dislike (upsert)", async () => {
    mockReactionFindFirst.mockResolvedValue(REACTION_BASE); // existing like
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    const dislikeReaction = { ...REACTION_BASE, type: "dislike" as const };
    mockReactionFindMany.mockResolvedValue([dislikeReaction]); // now a dislike

    const result = await communityService.addReaction("post-1", "user-1", "dislike");

    expect(mockInsert).toHaveBeenCalled();
    expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(result.likes).toBe(0);
    expect(result.dislikes).toBe(1);
    expect(result.userReaction).toBe("dislike");
  });
});

// ─── Comment helpers ───────────────────────────────────────────────────────────

const COMMENT_BASE = {
  id: "comment-1",
  postId: "post-1",
  userId: "user-1",
  parentCommentId: null,
  content: "Great post!",
  createdAt: new Date("2026-04-14T10:00:00Z"),
};

describe("communityService.addComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues.mockReturnValue({
      returning: mockReturning,
      onConflictDoUpdate: mockOnConflictDoUpdate,
    });
    mockInsert.mockReturnValue({ values: mockValues });
    mockCommentFindFirst.mockResolvedValue(null); // default: no parent lookup needed
  });

  it("adds top-level comment", async () => {
    mockReturning.mockResolvedValue([COMMENT_BASE]);

    const result = await communityService.addComment("post-1", "user-1", "Great post!");

    expect(mockInsert).toHaveBeenCalled();
    expect(result.id).toBe("comment-1");
    expect(result.postId).toBe("post-1");
    expect(result.parentCommentId).toBeUndefined();
    expect(result.content).toBe("Great post!");
  });

  it("adds reply with parentCommentId set", async () => {
    // parent is a top-level comment on the same post
    mockCommentFindFirst.mockResolvedValue({
      id: "comment-1",
      postId: "post-1",
      parentCommentId: null,
    });
    const reply = { ...COMMENT_BASE, id: "comment-2", parentCommentId: "comment-1", content: "Nice reply!" };
    mockReturning.mockResolvedValue([reply]);

    const result = await communityService.addComment(
      "post-1",
      "user-1",
      "Nice reply!",
      "comment-1"
    );

    expect(result.parentCommentId).toBe("comment-1");
    expect(result.content).toBe("Nice reply!");
  });

  it("throws BadRequestError when replying to a reply (level 3 prevention)", async () => {
    mockCommentFindFirst.mockResolvedValue({
      id: "comment-2",
      postId: "post-1",
      parentCommentId: "comment-1", // itself a reply
    });

    await expect(
      communityService.addComment("post-1", "user-1", "Level 3 attempt", "comment-2")
    ).rejects.toThrow(BadRequestError);

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("throws BadRequestError when parentCommentId belongs to a different post", async () => {
    mockCommentFindFirst.mockResolvedValue({
      id: "comment-x",
      postId: "other-post",
      parentCommentId: null,
    });

    await expect(
      communityService.addComment("post-1", "user-1", "Cross-post reply", "comment-x")
    ).rejects.toThrow(BadRequestError);

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("throws BadRequestError when parentCommentId does not exist", async () => {
    mockCommentFindFirst.mockResolvedValue(null); // not found

    await expect(
      communityService.addComment("post-1", "user-1", "Orphan reply", "ghost-id")
    ).rejects.toThrow(BadRequestError);

    expect(mockInsert).not.toHaveBeenCalled();
  });
});

// ─── getPost tests ─────────────────────────────────────────────────────────────

const RAW_POST_DETAIL = {
  ...BASE_POST,
  user: { id: "user-1", name: "Alice", username: "alice", profileImageUrl: null },
  reactions: [
    { id: "r1", postId: "post-1", userId: "user-1", type: "like", createdAt: new Date() },
    { id: "r2", postId: "post-1", userId: "user-2", type: "dislike", createdAt: new Date() },
  ],
  comments: [
    {
      id: "c1",
      postId: "post-1",
      userId: "user-2",
      parentCommentId: null,
      content: "Great post!",
      createdAt: new Date("2026-04-14T10:00:00Z"),
      user: { id: "user-2", name: "Bob", username: "bob", profileImageUrl: null },
      replies: [
        {
          id: "c2",
          postId: "post-1",
          userId: "user-3",
          parentCommentId: "c1",
          content: "Agreed!",
          createdAt: new Date("2026-04-14T11:00:00Z"),
          user: { id: "user-3", name: "Carol", username: "carol", profileImageUrl: null },
        },
      ],
    },
  ],
};

describe("communityService.updatePost", () => {
  const UPDATE_INPUT = {
    title: "Updated Title",
    description: "Updated description",
    imageKeys: [] as string[],
    link: "",
    tags: ["Bikes"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
  });

  it("updates post fields and sets isEdited=true", async () => {
    mockFindFirst.mockResolvedValue(BASE_POST);
    const updatedRow = { ...BASE_POST, title: "Updated Title", description: "Updated description", isEdited: true, editHistory: [{ title: "Test Post", description: "A description", editedAt: "2026-04-21T00:00:00.000Z" }] };
    mockUpdateReturning.mockResolvedValue([updatedRow]);

    const result = await communityService.updatePost("post-1", "user-1", UPDATE_INPUT);

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Updated Title", isEdited: true })
    );
    expect(result.edited).toBe(true);
    expect(result.title).toBe("Updated Title");
  });

  it("appends previous title+description to editHistory", async () => {
    mockFindFirst.mockResolvedValue(BASE_POST);
    const updatedRow = { ...BASE_POST, title: "Updated Title", isEdited: true, editHistory: [{ title: "Test Post", description: "A description", editedAt: "2026-04-21T00:00:00.000Z" }] };
    mockUpdateReturning.mockResolvedValue([updatedRow]);

    await communityService.updatePost("post-1", "user-1", UPDATE_INPUT);

    const setCall = mockUpdateSet.mock.calls[0][0];
    expect(Array.isArray(setCall.editHistory)).toBe(true);
    expect(setCall.editHistory[0]).toMatchObject({
      title: "Test Post",
      description: "A description",
    });
    expect(typeof setCall.editHistory[0].editedAt).toBe("string");
  });

  it("appends to existing editHistory (does not replace)", async () => {
    const existingHistory = [{ title: "Original", description: "Original desc", editedAt: "2026-01-01T00:00:00.000Z" }];
    mockFindFirst.mockResolvedValue({ ...BASE_POST, editHistory: existingHistory });
    mockUpdateReturning.mockResolvedValue([{ ...BASE_POST, isEdited: true, editHistory: [...existingHistory, { title: "Test Post", description: "A description", editedAt: "2026-04-21T00:00:00.000Z" }] }]);

    await communityService.updatePost("post-1", "user-1", UPDATE_INPUT);

    const setCall = mockUpdateSet.mock.calls[0][0];
    expect(setCall.editHistory).toHaveLength(2);
    expect(setCall.editHistory[0].title).toBe("Original");
    expect(setCall.editHistory[1].title).toBe("Test Post");
  });

  it("throws ForbiddenError when different user attempts edit", async () => {
    mockFindFirst.mockResolvedValue(BASE_POST); // userId = "user-1"

    await expect(
      communityService.updatePost("post-1", "user-99", UPDATE_INPUT)
    ).rejects.toThrow(ForbiddenError);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for non-existent post", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      communityService.updatePost("missing-id", "user-1", UPDATE_INPUT)
    ).rejects.toThrow(NotFoundError);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("clears links when data.link is empty string", async () => {
    mockFindFirst.mockResolvedValue({ ...BASE_POST, links: ["https://example.com"] });
    mockUpdateReturning.mockResolvedValue([{ ...BASE_POST, links: [] }]);

    await communityService.updatePost("post-1", "user-1", { ...UPDATE_INPUT, link: "" });

    const setCall = mockUpdateSet.mock.calls[0][0];
    expect(setCall.links).toEqual([]);
  });

  it("overrides existing images when data.imageKeys provided", async () => {
    mockFindFirst.mockResolvedValue({ ...BASE_POST, images: ["old-key-1", "old-key-2"] });
    mockUpdateReturning.mockResolvedValue([{ ...BASE_POST, images: ["new-key-1"] }]);

    await communityService.updatePost("post-1", "user-1", { ...UPDATE_INPUT, imageKeys: ["new-key-1"] });

    const setCall = mockUpdateSet.mock.calls[0][0];
    expect(setCall.images).toEqual(["new-key-1"]);
  });
});

describe("communityService.getPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns full PostDetail with aggregated counts and comments", async () => {
    mockFindFirst.mockResolvedValue(RAW_POST_DETAIL);

    const result = await communityService.getPost("post-1");

    expect(result.id).toBe("post-1");
    expect(result.likes).toBe(1);
    expect(result.dislikes).toBe(1);
    expect(result.commentCount).toBe(2); // 1 top-level + 1 reply
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].replies).toHaveLength(1);
    expect(result.userReaction).toBeUndefined();
  });

  it("throws NotFoundError when post does not exist", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(communityService.getPost("missing-id")).rejects.toThrow(NotFoundError);
  });

  it("returns userReaction when userId matches a reaction", async () => {
    mockFindFirst.mockResolvedValue(RAW_POST_DETAIL);

    const result = await communityService.getPost("post-1", "user-1");

    expect(result.userReaction).toBe("like");
  });

  it("returns undefined userReaction when userId has no reaction", async () => {
    mockFindFirst.mockResolvedValue(RAW_POST_DETAIL);

    const result = await communityService.getPost("post-1", "user-99");

    expect(result.userReaction).toBeUndefined();
  });

  it("counts commentCount as top-level + replies", async () => {
    const postWithReplies = {
      ...RAW_POST_DETAIL,
      comments: [
        { ...RAW_POST_DETAIL.comments[0], replies: [RAW_POST_DETAIL.comments[0].replies[0], RAW_POST_DETAIL.comments[0].replies[0]] },
      ],
    };
    mockFindFirst.mockResolvedValue(postWithReplies);

    const result = await communityService.getPost("post-1");

    expect(result.commentCount).toBe(3); // 1 top-level + 2 replies
  });
});

// ─── reportPost tests ──────────────────────────────────────────────────────────

describe("communityService.reportPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue(BASE_POST); // post exists check
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue(undefined); // insert postReport — no .returning()
    mockSelectWhere.mockResolvedValue([{ count: 1 }]); // below threshold by default
    mockAdminFindFirst.mockResolvedValue({ key: "auto_hide_report_threshold", value: "10" });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  it("creates report record", async () => {
    await communityService.reportPost("post-1", "user-2", "spam");

    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ postId: "post-1", reporterUserId: "user-2", reason: "spam" })
    );
    expect(mockUpdate).not.toHaveBeenCalled(); // count(1) < threshold(10)
  });

  it("does not throw on duplicate report from same user", async () => {
    mockValues.mockRejectedValueOnce({ code: "23505" }); // unique constraint violation

    await expect(
      communityService.reportPost("post-1", "user-2", "spam")
    ).resolves.toBeUndefined();

    expect(mockUpdate).not.toHaveBeenCalled(); // early return — no auto-hide check
  });

  it("hides post when report count reaches threshold", async () => {
    mockSelectWhere.mockResolvedValue([{ count: 10 }]); // at threshold
    mockAdminFindFirst.mockResolvedValue({ key: "auto_hide_report_threshold", value: "10" });

    await communityService.reportPost("post-1", "user-2", "spam");

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith({ isHidden: true });
  });

  it("reads threshold from admin_settings table", async () => {
    mockSelectWhere.mockResolvedValue([{ count: 5 }]);
    mockAdminFindFirst.mockResolvedValue({ key: "auto_hide_report_threshold", value: "5" });

    await communityService.reportPost("post-1", "user-2", "spam");

    expect(mockAdminFindFirst).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled(); // count(5) >= threshold(5)
  });

  it("uses default threshold of 10 if admin_settings missing", async () => {
    mockAdminFindFirst.mockResolvedValue(null); // no setting in DB
    mockSelectWhere.mockResolvedValue([{ count: 9 }]); // below default of 10

    await communityService.reportPost("post-1", "user-2", "spam");

    expect(mockAdminFindFirst).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled(); // 9 < 10 (default threshold)
  });

  it("throws NotFoundError for non-existent post", async () => {
    mockFindFirst.mockResolvedValue(null); // post not found

    await expect(
      communityService.reportPost("bad-id", "user-2", "spam")
    ).rejects.toThrow(NotFoundError);

    expect(mockInsert).not.toHaveBeenCalled();
  });
});

// ─── deletePost tests ──────────────────────────────────────────────────────────

describe("communityService.deletePost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue(undefined);
    mockDeleteObject.mockResolvedValue(undefined);
  });

  it("deletes post and returns successfully", async () => {
    mockFindFirst.mockResolvedValue(BASE_POST); // owner = user-1

    await expect(communityService.deletePost("post-1", "user-1")).resolves.toBeUndefined();

    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteWhere).toHaveBeenCalled();
  });

  it("throws ForbiddenError when different user attempts delete", async () => {
    mockFindFirst.mockResolvedValue(BASE_POST); // owner = user-1

    await expect(
      communityService.deletePost("post-1", "user-99")
    ).rejects.toThrow(ForbiddenError);

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when post does not exist", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      communityService.deletePost("missing", "user-1")
    ).rejects.toThrow(NotFoundError);

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("calls deleteObject for each image key", async () => {
    mockFindFirst.mockResolvedValue({ ...BASE_POST, images: ["key-1", "key-2"] });

    await communityService.deletePost("post-1", "user-1");

    expect(mockDeleteObject).toHaveBeenCalledTimes(2);
    expect(mockDeleteObject).toHaveBeenCalledWith("key-1");
    expect(mockDeleteObject).toHaveBeenCalledWith("key-2");
  });

  it("continues and deletes post if R2 delete fails (non-fatal)", async () => {
    mockFindFirst.mockResolvedValue({ ...BASE_POST, images: ["key-1"] });
    mockDeleteObject.mockRejectedValueOnce(new Error("R2 unavailable"));

    await expect(communityService.deletePost("post-1", "user-1")).resolves.toBeUndefined();

    expect(mockDelete).toHaveBeenCalled(); // post still deleted
  });
});

// ─── deleteComment tests ───────────────────────────────────────────────────────

const BASE_COMMENT = {
  id: "comment-1",
  postId: "post-1",
  userId: "user-1",
  parentCommentId: null,
  content: "A comment",
  deleted: false,
  createdAt: new Date("2026-04-22T10:00:00Z"),
  replies: [] as { id: string }[],
};

describe("communityService.deleteComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue(undefined);
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  it("hard deletes comment with no replies", async () => {
    mockCommentFindFirst.mockResolvedValue({ ...BASE_COMMENT, replies: [] });

    await communityService.deleteComment("comment-1", "user-1");

    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteWhere).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("soft deletes comment with replies (sets content=[deleted], deleted=true)", async () => {
    mockCommentFindFirst.mockResolvedValue({
      ...BASE_COMMENT,
      replies: [{ id: "reply-1" }],
    });

    await communityService.deleteComment("comment-1", "user-1");

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith({ content: "[deleted]", deleted: true });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError for non-owner", async () => {
    mockCommentFindFirst.mockResolvedValue({ ...BASE_COMMENT, userId: "user-1" });

    await expect(
      communityService.deleteComment("comment-1", "user-99")
    ).rejects.toThrow(ForbiddenError);

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when comment does not exist", async () => {
    mockCommentFindFirst.mockResolvedValue(null);

    await expect(
      communityService.deleteComment("missing", "user-1")
    ).rejects.toThrow(NotFoundError);
  });
});
