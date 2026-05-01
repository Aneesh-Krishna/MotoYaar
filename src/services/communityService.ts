import { db } from "@/lib/db/client";
import { posts, users, postReactions, comments, postReports } from "@/lib/db/schema";
import { eq, desc, and, sql, ilike, or, inArray } from "drizzle-orm";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import type { Post, FeedPost, Comment, PostDetail } from "@/types";
import type { CreatePostInput } from "@/lib/validations/post";

const PAGE_SIZE = 10;

function mapAuthor(user: typeof users.$inferSelect | null) {
  if (!user) return undefined;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    profileImageUrl: user.profileImageUrl ?? undefined,
  };
}

async function enrichPosts(
  rows: (typeof posts.$inferSelect)[],
  currentUserId?: string
): Promise<FeedPost[]> {
  if (rows.length === 0) return [];

  const postIds = rows.map((p) => p.id);

  const [authorRows, reactionRows, commentCountRows, userReactionRows] = await Promise.all([
    db.select().from(users).where(
      inArray(users.id, [...new Set(rows.map((p) => p.userId))])
    ),
    db
      .select({
        postId: postReactions.postId,
        type: postReactions.type,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(postReactions)
      .where(inArray(postReactions.postId, postIds))
      .groupBy(postReactions.postId, postReactions.type),
    db
      .select({
        postId: comments.postId,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(comments)
      .where(inArray(comments.postId, postIds))
      .groupBy(comments.postId),
    currentUserId
      ? db
          .select({ postId: postReactions.postId, type: postReactions.type })
          .from(postReactions)
          .where(
            and(
              inArray(postReactions.postId, postIds),
              eq(postReactions.userId, currentUserId)
            )
          )
      : Promise.resolve([]),
  ]);

  const authorMap = new Map(authorRows.map((u) => [u.id, u]));
  const likesMap = new Map<string, number>();
  const dislikesMap = new Map<string, number>();
  for (const r of reactionRows) {
    if (r.type === "like") likesMap.set(r.postId, r.count);
    else dislikesMap.set(r.postId, r.count);
  }
  const commentCountMap = new Map(commentCountRows.map((r) => [r.postId, r.count]));
  const userReactionMap = new Map(
    (userReactionRows as { postId: string; type: string }[]).map((r) => [r.postId, r.type])
  );

  return rows.map((p) => ({
    id: p.id,
    userId: p.userId,
    title: p.title,
    description: p.description,
    images: p.images ?? [],
    links: p.links ?? [],
    tags: p.tags ?? [],
    edited: p.isEdited,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
    author: mapAuthor(authorMap.get(p.userId) ?? null),
    likes: likesMap.get(p.id) ?? 0,
    dislikes: dislikesMap.get(p.id) ?? 0,
    commentCount: commentCountMap.get(p.id) ?? 0,
    userReaction: (userReactionMap.get(p.id) as Post["userReaction"]) ?? undefined,
  }));
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

    const conditions = [eq(posts.isHidden, false)];
    if (tag) conditions.push(sql`${posts.tags} @> ARRAY[${tag}]::text[]`);
    if (q) {
      conditions.push(
        or(
          ilike(posts.title, `%${q}%`),
          ilike(posts.description, `%${q}%`)
        )!
      );
    }

    const orderBy = sort === "trending" ? desc(posts.score) : desc(posts.createdAt);

    const rows = await db
      .select()
      .from(posts)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(PAGE_SIZE + 1)
      .offset(offset);

    const hasMore = rows.length > PAGE_SIZE;
    const pageRows = rows.slice(0, PAGE_SIZE);
    const enriched = await enrichPosts(pageRows, currentUserId);
    return { posts: enriched, hasMore };
  },

  async getById(postId: string, currentUserId?: string): Promise<FeedPost> {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) throw new NotFoundError("Post not found");
    if (post.isHidden) throw new NotFoundError("Post not found");
    const [enriched] = await enrichPosts([post], currentUserId);
    return enriched;
  },

  async createPost(userId: string, data: CreatePostInput): Promise<FeedPost> {
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
    const [enriched] = await enrichPosts([post], userId);
    return enriched;
  },

  async updatePost(postId: string, userId: string, data: CreatePostInput): Promise<FeedPost> {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) throw new NotFoundError("Post not found");
    if (post.userId !== userId) throw new ForbiddenError("You do not own this post");

    const [updated] = await db
      .update(posts)
      .set({
        title: data.title,
        description: data.description,
        images: data.imageKeys ?? [],
        links: data.link ? [data.link] : [],
        tags: data.tags ?? [],
        isEdited: true,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId))
      .returning();

    const [enriched] = await enrichPosts([updated], userId);
    return enriched;
  },

  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) throw new NotFoundError("Post not found");
    if (post.userId !== userId) throw new ForbiddenError("You do not own this post");
    await db.delete(posts).where(eq(posts.id, postId));
  },

  async addReaction(
    postId: string,
    userId: string,
    type: "like" | "dislike"
  ): Promise<{ likes: number; dislikes: number; userReaction: string | null }> {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) throw new NotFoundError("Post not found");

    const existing = await db.query.postReactions.findFirst({
      where: and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)),
    });

    if (existing) {
      if (existing.type === type) {
        await db.delete(postReactions).where(eq(postReactions.id, existing.id));
      } else {
        await db.update(postReactions).set({ type }).where(eq(postReactions.id, existing.id));
      }
    } else {
      await db.insert(postReactions).values({ postId, userId, type });
    }

    // Update score (likes - dislikes)
    await db
      .update(posts)
      .set({
        score: sql`(
          SELECT COUNT(*) FILTER (WHERE type = 'like') - COUNT(*) FILTER (WHERE type = 'dislike')
          FROM ${postReactions} WHERE post_id = ${postId}
        )`,
      })
      .where(eq(posts.id, postId));

    const reactionCounts = await db
      .select({ type: postReactions.type, count: sql<number>`COUNT(*)::int` })
      .from(postReactions)
      .where(eq(postReactions.postId, postId))
      .groupBy(postReactions.type);

    const userReaction = await db.query.postReactions.findFirst({
      where: and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)),
    });

    let likes = 0;
    let dislikes = 0;
    for (const r of reactionCounts) {
      if (r.type === "like") likes = r.count;
      else dislikes = r.count;
    }

    return { likes, dislikes, userReaction: userReaction?.type ?? null };
  },

  async getComments(postId: string): Promise<Comment[]> {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) throw new NotFoundError("Post not found");

    const allComments = await db
      .select({ comment: comments, user: users })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt);

    const topLevel: Comment[] = [];
    const replyMap = new Map<string, Comment[]>();

    for (const { comment, user } of allComments) {
      const mapped: Comment = {
        id: comment.id,
        postId: comment.postId,
        parentCommentId: comment.parentCommentId ?? undefined,
        userId: comment.userId,
        content: comment.content,
        createdAt: comment.createdAt instanceof Date ? comment.createdAt.toISOString() : String(comment.createdAt),
        author: mapAuthor(user),
        replies: [],
      };
      if (comment.parentCommentId) {
        const arr = replyMap.get(comment.parentCommentId) ?? [];
        arr.push(mapped);
        replyMap.set(comment.parentCommentId, arr);
      } else {
        topLevel.push(mapped);
      }
    }

    for (const c of topLevel) {
      c.replies = replyMap.get(c.id) ?? [];
    }

    return topLevel;
  },

  async getPost(postId: string, currentUserId?: string): Promise<PostDetail> {
    const post = await communityService.getById(postId, currentUserId);
    const postComments = await communityService.getComments(postId);
    return { ...post, comments: postComments };
  },

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await db.query.comments.findFirst({ where: eq(comments.id, commentId) });
    if (!comment) throw new NotFoundError("Comment not found");
    if (comment.userId !== userId) throw new ForbiddenError("You do not own this comment");
    await db.delete(comments).where(eq(comments.id, commentId));
  },

  async reportPost(
    postId: string,
    userId: string,
    reason: string,
    description?: string
  ): Promise<void> {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) throw new NotFoundError("Post not found");
    await db
      .insert(postReports)
      .values({ postId, reporterUserId: userId, reason, description: description ?? null });
  },

  async addComment(
    postId: string,
    userId: string,
    content: string,
    parentCommentId?: string
  ): Promise<Comment> {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) throw new NotFoundError("Post not found");

    if (parentCommentId) {
      const parent = await db.query.comments.findFirst({
        where: and(eq(comments.id, parentCommentId), eq(comments.postId, postId)),
      });
      if (!parent) throw new NotFoundError("Parent comment not found");
    }

    const [comment] = await db
      .insert(comments)
      .values({ postId, userId, content, parentCommentId: parentCommentId ?? null })
      .returning();

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

    return {
      id: comment.id,
      postId: comment.postId,
      parentCommentId: comment.parentCommentId ?? undefined,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt instanceof Date ? comment.createdAt.toISOString() : String(comment.createdAt),
      author: mapAuthor(user ?? null),
      replies: [],
    };
  },
};
