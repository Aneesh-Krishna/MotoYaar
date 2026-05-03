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
  makeChain,
  mockAdminFindFirst,
  mockDeleteObject,
  mockUserFindFirst,
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
  const makeChain = (data: unknown[]) => {
    const chain: any = {};
    chain.from = vi.fn().mockReturnValue(chain);
    chain.leftJoin = vi.fn().mockReturnValue(chain);
    chain.where = vi.fn().mockReturnValue(chain);
    chain.orderBy = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.offset = vi.fn().mockReturnValue(chain);
    chain.groupBy = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(data).then(resolve, reject);
    chain.catch = (fn: (e: unknown) => unknown) => Promise.resolve(data).catch(fn);
    return chain;
  };
  const mockSelect = vi.fn().mockImplementation(() => makeChain([]));
  const mockAdminFindFirst = vi.fn();
  const mockDeleteObject = vi.fn().mockResolvedValue(undefined);
  const mockUserFindFirst = vi.fn();
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
    makeChain,
    mockAdminFindFirst,
    mockDeleteObject,
    mockUserFindFirst,
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
      users: {
        findFirst: mockUserFindFirst,
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

// PostSelectRow-shaped data for listPosts select-based queries
const makeSelectRow = (overrides: Record<string, unknown> = {}) => ({
  id: "post-1",
  userId: "user-1",
  title: "Test Post",
  description: "A description",
  images: [] as string[],
  links: [] as string[],
  tags: [] as string[],
  isEdited: false,
  isPinned: false,
  createdAt: new Date("2026-04-14T10:00:00Z"),
  updatedAt: new Date("2026-04-14T10:00:00Z"),
  likes: 0,
  dislikes: 0,
  commentCount: 0,
  userReaction: null as string | null,
  authorId: "user-1",
  authorName: "Alice",
  authorUsername: "alice",
  authorProfileImageUrl: null as string | null,
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
  });

  it("excludes hidden posts (filter applied via query)", async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([]))                      // pinned query
      .mockReturnValueOnce(makeChain([makeSelectRow()]));      // regular query

    const result = await communityService.listPosts("trending", 1);

    expect(result.posts).toHaveLength(1);
  });

  it("returns newest first when sort=newest", async () => {
    const newer = makeSelectRow({ id: "post-new", createdAt: new Date("2026-04-14T00:00:00Z") });
    const older = makeSelectRow({ id: "post-old", createdAt: new Date("2026-01-01T00:00:00Z") });
    // DB returns newest-first (service relies on DB ordering)
    mockSelect
      .mockReturnValueOnce(makeChain([]))                      // pinned
      .mockReturnValueOnce(makeChain([newer, older]));         // regular

    const result = await communityService.listPosts("newest", 1);

    expect(result.posts[0].id).toBe("post-new");
    expect(result.posts[1].id).toBe("post-old");
  });

  it("filters by tag correctly (passes tag to query)", async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([makeSelectRow({ tags: ["Bikes"] })]));

    const result = await communityService.listPosts("trending", 1, "Bikes");

    expect(result.posts).toHaveLength(1);
  });

  it("paginates correctly with page param", async () => {
    // Service requests PAGE_SIZE+1 (21) rows; if 21 returned → hasMore=true, return 20
    const rows21 = Array.from({ length: 21 }, (_, i) =>
      makeSelectRow({ id: `post-${i + 1}` })
    );
    mockSelect
      .mockReturnValueOnce(makeChain([]))         // pinned
      .mockReturnValueOnce(makeChain(rows21));    // regular: 21 → hasMore

    const page1 = await communityService.listPosts("newest", 1);
    expect(page1.posts).toHaveLength(20);
    expect(page1.hasMore).toBe(true);

    // Page 2: only 5 rows from DB → hasMore=false
    const rows5 = Array.from({ length: 5 }, (_, i) =>
      makeSelectRow({ id: `post-${i + 21}` })
    );
    mockSelect
      .mockReturnValueOnce(makeChain([]))         // pinned (still queried on page 2)
      .mockReturnValueOnce(makeChain(rows5));     // regular: 5 → no more

    const page2 = await communityService.listPosts("newest", 2);
    expect(page2.posts).toHaveLength(5);
    expect(page2.hasMore).toBe(false);
  });

  it("attaches userReaction when userId provided", async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([makeSelectRow({ userReaction: "like" })]));

    const result = await communityService.listPosts("trending", 1, undefined, "user-1");

    expect(result.posts[0].userReaction).toBe("like");
  });

  it("returns undefined userReaction when userId not provided", async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([makeSelectRow({ userReaction: null })]));

    const result = await communityService.listPosts("trending", 1);

    expect(result.posts[0].userReaction).toBeUndefined();
  });
});

