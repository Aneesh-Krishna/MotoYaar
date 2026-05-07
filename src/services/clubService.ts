import { db } from "@/lib/db/client";
import { clubs, clubMembers, posts, users, notifications } from "@/lib/db/schema";
import { eq, and, sql, ilike, or, isNull } from "drizzle-orm";
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from "@/lib/errors";
import type { Club, ClubMember, FeedPost } from "@/types";
import type { CreateClubInput, UpdateClubInput } from "@/lib/validations/club";

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function mapClub(row: typeof clubs.$inferSelect & { memberCount?: number }): Club {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    description: row.description ?? undefined,
    logoUrl: row.logoUrl ?? undefined,
    inviteCode: row.inviteCode,
    joinPolicy: row.joinPolicy as Club["joinPolicy"],
    createdBy: row.createdBy,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    memberCount: row.memberCount,
  };
}

function mapMember(
  row: typeof clubMembers.$inferSelect & {
    user?: { id: string; name: string; username: string | null; profileImageUrl: string | null } | null;
  }
): ClubMember {
  return {
    id: row.id,
    clubId: row.clubId,
    userId: row.userId,
    role: row.role as ClubMember["role"],
    status: row.status as ClubMember["status"],
    joinedAt: row.joinedAt instanceof Date ? row.joinedAt.toISOString() : String(row.joinedAt),
    user: row.user
      ? {
          id: row.user.id,
          name: row.user.name,
          username: row.user.username,
          profileImageUrl: row.user.profileImageUrl ?? undefined,
        }
      : undefined,
  };
}

async function assertActiveMember(clubId: string, userId: string): Promise<ClubMember> {
  const member = await db.query.clubMembers.findFirst({
    where: and(
      eq(clubMembers.clubId, clubId),
      eq(clubMembers.userId, userId),
      eq(clubMembers.status, "active")
    ),
  });
  if (!member) throw new ForbiddenError("You are not an active member of this club");
  return mapMember(member);
}

async function assertAdmin(clubId: string, userId: string): Promise<void> {
  const member = await db.query.clubMembers.findFirst({
    where: and(
      eq(clubMembers.clubId, clubId),
      eq(clubMembers.userId, userId),
      eq(clubMembers.status, "active"),
      eq(clubMembers.role, "admin")
    ),
  });
  if (!member) throw new ForbiddenError("Only club admins can perform this action");
}

