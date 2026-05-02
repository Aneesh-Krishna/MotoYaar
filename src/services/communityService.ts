import { db } from "@/lib/db/client";
import { posts, postReactions, comments, postReports, adminSettings, users } from "@/lib/db/schema";
import { eq, desc, and, sql, ilike, or, gte, type SQL } from "drizzle-orm";
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from "@/lib/errors";
import type { FeedPost, Comment, PostDetail } from "@/types";
import type { CreatePostInput } from "@/lib/validations/post";
import { deleteObject } from "@/lib/r2";
import { hotScore } from "@/utils/hotScore";

const PAGE_SIZE = 20;

type RawReaction = { type: string; userId: string };
type RawCommentUser = { id: string; name: string; username: string | null; profileImageUrl: string | null };
type RawReply = {
  id: string;
  postId: string;
  userId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: Date;
  user?: RawCommentUser | null;
};
type RawComment = RawReply & { replies?: RawReply[] };
type RawAuthor = { id: string; name: string; username: string | null; profileImageUrl: string | null };
type RawPost = {
  id: string;
  userId: string;
  title: string;
  description: string;
  images: string[] | null;
  links: string[] | null;
  tags: string[] | null;
  isEdited: boolean;
  editHistory: unknown;
  isPinned: boolean;
  isHidden: boolean;
  score: number;
  createdAt: Date;
  updatedAt: Date;
  user?: RawAuthor | null;
  reactions?: RawReaction[];
  comments?: { id: string }[];
};

function mapAuthor(user?: RawAuthor | null) {
  if (!user) return undefined;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    profileImageUrl: user.profileImageUrl ?? undefined,
  };
}

function mapRawPost(row: RawPost, currentUserId?: string): FeedPost {
  const reactions = row.reactions ?? [];
  const likes = reactions.filter((r) => r.type === "like").length;
  const dislikes = reactions.filter((r) => r.type === "dislike").length;
  const comments = row.comments ?? [];
  const userReaction = currentUserId
    ? (reactions.find((r) => r.userId === currentUserId)?.type as FeedPost["userReaction"])
    : undefined;
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
    images: row.images ?? [],
    links: row.links ?? [],
    tags: row.tags ?? [],
    edited: row.isEdited,
    isPinned: row.isPinned,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    author: mapAuthor(row.user),
    likes,
    dislikes,
    commentCount: comments.length,
    userReaction,
  };
}

type PostSelectRow = {
  id: string;
  userId: string;
  title: string;
  description: string;
  images: string[] | null;
  links: string[] | null;
  tags: string[] | null;
  isEdited: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  dislikes: number;
  commentCount: number;
  userReaction: string | null;
  authorId: string | null;
  authorName: string | null;
  authorUsername: string | null;
  authorProfileImageUrl: string | null;
};

function mapSelectToFeedPost(row: PostSelectRow): FeedPost {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
    images: row.images ?? [],
    links: row.links ?? [],
    tags: row.tags ?? [],
    edited: row.isEdited,
    isPinned: row.isPinned,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    author: row.authorId
      ? {
          id: row.authorId,
          name: row.authorName!,
          username: row.authorUsername,
          profileImageUrl: row.authorProfileImageUrl ?? undefined,
        }
      : undefined,
    likes: row.likes,
    dislikes: row.dislikes,
    commentCount: row.commentCount,
    userReaction: (row.userReaction as FeedPost["userReaction"]) ?? undefined,
  };
}

