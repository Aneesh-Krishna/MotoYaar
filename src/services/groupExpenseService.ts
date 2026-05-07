import { db } from "@/lib/db/client";
import { groupExpenseSessions, groupExpenseSessionMembers, groupExpenseItems, groupExpenseSettlements, trips, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from "@/lib/errors";
import { notificationService } from "@/services/notificationService";
import { logger } from "@/lib/logger";
import type { CreateGroupExpenseItemInput, UpdateGroupExpenseItemInput } from "@/lib/validations/group-expense";
import type { GroupExpenseItem, GroupExpenseBalance, GroupExpenseSettlement, GroupExpenseBalancesResponse } from "@/types";

export interface GroupExpenseSession {
  id: string;
  title: string | null;
  tripId: string | null;
  createdBy: string;
  status: "active" | "archived";
  currency: string;
  inviteCode: string;
  createdAt: string;
  members: GroupExpenseSessionMember[];
}

export interface GroupExpenseSessionMember {
  userId: string;
  name: string;
  username: string | null;
  profileImageUrl: string | null;
  joinedAt: string;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateInviteCode();
    const existing = await db.query.groupExpenseSessions.findFirst({
      where: eq(groupExpenseSessions.inviteCode, code),
      columns: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique invite code after 10 attempts");
}

async function getSessionWithMembers(sessionId: string): Promise<GroupExpenseSession> {
  const session = await db.query.groupExpenseSessions.findFirst({
    where: eq(groupExpenseSessions.id, sessionId),
  });
  if (!session) throw new NotFoundError("Group expense session not found");

  const memberRows = await db
    .select({
      userId: groupExpenseSessionMembers.userId,
      name: users.name,
      username: users.username,
      profileImageUrl: users.profileImageUrl,
      joinedAt: groupExpenseSessionMembers.joinedAt,
    })
    .from(groupExpenseSessionMembers)
    .innerJoin(users, eq(users.id, groupExpenseSessionMembers.userId))
    .where(eq(groupExpenseSessionMembers.sessionId, sessionId));

  return {
    id: session.id,
    title: session.title,
    tripId: session.tripId,
    createdBy: session.createdBy,
    status: session.status as "active" | "archived",
    currency: session.currency,
    inviteCode: session.inviteCode,
    createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : String(session.createdAt),
    members: memberRows.map((m) => ({
      userId: m.userId,
      name: m.name,
      username: m.username,
      profileImageUrl: m.profileImageUrl,
      joinedAt: m.joinedAt instanceof Date ? m.joinedAt.toISOString() : String(m.joinedAt),
    })),
  };
}

function toGroupExpenseItem(row: {
  id: string;
  sessionId: string;
  loggedBy: string;
  paidBy: string;
  paidByName: string;
  amount: string | number;
  description: string;
  category: string;
  includedUserIds: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
}): GroupExpenseItem {
  const amount = typeof row.amount === "number" ? row.amount : parseFloat(row.amount);
  const rawPerPerson = amount / row.includedUserIds.length;
  return {
    id: row.id,
    sessionId: row.sessionId,
    loggedBy: row.loggedBy,
    paidBy: row.paidBy,
    paidByName: row.paidByName,
    amount,
    description: row.description,
    category: row.category as GroupExpenseItem["category"],
    includedUserIds: row.includedUserIds,
    perPerson: Math.round(rawPerPerson * 100) / 100,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export const groupExpenseService = {
  async create(
    creatorId: string,
    input: { title?: string; tripId?: string; currency?: string }
  ): Promise<GroupExpenseSession> {
    let resolvedTitle = input.title ?? null;
    let resolvedCurrency = input.currency ?? "INR";

    if (input.tripId) {
      const trip = await db.query.trips.findFirst({
        where: eq(trips.id, input.tripId),
        columns: { id: true, userId: true, title: true },
      });
      if (!trip) throw new NotFoundError("Trip not found");
      if (trip.userId !== creatorId) throw new ForbiddenError("You do not own this trip");
      if (!resolvedTitle) resolvedTitle = trip.title;
    }

    const inviteCode = await generateUniqueInviteCode();

    const [session] = await db
      .insert(groupExpenseSessions)
      .values({
        title: resolvedTitle,
        tripId: input.tripId ?? null,
        createdBy: creatorId,
        currency: resolvedCurrency,
        inviteCode,
      })
      .returning();

    await db.insert(groupExpenseSessionMembers).values({
      sessionId: session.id,
      userId: creatorId,
    });

    return getSessionWithMembers(session.id);
  },

  async getById(sessionId: string, requestingUserId: string): Promise<GroupExpenseSession> {
    const session = await db.query.groupExpenseSessions.findFirst({
      where: eq(groupExpenseSessions.id, sessionId),
    });
    if (!session) throw new NotFoundError("Group expense session not found");

    const membership = await db.query.groupExpenseSessionMembers.findFirst({
      where: and(
        eq(groupExpenseSessionMembers.sessionId, sessionId),
        eq(groupExpenseSessionMembers.userId, requestingUserId)
      ),
    });
    if (!membership) throw new ForbiddenError("You are not a member of this session");

    return getSessionWithMembers(sessionId);
  },

  async update(
    sessionId: string,
    requestingUserId: string,
    input: { title?: string; status?: "active" | "archived" }
  ): Promise<GroupExpenseSession> {
    const session = await db.query.groupExpenseSessions.findFirst({
      where: eq(groupExpenseSessions.id, sessionId),
    });
    if (!session) throw new NotFoundError("Group expense session not found");
    if (session.createdBy !== requestingUserId) throw new ForbiddenError("Only the creator can update this session");
    if (session.status === "archived" && input.status === "active") throw new BadRequestError("Cannot reactivate an archived session");

    await db
      .update(groupExpenseSessions)
      .set({
        title: input.title !== undefined ? input.title : session.title,
        status: input.status ?? session.status,
      })
      .where(eq(groupExpenseSessions.id, sessionId));

    return getSessionWithMembers(sessionId);
  },

  async inviteMember(
    sessionId: string,
    requestingUserId: string,
    inviteeUserId: string
  ): Promise<void> {
    const session = await db.query.groupExpenseSessions.findFirst({
      where: eq(groupExpenseSessions.id, sessionId),
    });
    if (!session) throw new NotFoundError("Group expense session not found");
    if (session.createdBy !== requestingUserId) throw new ForbiddenError("Only the creator can invite members");
    if (session.status === "archived") throw new BadRequestError("Cannot invite to an archived session");
    if (inviteeUserId === requestingUserId) throw new BadRequestError("You cannot invite yourself");

    const invitee = await db.query.users.findFirst({
      where: eq(users.id, inviteeUserId),
      columns: { id: true, name: true },
    });
    if (!invitee) throw new NotFoundError("User not found");

    const existing = await db.query.groupExpenseSessionMembers.findFirst({
      where: and(
        eq(groupExpenseSessionMembers.sessionId, sessionId),
        eq(groupExpenseSessionMembers.userId, inviteeUserId)
      ),
    });
    if (existing) throw new ConflictError("User is already a member of this session");

    const creator = await db.query.users.findFirst({
      where: eq(users.id, requestingUserId),
      columns: { name: true },
    });

    const sessionTitle = session.title ?? "a group trip";
    await notificationService.create({
      userId: inviteeUserId,
      type: "group_expense_invite",
      title: "Group expense invite",
      body: `${creator?.name ?? "Someone"} invited you to a group expense session for ${sessionTitle}`,
      actionUrl: `/group-expenses/join/${session.inviteCode}`,
    });

    logger.info({ sessionId, inviteeUserId }, "groupExpenseService.inviteMember: notification sent");
  },

  async joinByCode(code: string, userId: string): Promise<GroupExpenseSession> {
    const session = await db.query.groupExpenseSessions.findFirst({
      where: eq(groupExpenseSessions.inviteCode, code),
    });
    if (!session) throw new NotFoundError("Invalid invite code");
    if (session.status === "archived") throw new BadRequestError("This session is archived");

    const existing = await db.query.groupExpenseSessionMembers.findFirst({
      where: and(
        eq(groupExpenseSessionMembers.sessionId, session.id),
        eq(groupExpenseSessionMembers.userId, userId)
      ),
    });

    if (!existing) {
      await db.insert(groupExpenseSessionMembers).values({
        sessionId: session.id,
        userId,
      });
    }

    return getSessionWithMembers(session.id);
  },

  async removeMember(
    sessionId: string,
    requestingUserId: string,
    targetUserId: string
  ): Promise<void> {
    const session = await db.query.groupExpenseSessions.findFirst({
      where: eq(groupExpenseSessions.id, sessionId),
    });
    if (!session) throw new NotFoundError("Group expense session not found");
    if (session.createdBy !== requestingUserId) throw new ForbiddenError("Only the creator can remove members");
    if (session.status === "archived") throw new BadRequestError("Session is archived");
    if (targetUserId === requestingUserId) throw new BadRequestError("Creator cannot remove themselves");

    const membership = await db.query.groupExpenseSessionMembers.findFirst({
      where: and(
        eq(groupExpenseSessionMembers.sessionId, sessionId),
        eq(groupExpenseSessionMembers.userId, targetUserId)
      ),
    });
    if (!membership) throw new NotFoundError("User is not a member of this session");

    await db
      .delete(groupExpenseSessionMembers)
      .where(
        and(
          eq(groupExpenseSessionMembers.sessionId, sessionId),
          eq(groupExpenseSessionMembers.userId, targetUserId)
        )
      );
  },

  async listItems(sessionId: string, requestingUserId: string): Promise<GroupExpenseItem[]> {
    const session = await db.query.groupExpenseSessions.findFirst({
      where: eq(groupExpenseSessions.id, sessionId),
      columns: { id: true },
    });
    if (!session) throw new NotFoundError("Group expense session not found");

    const membership = await db.query.groupExpenseSessionMembers.findFirst({
      where: and(
        eq(groupExpenseSessionMembers.sessionId, sessionId),
        eq(groupExpenseSessionMembers.userId, requestingUserId)
      ),
    });
    if (!membership) throw new ForbiddenError("You are not a member of this session");

    const rows = await db
      .select({
        id: groupExpenseItems.id,
        sessionId: groupExpenseItems.sessionId,
        loggedBy: groupExpenseItems.loggedBy,
        paidBy: groupExpenseItems.paidBy,
        paidByName: users.name,
        amount: groupExpenseItems.amount,
        description: groupExpenseItems.description,
        category: groupExpenseItems.category,
        includedUserIds: groupExpenseItems.includedUserIds,
        createdAt: groupExpenseItems.createdAt,
        updatedAt: groupExpenseItems.updatedAt,
      })
      .from(groupExpenseItems)
      .innerJoin(users, eq(users.id, groupExpenseItems.paidBy))
      .where(eq(groupExpenseItems.sessionId, sessionId));

    return rows.map(toGroupExpenseItem);
  },

  async addItem(
    sessionId: string,
    requestingUserId: string,
    input: CreateGroupExpenseItemInput
  ): Promise<GroupExpenseItem> {
    const session = await db.query.groupExpenseSessions.findFirst({
      where: eq(groupExpenseSessions.id, sessionId),
      columns: { id: true },
    });
    if (!session) throw new NotFoundError("Group expense session not found");

    const allMembers = await db
      .select({
        userId: groupExpenseSessionMembers.userId,
        name: users.name,
      })
      .from(groupExpenseSessionMembers)
      .innerJoin(users, eq(users.id, groupExpenseSessionMembers.userId))
      .where(eq(groupExpenseSessionMembers.sessionId, sessionId));

    const memberMap = new Map(allMembers.map((m) => [m.userId, m.name]));

    if (!memberMap.has(requestingUserId)) throw new ForbiddenError("You are not a member of this session");
    if (!memberMap.has(input.paidBy)) throw new BadRequestError("paidBy must be a session member");

    const invalidIds = input.includedUserIds.filter((id) => !memberMap.has(id));
    if (invalidIds.length > 0) throw new BadRequestError("includedUserIds must all be session members");

    const [item] = await db
      .insert(groupExpenseItems)
      .values({
        sessionId,
        loggedBy: requestingUserId,
        paidBy: input.paidBy,
        amount: String(input.amount),
        description: input.description,
        category: input.category,
        includedUserIds: input.includedUserIds,
      })
      .returning();

    return toGroupExpenseItem({
      ...item,
      paidByName: memberMap.get(input.paidBy) ?? "",
    });
  },

  async updateItem(
    sessionId: string,
    itemId: string,
    requestingUserId: string,
    input: UpdateGroupExpenseItemInput
  ): Promise<GroupExpenseItem> {
    const session = await db.query.groupExpenseSessions.findFirst({
      where: eq(groupExpenseSessions.id, sessionId),
      columns: { id: true, createdBy: true },
    });
    if (!session) throw new NotFoundError("Group expense session not found");

    const item = await db.query.groupExpenseItems.findFirst({
      where: and(
        eq(groupExpenseItems.id, itemId),
        eq(groupExpenseItems.sessionId, sessionId)
      ),
    });
    if (!item) throw new NotFoundError("Expense item not found");

    const canEdit = item.loggedBy === requestingUserId || session.createdBy === requestingUserId;
    if (!canEdit) throw new ForbiddenError("You can only edit your own expenses");

    if (input.paidBy !== undefined || input.includedUserIds !== undefined) {
      const allMembers = await db
        .select({ userId: groupExpenseSessionMembers.userId, name: users.name })
        .from(groupExpenseSessionMembers)
        .innerJoin(users, eq(users.id, groupExpenseSessionMembers.userId))
        .where(eq(groupExpenseSessionMembers.sessionId, sessionId));

      const memberMap = new Map(allMembers.map((m) => [m.userId, m.name]));

      if (input.paidBy !== undefined && !memberMap.has(input.paidBy)) {
        throw new BadRequestError("paidBy must be a session member");
      }
      if (input.includedUserIds !== undefined) {
        const invalidIds = input.includedUserIds.filter((id) => !memberMap.has(id));
        if (invalidIds.length > 0) throw new BadRequestError("includedUserIds must all be session members");
      }

      const resolvedPaidBy = input.paidBy ?? item.paidBy;
      const [updated] = await db
        .update(groupExpenseItems)
        .set({
          paidBy: resolvedPaidBy,
          amount: input.amount !== undefined ? String(input.amount) : item.amount,
          description: input.description ?? item.description,
          category: input.category ?? item.category,
          includedUserIds: input.includedUserIds ?? item.includedUserIds,
          updatedAt: new Date(),
        })
        .where(eq(groupExpenseItems.id, itemId))
        .returning();

      return toGroupExpenseItem({
        ...updated,
        paidByName: memberMap.get(resolvedPaidBy) ?? "",
      });
    }

    const [updated] = await db
      .update(groupExpenseItems)
      .set({
        amount: input.amount !== undefined ? String(input.amount) : item.amount,
        description: input.description ?? item.description,
        category: input.category ?? item.category,
        updatedAt: new Date(),
      })
      .where(eq(groupExpenseItems.id, itemId))
      .returning();

    const paidByUser = await db.query.users.findFirst({
      where: eq(users.id, updated.paidBy),
      columns: { name: true },
    });

    return toGroupExpenseItem({
      ...updated,
      paidByName: paidByUser?.name ?? "",
    });
  },

  async computeBalances(sessionId: string, requestingUserId: string): Promise<GroupExpenseBalancesResponse> {
    const session = await db.query.groupExpenseSessions.findFirst({
      where: eq(groupExpenseSessions.id, sessionId),
    });
    if (!session) throw new NotFoundError("Group expense session not found");

    const membership = await db.query.groupExpenseSessionMembers.findFirst({
      where: and(
        eq(groupExpenseSessionMembers.sessionId, sessionId),
        eq(groupExpenseSessionMembers.userId, requestingUserId)
      ),
    });
    if (!membership) throw new ForbiddenError("You are not a member of this session");

    const memberRows = await db
      .select({ userId: groupExpenseSessionMembers.userId, name: users.name })
      .from(groupExpenseSessionMembers)
      .innerJoin(users, eq(users.id, groupExpenseSessionMembers.userId))
      .where(eq(groupExpenseSessionMembers.sessionId, sessionId));

    const memberNameMap = new Map(memberRows.map((m) => [m.userId, m.name]));
    const memberIds = memberRows.map((m) => m.userId);

    const items = await db.query.groupExpenseItems.findMany({
      where: eq(groupExpenseItems.sessionId, sessionId),
    });

    const settlementRows = await db
      .select({
        id: groupExpenseSettlements.id,
        fromUserId: groupExpenseSettlements.fromUserId,
        toUserId: groupExpenseSettlements.toUserId,
        amount: groupExpenseSettlements.amount,
        settledAt: groupExpenseSettlements.settledAt,
        settledBy: groupExpenseSettlements.settledBy,
      })
      .from(groupExpenseSettlements)
      .where(eq(groupExpenseSettlements.sessionId, sessionId));

    // Net balance per member from expense items
    const net: Record<string, number> = {};
    memberIds.forEach((id) => { net[id] = 0; });

    let totalSessionSpend = 0;
    const perMemberRaw: Record<string, number> = {};
    memberIds.forEach((id) => { perMemberRaw[id] = 0; });

    for (const item of items) {
      const amount = parseFloat(String(item.amount));
      totalSessionSpend += amount;
      const share = amount / item.includedUserIds.length;
      net[item.paidBy] = (net[item.paidBy] ?? 0) + amount;
      for (const uid of item.includedUserIds) {
        net[uid] = (net[uid] ?? 0) - share;
        perMemberRaw[uid] = (perMemberRaw[uid] ?? 0) + share;
      }
    }

    // Apply settlements to net balances
    for (const s of settlementRows) {
      const amt = parseFloat(String(s.amount));
      net[s.fromUserId] = (net[s.fromUserId] ?? 0) + amt;
      net[s.toUserId] = (net[s.toUserId] ?? 0) - amt;
    }

    // Simplify into minimal transactions
    const creditors = Object.entries(net)
      .filter(([, v]) => v > 0.005)
      .map(([id, v]) => [id, v] as [string, number])
      .sort((a, b) => b[1] - a[1]);
    const debtors = Object.entries(net)
      .filter(([, v]) => v < -0.005)
      .map(([id, v]) => [id, v] as [string, number])
      .sort((a, b) => a[1] - b[1]);

    const activeBalances: GroupExpenseBalance[] = [];
    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
      const [credId, credAmt] = creditors[i];
      const [debtId, debtAmt] = debtors[j];
      const amount = parseFloat(Math.min(credAmt, Math.abs(debtAmt)).toFixed(2));
      if (amount >= 0.01) {
        activeBalances.push({
          from: debtId,
          fromName: memberNameMap.get(debtId) ?? debtId,
          to: credId,
          toName: memberNameMap.get(credId) ?? credId,
          amount,
        });
      }
      creditors[i][1] -= amount;
      debtors[j][1] += amount;
      if (Math.abs(creditors[i][1]) < 0.01) i++;
      if (Math.abs(debtors[j][1]) < 0.01) j++;
    }

    const settlements: GroupExpenseSettlement[] = settlementRows.map((s) => ({
      id: s.id,
      sessionId,
      from: s.fromUserId,
      fromName: memberNameMap.get(s.fromUserId) ?? s.fromUserId,
      to: s.toUserId,
      toName: memberNameMap.get(s.toUserId) ?? s.toUserId,
      amount: parseFloat(String(s.amount)),
      settledAt: s.settledAt instanceof Date ? s.settledAt.toISOString() : String(s.settledAt),
      settledBy: s.settledBy,
    }));

    const perMemberShare = memberIds.map((id) => ({
      userId: id,
      name: memberNameMap.get(id) ?? id,
      share: parseFloat((perMemberRaw[id] ?? 0).toFixed(2)),
    }));

    return {
      activeBalances,
      settlements,
      totalSessionSpend: parseFloat(totalSessionSpend.toFixed(2)),
      perMemberShare,
    };
  },

  async settleBalance(
    sessionId: string,
    requestingUserId: string,
    input: { fromUserId: string; toUserId: string; amount: number }
  ): Promise<GroupExpenseSettlement> {
    const session = await db.query.groupExpenseSessions.findFirst({
      where: eq(groupExpenseSessions.id, sessionId),
    });
    if (!session) throw new NotFoundError("Group expense session not found");
    if (session.status === "archived") throw new BadRequestError("Session is archived");

    const membership = await db.query.groupExpenseSessionMembers.findFirst({
      where: and(
        eq(groupExpenseSessionMembers.sessionId, sessionId),
        eq(groupExpenseSessionMembers.userId, requestingUserId)
      ),
    });
    if (!membership) throw new ForbiddenError("You are not a member of this session");

    const isCreator = session.createdBy === requestingUserId;
    const isParty = requestingUserId === input.fromUserId || requestingUserId === input.toUserId;
    if (!isCreator && !isParty) throw new ForbiddenError("Only the creator or a party in the debt can mark it as settled");

    if (input.amount <= 0) throw new BadRequestError("Amount must be positive");

    const memberRows = await db
      .select({ userId: groupExpenseSessionMembers.userId, name: users.name })
      .from(groupExpenseSessionMembers)
      .innerJoin(users, eq(users.id, groupExpenseSessionMembers.userId))
      .where(eq(groupExpenseSessionMembers.sessionId, sessionId));

    const memberNameMap = new Map(memberRows.map((r) => [r.userId, r.name]));

    if (!memberNameMap.has(input.fromUserId)) throw new BadRequestError("fromUserId is not a session member");
    if (!memberNameMap.has(input.toUserId)) throw new BadRequestError("toUserId is not a session member");

    // Validate amount matches the actual outstanding balance between this pair (±₹1 tolerance)
    const [sessionItems, existingSettlements] = await Promise.all([
      db.query.groupExpenseItems.findMany({ where: eq(groupExpenseItems.sessionId, sessionId) }),
      db.select({
        fromUserId: groupExpenseSettlements.fromUserId,
        toUserId: groupExpenseSettlements.toUserId,
        amount: groupExpenseSettlements.amount,
      }).from(groupExpenseSettlements).where(eq(groupExpenseSettlements.sessionId, sessionId)),
    ]);

    const memberIds = memberRows.map((r) => r.userId);
    const net: Record<string, number> = {};
    memberIds.forEach((id) => { net[id] = 0; });
    for (const item of sessionItems) {
      const amt = parseFloat(String(item.amount));
      const share = amt / item.includedUserIds.length;
      net[item.paidBy] = (net[item.paidBy] ?? 0) + amt;
      for (const uid of item.includedUserIds) net[uid] = (net[uid] ?? 0) - share;
    }
    for (const s of existingSettlements) {
      const amt = parseFloat(String(s.amount));
      net[s.fromUserId] = (net[s.fromUserId] ?? 0) + amt;
      net[s.toUserId] = (net[s.toUserId] ?? 0) - amt;
    }

    // Run full Splitwise simplification to get the exact pairwise balance
    const creditors = Object.entries(net)
      .filter(([, v]) => v > 0.005)
      .map(([id, v]) => [id, v] as [string, number])
      .sort((a, b) => b[1] - a[1]);
    const debtors = Object.entries(net)
      .filter(([, v]) => v < -0.005)
      .map(([id, v]) => [id, v] as [string, number])
      .sort((a, b) => a[1] - b[1]);

    let simplifiedAmount: number | null = null;
    let ci = 0, di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const [credId, credAmt] = creditors[ci];
      const [debtId, debtAmt] = debtors[di];
      const amount = parseFloat(Math.min(credAmt, Math.abs(debtAmt)).toFixed(2));
      if (debtId === input.fromUserId && credId === input.toUserId) {
        simplifiedAmount = amount;
        break;
      }
      creditors[ci][1] -= amount;
      debtors[di][1] += amount;
      if (Math.abs(creditors[ci][1]) < 0.01) ci++;
      if (Math.abs(debtors[di][1]) < 0.01) di++;
    }

    if (simplifiedAmount === null || simplifiedAmount < 0.01) {
      throw new BadRequestError("No outstanding balance between these users");
    }
    if (Math.abs(input.amount - simplifiedAmount) > 1) {
      throw new BadRequestError(`Settlement amount must be within ₹1 of the outstanding balance (${simplifiedAmount.toFixed(2)})`);
    }

    const [row] = await db
      .insert(groupExpenseSettlements)
      .values({
        sessionId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        amount: String(input.amount),
        settledBy: requestingUserId,
      })
      .returning();

    logger.info({ sessionId, fromUserId: input.fromUserId, toUserId: input.toUserId }, "groupExpenseService.settleBalance");

    return {
      id: row.id,
      sessionId,
      from: row.fromUserId,
      fromName: memberNameMap.get(row.fromUserId) ?? row.fromUserId,
      to: row.toUserId,
      toName: memberNameMap.get(row.toUserId) ?? row.toUserId,
      amount: parseFloat(String(row.amount)),
      settledAt: row.settledAt instanceof Date ? row.settledAt.toISOString() : String(row.settledAt),
      settledBy: row.settledBy,
    };
  },

  async deleteItem(
    sessionId: string,
    itemId: string,
    requestingUserId: string
  ): Promise<void> {
    const session = await db.query.groupExpenseSessions.findFirst({
      where: eq(groupExpenseSessions.id, sessionId),
      columns: { id: true, createdBy: true },
    });
    if (!session) throw new NotFoundError("Group expense session not found");

    const item = await db.query.groupExpenseItems.findFirst({
      where: and(
        eq(groupExpenseItems.id, itemId),
        eq(groupExpenseItems.sessionId, sessionId)
      ),
    });
    if (!item) throw new NotFoundError("Expense item not found");

    const canDelete = item.loggedBy === requestingUserId || session.createdBy === requestingUserId;
    if (!canDelete) throw new ForbiddenError("You can only delete your own expenses");

    await db.delete(groupExpenseItems).where(eq(groupExpenseItems.id, itemId));
  },
};