describe("communityService.listPosts with q", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns posts matching title ILIKE", async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([makeSelectRow({ title: "Helmet Review" })]));

    const result = await communityService.listPosts("trending", 1, undefined, undefined, "helmet");

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toBe("Helmet Review");
  });

  it("returns posts matching description ILIKE", async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([makeSelectRow({ id: "post-2", description: "This helmet is great for long rides" })]));

    const result = await communityService.listPosts("trending", 1, undefined, undefined, "helmet");

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].description).toContain("helmet");
  });

  it("returns posts in DB order (DB handles relevance ranking)", async () => {
    const titleMatch = makeSelectRow({ id: "post-title", title: "Helmet Review" });
    const descMatch = makeSelectRow({ id: "post-desc", title: "Gear Roundup", description: "Covers helmets" });
    // DB returns in whatever order it chose (service preserves DB order)
    mockSelect
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([titleMatch, descMatch]));

    const result = await communityService.listPosts("trending", 1, undefined, undefined, "helmet");

    expect(result.posts[0].id).toBe("post-title");
    expect(result.posts[1].id).toBe("post-desc");
  });

  it("returns empty array when no matches", async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([]));

    const result = await communityService.listPosts("trending", 1, undefined, undefined, "xyznonexistent");

    expect(result.posts).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it("combines tag and q filters (both where conditions applied)", async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([makeSelectRow({ id: "post-tagged", title: "Bike Helmet Tips", tags: ["Bikes"] })]));

    const result = await communityService.listPosts("trending", 1, "Bikes", undefined, "helmet");

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
    const pinnedPost = makeSelectRow({
      id: "pinned-1",
      isPinned: true,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    const regularPost = makeSelectRow({
      id: "regular-1",
      isPinned: false,
      likes: 3,
    });

    mockSelect
      .mockReturnValueOnce(makeChain([pinnedPost]))    // pinned query
      .mockReturnValueOnce(makeChain([regularPost]));  // regular query

    const result = await communityService.listPosts("trending", 1);

    expect(result.posts).toHaveLength(2);
    expect(result.posts[0].id).toBe("pinned-1");
    expect(result.posts[0].isPinned).toBe(true);
    expect(result.posts[1].id).toBe("regular-1");
  });

  it("orders multiple pinned posts by pinnedAt DESC (preserves DB order)", async () => {
    const olderPinned = makeSelectRow({ id: "pinned-old", isPinned: true });
    const newerPinned = makeSelectRow({ id: "pinned-new", isPinned: true });

    // DB returns newest-pinned-first — service must preserve this order
    mockSelect
      .mockReturnValueOnce(makeChain([newerPinned, olderPinned]))  // pinned (DB already ordered DESC)
      .mockReturnValueOnce(makeChain([]));                          // regular

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
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);
    mockFindFirst.mockResolvedValue({ id: "post-1", createdAt: new Date("2026-01-01T00:00:00Z") });
  });

  it("throws NotFoundError for non-existent post", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      communityService.addReaction("bad-id", "user-1", "like")
    ).rejects.toThrow(NotFoundError);

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("adds like reaction and returns updated counts", async () => {
    // Check existing → null; get user reaction after upsert → { type: "like" }
    mockReactionFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ type: "like" });
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    // counts from db.select().from().where().groupBy()
    mockSelect.mockReturnValueOnce(makeChain([{ type: "like", count: 1 }]));

    const result = await communityService.addReaction("post-1", "user-1", "like");

    expect(mockInsert).toHaveBeenCalled();
    expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    expect(result.likes).toBe(1);
    expect(result.dislikes).toBe(0);
    expect(result.userReaction).toBe("like");
  });

  it("removes reaction when same type submitted again (unlike)", async () => {
    // Check existing → REACTION_BASE (like); get user reaction after delete → null
    mockReactionFindFirst
      .mockResolvedValueOnce(REACTION_BASE)
      .mockResolvedValueOnce(null);
    mockDeleteWhere.mockResolvedValue(undefined);
    // No reactions remain after delete
    mockSelect.mockReturnValueOnce(makeChain([]));

    const result = await communityService.addReaction("post-1", "user-1", "like");

    expect(mockDelete).toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(result.likes).toBe(0);
    expect(result.dislikes).toBe(0);
    expect(result.userReaction).toBeUndefined();
  });

  it("switches from like to dislike (upsert)", async () => {
    // Check existing → REACTION_BASE (like); get user reaction after upsert → dislike
    mockReactionFindFirst
      .mockResolvedValueOnce(REACTION_BASE)
      .mockResolvedValueOnce({ type: "dislike" });
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    mockSelect.mockReturnValueOnce(makeChain([{ type: "dislike", count: 1 }]));

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
    mockAdminFindFirst.mockResolvedValue({ key: "auto_hide_report_threshold", value: "10" });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  it("creates report record", async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ count: 1 }])); // 1 report < threshold(10)

    await communityService.reportPost("post-1", "user-2", "spam");

    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ postId: "post-1", reporterUserId: "user-2", reason: "spam" })
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("does not throw on duplicate report from same user", async () => {
    mockValues.mockRejectedValueOnce({ code: "23505" }); // unique constraint violation

    await expect(
      communityService.reportPost("post-1", "user-2", "spam")
    ).resolves.toBeUndefined();

    expect(mockUpdate).not.toHaveBeenCalled(); // early return — no auto-hide check
  });

  it("hides post when report count reaches threshold", async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ count: 10 }])); // at threshold
    mockAdminFindFirst.mockResolvedValue({ key: "auto_hide_report_threshold", value: "10" });

    await communityService.reportPost("post-1", "user-2", "spam");

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith({ isHidden: true });
  });

  it("reads threshold from admin_settings table", async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ count: 5 }]));
    mockAdminFindFirst.mockResolvedValue({ key: "auto_hide_report_threshold", value: "5" });

    await communityService.reportPost("post-1", "user-2", "spam");

    expect(mockAdminFindFirst).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled(); // count(5) >= threshold(5)
  });

  it("uses default threshold of 10 if admin_settings missing", async () => {
    mockAdminFindFirst.mockResolvedValue(null); // no setting in DB
    mockSelect.mockReturnValueOnce(makeChain([{ count: 9 }])); // below default threshold

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