export const communityService = {
  async listPosts(
    sort: "trending" | "newest",
    page: number,
    tag?: string,
    currentUserId?: string,
    q?: string
  ): Promise<{ posts: FeedPost[]; hasMore: boolean }> {
    const offset = (page - 1) * PAGE_SIZE;

    // Correlated subqueries with indexed foreign keys — fast for small page sizes
    const userReactionSql: SQL<string | null> = currentUserId
      ? sql<string | null>`(SELECT type FROM post_reactions pr WHERE pr.post_id = ${posts.id} AND pr.user_id = ${currentUserId} LIMIT 1)`
      : sql<string | null>`NULL::text`;

    const selectFields = {
      id: posts.id,
      userId: posts.userId,
      title: posts.title,
      description: posts.description,
      images: posts.images,
      links: posts.links,
      tags: posts.tags,
      isEdited: posts.isEdited,
      isPinned: posts.isPinned,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      likes: sql<number>`(SELECT COUNT(*)::int FROM post_reactions pr WHERE pr.post_id = ${posts.id} AND pr.type = 'like')`,
      dislikes: sql<number>`(SELECT COUNT(*)::int FROM post_reactions pr WHERE pr.post_id = ${posts.id} AND pr.type = 'dislike')`,
      commentCount: sql<number>`(SELECT COUNT(*)::int FROM comments c WHERE c.post_id = ${posts.id})`,
      userReaction: userReactionSql,
      authorId: users.id,
      authorName: users.name,
      authorUsername: users.username,
      authorProfileImageUrl: users.profileImageUrl,
    };

    const regularConditions: SQL[] = [eq(posts.isHidden, false), eq(posts.isPinned, false)];
    if (tag) regularConditions.push(sql`${posts.tags} @> ARRAY[${tag}]::text[]`);
    if (q) regularConditions.push(or(ilike(posts.title, `%${q}%`), ilike(posts.description, `%${q}%`))!);

    const orderBy = sort === "newest"
      ? [desc(posts.createdAt)]
      : [desc(posts.score), desc(posts.createdAt)];

    const [pinnedRows, regularRows] = await Promise.all([
      db.select(selectFields)
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.id))
        .where(eq(posts.isPinned, true))
        .orderBy(desc(posts.createdAt)),
      db.select(selectFields)
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.id))
        .where(and(...regularConditions))
        .orderBy(...orderBy)
        .limit(PAGE_SIZE + 1)
        .offset(offset),
    ]);

    const hasMore = regularRows.length > PAGE_SIZE;
    const regularPage = regularRows.slice(0, PAGE_SIZE) as unknown as PostSelectRow[];
    const allRows: PostSelectRow[] =
      page === 1
        ? [...(pinnedRows as unknown as PostSelectRow[]), ...regularPage]
        : regularPage;

    return {
      posts: allRows.map(mapSelectToFeedPost),
      hasMore,
    };
  },

  async createPost(userId: string, data: CreatePostInput): Promise<FeedPost> {
    const sixtySecondsAgo = new Date(Date.now() - 60_000);
    const duplicate = await db.query.posts.findFirst({
      where: and(
        eq(posts.userId, userId),
        eq(posts.title, data.title),
        eq(posts.description, data.description),
        gte(posts.createdAt, sixtySecondsAgo)
      ),
    });
    if (duplicate) throw new ConflictError("Duplicate post submitted too quickly");

    const [post] = await db
      .insert(posts)
      .values({
        userId,
        title: data.title,
        description: data.description,
        images: data.imageKeys ?? [],
        links: data.link ? [data.link] : [],
        tags: data.tags ?? [],
      })
      .returning();

    return {
      id: post.id,
      userId: post.userId,
      title: post.title,
      description: post.description,
      images: post.images ?? [],
      links: post.links ?? [],
      tags: post.tags ?? [],
      edited: post.isEdited,
      isPinned: post.isPinned,
      createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : String(post.createdAt),
      updatedAt: post.updatedAt instanceof Date ? post.updatedAt.toISOString() : String(post.updatedAt),
      author: undefined,
      likes: 0,
      dislikes: 0,
      commentCount: 0,
      userReaction: undefined,
    };
  },

  async getPost(postId: string, currentUserId?: string): Promise<PostDetail> {
    const raw = (await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        user: true,
        reactions: true,
        comments: { with: { user: true, replies: { with: { user: true } } } },
      } as never,
    })) as unknown as (RawPost & { comments?: RawComment[] }) | null;

    if (!raw) throw new NotFoundError("Post not found");

    const reactions = raw.reactions ?? [];
    const likes = reactions.filter((r) => r.type === "like").length;
    const dislikes = reactions.filter((r) => r.type === "dislike").length;
    const rawComments = (raw.comments ?? []) as RawComment[];
    const commentCount = rawComments.reduce(
      (acc, c) => acc + 1 + (c.replies?.length ?? 0),
      0
    );
    const userReaction = currentUserId
      ? (reactions.find((r) => r.userId === currentUserId)?.type as FeedPost["userReaction"])
      : undefined;

    const mappedComments: Comment[] = rawComments
      .filter((c) => !c.parentCommentId)
      .map((c) => ({
        id: c.id,
        postId: c.postId,
        userId: c.userId,
        parentCommentId: c.parentCommentId ?? undefined,
        content: c.content,
        createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
        author: mapAuthor(c.user),
        replies: (c.replies ?? []).map((r) => ({
          id: r.id,
          postId: r.postId,
          userId: r.userId,
          parentCommentId: r.parentCommentId ?? undefined,
          content: r.content,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
          author: mapAuthor(r.user),
          replies: [],
        })),
      }));

    return {
      id: raw.id,
      userId: raw.userId,
      title: raw.title,
      description: raw.description,
      images: raw.images ?? [],
      links: raw.links ?? [],
      tags: raw.tags ?? [],
      edited: raw.isEdited,
      isPinned: raw.isPinned,
      createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt),
      updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : String(raw.updatedAt),
      author: mapAuthor(raw.user),
      likes,
      dislikes,
      commentCount,
      userReaction,
      comments: mappedComments,
    };
  },

  async updatePost(postId: string, userId: string, data: CreatePostInput): Promise<FeedPost> {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) throw new NotFoundError("Post not found");
    if (post.userId !== userId) throw new ForbiddenError("You do not own this post");

    const existingHistory = Array.isArray(post.editHistory) ? post.editHistory : [];
    const newHistory = [
      ...existingHistory,
      { title: post.title, description: post.description, editedAt: new Date().toISOString() },
    ];

    const [updated] = await db
      .update(posts)
      .set({
        title: data.title,
        description: data.description,
        images: data.imageKeys ?? [],
        links: data.link ? [data.link] : [],
        tags: data.tags ?? [],
        isEdited: true,
        editHistory: newHistory,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId))
      .returning();

    return {
      id: updated.id,
      userId: updated.userId,
      title: updated.title,
      description: updated.description,
      images: updated.images ?? [],
      links: updated.links ?? [],
      tags: updated.tags ?? [],
      edited: updated.isEdited,
      isPinned: updated.isPinned,
      createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : String(updated.createdAt),
      updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : String(updated.updatedAt),
      author: undefined,
      likes: 0,
      dislikes: 0,
      commentCount: 0,
      userReaction: undefined,
    };
  },

  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) throw new NotFoundError("Post not found");
    if (post.userId !== userId) throw new ForbiddenError("You do not own this post");

    for (const key of post.images ?? []) {
      await deleteObject(key).catch(() => {});
    }

    await db.delete(posts).where(eq(posts.id, postId));
  },

  async addReaction(
    postId: string,
    userId: string,
    type: "like" | "dislike"
  ): Promise<{ likes: number; dislikes: number; userReaction: string | undefined }> {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) throw new NotFoundError("Post not found");

    const existing = await db.query.postReactions.findFirst({
      where: and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)),
    });

    if (existing && existing.type === type) {
      await db.delete(postReactions).where(eq(postReactions.id, existing.id));
    } else {
      await db
        .insert(postReactions)
        .values({ postId, userId, type })
        .onConflictDoUpdate({ target: postReactions.id, set: { type } });
    }

    // Use aggregation instead of loading all reactions
    const [counts, userReactionRow] = await Promise.all([
      db
        .select({ type: postReactions.type, count: sql<number>`COUNT(*)::int` })
        .from(postReactions)
        .where(eq(postReactions.postId, postId))
        .groupBy(postReactions.type),
      db.query.postReactions.findFirst({
        where: and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)),
        columns: { type: true },
      }),
    ]);

    const likes = counts.find((c) => c.type === "like")?.count ?? 0;
    const dislikes = counts.find((c) => c.type === "dislike")?.count ?? 0;

    // Persist hot score so trending sort works at DB level
    const newScore = hotScore(likes, dislikes, post.createdAt);
    await db.update(posts).set({ score: newScore }).where(eq(posts.id, postId));

    return { likes, dislikes, userReaction: userReactionRow?.type };
  },

  async addComment(
    postId: string,
    userId: string,
    content: string,
    parentCommentId?: string
  ): Promise<Comment> {
    if (parentCommentId) {
      const parent = await db.query.comments.findFirst({
        where: eq(comments.id, parentCommentId),
      });
      if (!parent) throw new BadRequestError("Parent comment not found");
      if (parent.postId !== postId) throw new BadRequestError("Parent comment belongs to a different post");
      if (parent.parentCommentId !== null) throw new BadRequestError("Cannot reply to a reply");
    }

    const [comment] = await db
      .insert(comments)
      .values({ postId, userId, content, parentCommentId: parentCommentId ?? null })
      .returning();

    return {
      id: comment.id,
      postId: comment.postId,
      parentCommentId: comment.parentCommentId ?? undefined,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt instanceof Date ? comment.createdAt.toISOString() : String(comment.createdAt),
      author: undefined,
      replies: [],
    };
  },

  async getComments(postId: string): Promise<Comment[]> {
    const rawComments = (await db.query.comments.findMany({
      where: eq(comments.postId, postId),
      with: { user: true, replies: { with: { user: true } } },
    } as never)) as unknown as RawComment[];

    return rawComments
      .filter((c) => !c.parentCommentId)
      .map((c) => ({
        id: c.id,
        postId: c.postId,
        userId: c.userId,
        parentCommentId: c.parentCommentId ?? undefined,
        content: c.content,
        createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
        author: mapAuthor(c.user),
        replies: (c.replies ?? []).map((r) => ({
          id: r.id,
          postId: r.postId,
          userId: r.userId,
          parentCommentId: r.parentCommentId ?? undefined,
          content: r.content,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
          author: mapAuthor(r.user),
          replies: [],
        })),
      }));
  },

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
      with: { replies: true } as never,
    }) as (typeof comments.$inferSelect & { replies?: { id: string }[] }) | null;

    if (!comment) throw new NotFoundError("Comment not found");
    if (comment.userId !== userId) throw new ForbiddenError("You do not own this comment");

    if (comment.replies && comment.replies.length > 0) {
      await db
        .update(comments)
        .set({ content: "[deleted]", deleted: true } as never)
        .where(eq(comments.id, commentId));
    } else {
      await db.delete(comments).where(eq(comments.id, commentId));
    }
  },

  async reportPost(
    postId: string,
    userId: string,
    reason: string,
    description?: string
  ): Promise<void> {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) throw new NotFoundError("Post not found");

    try {
      await db
        .insert(postReports)
        .values({ postId, reporterUserId: userId, reason, description: description ?? null });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
        return;
      }
      throw err;
    }

    const countRows = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(postReports)
      .where(eq(postReports.postId, postId));
    const count = Number(countRows[0]?.count ?? 0);

    const setting = await db.query.adminSettings.findFirst({
      where: eq(adminSettings.key, "auto_hide_report_threshold"),
    });
    const threshold = setting ? Number(setting.value) : 10;

    if (count >= threshold) {
      await db.update(posts).set({ isHidden: true }).where(eq(posts.id, postId));
    }
  },
};