export const clubService = {
  async listForUser(userId: string, search?: string): Promise<Club[]> {
    const myClubs = await db
      .select({
        id: clubs.id,
        name: clubs.name,
        city: clubs.city,
        description: clubs.description,
        logoUrl: clubs.logoUrl,
        inviteCode: clubs.inviteCode,
        joinPolicy: clubs.joinPolicy,
        createdBy: clubs.createdBy,
        createdAt: clubs.createdAt,
        memberCount: sql<number>`(SELECT COUNT(*)::int FROM club_members cm WHERE cm.club_id = ${clubs.id} AND cm.status = 'active')`,
      })
      .from(clubs)
      .innerJoin(
        clubMembers,
        and(eq(clubMembers.clubId, clubs.id), eq(clubMembers.userId, userId), eq(clubMembers.status, "active"))
      );

    const myIds = new Set(myClubs.map((c) => c.id));

    let discover: typeof myClubs = [];
    if (search) {
      const results = await db
        .select({
          id: clubs.id,
          name: clubs.name,
          city: clubs.city,
          description: clubs.description,
          logoUrl: clubs.logoUrl,
          inviteCode: clubs.inviteCode,
          joinPolicy: clubs.joinPolicy,
          createdBy: clubs.createdBy,
          createdAt: clubs.createdAt,
          memberCount: sql<number>`(SELECT COUNT(*)::int FROM club_members cm WHERE cm.club_id = ${clubs.id} AND cm.status = 'active')`,
        })
        .from(clubs)
        .where(or(ilike(clubs.name, `%${search}%`), ilike(clubs.city, `%${search}%`)))
        .limit(20);
      discover = results.filter((c) => !myIds.has(c.id));
    }

    return [
      ...myClubs.map(mapClub),
      // Strip inviteCode from discover results — user is not a member of these clubs
      ...discover.map((c) => mapClub({ ...c, inviteCode: "" })),
    ];
  },

  async create(userId: string, data: CreateClubInput): Promise<Club> {
    const existing = await db.query.clubs.findFirst({ where: eq(clubs.name, data.name) });
    if (existing) throw new ConflictError("A club with this name already exists");

    let inviteCode = generateInviteCode();
    let codeConflict = await db.query.clubs.findFirst({ where: eq(clubs.inviteCode, inviteCode) });
    while (codeConflict) {
      inviteCode = generateInviteCode();
      codeConflict = await db.query.clubs.findFirst({ where: eq(clubs.inviteCode, inviteCode) });
    }

    const [club] = await db
      .insert(clubs)
      .values({
        name: data.name,
        city: data.city,
        description: data.description ?? null,
        logoUrl: data.logoUrl || null,
        inviteCode,
        joinPolicy: data.joinPolicy ?? "approval",
        createdBy: userId,
      })
      .returning();

    await db.insert(clubMembers).values({
      clubId: club.id,
      userId,
      role: "admin",
      status: "active",
    });

    return mapClub({ ...club, memberCount: 1 });
  },

  async getById(clubId: string, requestingUserId?: string): Promise<Club> {
    const rows = await db
      .select({
        id: clubs.id,
        name: clubs.name,
        city: clubs.city,
        description: clubs.description,
        logoUrl: clubs.logoUrl,
        inviteCode: clubs.inviteCode,
        joinPolicy: clubs.joinPolicy,
        createdBy: clubs.createdBy,
        createdAt: clubs.createdAt,
        memberCount: sql<number>`(SELECT COUNT(*)::int FROM club_members cm WHERE cm.club_id = ${clubs.id} AND cm.status = 'active')`,
      })
      .from(clubs)
      .where(eq(clubs.id, clubId));

    if (!rows[0]) throw new NotFoundError("Club not found");

    let isMember = false;
    if (requestingUserId) {
      const membership = await db.query.clubMembers.findFirst({
        where: and(
          eq(clubMembers.clubId, clubId),
          eq(clubMembers.userId, requestingUserId),
          eq(clubMembers.status, "active")
        ),
      });
      isMember = !!membership;
    }

    const club = mapClub(rows[0]);
    if (!isMember) return { ...club, inviteCode: "" };
    return club;
  },

  async update(clubId: string, userId: string, data: UpdateClubInput): Promise<Club> {
    await assertAdmin(clubId, userId);

    if (data.name) {
      const conflict = await db.query.clubs.findFirst({
        where: and(eq(clubs.name, data.name), sql`${clubs.id} != ${clubId}`),
      });
      if (conflict) throw new ConflictError("A club with this name already exists");
    }

    const [updated] = await db
      .update(clubs)
      .set({
        ...(data.name ? { name: data.name } : {}),
        ...(data.city ? { city: data.city } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl || null } : {}),
        ...(data.joinPolicy ? { joinPolicy: data.joinPolicy } : {}),
      })
      .where(eq(clubs.id, clubId))
      .returning();

    return mapClub({ ...updated, memberCount: undefined });
  },

  async resolveJoinLink(code: string): Promise<Club> {
    const rows = await db
      .select({
        id: clubs.id,
        name: clubs.name,
        city: clubs.city,
        description: clubs.description,
        logoUrl: clubs.logoUrl,
        inviteCode: clubs.inviteCode,
        joinPolicy: clubs.joinPolicy,
        createdBy: clubs.createdBy,
        createdAt: clubs.createdAt,
        memberCount: sql<number>`(SELECT COUNT(*)::int FROM club_members cm WHERE cm.club_id = ${clubs.id} AND cm.status = 'active')`,
      })
      .from(clubs)
      .where(eq(clubs.inviteCode, code));

    if (!rows[0]) throw new NotFoundError("Invalid invite link");
    return mapClub(rows[0]);
  },

  async joinById(clubId: string, userId: string): Promise<{ status: "active" | "pending" }> {
    const rows = await db
      .select({ inviteCode: clubs.inviteCode })
      .from(clubs)
      .where(eq(clubs.id, clubId));
    if (!rows[0]) throw new NotFoundError("Club not found");
    return clubService.joinViaCode(rows[0].inviteCode, userId);
  },

  async joinViaCode(code: string, userId: string): Promise<{ status: "active" | "pending" }> {
    const club = await clubService.resolveJoinLink(code);

    const existing = await db.query.clubMembers.findFirst({
      where: and(eq(clubMembers.clubId, club.id), eq(clubMembers.userId, userId)),
    });

    if (existing) {
      if (existing.status === "active") throw new ConflictError("You are already a member");
      if (existing.status === "pending") throw new ConflictError("Your join request is already pending");
      if (existing.status === "removed") {
        // Re-apply
        const newStatus = club.joinPolicy === "open" ? "active" : "pending";
        await db
          .update(clubMembers)
          .set({ status: newStatus, role: "member", joinedAt: new Date() })
          .where(eq(clubMembers.id, existing.id));

        if (newStatus === "pending") await notifyAdmins(club.id, userId, club.name);
        return { status: newStatus };
      }
    }

    const memberStatus = club.joinPolicy === "open" ? "active" : "pending";
    await db.insert(clubMembers).values({
      clubId: club.id,
      userId,
      role: "member",
      status: memberStatus,
    });

    if (memberStatus === "pending") await notifyAdmins(club.id, userId, club.name);
    return { status: memberStatus };
  },

  async getMembers(clubId: string, requestingUserId: string): Promise<ClubMember[]> {
    await assertActiveMember(clubId, requestingUserId);

    const rows = await db.query.clubMembers.findMany({
      where: eq(clubMembers.clubId, clubId),
      with: { user: { columns: { id: true, name: true, username: true, profileImageUrl: true } } },
    });

    return rows.map((r) =>
      mapMember(r as typeof r & { user: { id: string; name: string; username: string | null; profileImageUrl: string | null } | null })
    );
  },

  async memberAction(
    clubId: string,
    adminUserId: string,
    targetUserId: string,
    action: "approve" | "reject" | "remove" | "promote"
  ): Promise<void> {
    await assertAdmin(clubId, adminUserId);

    if (targetUserId === adminUserId) throw new BadRequestError("Cannot perform this action on yourself");

    const target = await db.query.clubMembers.findFirst({
      where: and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, targetUserId)),
    });
    if (!target) throw new NotFoundError("Member not found");

    switch (action) {
      case "approve":
        if (target.status !== "pending") throw new BadRequestError("Member is not pending");
        await db.update(clubMembers).set({ status: "active" }).where(eq(clubMembers.id, target.id));
        break;
      case "reject":
        if (target.status !== "pending") throw new BadRequestError("Member is not pending");
        await db.update(clubMembers).set({ status: "removed" }).where(eq(clubMembers.id, target.id));
        break;
      case "remove":
        if (target.status !== "active") throw new BadRequestError("Member is not active");
        await db.update(clubMembers).set({ status: "removed" }).where(eq(clubMembers.id, target.id));
        break;
      case "promote":
        if (target.status !== "active") throw new BadRequestError("Member is not active");
        await db.update(clubMembers).set({ role: "admin" }).where(eq(clubMembers.id, target.id));
        break;
    }
  },

  async getClubPosts(
    clubId: string,
    requestingUserId: string,
    page = 1
  ): Promise<{ posts: FeedPost[]; hasMore: boolean }> {
    await assertActiveMember(clubId, requestingUserId);

    const PAGE_SIZE = 20;
    const offset = (page - 1) * PAGE_SIZE;

    const rows = await db
      .select({
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
        userReaction: sql<string | null>`(SELECT type FROM post_reactions pr WHERE pr.post_id = ${posts.id} AND pr.user_id = ${requestingUserId} LIMIT 1)`,
        authorId: users.id,
        authorName: users.name,
        authorUsername: users.username,
        authorProfileImageUrl: users.profileImageUrl,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(and(eq(posts.clubId, clubId), eq(posts.isHidden, false)))
      .orderBy(posts.createdAt)
      .limit(PAGE_SIZE + 1)
      .offset(offset);

    const hasMore = rows.length > PAGE_SIZE;
    const page_rows = rows.slice(0, PAGE_SIZE);

    return {
      posts: page_rows.map((row) => ({
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
      })),
      hasMore,
    };
  },
};

async function notifyAdmins(clubId: string, applicantUserId: string, clubName: string): Promise<void> {
  const admins = await db.query.clubMembers.findMany({
    where: and(
      eq(clubMembers.clubId, clubId),
      eq(clubMembers.role, "admin"),
      eq(clubMembers.status, "active")
    ),
  });

  const applicant = await db.query.users.findFirst({
    where: eq(users.id, applicantUserId),
    columns: { name: true },
  });

  const name = applicant?.name ?? "Someone";

  if (admins.length === 0) return;

  await db.insert(notifications).values(
    admins.map((a) => ({
      userId: a.userId,
      type: "club_join_request",
      title: `New join request for ${clubName}`,
      body: `${name} wants to join ${clubName}`,
      actionUrl: `/clubs/${clubId}/members`,
    }))
  );
}
